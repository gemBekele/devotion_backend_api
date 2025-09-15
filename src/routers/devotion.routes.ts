import { Router } from "express";
import {
  createDevotion,
  getDevotions,
  getDevotionsByDate,
  getCurrentUser,
} from "../controller/devotion.controller.js";
import { getDevotionById } from "../controller/devotion.controller.js";
import { authenticateToken, requireAdmin } from "../controller/devotion.controller.js";

const router = Router();

// Admin-only route for creating devotions
router.post("", authenticateToken, requireAdmin, createDevotion);
// Public routes for reading devotions
router.get("", getDevotions);
router.get("/:id", getDevotionById);
router.get("/date", getDevotionsByDate);

// router.get("/:id", authenticateToken, (req, res) => {
//   console.log("✅ getDevotionById hit");
//   res.send("ok");
// });

// export default router;
export const devotionRoutes = router;
