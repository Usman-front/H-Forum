import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Properly resolve directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load environment variables (Render injects them automatically)
dotenv.config();

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import questionRoutes from "./routes/questions.js";
import topicRoutes from "./routes/topics.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allow your Render frontend domain (update this once frontend is deployed)
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5174",
  "http://localhost:5173",
];

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
});

// ✅ Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // disable strict CSP for flexibility in deployment
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan("combined"));
app.use(limiter);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Serve uploaded files statically (Render’s free plan will not persist uploads)
app.use("/uploads", express.static("uploads"));

// ✅ MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

connectDB();

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/topics", topicRoutes);

// ✅ Health Check Endpoint (Render uses this)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "H-Forum API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  });
});

// ✅ Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "production"}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || "not set"}`);
});

export default app;
