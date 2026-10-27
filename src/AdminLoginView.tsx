import React, { useState, FormEvent } from "react";
import { ShieldCheck, Lock, KeyRound, AlertCircle, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { adminSignIn } from "./lib/auth";
import SheAuraLogo from "./SheAuraLogo";

interface AdminLoginViewProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AdminLoginView({ onSuccess, onBack }: AdminLoginViewProps) {
  const [authMode, setAuthMode] = useState<"credentials" | "vaultKey">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vaultKey, setVaultKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload =
        authMode === "vaultKey"
          ? { secretKey: vaultKey }
          : { email: email.trim(), password: password.trim() };

      const result = await adminSignIn(payload);

      if (result.success) {
        setSuccessMessage("Identity verified. Decrypting Administrative Studio...");
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setErrorMessage(result.error || "Administrative authentication denied.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to establish secure gateway handshake.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 20%, #2a140d 0%, #150906 60%, #0d0504 100%)",
        color: "#fcf9f5",
        fontFamily: "'Montserrat', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          border: "1px solid rgba(223, 184, 149, 0.08)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "850px",
          height: "850px",
          borderRadius: "50%",
          border: "1px solid rgba(223, 184, 149, 0.04)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header Return Button */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(223, 184, 149, 0.2)",
            color: "#dfb895",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(223, 184, 149, 0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
        >
          <ArrowLeft size={13} />
          <span>Return to Boutique</span>
        </button>
      </div>

      {/* Security Gateway Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(24, 11, 8, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(223, 184, 149, 0.25)",
          borderRadius: "20px",
          padding: "40px 36px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(193, 136, 71, 0.1)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Security Crest & Branding */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(223, 184, 149, 0.2), rgba(125, 38, 22, 0.4))",
              border: "1px solid rgba(223, 184, 149, 0.4)",
              marginBottom: "16px",
              boxShadow: "0 0 20px rgba(223, 184, 149, 0.2)",
            }}
          >
            <ShieldCheck size={28} style={{ color: "#dfb895" }} />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <SheAuraLogo className="brand-logo-svg" height={22} fill="#dfb895" />
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "26px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              margin: "6px 0 2px",
              color: "#ffffff",
            }}
          >
            Maison Studio Console
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "#dfb895",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: 0,
              fontWeight: 500,
            }}
          >
            Isolated Administrative Gateway
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "24px",
            border: "1px solid rgba(223, 184, 149, 0.15)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode("credentials");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: authMode === "credentials" ? "rgba(223, 184, 149, 0.2)" : "transparent",
              color: authMode === "credentials" ? "#ffffff" : "#a89085",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <Lock size={12} />
            <span>Master Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("vaultKey");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: authMode === "vaultKey" ? "rgba(223, 184, 149, 0.2)" : "transparent",
              color: authMode === "vaultKey" ? "#ffffff" : "#a89085",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <KeyRound size={12} />
            <span>Vault Passkey</span>
          </button>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(180, 40, 20, 0.15)",
              border: "1px solid rgba(240, 70, 40, 0.4)",
              color: "#ff8c7a",
              padding: "12px 14px",
              borderRadius: "10px",
              fontSize: "11.5px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span style={{ lineHeight: 1.4 }}>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "rgba(40, 160, 80, 0.15)",
              border: "1px solid rgba(60, 200, 100, 0.4)",
              color: "#8effb0",
              padding: "12px 14px",
              borderRadius: "10px",
              fontSize: "11.5px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {authMode === "credentials" ? (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#dfb895",
                    marginBottom: "6px",
                  }}
                >
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sheaura.com"
                  autoComplete="username"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(223, 184, 149, 0.25)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#dfb895")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(223, 184, 149, 0.25)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#dfb895",
                    marginBottom: "6px",
                  }}
                >
                  Security Passkey
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(223, 184, 149, 0.25)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#dfb895")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(223, 184, 149, 0.25)")}
                />
              </div>
            </>
          ) : (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#dfb895",
                  marginBottom: "6px",
                }}
              >
                Maison Vault Passkey (x-admin-key)
              </label>
              <input
                type="password"
                required
                value={vaultKey}
                onChange={(e) => setVaultKey(e.target.value)}
                placeholder="Enter authorized administrative vault secret"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(223, 184, 149, 0.25)",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#dfb895")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(223, 184, 149, 0.25)")}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "10px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #dfb895 0%, #b88647 100%)",
              color: "#21130f",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: "0 8px 24px rgba(184, 134, 71, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Authorize & Enter Console</span>
              </>
            )}
          </button>
        </form>

        {/* Security Audit Badge */}
        <div
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(223, 184, 149, 0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "9.5px",
              color: "#9f867c",
              letterSpacing: "0.06em",
            }}
          >
            <Sparkles size={11} style={{ color: "#dfb895" }} />
            <span>Encrypted via Constant-Time HMAC-SHA256 · Rate Limited</span>
          </div>
        </div>
      </div>
    </div>
  );
}
