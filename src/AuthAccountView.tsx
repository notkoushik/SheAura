import React, { useState, useEffect, FormEvent, useMemo } from "react";
import {
  SheAuraUser,
  initAuth,
  getCurrentUser,
  signIn,
  signUp,
  signOut,
  updateBeautyProfile,
  updateAddress,
  onAuthStateChanged,
  OrderHistoryItem,
} from "./lib/auth";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { products, Product } from "./App";
import { generateInvoiceHtml, InvoiceData } from "./lib/invoice";
import {
  Sparkles,
  Gift,
  ShoppingBag,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Heart,
  Eye,
  Clock,
  MapPin,
  Lock,
  Truck,
  Package,
  Calendar,
  FileText,
  Copy,
  ChevronRight,
  User,
  ExternalLink,
  Edit3,
  RefreshCw,
  X,
  Phone,
  Mail,
  Home,
} from "lucide-react";

interface AuthAccountViewProps {
  onBack: () => void;
  onOpenAdmin: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onOpenCart?: () => void;
}

export interface SwatchOption {
  id: string;
  name: string;
  hex: string;
  toneTitle: string;
  desc: string;
  flatteringNote: string;
  matchedLipShades: string;
  bestProductSlugs: string[];
}

export const UNDERTONE_SWATCHES: SwatchOption[] = [
  {
    id: "Fair Porcelain Rose",
    name: "Alabaster Rose",
    hex: "#F5DFD2",
    toneTitle: "Cool Rose & Petal Alabaster",
    desc: "Delicate porcelain with cool pink undertones",
    flatteringNote: "Accentuates soft petal-pink, crushed berry stains, and cool rosewood.",
    matchedLipShades: "Rosewood Velvet · Petal Bloom · Orchid Silk",
    bestProductSlugs: ["lip-01", "face-01", "blush-01"],
  },
  {
    id: "Warm Golden Honey",
    name: "Golden Honey",
    hex: "#E8C6A5",
    toneTitle: "Warm Golden & Peachy Olive",
    desc: "Sun-drenched light/medium with warm golden glow",
    flatteringNote: "Pops dramatically with iconic scarlet red, warm terracotta, and molten amber.",
    matchedLipShades: "The Red Statement · Terracotta Dusk · Molten Glaze",
    bestProductSlugs: ["lip-01", "lip-02", "glow-01"],
  },
  {
    id: "Radiant Neutral Sand",
    name: "Neutral Sand",
    hex: "#DEB887",
    toneTitle: "Balanced Beige & Biscuit",
    desc: "Evenly balanced undertones suited for both satin and dewy finishes",
    flatteringNote: "Universally flattering — pairs effortlessly with rich nudes, spiced rose, and cashmere browns.",
    matchedLipShades: "Spiced Cashmere · Velvet Beige · Rose Squalane",
    bestProductSlugs: ["face-01", "lip-02", "blush-01"],
  },
  {
    id: "Sun-Kissed Bronze",
    name: "Warm Bronze",
    hex: "#C68B59",
    toneTitle: "Golden Ochre & Rich Caramel",
    desc: "Luminous tan with deep amber and golden glow",
    flatteringNote: "Complements molten bronze highlights, deep Bordeaux wine, and warm sunset apricot.",
    matchedLipShades: "Sunset Apricot · Molten Bronze · Scarlet Rose",
    bestProductSlugs: ["glow-01", "lip-01", "face-01"],
  },
  {
    id: "Deep Espresso Velvet",
    name: "Rich Cocoa",
    hex: "#6B3B24",
    toneTitle: "Deep Mahogany & Warm Cocoa",
    desc: "Deep sculpted complexion with rich mahogany warmth",
    flatteringNote: "Stunning with high-pigment bold scarlet, deep plum, and golden glazed glass.",
    matchedLipShades: "Blackberry Velvet · Rich Ruby · Molten Gold",
    bestProductSlugs: ["lip-01", "face-01", "glow-01"],
  },
];

export const VANITY_ARCHETYPES = [
  {
    id: "Old Money Radiance",
    title: "Old Money Radiance",
    tagline: "Polished · Cashmere · Timeless",
    desc: "Luminous, velvet-matte base with sculpted rosewood lips and subtle champagne cheekbones.",
    badge: "✦ Most Adored",
    colors: ["#2b130c", "#dfb895", "#8c4436"],
  },
  {
    id: "Sunlit Glass Skin",
    title: "Sunlit Glass Skin",
    tagline: "Dewy · Glazed · Botanical",
    desc: "Ultra-hydrated, drenched radiance with translucent skin and light-reflecting botanical glow.",
    badge: "✨ Viral Glow",
    colors: ["#f4ede5", "#c18847", "#dfb895"],
  },
  {
    id: "French Girl Effortless",
    title: "French Girl Effortless",
    tagline: "Blurred · Petal · Minimal",
    desc: "Fluffy feathery brows, soft-bitten berry stained pout, and barely-there skin tint.",
    badge: "🍒 Editorial",
    colors: ["#7d2616", "#f9e5dc", "#a81920"],
  },
  {
    id: "Haute Runway Drama",
    title: "Haute Runway Drama",
    tagline: "Sculpted · Bold · Iconic",
    desc: "Saturated signature crimson lips, razor-sharp sculpting, and 24K velvet intensity.",
    badge: "🥀 Runway Muse",
    colors: ["#a81920", "#1a0b07", "#dfb895"],
  },
];

export const SKIN_PRIORITIES = [
  { id: "Glass-Skin Hydration", label: "Glass-Skin Hydration", note: "Plant Squalane & Rosewater" },
  { id: "Poreless Velvet Blur", label: "Poreless Velvet Blur", note: "Soft-Focus Cashmere Micro-Powder" },
  { id: "16H Transfer-Proof", label: "16H Transfer-Proof", note: "Runway-Grade All-Day Wear" },
  { id: "Botanical Barrier Shield", label: "Botanical Barrier Shield", note: "Damask Rose & Centella Calm" },
];

export const FINISH_OPTIONS = [
  "Sculpted satin",
  "Velvet matte",
  "Molten pearl glaze",
  "Soft silk powder",
  "Dewy liquid radiance",
];

export const BIRTHDAY_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FALLBACK_PRODUCT_IMAGE = "/products/Peach Blossom Blush.webp";

export default function AuthAccountView({
  onBack,
  onOpenAdmin,
  onSelectProduct,
  onAddToCart,
  onOpenCart,
}: AuthAccountViewProps) {
  const [user, setUser] = useState<SheAuraUser | null>(() => getCurrentUser());
  const [loadingSession, setLoadingSession] = useState(() => !getCurrentUser());
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [profileTab, setProfileTab] = useState<"orders" | "addresses" | "beauty" | "wishlist">("orders");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [passportToast, setPassportToast] = useState<string | null>(null);

  // Live Supabase Orders
  const [liveOrders, setLiveOrders] = useState<OrderHistoryItem[]>(() => getCurrentUser()?.orders || []);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "delivered">("all");

  // Active Tracking Order Modal
  const [trackingOrder, setTrackingOrder] = useState<OrderHistoryItem | null>(null);

  // Address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(() => {
    const active = getCurrentUser();
    const addr = active?.addressBook?.[0];
    return {
      fullName: addr?.fullName || active?.fullName || "",
      street: addr?.street || "",
      city: addr?.city || "",
      state: addr?.state || "",
      postalCode: addr?.postalCode || "",
      country: addr?.country || "India",
      phone: addr?.phone || active?.phone || "",
    };
  });

  // Beauty preferences calibration toggle
  const [isCalibratingBeauty, setIsCalibratingBeauty] = useState(false);

  // Toast notifier
  const showNotification = (msg: string) => {
    setPassportToast(msg);
    setTimeout(() => setPassportToast(null), 3500);
  };

  // Sync orders from Supabase & Local Session
  const fetchOrders = async (userEmail: string, localOrders: OrderHistoryItem[] = []) => {
    setLoadingOrders(true);
    let combined = [...localOrders];

    if (isSupabaseConfigured && userEmail) {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .or(`client_email.ilike.%${userEmail}%,customer_email.ilike.%${userEmail}%`)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: OrderHistoryItem[] = data.map((d: any) => {
            let items: any[] = [];
            if (Array.isArray(d.items)) {
              items = d.items;
            } else if (typeof d.items === "string") {
              try {
                items = JSON.parse(d.items);
              } catch {
                items = [];
              }
            }

            const formattedItems = items.map((i: any) => ({
              name: i.name || "Maison Cosmetic Creation",
              shade: i.shade || i.category || "Signature Shade",
              price: i.unitPrice ? `₹${Number(i.unitPrice).toLocaleString("en-IN")}` : (i.price || "₹899"),
              image: i.image || FALLBACK_PRODUCT_IMAGE,
            }));

            const createdDate = d.created_at
              ? new Date(d.created_at).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
              : "Recent Order";

            return {
              id: d.id,
              date: createdDate,
              itemsCount: d.items_count || formattedItems.length || 1,
              totalAmount: d.total_amount || (d.total_price ? `₹${Number(d.total_price).toLocaleString("en-IN")}` : "₹899"),
              status: d.status === "delivered" ? "delivered" : (d.status === "dispatched" ? "dispatched" : "processing"),
              trackingNumber: d.tracking_number || "Awaiting Dispatch Scan",
              eta: d.eta || (d.status === "delivered" ? "Delivered to Residence" : "Arriving in 2-3 Business Days"),
              items: formattedItems.length ? formattedItems : [
                {
                  name: "Signature Collection Piece",
                  shade: "Haute Shade",
                  price: d.total_amount || "₹899",
                  image: FALLBACK_PRODUCT_IMAGE,
                },
              ],
            };
          });

          // Merge Supabase orders with local, prioritizing Supabase DB
          const existingIds = new Set(mapped.map((m) => m.id));
          for (const loc of localOrders) {
            if (!existingIds.has(loc.id)) {
              mapped.push(loc);
            }
          }
          combined = mapped;
        }
      } catch (e) {
        console.warn("[AccountView] Supabase orders fetch error:", e);
      }
    }

    setLiveOrders(combined);
    setLoadingOrders(false);
  };

  // Load and listen to auth state
  useEffect(() => {
    initAuth().then((initialUser) => {
      setUser(initialUser);
      setLoadingSession(false);
      if (initialUser) {
        if (initialUser.addressBook?.[0]) {
          const addr = initialUser.addressBook[0];
          setAddressForm({
            fullName: addr.fullName || initialUser.fullName,
            street: addr.street || "",
            city: addr.city || "",
            state: addr.state || "",
            postalCode: addr.postalCode || "",
            country: addr.country || "India",
            phone: addr.phone || initialUser.phone || "",
          });
        }
        fetchOrders(initialUser.email, initialUser.orders || []);
      }
    });

    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoadingSession(false);
      if (currentUser) {
        fetchOrders(currentUser.email, currentUser.orders || []);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtered orders
  const displayedOrders = useMemo(() => {
    if (orderFilter === "active") {
      return liveOrders.filter((o) => o.status !== "delivered");
    }
    if (orderFilter === "delivered") {
      return liveOrders.filter((o) => o.status === "delivered");
    }
    return liveOrders;
  }, [liveOrders, orderFilter]);

  // Derived user details
  const userDisplayName = user?.fullName || "Maison Member";
  const userEmail = user?.email || "";
  const userInitials = useMemo(() => {
    if (!userDisplayName) return "MM";
    const parts = userDisplayName.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [userDisplayName]);

  // Active calibrated preferences
  const activeSwatch = useMemo(() => {
    return (
      UNDERTONE_SWATCHES.find((s) => s.id === user?.beautyProfile?.undertone) ||
      UNDERTONE_SWATCHES[1] // Warm Golden Honey default
    );
  }, [user?.beautyProfile?.undertone]);

  const activeArchetype = useMemo(() => {
    return (
      VANITY_ARCHETYPES.find((a) => a.id === user?.beautyProfile?.vanityMood) ||
      VANITY_ARCHETYPES[1] // Sunlit Glass Skin default
    );
  }, [user?.beautyProfile?.vanityMood]);

  // Curated pieces for this profile
  const curatedPieces = useMemo(() => {
    return products.slice(0, 3);
  }, []);

  // Handle Sign In
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        setSuccessMsg(result.message || "Signed in successfully.");
        fetchOrders(result.user.email, result.user.orders || []);
      } else {
        setErrorMsg(result.error || "Could not sign in with these credentials.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in error occurred.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await signUp(email, password, fullName || "SheAura Client");
      if (result.success && result.user) {
        setUser(result.user);
        setSuccessMsg(result.message || "Welcome to She'Aura Maison.");
        fetchOrders(result.user.email, []);
      } else {
        setErrorMsg(result.error || "Could not create account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Sign up error occurred.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setLiveOrders([]);
    showNotification("You have safely signed out of your Maison Atelier.");
  };

  // Handle Save Address
  const handleSaveAddress = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateAddress(addressForm);
    setIsEditingAddress(false);
    showNotification("✓ Primary Maison delivery address updated.");
  };

  // Handle Update Beauty Preference
  const handleUpdateProfile = (updates: any, toastMsg: string) => {
    if (!user) return;
    updateBeautyProfile(updates);
    showNotification(toastMsg);
  };

  // Download GST Invoice
  const handleDownloadInvoice = (order: OrderHistoryItem) => {
    const numericTotal = parseInt(order.totalAmount.replace(/[^0-9]/g, ""), 10) || 899;
    const taxableSubtotal = Math.round((numericTotal / 1.18) * 100) / 100;
    const totalGst = Math.round((numericTotal - taxableSubtotal) * 100) / 100;
    const cgstTotal = Math.round((totalGst / 2) * 100) / 100;
    const sgstTotal = Math.round((totalGst - cgstTotal) * 100) / 100;

    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${order.id.replace(/[^0-9A-Z]/gi, "").slice(-8)}`,
      invoiceDate: order.date,
      orderId: order.id,
      orderDate: order.date,
      customer: {
        name: userDisplayName,
        email: userEmail,
        phone: addressForm.phone || user?.phone || "+91 98765 43210",
        address: `${addressForm.street || "Atelier Residence"}, ${addressForm.city || "Mumbai"}, ${addressForm.state || "Maharashtra"} - ${addressForm.postalCode || "400050"}`,
        city: addressForm.city || "Mumbai",
        state: addressForm.state || "Maharashtra",
        pincode: addressForm.postalCode || "400050",
      },
      items: order.items.map((item, idx) => ({
        srNo: idx + 1,
        description: `${item.name} (${item.shade})`,
        hsnCode: "3304",
        qty: 1,
        unitPrice: Math.round((numericTotal / (order.items.length || 1) / 1.18) * 100) / 100,
        taxableValue: Math.round((numericTotal / (order.items.length || 1) / 1.18) * 100) / 100,
        cgstRate: 9,
        cgstAmount: Math.round((cgstTotal / (order.items.length || 1)) * 100) / 100,
        sgstRate: 9,
        sgstAmount: Math.round((sgstTotal / (order.items.length || 1)) * 100) / 100,
        igstRate: 0,
        igstAmount: 0,
        total: Math.round((numericTotal / (order.items.length || 1)) * 100) / 100,
      })),
      subtotal: taxableSubtotal,
      cgstTotal,
      sgstTotal,
      igstTotal: 0,
      totalGst,
      shippingFee: 0,
      discountAmount: 0,
      grandTotal: numericTotal,
      payment: {
        method: "UPI / Prepaid",
        status: "COMPLETED",
        transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
        date: order.date,
      },
    };

    const invoiceHtml = generateInvoiceHtml(invoiceData);
    const blob = new Blob([invoiceHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SheAura-Tax-Invoice-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`✓ Tax Invoice generated for Order #${order.id}`);
  };

  const isAdminUser = user?.role === "admin" || userEmail.includes("admin");

  return (
    <div className="auth-page">
      {/* Toast Feedback */}
      {passportToast && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 9999,
            background: "#2b130c",
            color: "#ffffff",
            padding: "12px 22px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            boxShadow: "0 12px 32px rgba(43, 19, 12, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={14} style={{ color: "#dfb895" }} />
          <span>{passportToast}</span>
        </div>
      )}

      {/* Top Haute Navigation Bar */}
      <header className="auth-nav shell">
        <button className="auth-back-btn" onClick={onBack} aria-label="Return to storefront">
          <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
          <span>Storefront</span>
        </button>

        <button className="brand auth-brand" onClick={onBack}>
          SHE’AURA
          <span>YOUR AURA · YOUR STORY</span>
        </button>

        <div className="auth-nav-actions">
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="auth-pill-btn signout"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="auth-container shell" style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 20px 80px" }}>
        {loadingSession ? (
          <div className="auth-loading-card">
            <div className="auth-spinner" />
            <p>Consulting She’Aura Secure Session…</p>
          </div>
        ) : user ? (
          /* =========================================================================
             AUTHENTICATED STATE: Refined, Natural Luxury Customer Profile
             ========================================================================= */
          <div className="account-dashboard" style={{ maxWidth: "1040px", margin: "0 auto" }}>
            {/* 1. Member Profile Hero Banner */}
            <div
              className="account-hero-card"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(250, 246, 240, 0.95))",
                border: "1px solid rgba(223, 184, 149, 0.45)",
                borderRadius: "20px",
                padding: "28px 32px",
                boxShadow: "0 14px 36px rgba(45, 20, 10, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "20px", minWidth: 0 }}>
                {/* Monogram Ring */}
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2b130c, #7d2616)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    font: "500 22px 'Cormorant Garamond', serif",
                    letterSpacing: "0.08em",
                    boxShadow: "0 6px 18px rgba(43, 19, 12, 0.25)",
                    border: "2px solid rgba(223, 184, 149, 0.6)",
                    flexShrink: 0,
                  }}
                >
                  {userInitials}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "rgba(193, 136, 71, 0.15)",
                        border: "1px solid rgba(193, 136, 71, 0.4)",
                        color: "#7d4416",
                        fontSize: "8.5px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Sparkles size={10} />
                      {user.tier?.toUpperCase() || "RADIANCE CIRCLE"}
                    </span>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "rgba(43, 19, 12, 0.06)",
                        color: "#543026",
                        fontSize: "8.5px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                      }}
                    >
                      ✦ {user.loyaltyPoints || 350} Loyalty Points
                    </span>
                  </div>

                  <h2 style={{ font: "500 28px/1.2 'Cormorant Garamond', serif", color: "#2b130c", margin: "2px 0 3px" }}>
                    {userDisplayName}
                  </h2>
                  <p style={{ fontSize: "11px", color: "#765d50", margin: 0 }}>
                    {userEmail} {user.phone ? `· ${user.phone}` : ""}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {onOpenCart && (
                  <button
                    type="button"
                    onClick={onOpenCart}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "999px",
                      background: "rgba(43, 19, 12, 0.05)",
                      border: "1px solid rgba(43, 19, 12, 0.18)",
                      color: "#2b130c",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ShoppingBag size={12} />
                    <span>View Bag</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    background: "transparent",
                    border: "1px solid rgba(125, 38, 22, 0.3)",
                    color: "#7d2616",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* 2. Refined Navigation Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: "1px solid rgba(223, 184, 149, 0.35)",
                paddingBottom: "8px",
                overflowX: "auto",
              }}
            >
              <button
                type="button"
                className={`account-tab ${profileTab === "orders" ? "active" : ""}`}
                onClick={() => setProfileTab("orders")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: profileTab === "orders" ? "#2b130c" : "transparent",
                  color: profileTab === "orders" ? "#ffffff" : "#68483b",
                  border: "none",
                  font: "600 11px/1 'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                }}
              >
                <Package size={14} />
                <span>Orders & Deliveries ({liveOrders.length})</span>
              </button>

              <button
                type="button"
                className={`account-tab ${profileTab === "addresses" ? "active" : ""}`}
                onClick={() => setProfileTab("addresses")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: profileTab === "addresses" ? "#2b130c" : "transparent",
                  color: profileTab === "addresses" ? "#ffffff" : "#68483b",
                  border: "none",
                  font: "600 11px/1 'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                }}
              >
                <MapPin size={14} />
                <span>Delivery Addresses</span>
              </button>

              <button
                type="button"
                className={`account-tab ${profileTab === "beauty" ? "active" : ""}`}
                onClick={() => setProfileTab("beauty")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: profileTab === "beauty" ? "#2b130c" : "transparent",
                  color: profileTab === "beauty" ? "#ffffff" : "#68483b",
                  border: "none",
                  font: "600 11px/1 'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                }}
              >
                <Sparkles size={14} />
                <span>Beauty Signature</span>
              </button>

              <button
                type="button"
                className={`account-tab ${profileTab === "wishlist" ? "active" : ""}`}
                onClick={() => setProfileTab("wishlist")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: profileTab === "wishlist" ? "#2b130c" : "transparent",
                  color: profileTab === "wishlist" ? "#ffffff" : "#68483b",
                  border: "none",
                  font: "600 11px/1 'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                }}
              >
                <Heart size={14} />
                <span>Saved Pieces</span>
              </button>
            </div>

            {/* =====================================================================
                TAB 1: ORDERS & DELIVERIES (The Core E-Commerce Hub)
                ===================================================================== */}
            {profileTab === "orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Orders Sub-Header Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("all")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "999px",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        border: "1px solid",
                        borderColor: orderFilter === "all" ? "#2b130c" : "rgba(43, 19, 12, 0.2)",
                        background: orderFilter === "all" ? "#2b130c" : "transparent",
                        color: orderFilter === "all" ? "#ffffff" : "#543026",
                        cursor: "pointer",
                      }}
                    >
                      All Orders ({liveOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("active")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "999px",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        border: "1px solid",
                        borderColor: orderFilter === "active" ? "#2b130c" : "rgba(43, 19, 12, 0.2)",
                        background: orderFilter === "active" ? "#2b130c" : "transparent",
                        color: orderFilter === "active" ? "#ffffff" : "#543026",
                        cursor: "pointer",
                      }}
                    >
                      Active Transit ({liveOrders.filter((o) => o.status !== "delivered").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("delivered")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "999px",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        border: "1px solid",
                        borderColor: orderFilter === "delivered" ? "#2b130c" : "rgba(43, 19, 12, 0.2)",
                        background: orderFilter === "delivered" ? "#2b130c" : "transparent",
                        color: orderFilter === "delivered" ? "#ffffff" : "#543026",
                        cursor: "pointer",
                      }}
                    >
                      Delivered ({liveOrders.filter((o) => o.status === "delivered").length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchOrders(userEmail, user.orders || [])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7d2616",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <RefreshCw size={11} className={loadingOrders ? "animate-spin" : ""} />
                    <span>Sync Live Status</span>
                  </button>
                </div>

                {/* Orders List */}
                {displayedOrders.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "50px 20px",
                      background: "#ffffff",
                      borderRadius: "18px",
                      border: "1px solid rgba(223, 184, 149, 0.45)",
                    }}
                  >
                    <Package size={36} style={{ color: "#c18847", margin: "0 auto 12px" }} />
                    <h3 style={{ font: "500 24px 'Cormorant Garamond', serif", color: "#2b130c", margin: "0 0 6px" }}>
                      No Orders Recorded
                    </h3>
                    <p style={{ fontSize: "11px", color: "#765d50", maxWidth: "400px", margin: "0 auto 18px" }}>
                      Your private lookbook orders will appear here as soon as you complete your purchase.
                    </p>
                    <button
                      type="button"
                      onClick={onBack}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "999px",
                        background: "#2b130c",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Explore Haute Collection
                    </button>
                  </div>
                ) : (
                  displayedOrders.map((ord) => {
                    const isDelivered = ord.status === "delivered";
                    const isDispatched = ord.status === "dispatched";

                    return (
                      <div
                        key={ord.id}
                        className="order-card"
                        style={{
                          background: "#ffffff",
                          border: "1px solid rgba(223, 184, 149, 0.45)",
                          borderRadius: "18px",
                          padding: "24px 28px",
                          boxShadow: "0 8px 24px rgba(45, 20, 10, 0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "18px",
                        }}
                      >
                        {/* Order Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                            paddingBottom: "14px",
                            borderBottom: "1px solid rgba(223, 184, 149, 0.25)",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                font: "700 11px/1 'Plus Jakarta Sans', sans-serif",
                                letterSpacing: "0.12em",
                                color: "#2b130c",
                                textTransform: "uppercase",
                                display: "block",
                                marginBottom: "3px",
                              }}
                            >
                              ORDER #{ord.id}
                            </span>
                            <span style={{ fontSize: "10px", color: "#8c766a" }}>
                              Placed on {ord.date} · {ord.itemsCount} piece{ord.itemsCount > 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span
                            style={{
                              padding: "5px 12px",
                              borderRadius: "999px",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background: isDelivered
                                ? "rgba(46, 105, 48, 0.1)"
                                : isDispatched
                                ? "rgba(193, 136, 71, 0.15)"
                                : "rgba(125, 38, 22, 0.08)",
                              color: isDelivered
                                ? "#2e6930"
                                : isDispatched
                                ? "#8f5319"
                                : "#7d2616",
                              border: `1px solid ${
                                isDelivered
                                  ? "rgba(46, 105, 48, 0.3)"
                                  : isDispatched
                                  ? "rgba(193, 136, 71, 0.4)"
                                  : "rgba(125, 38, 22, 0.25)"
                              }`,
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: isDelivered ? "#2e6930" : isDispatched ? "#c18847" : "#7d2616",
                              }}
                            />
                            {isDelivered
                              ? "DELIVERED TO RESIDENCE"
                              : isDispatched
                              ? "IN WHITE-GLOVE TRANSIT"
                              : "PROCESSING AT ATELIER"}
                          </span>
                        </div>

                        {/* Visual Delivery Stepper */}
                        <div
                          style={{
                            background: "rgba(250, 246, 240, 0.75)",
                            borderRadius: "14px",
                            padding: "14px 18px",
                            border: "1px solid rgba(223, 184, 149, 0.3)",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4, 1fr)",
                              gap: "8px",
                              position: "relative",
                            }}
                          >
                            {/* Step 1: Confirmed */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  background: "#2b130c",
                                  color: "#ffffff",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                <Check size={11} strokeWidth={2.8} />
                              </div>
                              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#2b130c", display: "block" }}>
                                Confirmed
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>Payment Verified</small>
                            </div>

                            {/* Step 2: Preparing */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  background: "#2b130c",
                                  color: "#ffffff",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                <Check size={11} strokeWidth={2.8} />
                              </div>
                              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#2b130c", display: "block" }}>
                                Atelier Packing
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>Silk Wrapped</small>
                            </div>

                            {/* Step 3: Dispatched */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  background: isDispatched || isDelivered ? "#2b130c" : "rgba(43, 19, 12, 0.15)",
                                  color: isDispatched || isDelivered ? "#ffffff" : "#765d50",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                {isDispatched || isDelivered ? <Truck size={11} /> : <Clock size={11} />}
                              </div>
                              <span
                                style={{
                                  fontSize: "8.5px",
                                  fontWeight: 700,
                                  color: isDispatched || isDelivered ? "#2b130c" : "#8c766a",
                                  display: "block",
                                }}
                              >
                                Dispatched
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>
                                {ord.trackingNumber?.startsWith("EXP") ? "BlueDart Air" : "Express Transit"}
                              </small>
                            </div>

                            {/* Step 4: Delivered */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  background: isDelivered ? "#2e6930" : "rgba(43, 19, 12, 0.15)",
                                  color: isDelivered ? "#ffffff" : "#765d50",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                {isDelivered ? <Check size={11} strokeWidth={2.8} /> : <Home size={11} />}
                              </div>
                              <span
                                style={{
                                  fontSize: "8.5px",
                                  fontWeight: 700,
                                  color: isDelivered ? "#2e6930" : "#8c766a",
                                  display: "block",
                                }}
                              >
                                Delivered
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>
                                {isDelivered ? "Delivered" : "In 2-3 Days"}
                              </small>
                            </div>
                          </div>
                        </div>

                        {/* Items Row */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {ord.items.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "14px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                  }}
                                  style={{
                                    width: "52px",
                                    height: "52px",
                                    borderRadius: "10px",
                                    objectFit: "cover",
                                    border: "1px solid rgba(223, 184, 149, 0.35)",
                                    flexShrink: 0,
                                    backgroundColor: "#fcfaf7",
                                  }}
                                />
                                <div>
                                  <h4 style={{ font: "500 17px/1.2 'Cormorant Garamond', serif", color: "#2b130c", margin: "0 0 2px" }}>
                                    {item.name}
                                  </h4>
                                  <span style={{ fontSize: "9px", color: "#765d50" }}>
                                    Shade: {item.shade}
                                  </span>
                                </div>
                              </div>
                              <b style={{ font: "700 12px/1 'Plus Jakarta Sans', sans-serif", color: "#2b130c" }}>
                                {item.price}
                              </b>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer & Actions */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            paddingTop: "14px",
                            borderTop: "1px solid rgba(223, 184, 149, 0.25)",
                          }}
                        >
                          <div style={{ fontSize: "10px", color: "#765d50" }}>
                            Tracking ID: <b style={{ color: "#2b130c" }}>{ord.trackingNumber}</b> · Total Paid: <b style={{ color: "#2b130c" }}>{ord.totalAmount}</b>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => setTrackingOrder(ord)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "999px",
                                border: "1px solid #2b130c",
                                background: "transparent",
                                color: "#2b130c",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <Truck size={11} />
                              <span>Track Shipment</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(ord)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "999px",
                                border: "1px solid rgba(193, 136, 71, 0.5)",
                                background: "rgba(193, 136, 71, 0.08)",
                                color: "#7d4416",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <FileText size={11} />
                              <span>Tax Invoice</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* =====================================================================
                TAB 2: DELIVERY ADDRESSES & RESIDENCE
                ===================================================================== */}
            {profileTab === "addresses" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "24px",
                  alignItems: "start",
                }}
              >
                {/* Primary Address Box */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid rgba(223, 184, 149, 0.45)",
                    padding: "26px",
                    boxShadow: "0 8px 24px rgba(45, 20, 10, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid rgba(223, 184, 149, 0.25)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <MapPin size={16} style={{ color: "#c18847" }} />
                      <h4 style={{ font: "500 20px 'Cormorant Garamond', serif", color: "#2b130c", margin: 0 }}>
                        Primary Maison Residence
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#7d2616",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Edit3 size={11} />
                      <span>{isEditingAddress ? "Cancel" : "Edit"}</span>
                    </button>
                  </div>

                  {isEditingAddress ? (
                    <form onSubmit={handleSaveAddress} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Recipient Full Name"
                        value={addressForm.fullName}
                        onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                        style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Street Address, Villa, or Apartment"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                        required
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="City"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                          required
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                          required
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Postal Code"
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone (+91)"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(43, 19, 12, 0.2)", fontSize: "11px" }}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        style={{
                          marginTop: "6px",
                          padding: "10px",
                          borderRadius: "999px",
                          background: "#2b130c",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Save Delivery Address
                      </button>
                    </form>
                  ) : (
                    <div>
                      <b style={{ font: "700 13px 'Plus Jakarta Sans', sans-serif", color: "#2b130c", display: "block", marginBottom: "4px" }}>
                        {addressForm.fullName || userDisplayName}
                      </b>
                      <p style={{ fontSize: "11px", color: "#68483b", lineHeight: 1.6, margin: "0 0 14px" }}>
                        {addressForm.street || "74 Haute Boulevard, Jubilee Hills"}<br />
                        {addressForm.city || "Hyderabad"}, {addressForm.state || "Telangana"} {addressForm.postalCode || "500033"}<br />
                        {addressForm.country || "India"}<br />
                        Phone: {addressForm.phone || user.phone || "+91 98765 43210"}
                      </p>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          fontSize: "8px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        ✓ Verified White-Glove Dispatch Destination
                      </span>
                    </div>
                  )}
                </div>

                {/* Maison Privileges */}
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 244, 238, 0.95))",
                    borderRadius: "18px",
                    border: "1px solid rgba(223, 184, 149, 0.45)",
                    padding: "26px",
                    boxShadow: "0 8px 24px rgba(45, 20, 10, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <ShieldCheck size={16} style={{ color: "#c18847" }} />
                    <h4 style={{ font: "500 20px 'Cormorant Garamond', serif", color: "#2b130c", margin: 0 }}>
                      Maison Muse Privileges
                    </h4>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#543026" }}>
                      <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span>Complimentary White-Glove Courier on all orders</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#543026" }}>
                      <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span>Deluxe Botanical Miniature in Every Order</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#543026" }}>
                      <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span>Hand-Tied Gold Foil Keepsake Box Presentation</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#543026" }}>
                      <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span>Private Runway Cinema Front-Row Access</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 3: BEAUTY SIGNATURE & PREFERENCES (Streamlined & Natural)
                ===================================================================== */}
            {profileTab === "beauty" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Active Beauty Calibration Summary */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid rgba(223, 184, 149, 0.45)",
                    padding: "26px 30px",
                    boxShadow: "0 8px 24px rgba(45, 20, 10, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginBottom: "20px",
                      paddingBottom: "14px",
                      borderBottom: "1px solid rgba(223, 184, 149, 0.25)",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 700,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "#7d2616",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "3px",
                        }}
                      >
                        <Sparkles size={11} />
                        MAISON BEAUTY SIGNATURE
                      </span>
                      <h3 style={{ font: "500 24px 'Cormorant Garamond', serif", color: "#2b130c", margin: 0 }}>
                        Your Calibrated Beauty Profile
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCalibratingBeauty(!isCalibratingBeauty)}
                      style={{
                        padding: "7px 16px",
                        borderRadius: "999px",
                        border: "1px solid #2b130c",
                        background: isCalibratingBeauty ? "#2b130c" : "transparent",
                        color: isCalibratingBeauty ? "#ffffff" : "#2b130c",
                        fontSize: "8.5px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {isCalibratingBeauty ? "Close Calibration" : "Calibrate Profile"}
                    </button>
                  </div>

                  {/* 4 Identity Pillars Summary */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div style={{ background: "rgba(250, 246, 240, 0.6)", padding: "14px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", color: "#8c766a", textTransform: "uppercase" }}>
                        Complexion Undertone
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <span
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            backgroundColor: activeSwatch.hex,
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        />
                        <b style={{ fontSize: "12px", color: "#2b130c" }}>{activeSwatch.name}</b>
                      </div>
                      <small style={{ fontSize: "8.5px", color: "#765d50", display: "block", marginTop: "2px" }}>
                        {activeSwatch.toneTitle}
                      </small>
                    </div>

                    <div style={{ background: "rgba(250, 246, 240, 0.6)", padding: "14px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", color: "#8c766a", textTransform: "uppercase" }}>
                        Signature Aesthetic
                      </span>
                      <b style={{ fontSize: "12px", color: "#2b130c", display: "block", marginTop: "6px" }}>
                        {activeArchetype.title}
                      </b>
                      <small style={{ fontSize: "8.5px", color: "#765d50", display: "block", marginTop: "2px" }}>
                        {activeArchetype.tagline}
                      </small>
                    </div>

                    <div style={{ background: "rgba(250, 246, 240, 0.6)", padding: "14px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", color: "#8c766a", textTransform: "uppercase" }}>
                        Skin Priority
                      </span>
                      <b style={{ fontSize: "12px", color: "#2b130c", display: "block", marginTop: "6px" }}>
                        {user.beautyProfile?.skinPriority || "Glass-Skin Hydration"}
                      </b>
                      <small style={{ fontSize: "8.5px", color: "#765d50", display: "block", marginTop: "2px" }}>
                        Tactile finish: {user.beautyProfile?.preferredFinish || "Sculpted satin"}
                      </small>
                    </div>

                    <div style={{ background: "rgba(250, 246, 240, 0.6)", padding: "14px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", color: "#8c766a", textTransform: "uppercase" }}>
                        Birthday Celebration
                      </span>
                      <b style={{ fontSize: "12px", color: "#2b130c", display: "block", marginTop: "6px" }}>
                        {user.beautyProfile?.birthdayMonth || "September"} VIP Gift
                      </b>
                      <small style={{ fontSize: "8.5px", color: "#765d50", display: "block", marginTop: "2px" }}>
                        Full-Size Rose Gold Lipstick Unlocked
                      </small>
                    </div>
                  </div>

                  {/* Calibration Drawer (Shown only when user clicks Calibrate) */}
                  {isCalibratingBeauty && (
                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(223, 184, 149, 0.3)" }}>
                      <h4 style={{ font: "500 18px 'Cormorant Garamond', serif", color: "#2b130c", margin: "0 0 10px" }}>
                        Select Your Complexion Tone
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "20px" }}>
                        {UNDERTONE_SWATCHES.map((swatch) => {
                          const isSelected = activeSwatch.id === swatch.id;
                          return (
                            <button
                              key={swatch.id}
                              type="button"
                              onClick={() => {
                                handleUpdateProfile(
                                  { undertone: swatch.id },
                                  `✓ Undertone calibrated to ${swatch.name}`
                                );
                              }}
                              style={{
                                padding: "10px",
                                borderRadius: "10px",
                                border: `1px solid ${isSelected ? "#2b130c" : "rgba(43, 19, 12, 0.15)"}`,
                                background: isSelected ? "rgba(43, 19, 12, 0.05)" : "#ffffff",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <span
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  backgroundColor: swatch.hex,
                                  border: "1px solid rgba(0,0,0,0.1)",
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <b style={{ fontSize: "11px", color: "#2b130c", display: "block" }}>{swatch.name}</b>
                                <small style={{ fontSize: "8px", color: "#8c766a" }}>{swatch.toneTitle}</small>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <h4 style={{ font: "500 18px 'Cormorant Garamond', serif", color: "#2b130c", margin: "0 0 10px" }}>
                        Select Your Signature Aesthetic
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                        {VANITY_ARCHETYPES.map((arch) => {
                          const isSelected = activeArchetype.id === arch.id;
                          return (
                            <button
                              key={arch.id}
                              type="button"
                              onClick={() => {
                                handleUpdateProfile(
                                  { vanityMood: arch.id },
                                  `✓ Aesthetic set to ${arch.title}`
                                );
                              }}
                              style={{
                                padding: "10px",
                                borderRadius: "10px",
                                border: `1px solid ${isSelected ? "#2b130c" : "rgba(43, 19, 12, 0.15)"}`,
                                background: isSelected ? "rgba(43, 19, 12, 0.05)" : "#ffffff",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <b style={{ fontSize: "11px", color: "#2b130c", display: "block" }}>{arch.title}</b>
                              <small style={{ fontSize: "8.5px", color: "#765d50" }}>{arch.tagline}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Harmonized Curated Pieces */}
                <div>
                  <h4 style={{ font: "500 22px 'Cormorant Garamond', serif", color: "#2b130c", margin: "0 0 14px" }}>
                    ✦ Curated Pieces Harmonizing with {activeSwatch.name}
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "18px",
                    }}
                  >
                    {curatedPieces.map((prod) => (
                      <div
                        key={prod.name}
                        style={{
                          background: "#ffffff",
                          borderRadius: "14px",
                          border: "1px solid rgba(223, 184, 149, 0.4)",
                          overflow: "hidden",
                          boxShadow: "0 4px 16px rgba(45, 20, 10, 0.04)",
                        }}
                      >
                        <img
                          src={prod.image}
                          alt={prod.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                          }}
                          style={{
                            width: "100%",
                            height: "170px",
                            objectFit: "cover",
                            cursor: "pointer",
                            backgroundColor: "#fcfaf7",
                          }}
                          onClick={() => {
                            onBack();
                            onSelectProduct(prod);
                          }}
                        />
                        <div style={{ padding: "14px" }}>
                          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8c766a" }}>
                            {prod.category}
                          </span>
                          <h5
                            style={{
                              font: "500 17px 'Cormorant Garamond', serif",
                              color: "#2b130c",
                              margin: "2px 0 4px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              onBack();
                              onSelectProduct(prod);
                            }}
                          >
                            {prod.name}
                          </h5>
                          <b style={{ font: "700 12px 'Plus Jakarta Sans', sans-serif", color: "#2b130c", display: "block", marginBottom: "10px" }}>
                            ₹{prod.price.toLocaleString("en-IN")}
                          </b>

                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddToCart(prod);
                                showNotification(`✓ Added ${prod.name} to Bag`);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "999px",
                                background: "#2b130c",
                                color: "#ffffff",
                                border: "none",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              <ShoppingBag size={11} />
                              <span>Add to Bag</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 4: SAVED LOOKBOOK (Wishlist)
                ===================================================================== */}
            {profileTab === "wishlist" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "20px",
                }}
              >
                {products.slice(0, 4).map((item) => (
                  <div
                    key={item.name}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid rgba(223, 184, 149, 0.4)",
                      overflow: "hidden",
                      boxShadow: "0 6px 18px rgba(45, 20, 10, 0.04)",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                      }}
                      style={{
                        width: "100%",
                        height: "180px",
                        objectFit: "cover",
                        backgroundColor: "#fcfaf7",
                      }}
                    />
                    <div style={{ padding: "16px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8c766a" }}>
                        {item.category}
                      </span>
                      <h4 style={{ font: "500 18px 'Cormorant Garamond', serif", color: "#2b130c", margin: "2px 0 6px" }}>
                        {item.name}
                      </h4>
                      <b style={{ font: "700 12px 'Plus Jakarta Sans', sans-serif", color: "#2b130c", display: "block", marginBottom: "12px" }}>
                        ₹{item.price.toLocaleString("en-IN")}
                      </b>
                      <button
                        type="button"
                        onClick={() => {
                          onBack();
                          onSelectProduct(item);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "999px",
                          background: "transparent",
                          border: "1px solid #2b130c",
                          color: "#2b130c",
                          fontSize: "8.5px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Explore Piece
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tracking Modal */}
            {trackingOrder && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(35, 17, 12, 0.65)",
                  backdropFilter: "blur(8px)",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 9999,
                  padding: "20px",
                }}
                onClick={() => setTrackingOrder(null)}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    maxWidth: "500px",
                    width: "100%",
                    padding: "28px",
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <div>
                      <span style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.16em", color: "#7d2616", textTransform: "uppercase" }}>
                        White-Glove Courier Dispatch
                      </span>
                      <h3 style={{ font: "500 24px 'Cormorant Garamond', serif", color: "#2b130c", margin: "2px 0 0" }}>
                        Tracking #{trackingOrder.id}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTrackingOrder(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "6px" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ background: "rgba(250, 246, 240, 0.8)", padding: "14px 18px", borderRadius: "12px", marginBottom: "18px" }}>
                    <div style={{ fontSize: "11px", color: "#2b130c" }}>
                      Waybill Number: <b>{trackingOrder.trackingNumber}</b>
                    </div>
                    <div style={{ fontSize: "10px", color: "#765d50", marginTop: "3px" }}>
                      Carrier: BlueDart White-Glove Express Air · Estimated: {trackingOrder.eta}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingLeft: "10px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <CheckCircle2 size={16} style={{ color: "#2e6930", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <b style={{ fontSize: "11px", color: "#2b130c", display: "block" }}>Order Authorized & Hand-Packed</b>
                        <small style={{ fontSize: "9px", color: "#765d50" }}>Maison Mumbai Atelier Hub</small>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <Truck size={16} style={{ color: "#c18847", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <b style={{ fontSize: "11px", color: "#2b130c", display: "block" }}>In Express Transit</b>
                        <small style={{ fontSize: "9px", color: "#765d50" }}>Air Cargo Route to Destination City Hub</small>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <Clock size={16} style={{ color: "#8c766a", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <b style={{ fontSize: "11px", color: "#2b130c", display: "block" }}>White-Glove Courier Delivery</b>
                        <small style={{ fontSize: "9px", color: "#765d50" }}>Recipient Verification at Residence</small>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTrackingOrder(null)}
                    style={{
                      marginTop: "22px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "999px",
                      background: "#2b130c",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Close Tracking Window
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             UNAUTHENTICATED STATE: Clean, Centered Member Atelier Sign-In
             ========================================================================= */
          <div className="auth-card" style={{ maxWidth: "460px", margin: "0 auto" }}>
            <div className="auth-icon-wrap">
              <Sparkles size={20} strokeWidth={2} style={{ color: "#c18847" }} />
            </div>

            <span className="auth-eyebrow">MAISON SHE’AURA MEMBER ATELIER</span>
            <h2 className="auth-title">
              {authMode === "signup" ? "Begin Your Aura Story" : "Welcome to She’Aura"}
            </h2>
            <p className="auth-sub">
              {authMode === "signup"
                ? "Join the private inner circle for complimentary white-glove shipping and personalized cosmetics."
                : "Sign in with your email to access your rituals, orders, and personalised shade recommendations."}
            </p>

            {/* Auth Mode Toggle */}
            <div className="auth-mode-toggle" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <button
                type="button"
                className={authMode === "signin" ? "active" : ""}
                onClick={() => {
                  setAuthMode("signin");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={authMode === "signup" ? "active" : ""}
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
              >
                Create Account
              </button>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
            {successMsg && <div className="auth-success-banner">{successMsg}</div>}

            <form onSubmit={authMode === "signup" ? handleSignUp : handleSignIn} className="auth-form">
              {authMode === "signup" && (
                <div className="auth-field">
                  <label>Full Name</label>
                  <div className="input-wrap">
                    <User size={15} className="field-icon" />
                    <input
                      type="text"
                      placeholder="Aaradhya Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label>Email Address</label>
                <div className="input-wrap">
                  <Mail size={15} className="field-icon" />
                  <input
                    type="email"
                    placeholder="client@sheaura.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Password</label>
                  <button
                    type="button"
                    className="password-toggle-text"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="input-wrap">
                  <Lock size={15} className="field-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={busy}>
                {busy ? "Authenticating Session…" : authMode === "signup" ? "Create Member Account" : "Sign In Securely"}
              </button>
            </form>

            {/* Quick Demo Fillers for Fast Testing */}
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px dashed rgba(223, 184, 149, 0.45)", textAlign: "center" }}>
              <span style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8c766a", display: "block", marginBottom: "8px" }}>
                Instant VIP Testing Credentials
              </span>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("client@sheaura.com");
                    setPassword("sheaura2025!");
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(43, 19, 12, 0.2)",
                    background: "#ffffff",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <User size={10} />
                  <span>VIP Member Demo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
