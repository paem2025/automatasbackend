import { AutomataTransition, PacketConfig } from "./types.js";

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

export function protocolAutomataTrace(packet: PacketConfig, detectedProtocol: string): AutomataTransition[] {
  if (packet.transport === "ICMP") {
    return [{ from: "p0", symbol: "ICMP", to: "pICMP", status: "ok" }];
  }

  return [
    { from: "p0", symbol: packet.transport, to: "p1", status: "ok" },
    {
      from: "p1",
      symbol: `PUERTO_${packet.destinationPort || "SIN_DATO"}`,
      to: `p${detectedProtocol.toUpperCase().replaceAll(" ", "_")}`,
      status: "ok"
    }
  ];
}
