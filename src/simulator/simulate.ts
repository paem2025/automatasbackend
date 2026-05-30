import { detectProtocol, protocolAutomataTrace } from "./protocol.js";
import { parseIpv4, parseMask, sameNetwork } from "./networkUtils.js";
import {
  AutomataTransition,
  PacketConfig,
  SimulationRequest,
  SimulationResponse,
  SimulationStep
} from "./types.js";

const FULL_PATH = ["PC1", "Switch1", "Router1", "Switch2", "PC2"];

interface FailureResult {
  reason: string;
  reachedPath: string[];
  steps: SimulationStep[];
  transitions: AutomataTransition[];
}

export function simulate(request: SimulationRequest): SimulationResponse {
  const protocol = detectProtocol(request.packet);

  const steps: SimulationStep[] = [];
  const transitions: AutomataTransition[] = [];

  const pc1Ip = parseIpv4(request.pc1.ip);
  if (!pc1Ip.ok || !pc1Ip.value) {
    return failure({
      reason: "IP de PC1 invalida.",
      reachedPath: ["PC1"],
      steps: [
        {
          description: "1. PC1 valida su direccion IP de origen.",
          status: "error"
        }
      ],
      transitions: [{ from: "q0", symbol: "IP_ORIGEN_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "1. PC1 valida su direccion IP de origen.", status: "ok" });
  transitions.push({ from: "q0", symbol: "IP_ORIGEN_OK", to: "q1", status: "ok" });

  const pc2Ip = parseIpv4(request.pc2.ip);
  if (!pc2Ip.ok || !pc2Ip.value) {
    return failure({
      reason: "IP de PC2 invalida.",
      reachedPath: ["PC1"],
      steps: [...steps, { description: "2. PC1 valida direccion de destino.", status: "error" }],
      transitions: [...transitions, { from: "q1", symbol: "IP_DESTINO_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "2. PC1 valida direccion de destino.", status: "ok" });
  transitions.push({ from: "q1", symbol: "IP_DESTINO_OK", to: "q2", status: "ok" });

  const pc1Mask = parseMask(request.pc1.mask);
  const pc2Mask = parseMask(request.pc2.mask);
  const eth0Mask = parseMask(request.router.eth0.mask);
  const eth1Mask = parseMask(request.router.eth1.mask);
  if (!pc1Mask.ok || !pc1Mask.value || !pc2Mask.ok || !pc2Mask.value || !eth0Mask.ok || !eth0Mask.value || !eth1Mask.ok || !eth1Mask.value) {
    return failure({
      reason: "Al menos una mascara de red es invalida.",
      reachedPath: ["PC1"],
      steps: [...steps, { description: "3. Se validan mascaras de red.", status: "error" }],
      transitions: [...transitions, { from: "q2", symbol: "MASCARA_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "3. Se validan mascaras de red.", status: "ok" });
  transitions.push({ from: "q2", symbol: "MASCARA_OK", to: "q3", status: "ok" });

  const eth0Ip = parseIpv4(request.router.eth0.ip);
  const eth1Ip = parseIpv4(request.router.eth1.ip);
  if (!eth0Ip.ok || !eth0Ip.value || !eth1Ip.ok || !eth1Ip.value) {
    return failure({
      reason: "Una interfaz del router tiene IP invalida.",
      reachedPath: ["PC1", "Switch1"],
      steps: [...steps, { description: "4. Se valida la configuracion del router.", status: "error" }],
      transitions: [...transitions, { from: "q3", symbol: "ROUTER_IP_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  const differentNetwork = !sameNetwork(pc1Ip.value, pc2Ip.value, pc1Mask.value);
  if (!differentNetwork) {
    return failure({
      reason: "PC1 y PC2 quedaron en la misma red logica; esta topologia requiere redes distintas para enrutar.",
      reachedPath: ["PC1"],
      steps: [...steps, { description: "4. PC1 evalua si PC2 esta en otra red.", status: "error" }],
      transitions: [...transitions, { from: "q3", symbol: "MISMA_RED", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "4. PC1 detecta que PC2 esta en otra red.", status: "ok" });
  transitions.push({ from: "q3", symbol: "DISTINTA_RED", to: "q4", status: "ok" });

  const pc1GatewayIp = parseIpv4(request.pc1.gateway);
  if (!pc1GatewayIp.ok || !pc1GatewayIp.value) {
    return failure({
      reason: "Gateway de PC1 invalido.",
      reachedPath: ["PC1"],
      steps: [...steps, { description: "5. PC1 intenta enviar al gateway.", status: "error" }],
      transitions: [...transitions, { from: "q4", symbol: "GATEWAY_FORMATO_INVALIDO", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  if (!sameNetwork(pc1Ip.value, pc1GatewayIp.value, pc1Mask.value)) {
    return failure({
      reason: "El gateway de PC1 no pertenece a la misma red que PC1.",
      reachedPath: ["PC1"],
      steps: [...steps, { description: "5. PC1 intenta enviar al gateway.", status: "error" }],
      transitions: [...transitions, { from: "q4", symbol: "GATEWAY_FUERA_DE_RED", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  if (request.pc1.gateway !== request.router.eth0.ip) {
    return failure({
      reason: "El gateway de PC1 no coincide con la IP de Router1 en eth0.",
      reachedPath: ["PC1", "Switch1"],
      steps: [...steps, { description: "5. PC1 intenta enviar al gateway.", status: "error" }],
      transitions: [...transitions, { from: "q4", symbol: "GATEWAY_NO_CORRESPONDE_ROUTER", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "5. PC1 envia el paquete al gateway.", status: "ok" });
  transitions.push({ from: "q4", symbol: "GATEWAY_OK", to: "q5", status: "ok" });

  if (!sameNetwork(pc1Ip.value, eth0Ip.value, eth0Mask.value)) {
    return failure({
      reason: "Router1 eth0 no pertenece a la red de PC1.",
      reachedPath: ["PC1", "Switch1", "Router1"],
      steps: [...steps, { description: "6. Router1 busca una ruta hacia la red destino.", status: "error" }],
      transitions: [...transitions, { from: "q5", symbol: "RUTA_NO_ENCONTRADA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  if (!sameNetwork(pc2Ip.value, eth1Ip.value, eth1Mask.value)) {
    return failure({
      reason: "Router1 eth1 no pertenece a la red de PC2.",
      reachedPath: ["PC1", "Switch1", "Router1"],
      steps: [...steps, { description: "6. Router1 busca una ruta hacia la red destino.", status: "error" }],
      transitions: [...transitions, { from: "q5", symbol: "RUTA_NO_ENCONTRADA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  const pc2GatewayIp = parseIpv4(request.pc2.gateway);
  if (!pc2GatewayIp.ok || !pc2GatewayIp.value) {
    return failure({
      reason: "Gateway de PC2 invalido.",
      reachedPath: ["PC1", "Switch1", "Router1", "Switch2"],
      steps: [...steps, { description: "6. Router1 busca una ruta hacia la red destino.", status: "error" }],
      transitions: [...transitions, { from: "q5", symbol: "RUTA_DESTINO_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  if (!sameNetwork(pc2Ip.value, pc2GatewayIp.value, pc2Mask.value)) {
    return failure({
      reason: "El gateway de PC2 no pertenece a la red de PC2.",
      reachedPath: ["PC1", "Switch1", "Router1", "Switch2"],
      steps: [...steps, { description: "6. Router1 busca una ruta hacia la red destino.", status: "error" }],
      transitions: [...transitions, { from: "q5", symbol: "RUTA_DESTINO_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  if (request.pc2.gateway !== request.router.eth1.ip) {
    return failure({
      reason: "El gateway de PC2 no coincide con Router1 eth1.",
      reachedPath: ["PC1", "Switch1", "Router1", "Switch2"],
      steps: [...steps, { description: "6. Router1 busca una ruta hacia la red destino.", status: "error" }],
      transitions: [...transitions, { from: "q5", symbol: "RUTA_DESTINO_INVALIDA", to: "qError", status: "error" }]
    }, request.packet, protocol);
  }

  steps.push({ description: "6. Router1 reenvia el paquete hacia la red destino.", status: "ok" });
  transitions.push({ from: "q5", symbol: "RUTA_OK", to: "q6", status: "ok" });

  steps.push({ description: "7. PC2 recibe el paquete.", status: "ok" });
  transitions.push({ from: "q6", symbol: "DESTINO_ALCANZADO", to: "qFinal", status: "ok" });

  steps.push({ description: `8. Se detecta el protocolo ${protocol}.`, status: "ok" });

  return {
    delivered: true,
    resultLabel: "Paquete entregado correctamente",
    reachedPath: FULL_PATH,
    fullPath: FULL_PATH,
    detectedProtocol: protocol,
    reason: `Transporte ${request.packet.transport}${packetPortMessage(request.packet)} corresponde a ${protocol}.`,
    steps,
    networkAutomataTrace: transitions,
    protocolAutomataTrace: protocolAutomataTrace(request.packet, protocol, { delivered: true })
  };
}

function failure(
  failureResult: FailureResult,
  packet: PacketConfig,
  protocol: string
): SimulationResponse {
  return {
    delivered: false,
    resultLabel: "Paquete descartado",
    reachedPath: failureResult.reachedPath,
    fullPath: FULL_PATH,
    detectedProtocol: protocol,
    reason: failureResult.reason,
    steps: failureResult.steps,
    networkAutomataTrace: failureResult.transitions,
    protocolAutomataTrace: protocolAutomataTrace(packet, protocol, {
      delivered: false,
      failureReason: failureResult.reason
    })
  };
}

function packetPortMessage(packet: PacketConfig): string {
  if (packet.transport === "ICMP") {
    return "";
  }
  return ` y puerto ${packet.destinationPort || "desconocido"}`;
}
