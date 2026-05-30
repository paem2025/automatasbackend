export type TransportProtocol = "TCP" | "UDP" | "ICMP";

export interface PcConfig {
  ip: string;
  mask: string;
  gateway: string;
}

export interface RouterInterfaceConfig {
  ip: string;
  mask: string;
}

export interface RouterConfig {
  eth0: RouterInterfaceConfig;
  eth1: RouterInterfaceConfig;
}

export interface PacketConfig {
  transport: TransportProtocol;
  destinationPort: string;
}

export interface SimulationRequest {
  pc1: PcConfig;
  pc2: PcConfig;
  router: RouterConfig;
  packet: PacketConfig;
}

export type StepStatus = "ok" | "warn" | "error" | "info";

export interface SimulationStep {
  description: string;
  status: StepStatus;
}

export type AutomataTransitionStatus = "ok" | "error" | "neutral";

export interface AutomataTransition {
  from: string;
  symbol: string;
  to: string;
  status: AutomataTransitionStatus;
}

export interface SimulationResponse {
  delivered: boolean;
  resultLabel: string;
  reachedPath: string[];
  fullPath: string[];
  detectedProtocol: string;
  reason: string;
  steps: SimulationStep[];
  networkAutomataTrace: AutomataTransition[];
  protocolAutomataTrace: AutomataTransition[];
}

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
