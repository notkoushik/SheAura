import { Router } from "express";
import { getCatalog, getProductBySlug } from "../controllers/catalogController.js";
import { createOrder, previewOrder, getOrderById } from "../controllers/orderController.js";
import { createPaymentIntent, verifyPayment } from "../controllers/paymentController.js";
import {
  getAdminOrders,
  updateOrderStatus,
  getAdminStats,
  adminLogin,
  verifyAdminSession,
  getTaxSettingsHandler,
  updateTaxSettingsHandler,
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/auth.js";
import { checkoutLimiter, adminLoginLimiter } from "../middleware/security.js";

export const apiRouter = Router();

// Health Check
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "SheAura Core API",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public Catalog Endpoints
apiRouter.get("/catalog", getCatalog);
apiRouter.get("/catalog/:slug", getProductBySlug);

// Customer Checkout & Orders (Protected with Rate Limiter)
apiRouter.post("/orders/preview", previewOrder);
apiRouter.post("/orders", checkoutLimiter, createOrder);
apiRouter.get("/orders/:id", getOrderById);

// Cryptographic Payment Gateways (Strict Validation & Anti-Price-Tampering)
apiRouter.post("/payments/create-intent", checkoutLimiter, createPaymentIntent);
apiRouter.post("/payments/verify", checkoutLimiter, verifyPayment);

// Dedicated Administrative Gateway (Rate-Limited Brute Force Defense)
apiRouter.post("/admin/login", adminLoginLimiter, adminLogin);
apiRouter.get("/admin/verify-session", verifyAdminSession);

// Protected Admin Console Endpoints (Strict Middleware)
apiRouter.get("/admin/stats", requireAdmin, getAdminStats);
apiRouter.get("/admin/orders", requireAdmin, getAdminOrders);
apiRouter.patch("/admin/orders/:id", requireAdmin, updateOrderStatus);

// Statutory Tax & GSTIN Configuration (Public Read / Admin Write)
apiRouter.get("/settings/tax", getTaxSettingsHandler);
apiRouter.put("/settings/tax", requireAdmin, updateTaxSettingsHandler);

