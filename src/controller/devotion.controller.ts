import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import { auth } from "../lib/auth.js"; // Import your Better Auth instance

// Middleware to validate token and attach session/user
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("🔐 Authenticating request...");
    console.log("   Method:", req.method);
    console.log("   URL:", req.url);
    console.log("   Headers:", {
      authorization: req.headers.authorization ? req.headers.authorization.substring(0, 30) + "..." : "None",
      cookie: req.headers.cookie ? req.headers.cookie.substring(0, 50) + "..." : "None"
    });

    // Get the session token from cookie (Better Auth stores it in cookies)
    const sessionToken = req.cookies?.devetionmobile_session || 
                        req.headers.authorization?.split(" ")[1];

    if (!sessionToken) {
      console.log("   ❌ No session token found");
      res.status(401).json({ error: "No token provided" });
      return;
    }

    console.log("   Session token:", sessionToken.substring(0, 20) + "...");

    // Query the database directly for the session
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!session) {
      console.log("   ❌ Session not found in database");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      console.log("   ❌ Session expired");
      res.status(401).json({ error: "Session expired" });
      return;
    }

    console.log("   ✅ Valid session for user:", session.user.email);
    req.user = session.user; // Attach user to request object
    req.session = session; // Attach session data if needed
    next();
  } catch (error: any) {
    console.error("   ❌ Token validation error:", error);
    res
      .status(500)
      .json({ error: "Failed to validate token", details: error.message });
    return;
  }
}

// Middleware to check if user is admin
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get user with role from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({ 
        error: "Admin access required. Only admin users can create devotions." 
      });
      return;
    }

    req.user = { ...req.user, role: user.role }; // Attach role to user object
    next();
  } catch (error: any) {
    console.error("Admin check error:", error);
    res
      .status(500)
      .json({ error: "Failed to verify admin status", details: error.message });
    return;
  }
}

// Create a devotion using validated token
export async function createDevotion(req: Request, res: Response) {
  try {
    if (!req.body) {
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    const {
      title,
      content,
      verse_reference,
      scriptureText,
      devotion_date,
      readTime,
    } = req.body;
    const userId = req.user?.id; // Extract userId from validated session
    const author = req.user?.name || "Anonymous"; // Use authenticated user's name

    if (!title || !content || !devotion_date || !userId || !readTime) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Handle image upload if file is provided
    let imageUrl: string | undefined;

    // Parse and validate date in UTC format
    const parsedDate = new Date(devotion_date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    const parsedCreatedAt = Date.now();
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    const devotion = await prisma.devotion.create({
      data: {
        title,
        content,
        verse_reference,
        scriptureText,
        created_at: parsedDate,
        devotion_date: parsedDate, // Store date in UTC
        imageUrl,
        readTime,
        author,

        user: {
          connect: { id: userId },
        },
      },
    });

    res.status(201).json(devotion);
    return;
  } catch (error: any) {
    console.error("Error creating devotion:", error);
    res
      .status(500)
      .json({ error: "Failed to create devotion", details: error.message });
    return;
  }
}
// Get devotions with a search parameter across title, verse_reference, user.name, and content
export async function getDevotions(req: Request, res: Response) {
  try {
    const { search } = req.query;

    // Build the where clause dynamically based on the search parameter
    const where: any = {};

    if (search && typeof search === "string") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { verse_reference: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const devotions = await prisma.devotion.findMany({
      where,
      orderBy: {
        devotion_date: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Return empty array instead of 404 for better client handling
    res.json(devotions);
    return;
  } catch (error: any) {
    console.error("Error fetching devotions:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch devotions", details: error.message });
    return;
  }
}

// Get devotions by exact date match
export async function getDevotionsByDate(req: Request, res: Response) {
  try {
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      res.status(400).json({ error: "Missing or invalid date" });
      return;
    }

    const devotions = await prisma.devotion.findMany({
      where: {
        devotion_date: new Date(date),
      },
      orderBy: {
        devotion_date: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Return empty array instead of 404 for better client handling
    res.json(devotions);
    return;
  } catch (error: any) {
    console.error("Error fetching devotions by date:", error);
    res.status(500).json({
      error: "Failed to fetch devotions by date",
      details: error.message,
    });
    return;
  }
}

// Get devotion by ID using URL pattern /api/devotions/:id
export async function getDevotionById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Missing devotion ID" });
      return;
    }

    const devotion = await prisma.devotion.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!devotion) {
      res.status(404).json({ error: "Devotion not found" });
      return;
    }

    res.json(devotion);
    return;
  } catch (error: any) {
    console.error("Error fetching devotion by ID:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch devotion", details: error.message });
    return;
  }
}

// Get current user profile with role
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
    return;
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch user profile", details: error.message });
    return;
  }
}
