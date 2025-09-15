// routers/auth.routes.ts
import { Router } from "express";
import { auth } from "../lib/auth.js";
import { authenticateToken, getCurrentUser } from "../controller/devotion.controller.js";

const router = Router();

// console.log("auth.emailAndPassword:", auth.emailAndPassword);

// console.dir(auth, { depth: null });

// Signup - TODO: Fix Better Auth API usage
router.post("/signup", async (req, res) => {
  try {
    // const { name, email, password } = req.body;
    // Better Auth API has changed - need to use auth.api.signUp
    res.status(501).json({ error: "Signup temporarily disabled - Better Auth API needs updating" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login - TODO: Fix Better Auth API usage
router.post("/login", async (req, res) => {
  try {
    // const { email, password } = req.body;
    // Better Auth API has changed - need to use auth.api.signIn
    res.status(501).json({ error: "Login temporarily disabled - Better Auth API needs updating" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get current user profile
router.get("/me", authenticateToken, getCurrentUser);

// export default router;
export const authRoutes = router;
