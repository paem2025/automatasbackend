import cors from "cors";
import express from "express";
import simulateRoute from "./routes/simulateRoute.js";

export function createApp(corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000") {
  const app = express();

  app.use(
    cors({
      origin: corsOrigin
    })
  );

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "simulador-automatas-red-backend",
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api", simulateRoute);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isMalformedJsonError(error)) {
      return res.status(400).json({ message: "Body JSON invalido." });
    }

    console.error("Error no controlado al procesar la solicitud:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  });

  return app;
}

function isMalformedJsonError(error: unknown): error is SyntaxError & { status: number } {
  if (!(error instanceof SyntaxError) || typeof error !== "object" || error === null) {
    return false;
  }

  return "status" in error && error.status === 400;
}
