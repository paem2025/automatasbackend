import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const validRequest = {
  pc1: { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" },
  pc2: { ip: "10.0.0.20", mask: "255.255.255.0", gateway: "10.0.0.1" },
  router: {
    eth0: { ip: "192.168.1.1", mask: "255.255.255.0" },
    eth1: { ip: "10.0.0.1", mask: "255.255.255.0" }
  },
  packet: { transport: "TCP", destinationPort: "443" }
};

describe("API HTTP", () => {
  it("informa el estado del servicio", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      service: "simulador-automatas-red-backend"
    });
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it("simula una solicitud valida por HTTP", async () => {
    const response = await request(createApp()).post("/api/simulate").send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      delivered: true,
      detectedProtocol: "HTTPS"
    });
  });

  it("responde 400 sin filtrar detalles cuando el JSON es invalido", async () => {
    const response = await request(createApp())
      .post("/api/simulate")
      .set("Content-Type", "application/json")
      .send('{"pc1":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Body JSON invalido." });
  });

  it("aplica el origen CORS configurado", async () => {
    const response = await request(createApp("https://frontend.example"))
      .options("/api/simulate")
      .set("Origin", "https://frontend.example")
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://frontend.example");
  });
});
