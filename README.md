# RouteSim Automata Backend

Backend de simulacion para la app RouteSim Automata.

## Puerto esperado

- Backend: `http://localhost:8080`
- Frontend consumidor: `http://localhost:3000`

## Ejecutar en desarrollo

1. `npm install`
2. Copiar `.env.example` a `.env` (opcional)
3. `npm run dev`

## Variables de entorno

- `PORT` (default `8080`)
- `CORS_ORIGIN` (default `http://localhost:3000`)

## Scripts

- `npm run dev`: servidor en modo desarrollo
- `npm run build`: compilacion TypeScript
- `npm start`: ejecutar build compilado
- `npm test`: pruebas unitarias
- `npm run test:watch`: pruebas en watch mode

## Endpoints

- `GET /api/health`
- `POST /api/simulate`

## Request de `POST /api/simulate`

```json
{
  "pc1": { "ip": "192.168.1.10", "mask": "255.255.255.0", "gateway": "192.168.1.1" },
  "pc2": { "ip": "10.0.0.20", "mask": "255.255.255.0", "gateway": "10.0.0.1" },
  "router": {
    "eth0": { "ip": "192.168.1.1", "mask": "255.255.255.0" },
    "eth1": { "ip": "10.0.0.1", "mask": "255.255.255.0" }
  },
  "packet": { "transport": "TCP", "destinationPort": "443" }
}
```

## Respuesta

- estado de entrega (`delivered`, `resultLabel`)
- camino (`reachedPath`, `fullPath`)
- protocolo detectado (`detectedProtocol`)
- motivo (`reason`)
- pasos explicados (`steps`)
- traza de automata de red y protocolo (`networkAutomataTrace`, `protocolAutomataTrace`)
