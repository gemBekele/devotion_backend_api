import { Router } from "express";
import {
  createPrayerRequest,
  getPrayerRequests,
  getPrayerRequestById,
  updatePrayerRequest,
  deletePrayerRequest,
  prayForRequest,
  getMyPrayerRequests,
  authenticateToken,
} from "../controller/prayerRequest.controller.js";

const router = Router();

// Public routes
router.get("", getPrayerRequests); // Get all prayer requests (no auth required for reading)

// Protected routes (require authentication) - specific routes before parameterized ones
router.get("/user/my-requests", authenticateToken, getMyPrayerRequests); // Get user's own prayer requests
router.post("", authenticateToken, createPrayerRequest); // Create prayer request
router.post("/:id/pray", authenticateToken, prayForRequest); // Pray for a request

// Public route for specific prayer request (no auth required for reading)
router.get("/:id", getPrayerRequestById); // Get specific prayer request

// Protected routes for modifying specific prayer requests
router.put("/:id", authenticateToken, updatePrayerRequest); // Update prayer request (owner only)
router.delete("/:id", authenticateToken, deletePrayerRequest); // Delete prayer request (owner only)

export const prayerRequestRoutes = router;
