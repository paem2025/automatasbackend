import { ParseResult } from "./types.js";

export function parseIpv4(ip: string): ParseResult<number[]> {
  const trimmed = ip.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 4) {
    return { ok: false, error: `Direccion invalida: ${ip}` };
  }

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return { ok: false, error: `Direccion invalida: ${ip}` };
    }

    const value = Number(part);
    if (value < 0 || value > 255) {
      return { ok: false, error: `Direccion invalida: ${ip}` };
    }
    octets.push(value);
  }

  return { ok: true, value: octets };
}

export function parseMask(mask: string): ParseResult<number[]> {
  const ip = parseIpv4(mask);
  if (!ip.ok || !ip.value) {
    return { ok: false, error: `Mascara invalida: ${mask}` };
  }

  const bits = ip.value.map((octet) => octet.toString(2).padStart(8, "0")).join("");
  if (!/^1*0*$/.test(bits)) {
    return { ok: false, error: `Mascara invalida: ${mask}` };
  }

  if (bits === "00000000000000000000000000000000") {
    return { ok: false, error: `Mascara invalida: ${mask}` };
  }

  return { ok: true, value: ip.value };
}

export function toIpv4String(octets: number[]): string {
  return octets.join(".");
}

export function sameNetwork(ipA: number[], ipB: number[], mask: number[]): boolean {
  return ipA.every((octet, index) => (octet & mask[index]) === (ipB[index] & mask[index]));
}

export function isPrivateIpv4(ip: number[]): boolean {
  const [a, b] = ip;
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}
