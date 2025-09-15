// Simple JavaScript server to test basic functionality
import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  credentials: true,
}));

// Simple cookie parser middleware
app.use((req, res, next) => {
  const cookies = {};
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

// Basic routes
app.get("/", (req, res) => {
  res.status(200).send("Devotion API Server - Running");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    message: "Server is running properly" 
  });
});

// Temporary admin endpoints (simplified)
app.get("/api/admin/users", (req, res) => {
  res.status(200).json({
    success: true,
    users: [],
    total: 0,
    message: "Admin API temporarily simplified - TypeScript issues being resolved"
  });
});

app.get("/api/admin/stats", (req, res) => {
  res.status(200).json({
    success: true,
    stats: {
      users: { total: 0, admins: 0, regular: 0 },
      content: { devotions: 0, prayerRequests: 0 },
      recentUsers: []
    },
    message: "Admin API temporarily simplified - TypeScript issues being resolved"
  });
});

// Temporary devotions endpoints
app.get("/api/devotions", (req, res) => {
  res.status(200).json([]);
});

app.get("/api/me", (req, res) => {
  res.status(200).json({
    id: "temp-user",
    name: "Test User", 
    email: "test@example.com",
    role: "admin",
    message: "Temporary user data - authentication being fixed"
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Simple Devotion API Server running on port ${port}`);
  console.log(`   Local: http://localhost:${port}`);
  console.log(`   Network: http://0.0.0.0:${port}`);
  console.log(`   Health check: http://localhost:${port}/api/health`);
  console.log('');
  console.log('📝 Note: This is a simplified server while TypeScript issues are being resolved');
  console.log('   - Admin functionality is temporarily mocked');
  console.log('   - Authentication is bypassed');
  console.log('   - Database operations are disabled');
});




