import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";

// Middleware to validate token and attach session/user (reused from other controllers)
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("🔐 Authenticating admin request...");
    console.log("   Method:", req.method);
    console.log("   URL:", req.url);

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
      .json({ error: "Authentication failed", details: error.message });
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
        error: "Admin access required. Only admin users can manage other users." 
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

// Get all users (admin only)
export async function getAllUsers(req: Request, res: Response) {
  try {
    console.log("📋 Admin fetching all users...");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            devotions: true,
            prayerRequests: true,
            prayers: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Admins first
        { createdAt: 'desc' } // Then by newest
      ]
    });

    console.log(`   ✅ Found ${users.length} users`);

    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error: any) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ 
      error: "Failed to fetch users", 
      details: error.message 
    });
  }
}

// Promote user to admin
export async function promoteToAdmin(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    console.log(`👑 Admin promoting user ${userId} to admin...`);

    // Validate that the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (targetUser.role === "admin") {
      res.status(400).json({ 
        error: "User is already an admin",
        user: targetUser
      });
      return;
    }

    // Update user role to admin
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`   ✅ User ${updatedUser.email} promoted to admin`);

    res.json({
      success: true,
      message: `User ${updatedUser.name} (${updatedUser.email}) has been promoted to admin`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error("❌ Error promoting user to admin:", error);
    res.status(500).json({ 
      error: "Failed to promote user to admin", 
      details: error.message 
    });
  }
}

// Demote admin to regular user
export async function demoteFromAdmin(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    console.log(`👤 Admin demoting user ${userId} from admin...`);

    // Validate that the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (targetUser.role !== "admin") {
      res.status(400).json({ 
        error: "User is not an admin",
        user: targetUser
      });
      return;
    }

    // Prevent self-demotion
    if (targetUser.id === req.user.id) {
      res.status(400).json({ 
        error: "You cannot demote yourself from admin. Another admin must do this." 
      });
      return;
    }

    // Update user role to regular user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: "user" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`   ✅ User ${updatedUser.email} demoted from admin`);

    res.json({
      success: true,
      message: `User ${updatedUser.name} (${updatedUser.email}) has been demoted from admin`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error("❌ Error demoting user from admin:", error);
    res.status(500).json({ 
      error: "Failed to demote user from admin", 
      details: error.message 
    });
  }
}

// Get admin statistics
export async function getAdminStats(req: Request, res: Response) {
  try {
    console.log("📊 Admin fetching statistics...");

    const [
      totalUsers,
      totalAdmins,
      totalDevotions,
      totalPrayerRequests,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.devotion.count(),
      prisma.prayerRequest.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalUsers - totalAdmins
      },
      content: {
        devotions: totalDevotions,
        prayerRequests: totalPrayerRequests
      },
      recentUsers
    };

    console.log("   ✅ Statistics compiled");

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error("❌ Error fetching admin statistics:", error);
    res.status(500).json({ 
      error: "Failed to fetch statistics", 
      details: error.message 
    });
  }
}

// Search users by email or name
export async function searchUsers(req: Request, res: Response) {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: "Search query is required" });
      return;
    }

    console.log(`🔍 Admin searching users with query: "${query}"`);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            devotions: true,
            prayerRequests: true,
            prayers: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Admins first
        { createdAt: 'desc' }
      ],
      take: 50 // Limit results
    });

    console.log(`   ✅ Found ${users.length} users matching query`);

    res.json({
      success: true,
      users,
      query,
      total: users.length
    });
  } catch (error: any) {
    console.error("❌ Error searching users:", error);
    res.status(500).json({ 
      error: "Failed to search users", 
      details: error.message 
    });
  }
}
