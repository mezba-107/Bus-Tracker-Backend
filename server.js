const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const initSocket = require("./sockets/busSocket");

const adminAuthRoutes = require("./routes/adminAuth");
const adminDriverRoutes = require("./routes/adminDriverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const driverRoutes = require("./routes/driverRoutes");

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Allowed origins: comma separated list in .env (CORS_ORIGINS). "*" = allow all (dev only)
const origins = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim());
const corsOrigin = origins.includes("*") ? "*" : origins;

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
  pingInterval: 10000,
  pingTimeout: 10000,
});

app.use(cors({ origin: corsOrigin, methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "100kb" }));

connectDB();
const { live } = initSocket(io);

app.get("/health", (req, res) => res.json({ ok: true, liveBuses: live.size }));

app.use("/api/buses", require("./routes/busRoutes")(live)); // public, read only
app.use("/api/auth", require("./routes/authRoutes")); // one login for the mobile app
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminDriverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/driver", driverRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
