import { Router } from "express";
import { listRecentSimulationHistory, saveSimulationHistory } from "../db/simulationHistory.js";
import { simulate } from "../simulator/simulate.js";
import { validateSimulationRequest } from "../simulator/validateRequest.js";

const router = Router();

router.post("/simulate", async (req, res, next) => {
  try {
    const validation = validateSimulationRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        message: validation.error
      });
    }

    const simulation = simulate(validation.value);
    await saveSimulationHistory(validation.value, simulation);
    return res.json(simulation);
  } catch (error) {
    return next(error);
  }
});

router.get("/simulations", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 20);
    const simulations = await listRecentSimulationHistory(Number.isFinite(limit) ? limit : 20);
    return res.json({
      simulations
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
