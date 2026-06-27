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

export interface AutomataDefinitionTransition {
  from: string;
  symbol: string;
  to: string;
}

export interface AutomataDefinition {
  id: string;
  name: string;
  states: string[];
  alphabet: string[];
  initialState: string;
  finalStates: string[];
  transitions: AutomataDefinitionTransition[];
}

export interface SimulationResponse {
  delivered: boolean;
  resultLabel: string;
  reachedPath: string[];
  fullPath: string[];
  detectedProtocol: string;
  reason: string;
  steps: SimulationStep[];
  networkAutomata: AutomataDefinition;
  networkAutomataTrace: AutomataTransition[];
  protocolAutomata: AutomataDefinition;
  protocolAutomataTrace: AutomataTransition[];
}

export type NetworkFailureCode =
  | "PC1_IP_INVALID"
  | "PC2_IP_INVALID"
  | "MASK_INVALID"
  | "ROUTER_IP_INVALID"
  | "SAME_NETWORK"
  | "PC1_GATEWAY_INVALID"
  | "PC1_GATEWAY_OUT_OF_NETWORK"
  | "PC1_GATEWAY_NOT_ROUTER"
  | "ROUTER_ETH0_NOT_IN_PC1_NETWORK"
  | "ROUTER_ETH1_NOT_IN_PC2_NETWORK"
  | "PC2_GATEWAY_INVALID"
  | "PC2_GATEWAY_OUT_OF_NETWORK"
  | "PC2_GATEWAY_NOT_ROUTER";

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
