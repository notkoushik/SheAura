import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

// Helmet HTTP security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: config.nodeEnv === "production",
  crossOriginEmbedderPolicy: false,
});

// Strict CORS policy
export const corsPolicy = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps or curl) or matching whitelist
    if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by SheAura CORS policy`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-admin-key",
    "X-Admin-Key",
  ],
});

// General API Rate Limiting (120 req / minute per IP)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// Sensitive Rate Limiting for Checkout & Payments (15 req / minute)
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again shortly." },
});

// High-Security Rate Limiting for Administrative Authentication (5 attempts / 15 minutes)
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many administrative login attempts. Gateway locked for 15 minutes." },
});

