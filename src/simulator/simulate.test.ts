import { describe, expect, it } from "vitest";
import { simulate } from "./simulate.js";
import { SimulationRequest } from "./types.js";

const baseRequest: SimulationRequest = {
  pc1: { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" },
  pc2: { ip: "10.0.0.20", mask: "255.255.255.0", gateway: "10.0.0.1" },
  router: {
    eth0: { ip: "192.168.1.1", mask: "255.255.255.0" },
    eth1: { ip: "10.0.0.1", mask: "255.255.255.0" }
  },
  packet: { transport: "TCP", destinationPort: "443" }
};

describe("simulate", () => {
  it("entrega paquete correctamente en escenario valido", () => {
    const result = simulate(baseRequest);

    expect(result.delivered).toBe(true);
    expect(result.resultLabel).toBe("Paquete entregado correctamente");
    expect(result.reachedPath).toEqual(["PC1", "Switch1", "Router1", "Switch2", "PC2"]);
    expect(result.detectedProtocol).toBe("HTTPS");
    expect(result.networkAutomataTrace.at(-1)?.symbol).toBe("DESTINO_ALCANZADO");
  });

  it("falla cuando gateway de PC1 queda fuera de red", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      pc1: {
        ...baseRequest.pc1,
        gateway: "192.168.2.1"
      }
    };

    const result = simulate(request);
    expect(result.delivered).toBe(false);
    expect(result.reason).toContain("gateway de PC1");
    expect(result.networkAutomataTrace.at(-1)?.symbol).toBe("GATEWAY_FUERA_DE_RED");
    expect(result.reachedPath).toEqual(["PC1"]);
  });

  it("falla cuando origen y destino quedan en misma red", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      pc2: {
        ip: "192.168.1.25",
        mask: "255.255.255.0",
        gateway: "192.168.1.1"
      },
      router: {
        eth0: { ip: "192.168.1.1", mask: "255.255.255.0" },
        eth1: { ip: "192.168.1.2", mask: "255.255.255.0" }
      }
    };

    const result = simulate(request);
    expect(result.delivered).toBe(false);
    expect(result.networkAutomataTrace.at(-1)?.symbol).toBe("MISMA_RED");
  });

  it("detecta protocolo DNS para UDP puerto 53", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      packet: { transport: "UDP", destinationPort: "53" }
    };

    const result = simulate(request);
    expect(result.detectedProtocol).toBe("DNS");
    expect(result.protocolAutomataTrace.at(-1)?.symbol).toBe("PUERTO_53");
  });

  it("detecta ICMP y traza de protocolo de un solo paso", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      packet: { transport: "ICMP", destinationPort: "" }
    };

    const result = simulate(request);
    expect(result.delivered).toBe(true);
    expect(result.detectedProtocol).toBe("ICMP");
    expect(result.protocolAutomataTrace).toEqual([
      { from: "p0", symbol: "ICMP", to: "pICMP", status: "ok" }
    ]);
  });

  it("detecta FTP para TCP puerto 21", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      packet: { transport: "TCP", destinationPort: "21" }
    };

    const result = simulate(request);
    expect(result.detectedProtocol).toBe("FTP");
    expect(result.protocolAutomataTrace.at(-1)?.to).toBe("pFTP");
  });

  it("detecta TFTP para UDP puerto 69", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      packet: { transport: "UDP", destinationPort: "69" }
    };

    const result = simulate(request);
    expect(result.detectedProtocol).toBe("TFTP");
    expect(result.protocolAutomataTrace.at(-1)?.to).toBe("pTFTP");
  });

  it("mantiene trazabilidad para puerto desconocido", () => {
    const request: SimulationRequest = {
      ...baseRequest,
      packet: { transport: "TCP", destinationPort: "9999" }
    };

    const result = simulate(request);
    expect(result.detectedProtocol).toBe("TCP puerto 9999");
    expect(result.protocolAutomataTrace.at(-1)?.to).toBe("pTCP_PUERTO_9999");
  });
});
