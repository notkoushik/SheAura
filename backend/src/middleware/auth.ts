import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { supabaseAdmin } from "../services/supabaseServer.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: string;
    issuedAt?: number;
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Create a tamper-proof cryptographic admin session token
 * Format: sa_adm.<payloadBase64>.<hmacSignature>
 */
export function createAdminSessionToken(adminId: string, email: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 8 * 60 * 60 * 1000; // 8 hours validity
  const payload = JSON.stringify({ adminId, email, role: "admin", issuedAt, expiresAt });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", config.admin.secretKey)
    .update(payloadB64)
    .digest("base64url");

  return `sa_adm.${payloadB64}.${signature}`;
}

/**
 * Verify a cryptographic admin session token
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; user?: any; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "sa_adm") {
      return { valid: false, error: "Malformed admin token format" };
    }

    const [, payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", config.admin.secretKey)
      .update(payloadB64)
      .digest("base64url");

    if (!timingSafeCompare(signature, expectedSignature)) {
      return { valid: false, error: "Invalid admin token cryptographic signature" };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: "Admin session token has expired" };
    }

    return { valid: true, user: payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Token parsing failure" };
  }
}

/**
 * High-Security Administrative Authorization Middleware
 * Enforces:
 * 1. Constant-time Vault Secret Key verification via 'x-admin-key'
 * 2. Cryptographic SheAura Admin Token verification
 * 3. Verified Supabase database profile check (strictly rejecting untrusted user_metadata)
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Direct Secret Vault Key check (timing-safe)
  const adminKey = req.headers["x-admin-key"] as string | undefined;
  if (adminKey && config.admin.secretKey) {
    if (timingSafeCompare(adminKey, config.admin.secretKey)) {
      req.user = { id: "admin-root", role: "admin", issuedAt: Date.now() };
      return next();
    }
  }

  // 2. Bearer Token Authorization check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized: Missing administrative credentials",
      instruction: "Authenticate via /sheaura/login with authorized administrative privileges.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Check if SheAura Admin Token
  if (token.startsWith("sa_adm.")) {
    const tokenVerification = verifyAdminSessionToken(token);
    if (tokenVerification.valid && tokenVerification.user) {
      req.user = {
        id: tokenVerification.user.adminId,
        email: tokenVerification.user.email,
        role: "admin",
        issuedAt: tokenVerification.user.issuedAt,
      };
      return next();
    } else {
      res.status(401).json({
        error: "Unauthorized: Expired or invalid administrative session",
        details: tokenVerification.error,
      });
      return;
    }
  }

  // 3. Supabase Auth Token verification (Hardened against Privilege Escalation)
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
      return;
    }

    // STRICT CHECK: Query database profiles table ONLY. Never trust user_metadata!
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      res.status(403).json({
        error: "Forbidden: Administrative privileges strictly required",
        warning: "Privilege escalation attempts are monitored and logged.",
      });
      return;
    }

    req.user = { id: user.id, email: user.email, role: "admin" };
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Auth verification failure", details: err?.message });
  }
}

