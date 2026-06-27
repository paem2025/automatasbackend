import { AutomataDefinition, AutomataDefinitionTransition, PacketConfig } from "./types.js";

export const networkAutomataDefinition: AutomataDefinition = {
  id: "network-routing-af",
  name: "AF de red",
  states: ["q0", "q1", "q2", "q3", "q4", "q5", "q6", "qFinal", "qError"],
  alphabet: [
    "IP_ORIGEN_OK",
    "IP_ORIGEN_INVALIDA",
    "IP_DESTINO_OK",
    "IP_DESTINO_INVALIDA",
    "MASCARA_OK",
    "MASCARA_INVALIDA",
    "ROUTER_IP_INVALIDA",
    "DISTINTA_RED",
    "MISMA_RED",
    "GATEWAY_FORMATO_INVALIDO",
    "GATEWAY_FUERA_DE_RED",
    "GATEWAY_NO_CORRESPONDE_ROUTER",
    "GATEWAY_OK",
    "RUTA_OK",
    "RUTA_NO_ENCONTRADA",
    "RUTA_DESTINO_INVALIDA",
    "DESTINO_ALCANZADO"
  ],
  initialState: "q0",
  finalStates: ["qFinal"],
  transitions: [
    { from: "q0", symbol: "IP_ORIGEN_OK", to: "q1" },
    { from: "q0", symbol: "IP_ORIGEN_INVALIDA", to: "qError" },
    { from: "q1", symbol: "IP_DESTINO_OK", to: "q2" },
    { from: "q1", symbol: "IP_DESTINO_INVALIDA", to: "qError" },
    { from: "q2", symbol: "MASCARA_OK", to: "q3" },
    { from: "q2", symbol: "MASCARA_INVALIDA", to: "qError" },
    { from: "q3", symbol: "ROUTER_IP_INVALIDA", to: "qError" },
    { from: "q3", symbol: "DISTINTA_RED", to: "q4" },
    { from: "q3", symbol: "MISMA_RED", to: "qError" },
    { from: "q4", symbol: "GATEWAY_FORMATO_INVALIDO", to: "qError" },
    { from: "q4", symbol: "GATEWAY_FUERA_DE_RED", to: "qError" },
    { from: "q4", symbol: "GATEWAY_NO_CORRESPONDE_ROUTER", to: "qError" },
    { from: "q4", symbol: "GATEWAY_OK", to: "q5" },
    { from: "q5", symbol: "RUTA_OK", to: "q6" },
    { from: "q5", symbol: "RUTA_NO_ENCONTRADA", to: "qError" },
    { from: "q5", symbol: "RUTA_DESTINO_INVALIDA", to: "qError" },
    { from: "q6", symbol: "DESTINO_ALCANZADO", to: "qFinal" }
  ]
};

export function buildProtocolAutomataDefinition(packet: PacketConfig, detectedProtocol: string, delivered: boolean): AutomataDefinition {
  const transitions: AutomataDefinitionTransition[] = [
    { from: "p0", symbol: "PRECHECK_FAILED", to: "pProtocolError" },
    { from: "p0", symbol: "FRAME_READY", to: "pL2" },
    { from: "pL2", symbol: "ARP_REQUEST_GATEWAY", to: "pArpWait" },
    { from: "pArpWait", symbol: "ARP_REPLY_GATEWAY", to: "pArpOk" },
    { from: "pArpWait", symbol: "ARP_TIMEOUT_GATEWAY", to: "pArpError" }
  ];
  const finalStates: string[] = [];
  const appState = `p${normalizeProtocolState(detectedProtocol)}`;

  if (packet.transport === "TCP") {
    transitions.push(
      { from: "pArpOk", symbol: "TCP_SYN", to: "pTcpSynSent" },
      { from: "pTcpSynSent", symbol: "TCP_SYN_ACK", to: "pTcpSynReceived" },
      { from: "pTcpSynSent", symbol: "TCP_TIMEOUT", to: "pTcpError" },
      { from: "pTcpSynReceived", symbol: "TCP_ACK", to: "pTcpEstablished" },
      { from: "pTcpEstablished", symbol: `APP_${normalizeProtocolState(detectedProtocol)}`, to: appState },
      { from: appState, symbol: "TCP_FIN", to: "pTcpFinWait" },
      { from: "pTcpFinWait", symbol: "TCP_FIN_ACK", to: "pTcpClosed" }
    );
    finalStates.push("pTcpClosed");
  } else if (packet.transport === "UDP" && detectedProtocol === "DNS") {
    transitions.push(
      { from: "pArpOk", symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx" },
      { from: "pUdpTx", symbol: "DNS_QUERY", to: "pDnsWait" },
      { from: "pDnsWait", symbol: "DNS_RESPONSE", to: "pDnsOk" },
      { from: "pDnsWait", symbol: "DNS_TIMEOUT", to: "pDnsError" }
    );
    finalStates.push("pDnsOk");
  } else if (packet.transport === "UDP" && detectedProtocol === "DHCP") {
    transitions.push(
      { from: "pArpOk", symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx" },
      { from: "pUdpTx", symbol: "DHCP_DISCOVER", to: "pDhcpSelecting" },
      { from: "pDhcpSelecting", symbol: "DHCP_OFFER", to: "pDhcpRequesting" },
      { from: "pDhcpSelecting", symbol: "DHCP_TIMEOUT", to: "pDhcpError" },
      { from: "pDhcpRequesting", symbol: "DHCP_REQUEST", to: "pDhcpBinding" },
      { from: "pDhcpBinding", symbol: "DHCP_ACK", to: "pDhcpBound" }
    );
    finalStates.push("pDhcpBound");
  } else if (packet.transport === "UDP") {
    transitions.push(
      { from: "pArpOk", symbol: "UDP_DATAGRAM_OUT", to: "pUdpTx" },
      {
        from: "pUdpTx",
        symbol: `APP_${normalizeProtocolState(detectedProtocol)}`,
        to: delivered ? appState : "pUdpError"
      }
    );
    if (delivered) {
      finalStates.push(appState);
    }
  } else {
    transitions.push(
      { from: "pArpOk", symbol: "ICMP_ECHO_REQUEST", to: "pIcmpWait" },
      { from: "pIcmpWait", symbol: "ICMP_ECHO_REPLY", to: "pIcmpOk" },
      { from: "pIcmpWait", symbol: "ICMP_DESTINATION_UNREACHABLE", to: "pIcmpError" },
      { from: "pIcmpWait", symbol: "ICMP_TIME_EXCEEDED", to: "pIcmpError" }
    );
    finalStates.push("pIcmpOk");
  }

  return {
    id: `protocol-af-${packet.transport.toLowerCase()}`,
    name: `AF de protocolo ${detectedProtocol}`,
    states: collectStates(transitions),
    alphabet: collectAlphabet(transitions),
    initialState: "p0",
    finalStates,
    transitions
  };
}

function collectStates(transitions: AutomataDefinitionTransition[]): string[] {
  const states: string[] = [];
  transitions.forEach((transition) => {
    appendUnique(states, transition.from);
    appendUnique(states, transition.to);
  });
  return states;
}

function collectAlphabet(transitions: AutomataDefinitionTransition[]): string[] {
  const alphabet: string[] = [];
  transitions.forEach((transition) => appendUnique(alphabet, transition.symbol));
  return alphabet;
}

function appendUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function normalizeProtocolState(protocol: string): string {
  const normalized = protocol
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "UNKNOWN_PROTOCOL";
}
