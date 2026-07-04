# Despliegue del backend en Coolify

Este repo se despliega como una app independiente con Dockerfile.

## Configuracion

- Build pack: Dockerfile
- Puerto interno: `8080`
- Base directory: raiz del repo `automatasbackend`

## Variables recomendadas

```env
PORT=8080
CORS_ORIGIN=https://URL-PUBLICA-DEL-FRONTEND
```

La base de datos no es necesaria para la simulacion. El backend procesa cada
request en memoria y devuelve la traza de automatas sin guardar historial.

## Prueba despues del deploy

Abrir:

```text
https://URL-DEL-BACKEND/api/health
```

Debe devolver JSON con:

```json
{
  "ok": true
}
```
