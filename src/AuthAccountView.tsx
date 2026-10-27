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
import {
  generateInvoiceHtml,
  buildInvoiceDataFromAdminOrder,
  downloadInvoiceHtml,
  InvoiceData,
} from "./lib/invoice";
import { getTaxSettings } from "./lib/taxSettings";
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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CreditCard,
  Tag,
  HelpCircle,
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

  // Expanded Order Dossier Accordions
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);
  const [supportModalOrder, setSupportModalOrder] = useState<OrderHistoryItem | null>(null);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, trackingKey: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedTrackingId(trackingKey);
    showNotification(`Copied to clipboard: ${text}`);
    setTimeout(() => {
      setCopiedTrackingId((current) => (current === trackingKey ? null : current));
    }, 2500);
  };

  const handleBuyAgain = (item: any) => {
    const foundProduct = products.find(
      (p) =>
        (item.productId && (p.slug === item.productId || p.id === item.productId)) ||
        p.name.toLowerCase() === item.name.toLowerCase()
    );

    if (foundProduct && onAddToCart) {
      onAddToCart(foundProduct);
      showNotification(`Added ${foundProduct.name} to your vanity bag!`);
      if (onOpenCart) onOpenCart();
    } else if (onAddToCart) {
      const fallbackProd: Product = {
        id: item.productId || `reorder-${Date.now()}`,
        name: item.name,
        category: "Cosmetics",
        price: item.price || `₹${item.unitPrice || 899}`,
        image: item.image || FALLBACK_PRODUCT_IMAGE,
        description: `Signature She'Aura couture formula - ${item.shade || "Selected Shade"}`,
        shades: item.shade ? [item.shade] : ["Signature Shade"],
        rating: 4.9,
        reviewsCount: 142,
        isBestseller: true,
      };
      onAddToCart(fallbackProd);
      showNotification(`Added ${item.name} to your vanity bag!`);
      if (onOpenCart) onOpenCart();
    }
  };

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

  // Sync orders from Supabase & Local Session with rich e-commerce dossier fields
  const fetchOrders = async (userEmail: string, localOrders: OrderHistoryItem[] = []) => {
    setLoadingOrders(true);
    let combined = [...localOrders];

    const parseOrderItems = (raw: any, fallbackPriceNum: number) => {
      let itemsList: any[] = [];
      if (Array.isArray(raw)) {
        itemsList = raw;
      } else if (typeof raw === "string") {
        try {
          itemsList = JSON.parse(raw);
        } catch {
          itemsList = [];
        }
      }

      if (!Array.isArray(itemsList) || itemsList.length === 0) {
        return [
          {
            id: "item-default",
            productId: "lip-01",
            name: "Maison Haute Couture Formulation",
            shade: "Signature Shade",
            quantity: 1,
            unitPrice: fallbackPriceNum || 1099,
            itemTotal: fallbackPriceNum || 1099,
            price: `₹${(fallbackPriceNum || 1099).toLocaleString("en-IN")}`,
            image: FALLBACK_PRODUCT_IMAGE,
          },
        ];
      }

      return itemsList.map((i: any, idx: number) => {
        const qty = Number(i.quantity) || 1;
        const uPrice =
          Number(i.unitPrice) ||
          Number(i.priceNum) ||
          (typeof i.price === "number" ? i.price : parseInt(String(i.price || "").replace(/[^0-9]/g, ""), 10)) ||
          Math.round((fallbackPriceNum || 1099) / Math.max(1, qty));
        const total = Number(i.itemTotal) || uPrice * qty;

        return {
          id: i.id || i.productId || `item-${idx}`,
          productId: i.productId || i.slug || i.id || `prod-${idx}`,
          name: i.name || "Maison Cosmetic Creation",
          shade: i.selectedShade || i.shade || i.category || "Signature Shade",
          quantity: qty,
          unitPrice: uPrice,
          itemTotal: total,
          price: `₹${uPrice.toLocaleString("en-IN")}`,
          image: i.image || FALLBACK_PRODUCT_IMAGE,
        };
      });
    };

    if (isSupabaseConfigured && userEmail) {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .or(`client_email.ilike.%${userEmail}%,customer_email.ilike.%${userEmail}%`)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: OrderHistoryItem[] = data.map((d: any) => {
            const rawPriceNum =
              typeof d.total_price === "number"
                ? d.total_price
                : parseFloat(String(d.total_amount || "").replace(/[^0-9.]/g, "")) || 0;

            const formattedItems = parseOrderItems(d.items, rawPriceNum);

            const createdDate = d.created_at
              ? new Date(d.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent Order";

            const exactTime = d.created_at
              ? new Date(d.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";

            const totalStr =
              d.total_amount && d.total_amount !== "₹0"
                ? d.total_amount
                : `₹${rawPriceNum.toLocaleString("en-IN")}`;

            const calculatedSubtotal =
              Number(d.subtotal) ||
              formattedItems.reduce((acc, it) => acc + (it.itemTotal || it.unitPrice || 0), 0) ||
              rawPriceNum;

            return {
              id: d.id,
              date: createdDate,
              exactTime,
              itemsCount: d.items_count || formattedItems.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1,
              totalAmount: totalStr,
              rawTotal: rawPriceNum,
              subtotal: calculatedSubtotal,
              discountCode: d.discount_code || undefined,
              discountAmount: Number(d.discount_amount || d.discount || 0),
              shippingFee: Number(d.shipping_fee || 0),
              paymentMethod: d.payment_method
                ? d.payment_method.toLowerCase() === "cod"
                  ? "Cash on Delivery"
                  : `${d.payment_method.toUpperCase()} / Instant Prepaid`
                : "Prepaid UPI / Card",
              paymentStatus: d.payment_status || (d.payment_method === "cod" ? "Awaiting Delivery" : "Paid & Verified"),
              shippingAddress: d.shipping_address || "",
              recipientName: d.customer_name || d.client_name || user?.fullName || "Maison Member",
              recipientPhone: d.customer_phone || d.client_phone || user?.phone || "",
              carrierName:
                d.carrier_name ||
                (d.tracking_number?.startsWith("EXP")
                  ? "BlueDart Express White-Glove Air"
                  : "BlueDart Express Air"),
              status: d.status === "delivered" ? "delivered" : d.status === "dispatched" ? "dispatched" : "processing",
              trackingNumber: d.tracking_number || "Awaiting Dispatch Scan",
              eta: d.eta || (d.status === "delivered" ? "Delivered to Residence" : "Arriving in 2-3 Business Days"),
              items: formattedItems,
            };
          });

          // Check localStorage live cache for instant cross-tab sync
          const existingIds = new Set(mapped.map((m) => m.id));
          try {
            const rawLive = localStorage.getItem("sheaura_live_orders_v2");
            if (rawLive) {
              const liveList = JSON.parse(rawLive);
              if (Array.isArray(liveList)) {
                liveList.forEach((lo: any) => {
                  const cEmail = (lo.customer_email || lo.client_email || "").toLowerCase();
                  if (cEmail === userEmail.toLowerCase() && !existingIds.has(lo.id)) {
                    existingIds.add(lo.id);
                    const rawNum =
                      typeof lo.total_price === "number"
                        ? lo.total_price
                        : parseFloat(String(lo.total_amount || "").replace(/[^0-9.]/g, "")) || 0;
                    const itemsParsed = parseOrderItems(lo.items, rawNum);

                    mapped.unshift({
                      id: lo.id,
                      date: lo.created_at
                        ? new Date(lo.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Today",
                      exactTime: lo.created_at
                        ? new Date(lo.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "",
                      itemsCount: lo.items_count || itemsParsed.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1,
                      totalAmount:
                        lo.total_amount && lo.total_amount !== "₹0"
                          ? lo.total_amount
                          : `₹${rawNum.toLocaleString("en-IN")}`,
                      rawTotal: rawNum,
                      subtotal:
                        Number(lo.subtotal) ||
                        itemsParsed.reduce((acc, it) => acc + (it.itemTotal || it.unitPrice || 0), 0) ||
                        rawNum,
                      discountCode: lo.discount_code || undefined,
                      discountAmount: Number(lo.discount_amount || lo.discount || 0),
                      shippingFee: Number(lo.shipping_fee || 0),
                      paymentMethod: lo.payment_method
                        ? lo.payment_method.toLowerCase() === "cod"
                          ? "Cash on Delivery"
                          : `${lo.payment_method.toUpperCase()} / Instant Prepaid`
                        : "Prepaid UPI / Card",
                      paymentStatus:
                        lo.payment_status || (lo.payment_method === "cod" ? "Awaiting Delivery" : "Paid & Verified"),
                      shippingAddress: lo.shipping_address || "",
                      recipientName: lo.customer_name || lo.client_name || user?.fullName || "Maison Member",
                      recipientPhone: lo.customer_phone || lo.client_phone || user?.phone || "",
                      carrierName: "BlueDart Express White-Glove Air",
                      status: lo.status || "processing",
                      trackingNumber: lo.tracking_number || "Awaiting Dispatch Scan",
                      eta: lo.eta || "Arriving in 2-3 Business Days",
                      items: itemsParsed,
                    });
                  }
                });
              }
            }
          } catch {}

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

  // Load and listen to auth state and live order events
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

    const handleLiveOrderRefresh = () => {
      const active = getCurrentUser();
      if (active?.email) {
        fetchOrders(active.email, active.orders || []);
      }
    };

    window.addEventListener("sheaura:orders-updated", handleLiveOrderRefresh);
    window.addEventListener("sheaura:order-created", handleLiveOrderRefresh);

    return () => {
      unsubscribe();
      window.removeEventListener("sheaura:orders-updated", handleLiveOrderRefresh);
      window.removeEventListener("sheaura:order-created", handleLiveOrderRefresh);
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

  // Download Dynamic Statutory GST Tax Invoice
  const handleDownloadInvoice = (order: OrderHistoryItem) => {
    try {
      const numericTotal =
        order.rawTotal ||
        parseInt(order.totalAmount.replace(/[^0-9]/g, ""), 10) ||
        1099;

      const payload = {
        id: order.id,
        orderId: order.id,
        created_at: order.date,
        total_price: numericTotal,
        total_amount: order.totalAmount,
        subtotal: order.subtotal || numericTotal,
        discount: order.discountAmount || 0,
        discount_amount: order.discountAmount || 0,
        discount_code: order.discountCode,
        shipping_fee: order.shippingFee || 0,
        customer_name: order.recipientName || userDisplayName,
        client_name: order.recipientName || userDisplayName,
        customer_email: userEmail,
        client_email: userEmail,
        customer_phone: order.recipientPhone || addressForm.phone || user?.phone || "+91 98765 43210",
        client_phone: order.recipientPhone || addressForm.phone || user?.phone || "+91 98765 43210",
        shipping_address:
          order.shippingAddress ||
          `${addressForm.street || "Atelier Residence"}, ${addressForm.city || "Mumbai"}, ${addressForm.state || "Maharashtra"} - ${addressForm.postalCode || "400050"}`,
        payment_method: order.paymentMethod || "UPI / Instant Prepaid",
        payment_status: order.paymentStatus || "COMPLETED",
        status: order.status,
        items: order.items.map((item) => ({
          name: item.name,
          shade: item.shade,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || Math.round(numericTotal / Math.max(1, order.items.length)),
          itemTotal: item.itemTotal || (item.unitPrice ? item.unitPrice * (item.quantity || 1) : undefined),
          price: item.price,
        })),
        items_count: order.itemsCount,
      };

      const invoiceData = buildInvoiceDataFromAdminOrder(payload);
      downloadInvoiceHtml(invoiceData);
      showNotification(`✓ Statutory Tax Invoice for Order #${order.id} downloaded successfully.`);
    } catch (err) {
      console.error("[AccountView] Invoice generation notice:", err);
      showNotification("Could not generate tax invoice. Please try again.");
    }
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
                    const isExpanded = expandedOrderIds.has(ord.id);

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
                          transition: "all 0.25s ease",
                        }}
                      >
                        {/* Order Header: ID, Placement Timestamp, Status & Payment Pill */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "12px",
                            paddingBottom: "14px",
                            borderBottom: "1px solid rgba(223, 184, 149, 0.25)",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span
                                style={{
                                  font: "700 12px/1 'Plus Jakarta Sans', sans-serif",
                                  letterSpacing: "0.12em",
                                  color: "#2b130c",
                                  textTransform: "uppercase",
                                }}
                              >
                                ORDER #{ord.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ord.id, `ord-${ord.id}`)}
                                title="Copy Order ID"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "3px 6px",
                                  cursor: "pointer",
                                  color: copiedTrackingId === `ord-${ord.id}` ? "#2e6930" : "#a36a3b",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "9px",
                                  fontWeight: 600,
                                }}
                              >
                                {copiedTrackingId === `ord-${ord.id}` ? (
                                  <>
                                    <Check size={11} strokeWidth={2.6} />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "10px", color: "#8c766a" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Calendar size={11} style={{ color: "#a36a3b" }} />
                                Placed on <b>{ord.date}</b> {ord.exactTime ? `at ${ord.exactTime}` : ""}
                              </span>
                              <span>•</span>
                              <span>
                                {ord.itemsCount} piece{ord.itemsCount > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Status and Settlement Badges */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {ord.discountCode && (
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontSize: "8.5px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  background: "rgba(125, 38, 22, 0.08)",
                                  color: "#7d2616",
                                  border: "1px dashed rgba(125, 38, 22, 0.3)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Tag size={10} />
                                {ord.discountCode}
                              </span>
                            )}

                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "999px",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                background: "rgba(43, 19, 12, 0.05)",
                                color: "#2b130c",
                                border: "1px solid rgba(43, 19, 12, 0.12)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CreditCard size={10} style={{ color: "#a36a3b" }} />
                              {ord.paymentStatus || "Verified"}
                            </span>

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
                                gap: "6px",
                                background: isDelivered
                                  ? "rgba(46, 105, 48, 0.1)"
                                  : isDispatched
                                  ? "rgba(193, 136, 71, 0.15)"
                                  : "rgba(125, 38, 22, 0.08)",
                                color: isDelivered ? "#2e6930" : isDispatched ? "#8f5319" : "#7d2616",
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
                                  animation: !isDelivered ? "pulse 2s infinite" : "none",
                                }}
                              />
                              {isDelivered
                                ? "DELIVERED TO RESIDENCE"
                                : isDispatched
                                ? "IN WHITE-GLOVE TRANSIT"
                                : "PROCESSING AT ATELIER"}
                            </span>
                          </div>
                        </div>

                        {/* Delivery Promise / Expected Arrival Banner */}
                        <div
                          style={{
                            background: isDelivered ? "rgba(46, 105, 48, 0.05)" : "rgba(250, 246, 240, 0.8)",
                            borderRadius: "12px",
                            padding: "10px 16px",
                            border: `1px solid ${isDelivered ? "rgba(46, 105, 48, 0.2)" : "rgba(223, 184, 149, 0.3)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {isDelivered ? (
                              <CheckCircle2 size={16} style={{ color: "#2e6930" }} />
                            ) : (
                              <Truck size={16} style={{ color: "#a36a3b" }} />
                            )}
                            <span style={{ fontSize: "11px", color: isDelivered ? "#2e6930" : "#2b130c", fontWeight: 600 }}>
                              {isDelivered ? (
                                `Delivered safely to your residence on ${ord.date}`
                              ) : (
                                <>
                                  Estimated Arrival: <b>{ord.eta}</b> via {ord.carrierName || "BlueDart White-Glove Air"}
                                </>
                              )}
                            </span>
                          </div>

                          <div style={{ fontSize: "10px", color: "#765d50" }}>
                            AWB: <b style={{ color: "#2b130c" }}>{ord.trackingNumber}</b>
                          </div>
                        </div>

                        {/* Visual 4-Stage Fulfillment Stepper */}
                        <div
                          style={{
                            background: "rgba(250, 246, 240, 0.6)",
                            borderRadius: "14px",
                            padding: "14px 18px",
                            border: "1px solid rgba(223, 184, 149, 0.25)",
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
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  background: "#2b130c",
                                  color: "#ffffff",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                  boxShadow: "0 2px 6px rgba(43, 19, 12, 0.2)",
                                }}
                              >
                                <Check size={12} strokeWidth={2.8} />
                              </div>
                              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#2b130c", display: "block" }}>
                                Order Confirmed
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>Payment Verified</small>
                            </div>

                            {/* Step 2: Preparing */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  background: "#2b130c",
                                  color: "#ffffff",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                  boxShadow: "0 2px 6px rgba(43, 19, 12, 0.2)",
                                }}
                              >
                                <Check size={12} strokeWidth={2.8} />
                              </div>
                              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#2b130c", display: "block" }}>
                                Atelier Packing
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>Silk Hand-Wrapped</small>
                            </div>

                            {/* Step 3: Dispatched */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  background: isDispatched || isDelivered ? "#2b130c" : "rgba(43, 19, 12, 0.15)",
                                  color: isDispatched || isDelivered ? "#ffffff" : "#765d50",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                {isDispatched || isDelivered ? <Truck size={12} /> : <Clock size={12} />}
                              </div>
                              <span
                                style={{
                                  fontSize: "8.5px",
                                  fontWeight: 700,
                                  color: isDispatched || isDelivered ? "#2b130c" : "#8c766a",
                                  display: "block",
                                }}
                              >
                                In Transit
                              </span>
                              <small style={{ fontSize: "7.5px", color: "#8c766a" }}>
                                {ord.trackingNumber?.startsWith("EXP") ? "BlueDart Air" : "Express Transit"}
                              </small>
                            </div>

                            {/* Step 4: Delivered */}
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  background: isDelivered ? "#2e6930" : "rgba(43, 19, 12, 0.15)",
                                  color: isDelivered ? "#ffffff" : "#765d50",
                                  display: "grid",
                                  placeItems: "center",
                                  margin: "0 auto 4px",
                                }}
                              >
                                {isDelivered ? <Check size={12} strokeWidth={2.8} /> : <Home size={12} />}
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
                                {isDelivered ? "Residence Delivery" : "Final Route"}
                              </small>
                            </div>
                          </div>
                        </div>

                        {/* WHAT She Ordered: High-End Item Manifest with Line Pricing & "Buy Again" */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8c766a" }}>
                            Itemized Manifest ({ord.items.length} {ord.items.length > 1 ? "Items" : "Item"})
                          </span>

                          {ord.items.map((item, idx) => {
                            const qty = item.quantity || 1;
                            const unitPriceVal = item.unitPrice || 899;
                            const lineTotalVal = item.itemTotal || unitPriceVal * qty;

                            return (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: "14px",
                                  padding: "12px 14px",
                                  borderRadius: "12px",
                                  background: "#fcfaf7",
                                  border: "1px solid rgba(223, 184, 149, 0.3)",
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
                                      width: "56px",
                                      height: "56px",
                                      borderRadius: "10px",
                                      objectFit: "cover",
                                      border: "1px solid rgba(223, 184, 149, 0.35)",
                                      flexShrink: 0,
                                      backgroundColor: "#ffffff",
                                    }}
                                  />
                                  <div>
                                    <h4
                                      style={{
                                        font: "600 17px/1.2 'Cormorant Garamond', serif",
                                        color: "#2b130c",
                                        margin: "0 0 4px",
                                      }}
                                    >
                                      {item.name}
                                    </h4>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      <span
                                        style={{
                                          fontSize: "9px",
                                          padding: "2px 8px",
                                          borderRadius: "999px",
                                          background: "rgba(193, 136, 71, 0.12)",
                                          color: "#7d4416",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Shade: {item.shade}
                                      </span>
                                      <span style={{ fontSize: "10px", color: "#8c766a" }}>
                                        Qty: <b>{qty}</b> × ₹{unitPriceVal.toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                  <div style={{ textAlign: "right" }}>
                                    <span style={{ fontSize: "8.5px", color: "#8c766a", display: "block" }}>Item Subtotal</span>
                                    <b style={{ font: "700 13px/1 'Plus Jakarta Sans', sans-serif", color: "#2b130c" }}>
                                      ₹{lineTotalVal.toLocaleString("en-IN")}
                                    </b>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleBuyAgain(item)}
                                    title="Add this creation back to your vanity bag"
                                    style={{
                                      padding: "7px 12px",
                                      borderRadius: "999px",
                                      background: "#ffffff",
                                      border: "1px solid rgba(43, 19, 12, 0.3)",
                                      color: "#2b130c",
                                      fontSize: "8.5px",
                                      fontWeight: 700,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <RotateCcw size={10} style={{ color: "#7d2616" }} />
                                    <span>Buy Again</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Collapsible Order Dossier: WHERE Is It, Logistics, and Financial Breakdown */}
                        {isExpanded && (
                          <div
                            style={{
                              background: "#fcfaf7",
                              border: "1px solid rgba(223, 184, 149, 0.4)",
                              borderRadius: "14px",
                              padding: "20px",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: "20px",
                              animation: "fadeIn 0.3s ease",
                            }}
                          >
                            {/* Dossier Pillar 1: WHERE Is It (Delivery Destination) */}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <MapPin size={13} style={{ color: "#7d2616" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2b130c" }}>
                                  Delivery Residence
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#2b130c", lineHeight: "1.6" }}>
                                <b>{ord.recipientName || userDisplayName}</b>
                                <div style={{ color: "#765d50", marginTop: "2px" }}>
                                  {ord.shippingAddress || `${addressForm.street || "Haute Luxury Residence"}, ${addressForm.city || "Mumbai"}, ${addressForm.state || "Maharashtra"} - ${addressForm.postalCode || "400001"}`}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", color: "#8c766a", fontSize: "10px" }}>
                                  <Phone size={10} style={{ color: "#a36a3b" }} />
                                  <span>{ord.recipientPhone || addressForm.phone || user?.phone || "+91 (Mobile on file)"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Dossier Pillar 2: Logistics & Air Courier Waybill */}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <Truck size={13} style={{ color: "#a36a3b" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2b130c" }}>
                                  Courier & Live Waybill
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#2b130c", lineHeight: "1.6" }}>
                                <div>
                                  Carrier: <b>{ord.carrierName || "BlueDart Express White-Glove Air"}</b>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                                  <span>AWB: <b>{ord.trackingNumber}</b></span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(ord.trackingNumber, `awb-${ord.trackingNumber}`)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: copiedTrackingId === `awb-${ord.trackingNumber}` ? "#2e6930" : "#7d2616",
                                      padding: "0",
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    {copiedTrackingId === `awb-${ord.trackingNumber}` ? (
                                      <>
                                        <Check size={10} />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={10} />
                                        <span>Copy AWB</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div style={{ fontSize: "10px", color: "#765d50", marginTop: "4px" }}>
                                  Current Status: {isDelivered ? "Delivered & Signed" : "Transit via Direct Metro Hub"}
                                </div>
                              </div>
                            </div>

                            {/* Dossier Pillar 3: Financial Settlement & Tax Receipt */}
                            <div style={{ borderLeft: "1px solid rgba(223, 184, 149, 0.25)", paddingLeft: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <FileText size={13} style={{ color: "#2e6930" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2b130c" }}>
                                  Settlement & Tax
                                </span>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10.5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#765d50" }}>
                                  <span>Items Subtotal:</span>
                                  <span>₹{(ord.subtotal || ord.rawTotal || 1099).toLocaleString("en-IN")}</span>
                                </div>
                                {ord.discountAmount ? (
                                  <div style={{ display: "flex", justifyContent: "space-between", color: "#7d2616", fontWeight: 600 }}>
                                    <span>Privilege ({ord.discountCode || "Promo"}):</span>
                                    <span>-₹{ord.discountAmount.toLocaleString("en-IN")}</span>
                                  </div>
                                ) : null}
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#2e6930" }}>
                                  <span>White-Glove Shipping:</span>
                                  <span>COMPLIMENTARY</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#8c766a", fontSize: "9.5px" }}>
                                  <span>Statutory Tax (GST):</span>
                                  <span>Included In Total</span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    color: "#2b130c",
                                    fontWeight: 700,
                                    paddingTop: "6px",
                                    borderTop: "1px dashed rgba(223, 184, 149, 0.5)",
                                    fontSize: "12px",
                                  }}
                                >
                                  <span>Net Total Paid:</span>
                                  <span>{ord.totalAmount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Order Footer & Action Controls */}
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
                          {/* Left: Accordion Expand Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleOrderExpanded(ord.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: "#2b130c",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span>{isExpanded ? "Hide Order Dossier" : "View Full Order Dossier"}</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {/* Right: Action Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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

                            <button
                              type="button"
                              onClick={() => setSupportModalOrder(ord)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "999px",
                                border: "1px solid rgba(43, 19, 12, 0.2)",
                                background: "transparent",
                                color: "#765d50",
                                fontSize: "8.5px",
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <HelpCircle size={11} />
                              <span>Concierge Help</span>
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
                      Carrier: {trackingOrder.carrierName || "BlueDart White-Glove Express Air"} · Estimated: {trackingOrder.eta}
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

            {/* Concierge Order Support Modal */}
            {supportModalOrder && (
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
                onClick={() => setSupportModalOrder(null)}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    maxWidth: "520px",
                    width: "100%",
                    padding: "32px",
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.16em", color: "#7d2616", textTransform: "uppercase" }}>
                        Maison She’Aura Priority Care
                      </span>
                      <h3 style={{ font: "500 24px 'Cormorant Garamond', serif", color: "#2b130c", margin: "2px 0 4px" }}>
                        Concierge Assistance
                      </h3>
                      <p style={{ fontSize: "11px", color: "#765d50", margin: 0 }}>
                        Reference: Order <b>#{supportModalOrder.id}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSupportModalOrder(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "6px" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div
                    style={{
                      background: "rgba(250, 246, 240, 0.85)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      border: "1px solid rgba(223, 184, 149, 0.4)",
                      marginBottom: "20px",
                    }}
                  >
                    <p style={{ fontSize: "11px", color: "#2b130c", lineHeight: "1.6", margin: "0 0 10px" }}>
                      Our dedicated beauty advisors and dispatch managers are ready to assist with address modifications, courier escalation, or shade exchanges.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2b130c" }}>
                        <Phone size={13} style={{ color: "#7d2616" }} />
                        <span>Direct Atelier Hotline: <b>+91 (022) 2854-AURA (2872)</b></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2b130c" }}>
                        <Mail size={13} style={{ color: "#a36a3b" }} />
                        <span>Priority Email: <b>concierge@sheaura.com</b></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2b130c" }}>
                        <Clock size={13} style={{ color: "#2e6930" }} />
                        <span>Operating Hours: <b>Mon – Sun · 8:00 AM – 10:00 PM IST</b></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <a
                      href={`mailto:concierge@sheaura.com?subject=Inquiry for She'Aura Order %23${supportModalOrder.id}&body=Hello Concierge Team,%0D%0A%0D%0AI would like assistance with my order %23${supportModalOrder.id}.`}
                      style={{
                        flex: 1,
                        padding: "11px",
                        borderRadius: "999px",
                        background: "#2b130c",
                        color: "#ffffff",
                        textAlign: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Mail size={12} />
                      <span>Email Concierge</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setSupportModalOrder(null)}
                      style={{
                        padding: "11px 20px",
                        borderRadius: "999px",
                        background: "transparent",
                        border: "1px solid rgba(43, 19, 12, 0.3)",
                        color: "#2b130c",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
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
