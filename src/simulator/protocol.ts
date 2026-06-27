import { AutomataTransition, NetworkFailureCode, PacketConfig } from "./types.js";

const TCP_PROTOCOL_BY_PORT: Record<number, string> = {
  20: "FTP-DATA",
  21: "FTP",
  22: "SSH",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  110: "POP3",
  143: "IMAP",
  443: "HTTPS"
};

const UDP_PROTOCOL_BY_PORT: Record<number, string> = {
  53: "DNS",
  67: "DHCP",
  68: "DHCP",
  69: "TFTP",
  123: "NTP"
};

export interface ProtocolTraceContext {
  delivered: boolean;
  failureCode?: NetworkFailureCode;
}

export function detectProtocol(packet: PacketConfig): string {
  if (packet.transport === "ICMP") {
    return "ICMP";
  }

  const port = Number(packet.destinationPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return `${packet.transport} puerto invalido`;
  }

  if (packet.transport === "TCP") {
    return TCP_PROTOCOL_BY_PORT[port] ?? `TCP puerto ${port}`;
  }
  return UDP_PROTOCOL_BY_PORT[port] ?? `UDP puerto ${port}`;
}

export function protocolAutomataTrace(
  packet: PacketConfig,
  detectedProtocol: string,
  context: ProtocolTraceContext
): AutomataTransition[] {
  const failureCode = context.failureCode;
  const normalizedProtocol = normalizeProtocolState(detectedProtocol);

  if (!context.delivered && isPrecheckFailure(failureCode)) {
    return [{ from: "p0", symbol: "PRECHECK_FAILED", to: "pProtocolError", status: "error" }];
  }

  const transitions = buildArpPhase(context.delivered, failureCode);
  const lastState = transitions.at(-1)?.to ?? "p0";
  if (lastState === "pArpError") {
    return transitions;
  }

  if (packet.transport === "TCP") {
    return transitions.concat(buildTcpPhase(lastState, normalizedProtocol, context.delivered));
  }

  if (packet.transport === "UDP") {
    return transitions.concat(buildUdpPhase(lastState, detectedProtocol, normalizedProtocol, context.delivered));
  }

  return transitions.concat(buildIcmpPhase(lastState, context.delivered, failureCode));
}

function buildArpPhase(delivered: boolean, failureCode?: NetworkFailureCode): AutomataTransition[] {
  const transitions: AutomataTransition[] = [
    { from: "p0", symbol: "FRAME_READY", to: "pL2", status: "ok" },
    { from: "pL2", symbol: "ARP_REQUEST_GATEWAY", to: "pArpWait", status: "ok" }
  ];

  if (!delivered && isArpFailure(failureCode)) {
    transitions.push({
      from: "pArpWait",
      symbol: "ARP_TIMEOUT_GATEWAY",
      to: "pArpError",
      status: "error"
    });
    return transitions;
  }

  transitions.push({
    from: "pArpWait",
    symbol: "ARP_REPLY_GATEWAY",
    to: "pArpOk",
    status: "ok"
  });

  return transitions;
}

function buildTcpPhase(
  startState: string,
  normalizedProtocol: string,
  delivered: boolean
): AutomataTransition[] {
  const handshake: AutomataTransition[] = [
    { from: startState, symbol: "TCP_SYN", to: "pTcpSynSent", status: "ok" }
  ];

  if (!delivered) {
    handshake.push({
      from: "pTcpSynSent",
      symbol: "TCP_TIMEOUT",
      to: "pTcpError",
      status: "error"
    });
    return handshake;
  }

  return handshake.concat([
    { from: "pTcpSynSent", symbol: "TCP_SYN_ACK", to: "pTcpSynReceived", status: "ok" },
    { from: "pTcpSynReceived", symbol: "TCP_ACK", to: "pTcpEstablished", status: "ok" },
    {
      from: "pTcpEstablished",
      symbol: `APP_${normalizedProtocol}`,
      to: `p${normalizedProtocol}`,
      status: "ok"
    },
    { from: `p${normalizedProtocol}`, symbol: "TCP_FIN", to: "pTcpFinWait", status: "ok" },
    { from: "pTcpFinWait", symbol: "TCP_FIN_ACK", to: "pTcpClosed", status: "ok" }
  ]);
}

function buildUdpPhase(
  startState: string,
  detectedProtocol: string,
  normalizedProtocol: string,
  delivered: boolean
): AutomataTransition[] {
  if (detectedProtocol === "DNS") {
    return [
      { from: startState, symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx", status: "ok" },
      { from: "pUdpTx", symbol: "DNS_QUERY", to: "pDnsWait", status: "ok" },
      {
      from: "pDnsWait",
      symbol: delivered ? "DNS_RESPONSE" : "DNS_TIMEOUT",
      to: delivered ? "pDnsOk" : "pDnsError",
      status: delivered ? ("ok" as const) : ("error" as const)
      }
    ];
  }

  if (detectedProtocol === "DHCP") {
    const dhcpStart: AutomataTransition[] = [
      { from: startState, symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx", status: "ok" },
      { from: "pUdpTx", symbol: "DHCP_DISCOVER", to: "pDhcpSelecting", status: "ok" }
    ];

    if (!delivered) {
      dhcpStart.push({
        from: "pDhcpSelecting",
        symbol: "DHCP_TIMEOUT",
        to: "pDhcpError",
        status: "error"
      });
      return dhcpStart;
    }

    return dhcpStart.concat([
      { from: "pDhcpSelecting", symbol: "DHCP_OFFER", to: "pDhcpRequesting", status: "ok" },
      { from: "pDhcpRequesting", symbol: "DHCP_REQUEST", to: "pDhcpBinding", status: "ok" },
      { from: "pDhcpBinding", symbol: "DHCP_ACK", to: "pDhcpBound", status: "ok" }
    ]);
  }

  return [
    { from: startState, symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx", status: "ok" },
    {
      from: "pUdpTx",
      symbol: `APP_${normalizedProtocol}`,
      to: delivered ? `p${normalizedProtocol}` : "pUdpError",
      status: delivered ? ("ok" as const) : ("error" as const)
    }
  ];
}

function buildIcmpPhase(
  startState: string,
  delivered: boolean,
  failureCode?: NetworkFailureCode
): AutomataTransition[] {
  const failureSymbol = isDestinationUnreachableFailure(failureCode)
    ? "ICMP_DESTINATION_UNREACHABLE"
    : "ICMP_TIME_EXCEEDED";

  return [
    { from: startState, symbol: "ICMP_ECHO_REQUEST", to: "pIcmpWait", status: "ok" },
    {
      from: "pIcmpWait",
      symbol: delivered ? "ICMP_ECHO_REPLY" : failureSymbol,
      to: delivered ? "pIcmpOk" : "pIcmpError",
      status: delivered ? ("ok" as const) : ("error" as const)
    }
  ];
}

function isPrecheckFailure(failureCode?: NetworkFailureCode): boolean {
  return (
    failureCode === "PC1_IP_INVALID" ||
    failureCode === "PC2_IP_INVALID" ||
    failureCode === "MASK_INVALID" ||
    failureCode === "ROUTER_IP_INVALID" ||
    failureCode === "SAME_NETWORK" ||
    failureCode === "PC1_GATEWAY_INVALID" ||
    failureCode === "PC1_GATEWAY_OUT_OF_NETWORK"
  );
}

function isArpFailure(failureCode?: NetworkFailureCode): boolean {
  return failureCode === "PC1_GATEWAY_NOT_ROUTER";
}

function isDestinationUnreachableFailure(failureCode?: NetworkFailureCode): boolean {
  return (
    failureCode === "ROUTER_ETH0_NOT_IN_PC1_NETWORK" ||
    failureCode === "ROUTER_ETH1_NOT_IN_PC2_NETWORK" ||
    failureCode === "PC2_GATEWAY_INVALID" ||
    failureCode === "PC2_GATEWAY_OUT_OF_NETWORK" ||
    failureCode === "PC2_GATEWAY_NOT_ROUTER"
  );
}

function normalizeProtocolState(protocol: string): string {
  const normalized = protocol
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "UNKNOWN_PROTOCOL";
}
