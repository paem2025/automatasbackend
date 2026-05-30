import { Router } from "express";
import { simulate } from "../simulator/simulate.js";
import { validateSimulationRequest } from "../simulator/validateRequest.js";

const router = Router();

router.post("/simulate", (req, res) => {
  const validation = validateSimulationRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json({
      message: validation.error
    });
  }

  const simulation = simulate(validation.value);
  return res.json(simulation);
});

export default router;
