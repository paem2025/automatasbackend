import { PacketConfig, PcConfig, RouterConfig, SimulationRequest, TransportProtocol } from "./types.js";

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  error: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateSimulationRequest(body: unknown): ValidationResult<SimulationRequest> {
  if (!isRecord(body)) {
    return { ok: false, error: "Body JSON invalido." };
  }

  const pc1 = parsePcConfig(body.pc1, "pc1");
  if (!pc1.ok) {
    return pc1;
  }

  const pc2 = parsePcConfig(body.pc2, "pc2");
  if (!pc2.ok) {
    return pc2;
  }

  const router = parseRouterConfig(body.router);
  if (!router.ok) {
    return router;
  }

  const packet = parsePacketConfig(body.packet);
  if (!packet.ok) {
    return packet;
  }

  return {
    ok: true,
    value: {
      pc1: pc1.value,
      pc2: pc2.value,
      router: router.value,
      packet: packet.value
    }
  };
}

function parsePcConfig(value: unknown, fieldName: string): ValidationResult<PcConfig> {
  if (!isRecord(value)) {
    return { ok: false, error: `Falta ${fieldName} en el body.` };
  }

  const ip = asString(value.ip);
  const mask = asString(value.mask);
  const gateway = asString(value.gateway);

  if (!ip || !mask || !gateway) {
    return { ok: false, error: `Campos invalidos en ${fieldName}.` };
  }

  return { ok: true, value: { ip, mask, gateway } };
}

function parseRouterConfig(value: unknown): ValidationResult<RouterConfig> {
  if (!isRecord(value)) {
    return { ok: false, error: "Falta router en el body." };
  }

  const eth0 = parseRouterInterface(value.eth0, "router.eth0");
  if (!eth0.ok) {
    return eth0;
  }

  const eth1 = parseRouterInterface(value.eth1, "router.eth1");
  if (!eth1.ok) {
    return eth1;
  }

  return { ok: true, value: { eth0: eth0.value, eth1: eth1.value } };
}

function parseRouterInterface(value: unknown, fieldName: string): ValidationResult<{ ip: string; mask: string }> {
  if (!isRecord(value)) {
    return { ok: false, error: `Falta ${fieldName} en el body.` };
  }

  const ip = asString(value.ip);
  const mask = asString(value.mask);
  if (!ip || !mask) {
    return { ok: false, error: `Campos invalidos en ${fieldName}.` };
  }

  return { ok: true, value: { ip, mask } };
}

function parsePacketConfig(value: unknown): ValidationResult<PacketConfig> {
  if (!isRecord(value)) {
    return { ok: false, error: "Falta packet en el body." };
  }

  const transportRaw = asString(value.transport)?.toUpperCase() as TransportProtocol | undefined;
  if (!transportRaw || !isTransport(transportRaw)) {
    return { ok: false, error: "Transporte invalido. Use TCP, UDP o ICMP." };
  }

  const destinationPort = asString(value.destinationPort) ?? "";
  if (transportRaw !== "ICMP") {
    if (!/^\d+$/.test(destinationPort)) {
      return { ok: false, error: "Puerto destino invalido." };
    }
    const portNumber = Number(destinationPort);
    if (!Number.isInteger(portNumber) || portNumber < 0 || portNumber > 65535) {
      return { ok: false, error: "Puerto destino fuera de rango (0-65535)." };
    }
  }

  return {
    ok: true,
    value: {
      transport: transportRaw,
      destinationPort: transportRaw === "ICMP" ? "" : destinationPort
    }
  };
}

function isTransport(value: string): value is TransportProtocol {
  return value === "TCP" || value === "UDP" || value === "ICMP";
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
