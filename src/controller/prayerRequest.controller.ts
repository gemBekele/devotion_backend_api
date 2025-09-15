import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";

// Middleware to validate token and attach session/user
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("🔐 AUTHENTICATION CHECK");
    
    // Extract the session token from headers or cookies
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;
    
    let token = null;
    
    // Try to get token from Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log("   ✅ Token found in Authorization header");
    }
    
    // Try to get token from cookie if not found in header
    if (!token && cookieHeader) {
      const cookieMatch = cookieHeader.match(/devetionmobile_session=([^;]+)/);
      if (cookieMatch) {
        token = cookieMatch[1];
        console.log("   ✅ Token found in Cookie");
      }
    }
    
    if (!token) {
      console.log("   ❌ No authentication token found");
      res.status(401).json({ error: "No authentication token provided" });
      return;
    }
    
    console.log("   🔍 Validating session...");
    
    // Direct database lookup for the session token
    // This is more reliable than trying to use Better Auth's complex validation
    let session;
    try {
      const sessionRecord = await prisma.session.findUnique({
        where: { token },
        include: {
          user: true
        }
      });
      
      if (sessionRecord && sessionRecord.expiresAt > new Date()) {
        console.log("   ✅ Valid session found in database");
        session = {
          user: sessionRecord.user,
          session: sessionRecord
        };
      } else {
        console.log("   ❌ Session not found or expired");
      }
    } catch (error: any) {
      console.log("   ❌ Database error:", error.message);
    }
    
    if (!session) {
      console.log("   ❌ Session validation failed");
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    console.log("   ✅ Authentication successful");
    console.log(`   👤 User: ${session.user.name} (${session.user.email})`);
    
    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error: any) {
    console.error("   ❌ Authentication error:", error.message);
    res
      .status(500)
      .json({ error: "Authentication failed", details: error.message });
  }
}

// Create a prayer request
export async function createPrayerRequest(req: Request, res: Response) {
  try {
    if (!req.body) {
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    const { title, description, isAnonymous } = req.body;
    const userId = req.user?.id;

    if (!title || !description || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const prayerRequest = await prisma.prayerRequest.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        isAnonymous: Boolean(isAnonymous),
        user: {
          connect: { id: userId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prayers: true,
      },
    });

    res.status(201).json(prayerRequest);
    return;
  } catch (error: any) {
    console.error("Error creating prayer request:", error);
    res.status(500).json({
      error: "Failed to create prayer request",
      details: error.message,
    });
  }
}

// Get all prayer requests with search functionality
export async function getPrayerRequests(req: Request, res: Response) {
  try {
    const { search, status, limit = "20", offset = "0" } = req.query;

    // Build the where clause dynamically
    const where: any = {};

    if (search && typeof search === "string") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && typeof status === "string") {
      where.status = status;
    } else {
      // Only show active prayer requests by default
      where.status = "active";
    }

    const prayerRequests = await prisma.prayerRequest.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prayers: {
          select: {
            id: true,
            userId: true,
            created_at: true,
          },
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Update prayer count for each request (in case it's out of sync)
    const updatedPrayerRequests = prayerRequests.map((request: any) => ({
      ...request,
      prayerCount: request.prayers.length,
    }));

    res.json(updatedPrayerRequests);
    return;
  } catch (error: any) {
    console.error("Error fetching prayer requests:", error);
    res.status(500).json({
      error: "Failed to fetch prayer requests",
      details: error.message,
    });
  }
}

// Get prayer request by ID
export async function getPrayerRequestById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Missing prayer request ID" });
      return;
    }

    const prayerRequest = await prisma.prayerRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prayers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    if (!prayerRequest) {
      res.status(404).json({ error: "Prayer request not found" });
      return;
    }

    res.json({
      ...prayerRequest,
      prayerCount: prayerRequest.prayers.length,
    });
  } catch (error: any) {
    console.error("Error fetching prayer request by ID:", error);
    res.status(500).json({
      error: "Failed to fetch prayer request",
      details: error.message,
    });
  }
}

// Update prayer request (only by owner)
export async function updatePrayerRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({ error: "Missing prayer request ID" });
      return;
    }

    // Check if the prayer request exists and belongs to the user
    const existingRequest = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      res.status(404).json({ error: "Prayer request not found" });
      return;
    }

    if (existingRequest.userId !== userId) {
      res.status(403).json({ error: "Not authorized to update this prayer request" });
      return;
    }

    // Build update data
    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (status && ["active", "answered", "closed"].includes(status)) {
      updateData.status = status;
    }

    const updatedPrayerRequest = await prisma.prayerRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prayers: true,
      },
    });

    res.json({
      ...updatedPrayerRequest,
      prayerCount: updatedPrayerRequest.prayers.length,
    });
  } catch (error: any) {
    console.error("Error updating prayer request:", error);
    res.status(500).json({
      error: "Failed to update prayer request",
      details: error.message,
    });
  }
}

// Delete prayer request (only by owner)
export async function deletePrayerRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({ error: "Missing prayer request ID" });
      return;
    }

    // Check if the prayer request exists and belongs to the user
    const existingRequest = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      res.status(404).json({ error: "Prayer request not found" });
      return;
    }

    if (existingRequest.userId !== userId) {
      res.status(403).json({ error: "Not authorized to delete this prayer request" });
      return;
    }

    await prisma.prayerRequest.delete({
      where: { id },
    });

    res.json({ message: "Prayer request deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting prayer request:", error);
    res.status(500).json({
      error: "Failed to delete prayer request",
      details: error.message,
    });
  }
}

// Pray for a prayer request (add a prayer)
export async function prayForRequest(req: Request, res: Response) {
  try {
    const { id } = req.params; // Prayer request ID
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({ error: "Missing prayer request ID" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Check if prayer request exists
    const prayerRequest = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!prayerRequest) {
      res.status(404).json({ error: "Prayer request not found" });
      return;
    }

    if (prayerRequest.status !== "active") {
      res.status(400).json({ error: "Cannot pray for inactive prayer requests" });
      return;
    }

    // Check if user has already prayed for this request
    const existingPrayer = await prisma.prayer.findUnique({
      where: {
        userId_prayerRequestId: {
          userId,
          prayerRequestId: id,
        },
      },
    });

    if (existingPrayer) {
      res.status(400).json({ error: "You have already prayed for this request" });
      return;
    }

    // Create the prayer and update prayer count
    const [prayer, updatedPrayerRequest] = await prisma.$transaction([
      prisma.prayer.create({
        data: {
          userId,
          prayerRequestId: id,
        },
      }),
      prisma.prayerRequest.update({
        where: { id },
        data: {
          prayerCount: {
            increment: 1,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          prayers: {
            select: {
              id: true,
              userId: true,
              created_at: true,
            },
          },
        },
      }),
    ]);

    res.json({
      message: "Prayer added successfully",
      prayerRequest: {
        ...updatedPrayerRequest,
        prayerCount: updatedPrayerRequest.prayers.length,
      },
    });
  } catch (error: any) {
    console.error("Error adding prayer:", error);
    res.status(500).json({
      error: "Failed to add prayer",
      details: error.message,
    });
    return;
  }
}

// Get user's own prayer requests
export async function getMyPrayerRequests(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { status, limit = "20", offset = "0" } = req.query;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const where: any = { userId };

    if (status && typeof status === "string") {
      where.status = status;
    }

    const prayerRequests = await prisma.prayerRequest.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prayers: {
          select: {
            id: true,
            userId: true,
            created_at: true,
          },
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const updatedPrayerRequests = prayerRequests.map((request: any) => ({
      ...request,
      prayerCount: request.prayers.length,
    }));

    res.json(updatedPrayerRequests);
    return;
  } catch (error: any) {
    console.error("Error fetching user's prayer requests:", error);
    res.status(500).json({
      error: "Failed to fetch prayer requests",
      details: error.message,
    });
  }
}
