import express from "express";
import { authenticateToken } from "../controller/devotion.controller.js";
import {
  createCounselingRequest,
  getUserCounselingRequests,
  getAllCounselingRequests,
  updateCounselingRequestStatus,
} from "../controller/counseling.controller.js";

const router = express.Router();

// Create counseling request
router.post("/", authenticateToken, createCounselingRequest);

// Get user's counseling requests
router.get("/", authenticateToken, getUserCounselingRequests);

// Get all counseling requests (admin only)
router.get("/admin", authenticateToken, getAllCounselingRequests);

// Update counseling request status (admin only)
router.put("/:id", authenticateToken, updateCounselingRequestStatus);

export { router as counselingRoutes };
