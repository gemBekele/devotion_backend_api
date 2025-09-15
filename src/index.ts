import "dotenv/config";
import cors from "cors";
import express from "express";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { devotionRoutes } from "./routers/devotion.routes.js";
import { authRoutes } from "./routers/auth.routes.js";
import { prayerRequestRoutes } from "./routers/prayerRequest.routes.js";
import { counselingRoutes } from "./routers/counseling.routes.js";
import adminRoutes from "./routers/admin.routes.js";

// Extend Express Request type to include cookies and user/session
declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      user?: any;
      session?: any;
    }
  }
}

const app = express();

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

// Simple cookie parser middleware
app.use((req, res, next) => {
  const cookies: Record<string, string> = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = parts[1];
      }
    });
  }
  req.cookies = cookies;
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true, // Allow cookies to be sent
  })
);

// Enhanced request/response logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Log incoming request with better formatting
  console.log(`\n🌐 INCOMING REQUEST [${requestId}]`);
  console.log(`┌─────────────────────────────────────────────────────────────`);
  console.log(`│ ${req.method.toUpperCase()} ${req.url}`);
  console.log(`│ Time: ${new Date().toLocaleTimeString()}`);
  console.log(`│ IP: ${req.ip || req.connection.remoteAddress || 'Unknown'}`);
  console.log(`│ User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}...`);
  
  // Show important headers
  if (req.headers.authorization) {
    console.log(`│ Auth: ${req.headers.authorization.substring(0, 20)}...`);
  }
  if (req.headers.cookie) {
    console.log(`│ Cookie: ${req.headers.cookie.substring(0, 40)}...`);
  }
  if (req.headers['content-type']) {
    console.log(`│ Content-Type: ${req.headers['content-type']}`);
  }
  
  // Show request body for non-GET requests
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`│ Body:`);
    const bodyStr = JSON.stringify(req.body, null, 2);
    bodyStr.split('\n').forEach(line => {
      console.log(`│   ${line}`);
    });
  }
  
  console.log(`└─────────────────────────────────────────────────────────────\n`);

  // Intercept response to log it
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(body) {
    logResponse(requestId, req, res, body, startTime);
    return originalSend.call(this, body);
  };
  
  res.json = function(body) {
    logResponse(requestId, req, res, body, startTime);
    return originalJson.call(this, body);
  };
  
  next();
});

function logResponse(requestId: string, req: any, res: any, body: any, startTime: number) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  const status = res.statusCode;
  const isSuccess = status >= 200 && status < 300;
  const statusIcon = isSuccess ? "✅" : "❌";
  const statusColor = isSuccess ? "SUCCESS" : "ERROR";
  
  console.log(`\n${statusIcon} RESPONSE [${requestId}]`);
  console.log(`┌─────────────────────────────────────────────────────────────`);
  console.log(`│ ${req.method.toUpperCase()} ${req.url}`);
  console.log(`│ Status: ${status} (${statusColor})`);
  console.log(`│ Duration: ${duration}ms`);
  console.log(`│ Time: ${new Date().toLocaleTimeString()}`);
  
  // Show response headers if they exist
  if (res.getHeaders) {
    const headers = res.getHeaders();
    if (headers['content-type']) {
      console.log(`│ Content-Type: ${headers['content-type']}`);
    }
  }
  
  // Show response body (limit size for readability)
  if (body) {
    console.log(`│ ${isSuccess ? '✅' : '❌'} RESPONSE DATA:`);
    let bodyStr;
    
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        bodyStr = JSON.stringify(parsed, null, 2);
      } catch {
        bodyStr = body;
      }
    } else {
      bodyStr = JSON.stringify(body, null, 2);
    }
    
    const lines = bodyStr.split('\n');
    
    // Limit output for large responses
    if (lines.length > 15) {
      lines.slice(0, 10).forEach(line => {
        console.log(`│   ${line}`);
      });
      console.log(`│   ... (${lines.length - 13} more lines)`);
      lines.slice(-3).forEach(line => {
        console.log(`│   ${line}`);
      });
    } else {
      lines.forEach(line => {
        console.log(`│   ${line}`);
      });
    }
  }
  
  console.log(`└─────────────────────────────────────────────────────────────\n`);
}

app.use("/api", authRoutes);
app.use("/api/devotions", devotionRoutes);
app.use("/api/prayer-requests", prayerRequestRoutes);
app.use("/api/counseling", counselingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

app.listen(port, host, () => {
  console.log(`Server is running on ${host}:${port}`);
  console.log(`Local access: http://localhost:${port}`);
  console.log(`Network access: http://192.168.43.160:${port}`);
});
