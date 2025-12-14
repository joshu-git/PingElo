import { Router } from "express";
import { dryRunBootstrapEloSystem, bootstrapEloSystem, deleteMatch, moveMatch, recalculateFromMatch } from "../services/admin.services.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

//Route for dry running the bootstrap
router.post("/dry-run/bootstrap", requireAdmin, async (_req, res) => {
  const result = await dryRunBootstrapEloSystem();
  
  //Returns the results of the dry run
  res.json(result);
});

//Route for actually running the bootstrap
router.post("/bootstrap", requireAdmin, async (_req, res) => {
  await bootstrapEloSystem();

  //Returns complete message
  res.json({ message: "Bootstrap complete" });
});

//Route for deleting a specified match
router.delete("/match/:id/delete", requireAdmin, async (req, res) => {
  const { id } = req.params;

  //Checks the match ID was sent
  if (!id) {
    return res.status(400).json({ error: "Match ID required" });
  }

  //Calls the service then confirms
  await deleteMatch(id);
  res.json({ message: "Match deleted" });
});

//Route for moving a match
router.post("/match/:id/move", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { newMatchNumber } = req.body;

  //Checks parameters to see if they are valid
  if (!id || typeof newMatchNumber !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }

  //Calls the service then confirms
  await moveMatch(id, newMatchNumber);
  res.json({ message: "Match moved" });
});

//Route for recalculating from n, mainly used by other services
router.post("/recalculate", requireAdmin, async (req, res) => {
  const from = Number(req.body.from ?? 1);

  //Checks that the number is a valid
  if (!Number.isInteger(from) || from < 1) {
    return res.status(400).json({ error: "Invalid match number" });
  }

  //Calls the service then confirms
  await recalculateFromMatch(from);
  res.json({ message: "Recalculated" });
});

export default router;