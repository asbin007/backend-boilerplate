import express from "express";
import cors from "cors";
import authRoute from "./routes/authRoute.js";

const app = express();
app.use(express.json());

// Basic CORS configuration (safe defaults for local dev)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://localhost"
];

if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.includes("localhost") || origin.includes("vercel.app")) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token", "Access-Control-Allow-Origin"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Core Auth Backend is running successfully!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Core Auth Backend API!",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      auth: "/api/auth"
    }
  });
});

app.use("/api/auth", authRoute);

export default app;

