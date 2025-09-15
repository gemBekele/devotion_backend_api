import { Router } from "express";
import {
  authenticateToken,
  requireAdmin,
  getAllUsers,
  promoteToAdmin,
  demoteFromAdmin,
  getAdminStats,
  searchUsers
} from "../controller/admin.controller.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /admin/users - Get all users
router.get("/users", getAllUsers);

// GET /admin/users/search - Search users by name or email
router.get("/users/search", searchUsers);

// GET /admin/stats - Get admin statistics
router.get("/stats", getAdminStats);

// POST /admin/users/:userId/promote - Promote user to admin
router.post("/users/:userId/promote", promoteToAdmin);

// POST /admin/users/:userId/demote - Demote admin to user
router.post("/users/:userId/demote", demoteFromAdmin);

export default router;
