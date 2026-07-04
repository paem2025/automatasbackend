# Simulador de Automatas de Red - Backend

Backend de simulacion para el Simulador de Automatas de Red. Recibe una configuracion de red,
valida el recorrido de un paquete y devuelve una respuesta educativa con pasos,
resultado, automatas finitos y trazas.

## Requisitos previos

- Node.js 20.19 o superior. Tambien sirve Node.js 22.12 o superior.
- npm.
- No requiere base de datos.

## Tecnologias

- Node.js
- TypeScript
- Express
- CORS
- Dotenv
- Vitest

## Puertos

- Backend: `http://localhost:8080`
- Frontend permitido por CORS: `http://localhost:3000`

## Instalacion desde cero

```bash
npm install
```

Crear el archivo de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell tambien se puede usar:

```powershell
Copy-Item .env.example .env
```

Variables disponibles:

```env
PORT=8080
CORS_ORIGIN=http://localhost:3000
```

El backend no guarda historial ni requiere persistencia. Cada simulacion se
calcula en memoria y la respuesta se devuelve en el momento.

## Ejecucion

Modo desarrollo:

```bash
npm run dev
```

Produccion local:

```bash
npm run build
npm start
```

El servidor debe quedar disponible en:

```text
http://localhost:8080
```

## Levantar el proyecto completo

1. Abrir una terminal en `automatasbackend`.
2. Ejecutar `npm install`.
3. Crear `.env` desde `.env.example`.
4. Ejecutar `npm run dev`.
5. En otra terminal, levantar el frontend desde la carpeta `automatasfrontend`.

El backend debe estar corriendo antes de simular desde el frontend, salvo que el
frontend este en modo mock.

## Scripts

- `npm run dev`: levanta el servidor en modo desarrollo.
- `npm run build`: compila TypeScript en `dist/`.
- `npm start`: ejecuta el build compilado.
- `npm test`: ejecuta pruebas unitarias.
- `npm run test:watch`: ejecuta pruebas en modo watch.

## Endpoints

### `GET /api/health`

Verifica estado del servicio.

Respuesta ejemplo:

```json
{
  "ok": true,
  "service": "simulador-automatas-red-backend",
  "timestamp": "2026-06-08T18:19:27.127Z"
}
```

### `POST /api/simulate`

Ejecuta la simulacion del paquete.

Request:

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

Campos principales de respuesta:

- `delivered`: indica si el paquete fue entregado.
- `resultLabel`: texto resumen del resultado.
- `reachedPath`: dispositivos alcanzados.
- `fullPath`: camino esperado completo.
- `detectedProtocol`: protocolo detectado por transporte/puerto.
- `reason`: explicacion del resultado.
- `steps`: pasos pedagogicos de la simulacion.
- `networkAutomata`: definicion formal del automata de red.
- `networkAutomataTrace`: recorrido ejecutado por el automata de red.
- `protocolAutomata`: definicion formal del automata de protocolo.
- `protocolAutomataTrace`: recorrido ejecutado por el automata de protocolo.

## Prueba rapida

Con el backend levantado:

```bash
curl http://localhost:8080/api/health
```

Ejemplo de simulacion:

```bash
curl -X POST http://localhost:8080/api/simulate \
  -H "Content-Type: application/json" \
  -d "{\"pc1\":{\"ip\":\"192.168.1.10\",\"mask\":\"255.255.255.0\",\"gateway\":\"192.168.1.1\"},\"pc2\":{\"ip\":\"10.0.0.20\",\"mask\":\"255.255.255.0\",\"gateway\":\"10.0.0.1\"},\"router\":{\"eth0\":{\"ip\":\"192.168.1.1\",\"mask\":\"255.255.255.0\"},\"eth1\":{\"ip\":\"10.0.0.1\",\"mask\":\"255.255.255.0\"}},\"packet\":{\"transport\":\"TCP\",\"destinationPort\":\"443\"}}"
```

## Como funciona la simulacion

El backend modela dos automatas finitos deterministas.

### 1. Automata de red

Valida si el paquete puede atravesar la topologia:

```text
Inicio red
  -> IP origen
  -> Chequeo red
  -> Mascara valida
  -> Otra red
  -> Puerta enlace
  -> Ruta valida
  -> Entregado
```

Puede terminar en `Rechazo red` si falla una validacion:

- IP de origen invalida.
- IP de destino invalida.
- Mascara invalida.
- Router con IP invalida.
- Origen y destino en la misma red cuando se espera enrutamiento.
- Gateway invalido, fuera de red o que no coincide con el router.
- Ruta inexistente o destino invalido.

### 2. Automata de protocolo

Se ejecuta segun el paquete configurado:

- TCP: ARP, SYN, SYN-ACK, ACK, aplicacion y cierre.
- UDP DNS: datagrama, consulta y respuesta DNS.
- UDP DHCP: discover, offer, request y ack.
- UDP generico: datagrama y aplicacion detectada.
- ICMP: echo request y echo reply, o error ICMP.

Si el automata de red falla en una etapa previa, el automata de protocolo queda
en error previo o se corta donde corresponda.

## Verificacion

```bash
npm test
npm run build
npm audit --audit-level=moderate
```

Estado verificado:

- Tests: 17 OK.
- Build TypeScript: OK.
- Audit NPM: 0 vulnerabilidades moderadas o superiores.

## Archivos para Git

Subir al repositorio:

- `src/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.env.example`
- `.gitignore`
- `README.md`

No subir:

- `node_modules/`
- `dist/`
- `.env`
- archivos `*.log`
