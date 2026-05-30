import { describe, expect, it } from "vitest";
import { validateSimulationRequest } from "./validateRequest.js";

const validBody = {
  pc1: { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" },
  pc2: { ip: "10.0.0.20", mask: "255.255.255.0", gateway: "10.0.0.1" },
  router: {
    eth0: { ip: "192.168.1.1", mask: "255.255.255.0" },
    eth1: { ip: "10.0.0.1", mask: "255.255.255.0" }
  },
  packet: { transport: "TCP", destinationPort: "443" }
};

describe("validateSimulationRequest", () => {
  it("acepta body valido", () => {
    const result = validateSimulationRequest(validBody);
    expect(result.ok).toBe(true);
  });

  it("rechaza puerto fuera de rango", () => {
    const invalid = {
      ...validBody,
      packet: {
        transport: "TCP",
        destinationPort: "70000"
      }
    };

    const result = validateSimulationRequest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("rango");
    }
  });

  it("acepta ICMP sin puerto", () => {
    const icmpBody = {
      ...validBody,
      packet: {
        transport: "ICMP",
        destinationPort: ""
      }
    };

    const result = validateSimulationRequest(icmpBody);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.packet.destinationPort).toBe("");
    }
  });
});
