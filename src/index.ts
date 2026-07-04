import "dotenv/config";
import cors from "cors";
import express from "express";
import { getSimulationHistoryStorageStatus, initializeSimulationHistoryStorage } from "./db/simulationHistory.js";
import simulateRoute from "./routes/simulateRoute.js";

const app = express();

const port = Number(process.env.PORT ?? 8080);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: getSimulationHistoryStorageStatus(),
    service: "simulador-automatas-red-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", simulateRoute);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Error interno del servidor.";
  res.status(500).json({ message });
});

app.listen(port, () => {
  // Keep startup log explicit so students can identify service state quickly.
  console.log(`Simulador de Automatas de Red backend escuchando en http://localhost:${port}`);
  void initializeSimulationHistoryStorage();
});
