import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  User,
  ShoppingBag,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  IndianRupee,
  Layers,
  MapPin,
  Phone,
  Mail,
  X,
  CreditCard,
  Tag,
  Percent,
  Award,
  Check,
  Trash2,
  Copy,
  Plus,
  Upload,
  Image as ImageIcon,
  Sparkles,
  FileText,
  Printer,
  Download,
  AlertTriangle,
  TrendingUp,
  Boxes,
  LayoutDashboard,
  Settings,
  Eye,
  LogOut,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { getAdminSession, clearAdminSession } from "./lib/auth";
import {
  getAllCoupons,
  addAdminCoupon,
  toggleCouponStatus,
  deleteCoupon,
  computeCouponRankings,
  Coupon,
  CouponRankingItem,
} from "./lib/couponStore";
import {
  normalizeCategory,
  CATEGORY_OPTIONS,
  saveLocalCustomProduct,
  deleteLocalCustomProduct,
  getLocalCustomProducts,
} from "./lib/catalog";
import {
  buildInvoiceDataFromAdminOrder,
  generateInvoiceHtml,
  downloadInvoiceHtml,
  printInvoiceHtml,
  InvoiceData,
} from "./lib/invoice";
import {
  getTaxSettings,
  saveTaxSettings,
  validateGstin,
  INDIAN_STATES_MAP,
  TaxSettings,
} from "./lib/taxSettings";
import SheAuraLogo from "./SheAuraLogo";

export interface AdminOrderItem {
  productId: string;
  name: string;
  shade?: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  image?: string;
}

export interface AdminOrder {
  id: string;
  client_name: string;
  customer_name?: string;
  client_email: string;
  customer_email?: string;
  client_phone: string;
  customer_phone?: string;
  shipping_address: string;
  items: AdminOrderItem[] | string;
  items_count: number;
  total_amount: string;
  subtotal?: number;
  discount?: number;
  discount_code?: string;
  discount_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  total_price?: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  gateway_payment_id?: string;
  status: "pending" | "processing" | "dispatched" | "delivered" | "cancelled";
  tracking_number?: string | null;
  eta?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerSummary {
  name: string;
  email: string;
  phone: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock_quantity?: number;
  image?: string;
  images?: string[];
  gallery?: string[];
  description?: string;
  short_description?: string;
  ingredients?: string;
  finish?: string;
  mood?: string;
  tag?: string;
  tone?: string;
  note?: string;
  is_published?: boolean;
}

interface AdminViewProps {
  onBack: () => void;
  reels?: any;
  onSelectProduct?: (product: any) => void;
}

const FALLBACK_PRODUCTS: AdminProduct[] = [
  { id: "1", name: "Pink Blossom Blush", slug: "pink-blossom-blush", category: "Blushes", price: 899, stock_quantity: 42, image: "/products/Pink Blossom Blush.webp", images: ["/products/Pink Blossom Blush.webp"] },
  { id: "2", name: "Peach Blossom Blush", slug: "peach-blossom-blush", category: "Blushes", price: 899, stock_quantity: 38, image: "/products/Peach Blossom Blush.webp", images: ["/products/Peach Blossom Blush.webp"] },
  { id: "3", name: "Cherry Blossom Blush", slug: "cherry-blossom-blush", category: "Blushes", price: 899, stock_quantity: 26, image: "/products/Cherry Blossom Blush.webp", images: ["/products/Cherry Blossom Blush.webp"] },
  { id: "4", name: "Scarlet Rose Lipstick", slug: "scarlet-rose-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 54, image: "/products/Minimal_design/Scarlet Rose Lipstick_still.png", images: ["/products/Scarlet Rose Lipstick.webp", "/products/Minimal_design/Scarlet Rose Lipstick_still.png"] },
  { id: "5", name: "Roseberry Lipstick", slug: "roseberry-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 48, image: "/products/Roseberry Lipstick.webp", images: ["/products/Roseberry Lipstick.webp"] },
  { id: "6", name: "Blush Rose Lipstick", slug: "blush-rose-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 35, image: "/products/Blush Rose Lipstick.webp", images: ["/products/Blush Rose Lipstick.webp"] },
  { id: "7", name: "Orchid Lipstick", slug: "orchid-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 29, image: "/products/Orchid Lipstick.webp", images: ["/products/Orchid Lipstick.webp"] },
  { id: "8", name: "Molten Glow Highlighter · Sunflower", slug: "molten-glow-highlighter", category: "Body Highlighter Oil", price: 1199, stock_quantity: 18, image: "/products/Minimal_design/Highlighter simple.png", images: ["/products/Minimal_design/Highlighter simple.png"] },
  { id: "9", name: "Moonflower Highlighter Oil", slug: "moonflower-highlighter-oil", category: "Body Highlighter Oil", price: 1199, stock_quantity: 12, image: "/products/Moonflower Highlighter Oil.webp", images: ["/products/Moonflower Highlighter Oil.webp"] },
  { id: "10", name: "Hydrating Matte Foundation · Daffodil", slug: "hydrating-matte-foundation-daffodil", category: "Foundation", price: 1299, stock_quantity: 32, image: "/products/Daffodil.png", images: ["/products/Daffodil.png"] },
  { id: "11", name: "Hydrating Matte Foundation · Snowdrop", slug: "hydrating-matte-foundation-snowdrop", category: "Foundation", price: 1299, stock_quantity: 24, image: "/products/Snowdrop.png", images: ["/products/Snowdrop.png"] },
  { id: "12", name: "She’Aura Discovery Wardrobe", slug: "sheaura-discovery-wardrobe", category: "Wardrobe Collection", price: 3299, stock_quantity: 9, image: "/products/discovery-wardrobe-still.png", images: ["/products/discovery-wardrobe-still.png"] },
];

const PRODUCT_PRESETS = [
  {
    label: "💄 Lipsticks Preset",
    category: "Lipsticks",
    data: {
      name: "Velvet Sculpted Satin Lipstick",
      category: "Lipsticks",
      price: 1099,
      stock_quantity: 50,
      image: "/products/Scarlet Rose Lipstick.webp",
      tag: "Bestseller",
      tone: "#a81920",
      finish: "Sculpted satin",
      mood: "Runway Statement",
      note: "High-pigment scarlet with 16h botanical comfort",
      description: "An iconic scarlet lip crafted with cold-pressed camellia seed oil, damask rose wax, and micronized pigments for a transfer-proof, velvet-satin finish.",
      ingredients: "Camellia Seed Oil, Multi-Weight Hyaluronic Acid, Candelilla Wax, Botanical Pigments, Damask Rose Extract.",
    },
  },
  {
    label: "🌸 Blushes Preset",
    category: "Blushes",
    data: {
      name: "Luminous Silk Blossom Blush",
      category: "Blushes",
      price: 899,
      stock_quantity: 40,
      image: "/products/Pink Blossom Blush.webp",
      tag: "Viral Flush",
      tone: "#b8486e",
      finish: "Silk powder",
      mood: "Fresh Petal Radiance",
      note: "Micro-milled silky powder with blurred finish",
      description: "Housed in a keepsake gold compact, this micro-milled blush diffuses a romantic flush across cheekbones with a light-reflecting soft-focus blur.",
      ingredients: "Mica, Camellia Seed Oil, Squalane, Vitamin E, Damask Rose Floral Wax, Mineral Pigments.",
    },
  },
  {
    label: "✨ Body Highlighter Oil Preset",
    category: "Body Highlighter Oil",
    data: {
      name: "Molten Golden Shimmer Body Oil",
      category: "Body Highlighter Oil",
      price: 1199,
      stock_quantity: 35,
      image: "/products/Minimal_design/Highlighter simple.png",
      tag: "Goddess Glow",
      tone: "#c18847",
      finish: "Molten pearl glaze",
      mood: "Sunlit Radiance",
      note: "Dry botanical shimmer oil for collarbones and shoulders",
      description: "A decadent dry-oil formula infused with suspended 24K gold and bronze botanical micas that drench skin in sunlight without any greasy feel.",
      ingredients: "Jojoba Seed Oil, Sweet Almond Oil, Squalane, Mica, Titanium Dioxide, Iron Oxides, Rosehip Seed Oil.",
    },
  },
  {
    label: "🧴 Foundation Preset",
    category: "Foundation",
    data: {
      name: "Hydrating Featherweight Serum Foundation",
      category: "Foundation",
      price: 1299,
      stock_quantity: 45,
      image: "/products/Minimal_design/Complexion_foundation_still.jpg",
      tag: "Second-Skin Base",
      tone: "#e8c6a5",
      finish: "Natural dewy satin",
      mood: "Poreless Filter",
      note: "Medium buildable coverage infused with hyaluronic serum",
      description: "A breathable, second-skin foundation that evens complexion while feeding skin with plant squalane, multi-weight hyaluronic acid, and niacinamide.",
      ingredients: "Aqua, Plant Squalane, Niacinamide, Sodium Hyaluronate, Centella Asiatica Extract, Tocopherol, Iron Oxides.",
    },
  },
];

const ASSET_LIBRARY_PICKER = [
  { label: "Scarlet Rose Lipstick", path: "/products/Scarlet Rose Lipstick.webp", category: "Lipsticks" },
  { label: "Roseberry Lipstick", path: "/products/Roseberry Lipstick.webp", category: "Lipsticks" },
  { label: "Pink Blossom Blush", path: "/products/Pink Blossom Blush.webp", category: "Blushes" },
  { label: "Peach Blossom Blush", path: "/products/Peach Blossom Blush.webp", category: "Blushes" },
  { label: "Sunflower Glow Oil", path: "/products/Minimal_design/Highlighter simple.png", category: "Body Highlighter Oil" },
  { label: "Moonflower Oil", path: "/products/Body_Highlighter_Oil_Moonflower.webp", category: "Body Highlighter Oil" },
  { label: "Daffodil Foundation", path: "/products/Daffodil.webp", category: "Foundation" },
  { label: "Complexion Still", path: "/products/Minimal_design/Complexion_foundation_still.jpg", category: "Foundation" },
];

// She'Aura Storefront Luxury Theme & Coloring Tokens
const THEME = {
  paper: "#f8f0e5",                    // Signature warm parchment background
  cream: "#f4ece1",                    // Sidebar, table headers & modal accents
  creamLight: "#fbf8f5",               // Row hover & light card fills
  cardBg: "#ffffff",                   // Pure white luxury card surfaces
  ink: "#21130f",                      // Deep luxury espresso ink
  inkHover: "#3b231c",                 // Espresso hover
  inkMuted: "#765d50",                 // Warm secondary typography
  inkSubtle: "#8c766a",                // Muted metadata typography
  inkBorder: "rgba(42, 26, 20, 0.12)", // Delicate warm borders
  inkBorderSubtle: "rgba(42, 26, 20, 0.07)",
  gold: "#a36a3b",                     // Warm brand gold
  goldHover: "#8b562a",
  goldLight: "#dfb895",                // Soft sand accent
  goldBg: "rgba(163, 106, 59, 0.12)",
  greenBg: "#dbe8d7",                  // Live / Delivered / Healthy stock
  greenText: "#2d5e35",
  amberBg: "#faedd9",                  // Low stock / Dispatched
  amberText: "#8a5712",
  blueBg: "#e8eff7",                   // Processing
  blueText: "#1d4677",
  redBg: "#fae8e8",                    // Failed / Critical / Logout
  redText: "#a34d45",
  fontSerif: "'Cormorant Garamond', serif",
  fontSans: "'Montserrat', sans-serif",
};

export default function AdminView({ onBack }: AdminViewProps) {
  const [adminSession, setAdminSessionState] = useState(() => getAdminSession());
  const [activeTab, setActiveTab] = useState<"overview" | "creations" | "inventory" | "orders" | "coupons" | "customers" | "settings">("overview");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>(() => {
    const local = getLocalCustomProducts();
    if (local && local.length > 0) {
      const combined: AdminProduct[] = [];
      const seen = new Set<string>();
      local.forEach((row: any) => {
        const key = (row.slug || row.name || row.id).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            id: row.id || `local-${Date.now()}`,
            name: row.name,
            slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: normalizeCategory(row.category),
            price: typeof row.price === "number" ? row.price : parseFloat(row.price) || 999,
            stock_quantity: row.stock_quantity ?? 50,
            image: row.image_url || row.image || "/products/Peach Blossom Blush.webp",
            images: Array.isArray(row.images) && row.images.length > 0 ? row.images : [row.image_url || row.image || "/products/Peach Blossom Blush.webp"],
            description: row.description || row.short_description || "",
            short_description: row.short_description || "",
            ingredients: row.ingredients || "",
            finish: row.finish || "Sculpted satin",
            mood: row.mood || "The statement",
            tag: row.tag || "New",
            tone: row.tone || "#a81920",
            note: row.note || "",
            is_published: row.is_published ?? true,
          });
        }
      });
      FALLBACK_PRODUCTS.forEach((p) => {
        const key = p.slug.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(p);
        }
      });
      return combined;
    }
    return FALLBACK_PRODUCTS;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockHealthFilter, setStockHealthFilter] = useState<string>("all");
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<AdminOrder | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminOrder | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Product Creation & Management State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isRawImportOpen, setIsRawImportOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState("");
  const [imageSourceTab, setImageSourceTab] = useState<"upload" | "library" | "url">("upload");
  const [newImageUrl, setNewImageUrl] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    category: "Lipsticks",
    price: 1099,
    stock_quantity: 50,
    image: "/products/Scarlet Rose Lipstick.webp",
    images: ["/products/Scarlet Rose Lipstick.webp"],
    tag: "New Arrival",
    tone: "#a81920",
    finish: "Sculpted satin",
    mood: "Runway Statement",
    note: "High-pigment botanical scarlet with 16h comfort",
    description: "An iconic beauty piece crafted with botanical extracts in the She'Aura Atelier.",
    ingredients: "Organic Camellia Seed Oil, Multi-Weight Hyaluronic Acid, Candelilla Wax, Botanical Pigments.",
  });

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Coupons Management State
  const [coupons, setCoupons] = useState<Coupon[]>(() => getAllCoupons());
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState<boolean>(false);
  const [newCouponForm, setNewCouponForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    minSubtotal: 1500,
  });

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponForm.code.trim()) {
      showNotice("⚠️ Please enter a voucher code.");
      return;
    }
    const created = addAdminCoupon({
      code: newCouponForm.code,
      description: newCouponForm.description,
      discountType: newCouponForm.discountType,
      discountValue: Number(newCouponForm.discountValue) || 10,
      minSubtotal: Number(newCouponForm.minSubtotal) || 0,
    });
    setCoupons(getAllCoupons());
    setIsAddCouponModalOpen(false);
    setNewCouponForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      minSubtotal: 1500,
    });
    showNotice(`✨ Privilege voucher "${created.code}" created and activated.`);
  };

  const handleToggleCoupon = (code: string) => {
    const updated = toggleCouponStatus(code);
    setCoupons(getAllCoupons());
    if (updated) {
      if (updated.isActive) {
        showNotice(`✅ Voucher "${updated.code}" reactivated for checkout.`);
      } else {
        showNotice(`🛑 Voucher "${updated.code}" DISMANTLED. Customer checkout blocked.`);
      }
    }
  };

  const handleDeleteCoupon = (code: string) => {
    if (window.confirm(`Are you sure you wish to permanently decommission voucher "${code}"?`)) {
      deleteCoupon(code);
      setCoupons(getAllCoupons());
      showNotice(`🗑️ Voucher "${code}" deleted permanently.`);
    }
  };

  // Statutory Tax & GST / CST Settings State
  const [taxSettings, setTaxSettingsState] = useState<TaxSettings>(() => getTaxSettings());
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [taxSuccessNotice, setTaxSuccessNotice] = useState<string | null>(null);

  const gstinValidation = useMemo(() => {
    return validateGstin(taxSettings.gstin);
  }, [taxSettings.gstin]);

  const handleSaveTaxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTax(true);
    try {
      const saved = await saveTaxSettings(taxSettings);
      setTaxSettingsState(saved);
      showNotice("🏛️ Statutory GST & CST settings saved & synchronized with database.");
      setTaxSuccessNotice("Settings saved and live on all customer invoices!");
      setTimeout(() => setTaxSuccessNotice(null), 5000);
    } catch (err: any) {
      showNotice("⚠️ Failed to update tax settings.");
    } finally {
      setIsSavingTax(false);
    }
  };

  // Format order total cleanly without showing ₹0 if total_price exists
  const formatOrderTotal = (o: AdminOrder): string => {
    const totalNum =
      typeof o.total_price === "number" && o.total_price > 0
        ? o.total_price
        : parseInt(String(o.total_amount || "").replace(/[^0-9]/g, ""), 10) || 0;
    if (totalNum > 0) return `₹${totalNum.toLocaleString("en-IN")}`;
    if (o.total_amount && o.total_amount !== "₹0") return o.total_amount;
    return `₹${o.total_price || 0}`;
  };

  // Safe payment badge mapping for Admin tables
  const getPaymentStatusBadge = (o: AdminOrder) => {
    const raw = (o.payment_status || "").toLowerCase().trim();
    const method = (o.payment_method || "").toLowerCase().trim();
    if (raw === "paid" || raw === "captured" || raw === "completed" || raw === "settled" || raw === "confirmed") {
      return { label: "PAID", bg: THEME.greenBg, text: THEME.greenText };
    }
    if (raw === "pending_cod" || raw === "cod" || method.includes("cod") || method.includes("cash")) {
      return { label: "COD PENDING", bg: THEME.amberBg, text: THEME.amberText };
    }
    if (raw === "awaiting_payment" || raw === "awaiting" || raw === "processing") {
      return { label: "PROCESSING", bg: THEME.blueBg, text: THEME.blueText };
    }
    if (raw === "failed" || raw === "cancelled") {
      return { label: "FAILED", bg: THEME.redBg, text: THEME.redText };
    }
    return { label: "PAID", bg: THEME.greenBg, text: THEME.greenText };
  };

  // Load orders from Supabase + Local Shared Cache
  const fetchOrders = async () => {
    setLoading(true);
    try {
      let combinedOrders: AdminOrder[] = [];
      const seen = new Set<string>();

      // 1. Fetch from Supabase cloud
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach((o: any) => {
            if (!seen.has(o.id)) {
              seen.add(o.id);
              combinedOrders.push(o as AdminOrder);
            }
          });
        }
      }

      // 2. Fetch from local shared cache (instant cross-view trigger)
      try {
        const rawLocal = localStorage.getItem("sheaura_live_orders_v2");
        if (rawLocal) {
          const localOrders = JSON.parse(rawLocal);
          if (Array.isArray(localOrders)) {
            localOrders.forEach((o: any) => {
              if (!seen.has(o.id)) {
                seen.add(o.id);
                combinedOrders.push(o as AdminOrder);
              }
            });
          }
        }
      } catch {}

      setOrders(combinedOrders);
    } catch (err) {
      console.warn("[AdminView] Live orders fetch notice:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load products from Supabase + Local Cache
  const fetchProducts = async () => {
    try {
      const combined: AdminProduct[] = [];
      const seen = new Set<string>();

      // 1. Fetch live products from Supabase
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach((row: any) => {
            const key = (row.slug || row.name || row.id).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);

              let galleryImgs: string[] = [];
              if (Array.isArray(row.images) && row.images.length > 0) {
                row.images.forEach((img: any) => typeof img === "string" && img && galleryImgs.push(img));
              } else if (Array.isArray(row.gallery) && row.gallery.length > 0) {
                row.gallery.forEach((img: any) => typeof img === "string" && img && galleryImgs.push(img));
              } else if (typeof row.images === "string") {
                try {
                  const parsed = JSON.parse(row.images);
                  if (Array.isArray(parsed)) parsed.forEach((img) => typeof img === "string" && img && galleryImgs.push(img));
                } catch {}
              }
              if (galleryImgs.length === 0 && (row.image_url || row.image)) {
                galleryImgs.push(row.image_url || row.image);
              }

              combined.push({
                id: row.id,
                name: row.name,
                slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                category: normalizeCategory(row.category),
                price: typeof row.price === "number" ? row.price : parseFloat(row.price) || 999,
                stock_quantity: row.stock_quantity ?? 50,
                image: row.image_url || row.image || "/products/Peach Blossom Blush.webp",
                images: galleryImgs,
                gallery: galleryImgs,
                description: row.description || row.short_description || "",
                short_description: row.short_description || "",
                ingredients: row.ingredients || "",
                finish: row.finish || "Sculpted satin",
                mood: row.mood || "The statement",
                tag: row.tag || "New",
                tone: row.tone || "#a81920",
                note: row.note || "",
                is_published: row.is_published ?? true,
              });
            }
          });
        }
      }

      // 2. Fetch locally stored custom products
      const local = getLocalCustomProducts();
      local.forEach((row: any) => {
        const key = (row.slug || row.name || row.id).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const galleryImgs = Array.isArray(row.images) && row.images.length > 0
            ? row.images
            : Array.isArray(row.gallery) && row.gallery.length > 0
            ? row.gallery
            : [row.image_url || row.image || "/products/Peach Blossom Blush.webp"];

          combined.push({
            id: row.id || `local-${Date.now()}`,
            name: row.name,
            slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: normalizeCategory(row.category),
            price: typeof row.price === "number" ? row.price : parseFloat(row.price) || 999,
            stock_quantity: row.stock_quantity ?? 50,
            image: row.image_url || row.image || "/products/Peach Blossom Blush.webp",
            images: galleryImgs,
            gallery: galleryImgs,
            description: row.description || row.short_description || "",
            short_description: row.short_description || "",
            ingredients: row.ingredients || "",
            finish: row.finish || "Sculpted satin",
            mood: row.mood || "The statement",
            tag: row.tag || "New",
            tone: row.tone || "#a81920",
            note: row.note || "",
            is_published: row.is_published ?? true,
          });
        }
      });

      // 3. Fallback curated default products
      FALLBACK_PRODUCTS.forEach((p) => {
        const key = p.slug.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(p);
        }
      });

      setProducts(combined);
    } catch (e) {
      console.warn("[AdminView] Products fetch notice:", e);
      setProducts(FALLBACK_PRODUCTS);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();

    // 1. Listen for real-time order creations from Customer Checkout
    const handleOrderCreated = (e: any) => {
      const newOrder = e.detail;
      if (!newOrder) return;
      showNotice(`🔔 New Customer Order #${newOrder.id} received! (${newOrder.total_amount || "₹" + newOrder.total_price})`);
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    };
    window.addEventListener("sheaura:order-created", handleOrderCreated);

    // 2. Listen for catalog updates
    const handleCatalogUpdated = () => {
      fetchProducts();
    };
    window.addEventListener("sheaura:catalog-updated", handleCatalogUpdated);

    // 3. Listen for coupon registry updates
    const handleCouponsUpdated = () => {
      setCoupons(getAllCoupons());
    };
    window.addEventListener("sheaura:coupons-updated", handleCouponsUpdated);

    // 4. Supabase Realtime Stream for Orders (if online)
    let orderSubscription: any = null;
    if (isSupabaseConfigured) {
      try {
        orderSubscription = supabase
          .channel("admin-orders-stream")
          .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
            fetchOrders();
          })
          .subscribe();
      } catch {}
    }

    // 4. Polling fallback every 15s to guarantee fresh sync
    const pollTimer = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      window.removeEventListener("sheaura:order-created", handleOrderCreated);
      window.removeEventListener("sheaura:catalog-updated", handleCatalogUpdated);
      window.removeEventListener("sheaura:coupons-updated", handleCouponsUpdated);
      clearInterval(pollTimer);
      if (orderSubscription) {
        supabase.removeChannel(orderSubscription);
      }
    };
  }, []);

  // Status Updater
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "processing" | "dispatched" | "delivered" | "cancelled",
    customTracking?: string
  ) => {
    setIsUpdatingStatus(true);
    const tracking = customTracking || `EXP-BLUEDART-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from("orders")
          .update({
            status: newStatus,
            tracking_number: newStatus === "dispatched" || newStatus === "delivered" ? tracking : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                tracking_number: newStatus === "dispatched" || newStatus === "delivered" ? tracking : o.tracking_number,
              }
            : o
        )
      );

      // Update local storage cache as well
      try {
        const rawLocal = localStorage.getItem("sheaura_live_orders_v2");
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          const updated = list.map((o: any) => (o.id === orderId ? { ...o, status: newStatus, tracking_number: tracking } : o));
          localStorage.setItem("sheaura_live_orders_v2", JSON.stringify(updated));
        }
      } catch {}

      showNotice(`Order ${orderId} transitioned to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      showNotice(`Failed to update status: ${e.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Generate dynamic test order to test live triggering
  const handleCreateDynamicTestOrder = async () => {
    const clients = [
      { name: "Suresh Reddy", email: "suresh.reddy@hyderabadarts.in", phone: "+91 98490 12890", city: "Hyderabad, Telangana 500034" },
      { name: "N Balaji", email: "balaji.n@chennaidesign.in", phone: "+91 98102 77102", city: "Chennai, Tamil Nadu 600028" },
      { name: "TM Raju", email: "raju.tm@bengalurumaison.com", phone: "+91 94470 33819", city: "Bengaluru, Karnataka 560001" },
      { name: "Beesa Prakash", email: "prakash.beesa@mumbaifinearts.in", phone: "+91 98220 55192", city: "Mumbai, Maharashtra 400050" },
      { name: "Venkatesh Mallpatil", email: "venkatesh.m@pune.org", phone: "+91 98230 44101", city: "Pune, Maharashtra 411004" },
    ];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const chosenProduct = products[Math.floor(Math.random() * products.length)] || FALLBACK_PRODUCTS[0];
    const qty = Math.floor(1 + Math.random() * 2);
    const itemTotal = chosenProduct.price * qty;
    const shipping = itemTotal > 1500 ? 0 : 99;
    const tax = Math.round(itemTotal * 0.18);
    const grandTotal = itemTotal + shipping;
    const orderId = `SA-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    const newOrderPayload: AdminOrder = {
      id: orderId,
      client_name: client.name,
      customer_name: client.name,
      client_email: client.email,
      customer_email: client.email,
      client_phone: client.phone,
      customer_phone: client.phone,
      shipping_address: `${client.name}, 14 Royal Palms, ${client.city}`,
      items: [
        {
          productId: chosenProduct.slug,
          name: chosenProduct.name,
          shade: chosenProduct.name.split(" ").slice(0, 2).join(" "),
          quantity: qty,
          unitPrice: chosenProduct.price,
          itemTotal,
          image: chosenProduct.image,
        },
      ],
      items_count: qty,
      total_amount: `₹${grandTotal.toLocaleString("en-IN")}`,
      subtotal: itemTotal,
      discount: 0,
      shipping_fee: shipping,
      tax_amount: tax,
      total_price: grandTotal,
      currency: "INR",
      payment_method: "upi",
      payment_status: "paid",
      status: "processing",
      tracking_number: null,
      eta: "Arriving in 2-3 Business Days",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from("orders").insert([newOrderPayload]);
      } catch {}
    }

    // Persist to local shared storage
    try {
      const rawLocal = localStorage.getItem("sheaura_live_orders_v2");
      const existing = rawLocal ? JSON.parse(rawLocal) : [];
      localStorage.setItem("sheaura_live_orders_v2", JSON.stringify([newOrderPayload, ...existing]));
    } catch {}

    window.dispatchEvent(new CustomEvent("sheaura:order-created", { detail: newOrderPayload }));
    setOrders((prev) => [newOrderPayload, ...prev]);
    showNotice(`✓ Live Test Order #${orderId} generated & synced directly!`);
  };

  // Stock Adjustment
  const handleAdjustStock = (slug: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.slug === slug ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) + delta) } : p
      )
    );
    showNotice(`Stock adjusted for ${slug}`);
  };

  // Preset quick fill
  const handleApplyPreset = (preset: (typeof PRODUCT_PRESETS)[number]) => {
    setProductForm((prev) => ({
      ...prev,
      ...preset.data,
      image: preset.data.image,
      images: [preset.data.image],
      slug: preset.data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
    }));
    showNotice(`✓ Loaded ${preset.label}! Form populated with luxury copy and photo.`);
  };

  // Raw text / JSON parser
  const handleParseRawText = () => {
    if (!rawImportText.trim()) return;

    try {
      const parsed = JSON.parse(rawImportText);
      const parsedImages = Array.isArray(parsed.images) && parsed.images.length > 0
        ? parsed.images
        : Array.isArray(parsed.gallery) && parsed.gallery.length > 0
        ? parsed.gallery
        : (parsed.image || parsed.image_url)
        ? [parsed.image || parsed.image_url]
        : undefined;

      setProductForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        slug: parsed.slug || (parsed.name ? parsed.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") : prev.slug),
        category: parsed.category ? normalizeCategory(parsed.category) : prev.category,
        price: parsed.price ? Number(parsed.price) : prev.price,
        stock_quantity: parsed.stock_quantity ?? parsed.stock ?? prev.stock_quantity,
        image: parsed.image || parsed.image_url || prev.image,
        images: parsedImages || prev.images,
        tag: parsed.tag || prev.tag,
        tone: parsed.tone || prev.tone,
        finish: parsed.finish || prev.finish,
        mood: parsed.mood || prev.mood,
        note: parsed.note || parsed.short_description || prev.note,
        description: parsed.description || prev.description,
        ingredients: parsed.ingredients || prev.ingredients,
      }));
      showNotice("✓ Smart Paste: JSON parsed and form populated!");
      setRawImportText("");
      setIsRawImportOpen(false);
      return;
    } catch {}

    const lines = rawImportText.split("\n");
    const extracted: Partial<typeof productForm> = {};
    for (const line of lines) {
      const parts = line.split(/:(.*)/s);
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts[1].trim();
        if (key.includes("name") || key === "title") extracted.name = val;
        else if (key.includes("cat")) extracted.category = normalizeCategory(val);
        else if (key.includes("price")) extracted.price = parseFloat(val.replace(/[^0-9.]/g, "")) || 999;
        else if (key.includes("stock") || key.includes("qty")) extracted.stock_quantity = parseInt(val.replace(/[^0-9]/g, ""), 10) || 40;
        else if (key.includes("image") || key.includes("photo") || key.includes("url")) {
          extracted.image = val;
          const multi = val.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
          if (multi.length > 0) extracted.images = multi;
        }
        else if (key.includes("ingred")) extracted.ingredients = val;
        else if (key.includes("desc")) extracted.description = val;
        else if (key.includes("note") || key.includes("tagline")) extracted.note = val;
        else if (key.includes("tone") || key.includes("color")) extracted.tone = val;
        else if (key.includes("finish")) extracted.finish = val;
        else if (key.includes("mood")) extracted.mood = val;
      }
    }

    if (Object.keys(extracted).length > 0) {
      setProductForm((prev) => ({
        ...prev,
        ...extracted,
        slug: extracted.name ? extracted.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") : prev.slug,
      }));
      showNotice("✓ Smart Paste: Form extracted and populated from raw text!");
      setRawImportText("");
      setIsRawImportOpen(false);
    } else {
      showNotice("Could not parse text. Ensure 'Key: Value' format (e.g. Name: Velvet Lip)");
    }
  };

  // Copy Product JSON
  const handleCopyProductJson = (product: AdminProduct) => {
    const json = JSON.stringify(
      {
        name: product.name,
        slug: product.slug,
        category: normalizeCategory(product.category),
        price: product.price,
        stock_quantity: product.stock_quantity || 45,
        image: product.image,
        images: product.images || (product.image ? [product.image] : []),
        tag: product.tag || "New Arrival",
        tone: product.tone || "#a81920",
        finish: product.finish || "Sculpted satin",
        mood: product.mood || "Timeless Radiance",
        note: product.short_description || product.note || "Botanical luxury formula",
        description: product.description || `Signature ${product.name} crafted in She'Aura Atelier.`,
        ingredients: product.ingredients || "Damask Rose Water, Camellia Seed Oil, Hyaluronic Acid, Mineral Pigments.",
      },
      null,
      2
    );

    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
    }
    showNotice(`✓ "${product.name}" JSON copied to clipboard! Ready to paste & tweak.`);
  };

  // Multi-image management
  const handleToggleLibraryAsset = (assetPath: string) => {
    setProductForm((prev) => {
      const current = prev.images && prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      let updated: string[];
      if (current.includes(assetPath)) {
        if (current.length > 1) {
          updated = current.filter((p) => p !== assetPath);
          showNotice("Packshot removed from gallery");
        } else {
          showNotice("Product must keep at least one packshot");
          return prev;
        }
      } else {
        updated = [...current, assetPath];
        showNotice("✓ Added packshot to gallery!");
      }
      return {
        ...prev,
        image: updated[0] || "",
        images: updated,
      };
    });
  };

  const handleAddImageUrl = (urlToAdd?: string) => {
    const raw = (urlToAdd || newImageUrl).trim();
    if (!raw) return;
    const splitUrls = raw.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
    if (splitUrls.length === 0) return;

    setProductForm((prev) => {
      const current = prev.images && prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      const combined = Array.from(new Set([...current, ...splitUrls]));
      return {
        ...prev,
        image: combined[0] || "",
        images: combined,
      };
    });
    setNewImageUrl("");
    showNotice(`✓ Added ${splitUrls.length} image(s) to product gallery!`);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductForm((prev) => {
      const current = prev.images && prev.images.length > 0 ? [...prev.images] : [prev.image || ""];
      if (current.length <= 1) {
        showNotice("At least one packshot is required.");
        return prev;
      }
      const updated = current.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        image: updated[0] || "",
        images: updated,
      };
    });
    showNotice("Photo removed from gallery");
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setProductForm((prev) => {
      const current = prev.images && prev.images.length > 0 ? [...prev.images] : [prev.image || ""];
      if (indexToPrimary <= 0 || indexToPrimary >= current.length) return prev;
      const [chosen] = current.splice(indexToPrimary, 1);
      current.unshift(chosen);
      return {
        ...prev,
        image: chosen,
        images: current,
      };
    });
    showNotice("✓ Set as primary cover photo");
  };

  // Image file upload (with multi-file support)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPath = event.target.result as string;
          setProductForm((prev) => {
            const current = prev.images && prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
            const updated = [...current, newPath];
            return {
              ...prev,
              image: updated[0] || newPath,
              images: updated,
            };
          });
          showNotice(`✓ Added "${file.name}" to gallery!`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Save new product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showNotice("Please provide a product name.");
      return;
    }

    setIsSubmittingProduct(true);
    const productId = crypto.randomUUID();
    const cleanSlug =
      productForm.slug.trim() ||
      productForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const numPrice = Number(productForm.price) || 999;
    const normCategory = normalizeCategory(productForm.category);

    const imagesList = (productForm.images && productForm.images.length > 0)
      ? productForm.images
      : [productForm.image || "/products/Peach Blossom Blush.webp"];
    const primaryImage = imagesList[0];
    const secondaryImage = imagesList[1] || primaryImage;

    const payload = {
      id: productId,
      name: productForm.name.trim(),
      slug: cleanSlug,
      price: numPrice,
      currency: "INR",
      category: normCategory,
      image_url: primaryImage,
      campaign_image_url: secondaryImage,
      images: imagesList,
      gallery: imagesList,
      description: productForm.description || `Signature ${productForm.name} from She'Aura.`,
      short_description: productForm.note || productForm.description || `Authentic ${productForm.name}.`,
      note: productForm.note || "Botanical formula",
      finish: productForm.finish || "Sculpted satin",
      mood: productForm.mood || "The statement",
      tag: productForm.tag || "New Arrival",
      tone: productForm.tone || "#a81920",
      ingredients: productForm.ingredients || "Damask Rose Water, Camellia Seed Oil, Hyaluronic Acid, Mineral Pigments.",
      size: "4.5g / 0.16 oz",
      stock_quantity: Number(productForm.stock_quantity) || 50,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Supabase Insertion
    let supabaseSuccess = false;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("products").upsert([payload]);
        if (!error) {
          supabaseSuccess = true;
        } else {
          console.warn("[AdminView] Supabase insert warning:", error);
        }
      } catch (dbErr) {
        console.warn("[AdminView] Supabase direct insert fallback:", dbErr);
      }
    }

    // 2. Local Custom Product Persistence
    saveLocalCustomProduct({
      ...payload,
      price: `₹${numPrice.toLocaleString("en-IN")}.00`,
      rawPrice: numPrice,
      image: primaryImage,
      still: primaryImage,
      campaign: secondaryImage,
      gallery: imagesList,
      images: imagesList,
      shades: [
        { name: "Signature Shade", tone: payload.tone, image: primaryImage, slug: cleanSlug },
      ],
    });

    // 3. Emit update event for Storefront and Admin
    window.dispatchEvent(new CustomEvent("sheaura:catalog-updated"));

    // 4. Update local state
    setProducts((prev) => [
      {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        category: payload.category,
        price: payload.price,
        stock_quantity: payload.stock_quantity,
        image: primaryImage,
        images: imagesList,
        gallery: imagesList,
        description: payload.description,
        short_description: payload.short_description,
        ingredients: payload.ingredients,
        finish: payload.finish,
        mood: payload.mood,
        tag: payload.tag,
        tone: payload.tone,
        note: payload.note,
        is_published: true,
      },
      ...prev.filter((p) => p.slug !== payload.slug && p.id !== payload.id),
    ]);

    setIsSubmittingProduct(false);
    setIsAddModalOpen(false);
    showNotice(
      supabaseSuccess
        ? `✓ "${payload.name}" published to live database & storefront!`
        : `✓ "${payload.name}" saved to Maison catalog & live on storefront!`
    );
  };

  // Delete product
  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`Are you sure you want to retire "${product.name}" from the Maison catalogue?`)) {
      return;
    }

    if (isSupabaseConfigured && product.id) {
      try {
        await supabase.from("products").delete().eq("id", product.id);
      } catch {}
    }

    deleteLocalCustomProduct(product.slug || product.id);
    setProducts((prev) => prev.filter((p) => p.slug !== product.slug && p.id !== product.id));
    showNotice(`✓ "${product.name}" archived from active catalogue.`);
  };

  // Sign out / Lock Console
  const handleLockConsole = () => {
    clearAdminSession();
    setAdminSessionState(null);
    window.history.pushState({}, "", "/sheaura/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Parse items safely
  const parseItems = (raw: any): AdminOrderItem[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  // Computed Metrics
  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, o) => {
      const val = typeof o.total_price === "number" && o.total_price > 0 ? o.total_price : parseFloat(String(o.total_amount).replace(/[^0-9.]/g, "")) || 0;
      return acc + val;
    }, 0);
  }, [orders]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "processing" || o.status === "dispatched" || o.status === "pending").length;
  }, [orders]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.stock_quantity ?? 50) < 15).length;
  }, [products]);

  const couponRankings = useMemo(() => {
    return computeCouponRankings(orders);
  }, [orders, coupons]);

  const customersList = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    orders.forEach((o) => {
      const name = o.customer_name || o.client_name || "Maison Member";
      const email = o.customer_email || o.client_email || "concierge@sheaura.com";
      const phone = o.customer_phone || o.client_phone || "+91 98200 11223";
      const city = o.shipping_address?.split(",")[1]?.trim() || "India";
      const amt = typeof o.total_price === "number" && o.total_price > 0 ? o.total_price : parseFloat(String(o.total_amount).replace(/[^0-9.]/g, "")) || 0;

      if (!map.has(email)) {
        map.set(email, {
          name,
          email,
          phone,
          city,
          orderCount: 1,
          totalSpent: amt,
          lastOrderDate: o.created_at,
        });
      } else {
        const existing = map.get(email)!;
        existing.orderCount += 1;
        existing.totalSpent += amt;
        if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.created_at;
        }
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = globalSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.client_name || o.customer_name || "").toLowerCase().includes(q) ||
        (o.client_email || o.customer_email || "").toLowerCase().includes(q) ||
        (o.shipping_address || "").toLowerCase().includes(q);

      const matchStatus =
        orderStatusFilter === "all" ||
        (orderStatusFilter === "processing" && o.status === "processing") ||
        (orderStatusFilter === "dispatched" && o.status === "dispatched") ||
        (orderStatusFilter === "delivered" && o.status === "delivered") ||
        (orderStatusFilter === "paid" && (o.payment_status === "paid" || o.payment_status === "confirmed")) ||
        (orderStatusFilter === "failed" && (o.payment_status === "failed" || o.status === "cancelled")) ||
        (orderStatusFilter === "cancelled" && o.status === "cancelled");

      return matchSearch && matchStatus;
    });
  }, [orders, globalSearch, orderStatusFilter]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = globalSearch.toLowerCase().trim();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCategory = categoryFilter === "all" || normalizeCategory(p.category) === categoryFilter;
      const stock = p.stock_quantity ?? 50;
      const matchStock =
        stockHealthFilter === "all" ||
        (stockHealthFilter === "low" && stock < 15) ||
        (stockHealthFilter === "healthy" && stock >= 15);

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, globalSearch, categoryFilter, stockHealthFilter]);

  // Derived SKU Matrix for Inventory tab
  const skuMatrix = useMemo(() => {
    const list: any[] = [];
    products.forEach((p, pIdx) => {
      const skuPrefix = String(pIdx + 1).padStart(2, "0");
      const stock = p.stock_quantity ?? 50;
      const shades = [
        { label: "Signature / Full Size", tone: p.tone || "#a81920" },
        { label: "Petite Luxe / Travel", tone: p.tone || "#a81920" },
      ];
      shades.forEach((sh, shIdx) => {
        const onHand = Math.round(stock * (shIdx === 0 ? 0.65 : 0.35));
        const reserved = Math.round(onHand * 0.1);
        const available = Math.max(0, onHand - reserved);
        list.push({
          sku: `${skuPrefix}-${shIdx === 0 ? "FS" : "TR"}`,
          product: p,
          shadeName: sh.label,
          tone: sh.tone,
          onHand,
          reserved,
          available,
          health: available < 8 ? "LOW" : "ACTIVE",
        });
      });
    });
    return list;
  }, [products]);

  // If session is missing, render access denied guard
  if (!adminSession) {
    return (
      <div
        className="admin-console-root"
        style={{
          minHeight: "100vh",
          background: THEME.paper,
          color: THEME.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: THEME.fontSans,
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: THEME.cardBg,
            border: `1px solid ${THEME.inkBorder}`,
            borderRadius: "16px",
            padding: "40px 32px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(33, 19, 15, 0.08)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: THEME.goldBg,
              border: "1px solid rgba(163, 106, 59, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <ShieldCheck size={32} style={{ color: THEME.gold }} />
          </div>
          <h2 style={{ fontFamily: THEME.fontSerif, fontSize: "28px", margin: "0 0 8px", color: THEME.ink }}>
            Restricted Studio Console
          </h2>
          <p style={{ fontSize: "12px", color: THEME.inkMuted, lineHeight: 1.6, marginBottom: "28px" }}>
            Administrative privileges are strictly isolated. Please authenticate via the dedicated gateway at <b>sheaura/login</b>.
          </p>
          <button
            onClick={() => {
              window.history.pushState({}, "", "/sheaura/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{
              width: "100%",
              background: THEME.ink,
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(33, 19, 15, 0.2)",
            }}
          >
            Authenticate via /sheaura/login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-console-root"
      style={{
        minHeight: "100vh",
        background: THEME.paper,
        color: THEME.ink,
        fontFamily: THEME.fontSans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toast Notice */}
      {actionNotice && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 9999,
            background: THEME.cardBg,
            border: `1px solid ${THEME.inkBorder}`,
            color: THEME.ink,
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(33, 19, 15, 0.12)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            letterSpacing: "0.03em",
          }}
        >
          <CheckCircle2 size={16} style={{ color: THEME.gold }} /> {actionNotice}
        </div>
      )}

      {/* ================= TOP BAR (MATCHING STOREFRONT LUXURY AESTHETIC) ================= */}
      <header
        style={{
          height: "64px",
          background: "rgba(248, 240, 229, 0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${THEME.inkBorder}`,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Brand + Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "0.15em", color: THEME.ink }}>
              SHE'AURA
            </span>
            <span style={{ fontSize: "11px", letterSpacing: "0.2em", color: THEME.gold, fontWeight: 700 }}>
              ATELIER
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: THEME.greenText,
              background: THEME.greenBg,
              border: "1px solid rgba(45, 94, 53, 0.25)",
              padding: "3px 10px",
              borderRadius: "999px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: THEME.greenText }} />
            DATABASE LIVE
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ position: "relative", width: "420px", maxWidth: "100%" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: THEME.inkSubtle }} />
          <input
            type="text"
            placeholder="Search clients, orders, creations, SKUs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px 9px 38px",
              borderRadius: "8px",
              border: `1px solid ${THEME.inkBorder}`,
              background: THEME.cardBg,
              color: THEME.ink,
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Right: View Website + Profile + Sign Out */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: THEME.cardBg,
              border: `1px solid ${THEME.inkBorder}`,
              borderRadius: "6px",
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: THEME.ink,
            }}
          >
            <ExternalLink size={13} /> VIEW WEBSITE
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #21130f 0%, #765d50 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              SD
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: THEME.ink }}>Studio Director</div>
              <div style={{ fontSize: "9.5px", color: THEME.inkMuted }}>STUDIO DIRECTOR</div>
            </div>
          </div>

          <button
            onClick={handleLockConsole}
            title="Lock Studio & Sign Out"
            style={{
              background: THEME.redBg,
              border: "1px solid rgba(163, 77, 69, 0.25)",
              color: THEME.redText,
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LogOut size={12} /> SIGN OUT
          </button>
        </div>
      </header>

      {/* ================= MAIN LAYOUT WITH SIDEBAR ================= */}
      <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 64px)" }}>
        {/* Left Navigation Sidebar */}
        <aside
          style={{
            width: "230px",
            background: THEME.cream,
            borderRight: `1px solid ${THEME.inkBorder}`,
            padding: "20px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Nav Items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { key: "overview", label: "Overview", icon: LayoutDashboard },
              { key: "creations", label: "Creations", icon: Sparkles },
              { key: "inventory", label: "Inventory", icon: Boxes },
              { key: "orders", label: "Orders & Dispatch", icon: Truck },
              { key: "coupons", label: "Privileges & Coupons", icon: Tag },
              { key: "customers", label: "Customers", icon: User },
              { key: "settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: isActive ? `1px solid ${THEME.ink}` : "1px solid transparent",
                    background: isActive ? THEME.ink : "transparent",
                    color: isActive ? "#ffffff" : THEME.inkMuted,
                    fontSize: "12.5px",
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? THEME.goldLight : THEME.inkSubtle }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mini Brand Banner Card at Bottom */}
          <div
            style={{
              background: THEME.cardBg,
              border: `1px solid ${THEME.inkBorder}`,
              borderRadius: "10px",
              padding: "12px",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.1em" }}>
              SHE'AURA ATELIER
            </div>
            <div style={{ fontSize: "9px", color: THEME.inkSubtle, marginTop: "2px" }}>
              COUTURE BEAUTY · ART MEETS FORMULATION
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto", background: THEME.paper }}>
          {/* ================= TAB 1: STUDIO OVERVIEW ================= */}
          {activeTab === "overview" && (
            <div>
              {/* Header section with Date picker and + Add Creation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                    STUDIO OVERVIEW
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                    Real-time insights into your creations, orders, inventory and customers.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      background: THEME.cardBg,
                      border: `1px solid ${THEME.inkBorder}`,
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "11.5px",
                      color: THEME.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Calendar size={13} style={{ color: THEME.gold }} /> 22 Oct 2026 – 28 Oct 2026 ▾
                  </div>

                  <button
                    onClick={handleCreateDynamicTestOrder}
                    style={{
                      background: THEME.greenBg,
                      border: "1px solid rgba(45, 94, 53, 0.3)",
                      color: THEME.greenText,
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="Simulate customer placing an order to test live triggering"
                  >
                    <PlusCircle size={14} /> + Simulate Customer Order
                  </button>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    style={{
                      background: THEME.ink,
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 18px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 4px 14px rgba(33, 19, 15, 0.18)",
                    }}
                  >
                    <Plus size={14} /> + Add Creation
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards (Storefront Luxury Aesthetic) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
                {/* 1. Total Revenue */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.08em" }}>
                      TOTAL REVENUE
                    </span>
                    <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: THEME.cream, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.gold, fontSize: "11px", fontWeight: 700 }}>
                      ₹
                    </span>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, margin: "8px 0 2px" }}>
                    ₹ {totalRevenue.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.greenText, display: "flex", alignItems: "center", gap: "4px" }}>
                    <TrendingUp size={12} /> from {orders.length} customer orders
                  </div>
                </div>

                {/* 2. Active Orders */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.08em" }}>
                      ACTIVE ORDERS
                    </span>
                    <ShoppingBag size={14} style={{ color: THEME.blueText }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, margin: "8px 0 2px" }}>
                    {activeOrdersCount}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.blueText }}>
                    On track in fulfillment
                  </div>
                </div>

                {/* 3. Low-Stock SKUs */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.08em" }}>
                      LOW-STOCK SKUS
                    </span>
                    <Boxes size={14} style={{ color: THEME.amberText }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, margin: "8px 0 2px" }}>
                    {lowStockCount}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.amberText, display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={11} /> Needs attention
                  </div>
                </div>

                {/* 4. Total Customers */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.08em" }}>
                      TOTAL CUSTOMERS
                    </span>
                    <User size={14} style={{ color: THEME.greenText }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, margin: "8px 0 2px" }}>
                    {customersList.length}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.greenText }}>
                    ↑ Active VIP clients
                  </div>
                </div>
              </div>

              {/* Middle Section: Orders Requiring Attention + Inventory Alerts */}
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "20px", marginBottom: "28px" }}>
                {/* Orders Requiring Attention */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, letterSpacing: "0.02em" }}>
                      Orders Requiring Attention
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      style={{ background: "transparent", border: "none", color: THEME.gold, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                    >
                      View all →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: THEME.inkSubtle, fontSize: "12px" }}>
                      No pending orders. All client orders are dispatched.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                        <thead>
                          <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream, textAlign: "left" }}>
                            <th style={{ padding: "9px 12px", fontWeight: 700 }}>ORDER ID</th>
                            <th style={{ padding: "9px 12px", fontWeight: 700 }}>CUSTOMER</th>
                            <th style={{ padding: "9px 12px", fontWeight: 700 }}>TOTAL</th>
                            <th style={{ padding: "9px 12px", fontWeight: 700 }}>PAYMENT</th>
                            <th style={{ padding: "9px 12px", fontWeight: 700 }}>FULFILLMENT</th>
                            <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>INVOICE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((o) => {
                            const { label: payLabel, bg: payBg, text: payText } = getPaymentStatusBadge(o);
                            const formattedTotal = formatOrderTotal(o);
                            const custName = o.customer_name || o.client_name || "Maison Guest";
                            return (
                              <tr key={o.id} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.gold }}>{o.id}</td>
                                <td style={{ padding: "10px 12px", color: THEME.ink }}>
                                  <div>{custName}</div>
                                  {o.discount_code && (
                                    <span style={{ fontSize: "9px", color: THEME.gold, fontWeight: 700 }}>
                                      🎟️ {o.discount_code}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px", fontWeight: 700, color: THEME.ink }}>{formattedTotal}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      background: payBg,
                                      color: payText,
                                    }}
                                  >
                                    {payLabel}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      background:
                                        o.status === "delivered"
                                          ? THEME.greenBg
                                          : o.status === "dispatched"
                                          ? THEME.amberBg
                                          : THEME.blueBg,
                                      color:
                                        o.status === "delivered"
                                          ? THEME.greenText
                                          : o.status === "dispatched"
                                          ? THEME.amberText
                                          : THEME.blueText,
                                    }}
                                  >
                                    {o.status.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(o)}
                                    style={{
                                      background: THEME.cream,
                                      border: `1px solid ${THEME.inkBorder}`,
                                      color: THEME.ink,
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <FileText size={11} /> Invoice
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Inventory Alerts */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink, letterSpacing: "0.02em" }}>
                      Inventory Alerts
                    </h3>
                    <button
                      onClick={() => setActiveTab("inventory")}
                      style={{ background: "transparent", border: "none", color: THEME.gold, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                    >
                      View inventory →
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {products.slice(0, 4).map((p) => {
                      const stock = p.stock_quantity ?? 50;
                      const isLow = stock < 20;
                      return (
                        <div
                          key={p.slug}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "9px 12px",
                            background: THEME.creamLight,
                            borderRadius: "8px",
                            border: `1px solid ${THEME.inkBorderSubtle}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={p.image}
                              alt={p.name}
                              style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}` }}
                            />
                            <div>
                              <div style={{ fontSize: "11.5px", fontWeight: 600, color: THEME.ink }}>{p.name}</div>
                              <div style={{ fontSize: "10px", color: THEME.inkSubtle }}>{p.category}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: isLow ? THEME.amberBg : THEME.greenBg,
                                color: isLow ? THEME.amberText : THEME.greenText,
                              }}
                            >
                              {stock} units
                            </span>
                            <button
                              onClick={() => handleAdjustStock(p.slug, 10)}
                              style={{
                                background: THEME.cream,
                                color: THEME.ink,
                                border: `1px solid ${THEME.inkBorder}`,
                                borderRadius: "4px",
                                padding: "2px 8px",
                                fontSize: "10px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lower Section: Recent Orders */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink }}>
                    Recent Orders
                  </h3>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      style={{
                        background: "#ffffff",
                        color: THEME.ink,
                        border: `1px solid ${THEME.inkBorder}`,
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "11px",
                        outline: "none",
                      }}
                    >
                      <option value="all">All orders</option>
                      <option value="processing">Processing</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="delivered">Delivered</option>
                      <option value="paid">Paid only</option>
                      <option value="failed">Failed / Cancelled</option>
                    </select>

                    <button
                      onClick={fetchOrders}
                      disabled={loading}
                      style={{
                        background: "#ffffff",
                        color: THEME.inkMuted,
                        border: `1px solid ${THEME.inkBorder}`,
                        borderRadius: "6px",
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                      title="Refresh Orders"
                    >
                      <RefreshCw size={13} className={loading ? "spin-icon" : ""} />
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                    <thead>
                      <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream, textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>ORDER ID</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>CUSTOMER</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>DATE</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>ITEMS</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>TOTAL</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>PAYMENT</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>STATUS</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const items = parseItems(o.items);
                        const { label: payLabel, bg: payBg, text: payText } = getPaymentStatusBadge(o);
                        const formattedTotal = formatOrderTotal(o);
                        const custName = o.customer_name || o.client_name || "Maison Guest";
                        const custEmail = o.customer_email || o.client_email || "guest@sheaura.com";
                        return (
                          <tr key={o.id} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                            <td style={{ padding: "12px", fontWeight: 600, color: THEME.gold }}>{o.id}</td>
                            <td style={{ padding: "12px" }}>
                              <div style={{ fontWeight: 600, color: THEME.ink }}>{custName}</div>
                              <div style={{ fontSize: "10px", color: THEME.inkSubtle }}>{custEmail}</div>
                              {o.discount_code && (
                                <div style={{ marginTop: "3px" }}>
                                  <span style={{ fontSize: "9.5px", color: THEME.gold, fontWeight: 700, background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}`, padding: "1px 6px", borderRadius: "3px" }}>
                                    🎟️ {o.discount_code}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "12px", color: THEME.inkMuted }}>
                              {new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px", color: THEME.ink }}>{items.length || o.items_count || 1}</td>
                            <td style={{ padding: "12px", fontWeight: 700, color: THEME.ink }}>{formattedTotal}</td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  background: payBg,
                                  color: payText,
                                }}
                              >
                                {payLabel}
                              </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  background:
                                    o.status === "delivered"
                                      ? THEME.greenBg
                                      : o.status === "dispatched"
                                      ? THEME.amberBg
                                      : THEME.blueBg,
                                  color:
                                    o.status === "delivered"
                                      ? THEME.greenText
                                      : o.status === "dispatched"
                                      ? THEME.amberText
                                      : THEME.blueText,
                                }}
                              >
                                {o.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  onClick={() => setSelectedInvoiceOrder(o)}
                                  style={{
                                    background: THEME.cream,
                                    border: `1px solid ${THEME.inkBorder}`,
                                    color: THEME.ink,
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <FileText size={12} /> Tax Invoice
                                </button>
                                <button
                                  onClick={() => setSelectedOrderDetails(o)}
                                  style={{
                                    background: "#ffffff",
                                    border: `1px solid ${THEME.inkBorder}`,
                                    color: THEME.inkMuted,
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: CREATIONS CATALOGUE (STOREFRONT THEME) ================= */}
          {activeTab === "creations" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                    CREATIONS CATALOGUE
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                    Manage your archival creations, photoshoot releases, pricing, and shade availability.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    background: THEME.ink,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "10px 20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(33, 19, 15, 0.18)",
                  }}
                >
                  <Plus size={14} /> + Add New Creation
                </button>
              </div>

              {/* Filters & Search */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "14px 18px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: THEME.ink }}>
                  CATALOGUE ({filteredProducts.length})
                </span>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      background: "#ffffff",
                      color: THEME.ink,
                      border: `1px solid ${THEME.inkBorder}`,
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      outline: "none",
                    }}
                  >
                    <option value="all">All Categories</option>
                    <option value="Lipsticks">Lipsticks</option>
                    <option value="Blushes">Blushes</option>
                    <option value="Body Highlighter Oil">Body Highlighter Oil</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Collection">Wardrobe Collection</option>
                  </select>

                  <select
                    value={stockHealthFilter}
                    onChange={(e) => setStockHealthFilter(e.target.value)}
                    style={{
                      background: "#ffffff",
                      color: THEME.ink,
                      border: `1px solid ${THEME.inkBorder}`,
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      outline: "none",
                    }}
                  >
                    <option value="all">All Stock Levels</option>
                    <option value="healthy">Healthy Stock (&ge; 15)</option>
                    <option value="low">Low Stock (&lt; 15)</option>
                  </select>
                </div>
              </div>

              {/* Creations Table */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>SKU</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>CREATION NAME</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>CATEGORY</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>SELLING PRICE</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>VARIANTS</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>TOTAL STOCK</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>STATUS</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, idx) => {
                      const sku = String(idx + 1).padStart(2, "0");
                      const stock = p.stock_quantity ?? 50;
                      return (
                        <tr key={p.slug || p.id} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                          <td style={{ padding: "12px 16px", color: THEME.inkSubtle, fontFamily: "monospace" }}>{sku}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: "38px", height: "38px", objectFit: "cover", borderRadius: "6px", background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}` }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: THEME.ink }}>{p.name}</div>
                                <div style={{ fontSize: "10px", color: THEME.inkSubtle, display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                  <span>{p.slug}</span>
                                  {p.images && p.images.length > 1 && (
                                    <span style={{ fontSize: "9px", background: THEME.cream, color: THEME.gold, padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: `1px solid ${THEME.inkBorderSubtle}` }}>
                                      📷 {p.images.length} photos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: THEME.inkMuted }}>{p.category}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.ink }}>
                            ₹ {p.price.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 16px", color: THEME.inkMuted }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorderSubtle}`, padding: "2px 6px", borderRadius: "4px", fontSize: "9.5px", color: THEME.inkMuted }}>Full Size</span>
                              <span style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorderSubtle}`, padding: "2px 6px", borderRadius: "4px", fontSize: "9.5px", color: THEME.inkMuted }}>Travel</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: THEME.ink }}>{stock} units</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, background: THEME.greenBg, color: THEME.greenText }}>
                              ACTIVE
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => handleCopyProductJson(p)}
                                style={{ background: "#ffffff", border: `1px solid ${THEME.inkBorder}`, color: THEME.inkMuted, padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                title="Copy JSON"
                              >
                                <Copy size={11} /> Copy JSON
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                style={{ background: THEME.redBg, border: "1px solid rgba(163, 77, 69, 0.2)", color: THEME.redText, padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                title="Delete Piece"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVENTORY & SKU MATRIX (STOREFRONT THEME) ================= */}
          {activeTab === "inventory" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                    INVENTORY & SKU MATRIX
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                    Size-level telemetry, available-to-sell calculations, buffer alerts, and stock adjustments.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Variant SKU,Creation,Shade,On Hand,Reserved,Available\n" +
                      skuMatrix.map(s => `${s.sku},"${s.product.name}","${s.shadeName}",${s.onHand},${s.reserved},${s.available}`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `SheAura-Inventory-Matrix-${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showNotice("✓ Inventory SKU Matrix CSV exported successfully!");
                  }}
                  style={{
                    background: THEME.cardBg,
                    border: `1px solid ${THEME.inkBorder}`,
                    color: THEME.ink,
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FileSpreadsheet size={13} /> Export CSV
                </button>
              </div>

              {/* Variant Matrix Table */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${THEME.inkBorder}`, fontSize: "13px", fontWeight: 700, color: THEME.ink }}>
                  VARIANT MATRIX ({skuMatrix.length})
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>VARIANT SKU</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>CREATION</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>SHADE / SIZE</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>ON HAND</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>RESERVED</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>AVAILABLE TO SELL</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>HEALTH</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>ADJUST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuMatrix.map((item) => (
                      <tr key={item.sku} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", color: THEME.gold, fontWeight: 600 }}>{item.sku}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: THEME.ink }}>{item.product.name}</div>
                          <div style={{ fontSize: "10px", color: THEME.inkSubtle }}>{item.product.category}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}`, padding: "3px 8px", borderRadius: "4px", fontSize: "10.5px", color: THEME.ink }}>
                            {item.shadeName}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: THEME.ink }}>{item.onHand}</td>
                        <td style={{ padding: "12px 16px", color: THEME.inkMuted }}>{item.reserved}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.greenText }}>{item.available}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              background: item.health === "ACTIVE" ? THEME.greenBg : THEME.amberBg,
                              color: item.health === "ACTIVE" ? THEME.greenText : THEME.amberText,
                            }}
                          >
                            {item.health}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => handleAdjustStock(item.product.slug, -5)}
                              style={{ background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}`, color: THEME.ink, padding: "3px 7px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleAdjustStock(item.product.slug, 5)}
                              style={{ background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}`, color: THEME.greenText, padding: "3px 7px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ORDERS & DISPATCH (STOREFRONT THEME) ================= */}
          {activeTab === "orders" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                    ORDERS & DISPATCH MANAGEMENT
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                    Live customer order dispatch pipeline, courier tracking, and GST tax invoice generation.
                  </p>
                </div>

                <button
                  onClick={handleCreateDynamicTestOrder}
                  style={{
                    background: THEME.greenBg,
                    border: "1px solid rgba(45, 94, 53, 0.3)",
                    color: THEME.greenText,
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <PlusCircle size={14} /> + New Test Order
                </button>
              </div>

              {/* Status Filters */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                {["all", "processing", "dispatched", "delivered", "paid", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    style={{
                      background: orderStatusFilter === st ? THEME.ink : THEME.cardBg,
                      color: orderStatusFilter === st ? "#ffffff" : THEME.inkMuted,
                      border: `1px solid ${orderStatusFilter === st ? THEME.ink : THEME.inkBorder}`,
                      borderRadius: "999px",
                      padding: "6px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {st === "all" ? "All Orders" : st}
                  </button>
                ))}
              </div>

              {/* Orders Full Table */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream }}>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>ORDER ID</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>CUSTOMER & ADDRESS</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>ITEMS</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>TOTAL</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>STATUS</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>TRACKING</th>
                      <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const items = parseItems(o.items);
                      const { label: payLabel, bg: payBg, text: payText } = getPaymentStatusBadge(o);
                      const formattedTotal = formatOrderTotal(o);
                      const custName = o.customer_name || o.client_name || "Maison Guest";
                      const custEmail = o.customer_email || o.client_email || "guest@sheaura.com";
                      return (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.gold }}>
                            <div>{o.id}</div>
                            <div style={{ fontSize: "10px", color: THEME.inkSubtle, marginTop: "2px" }}>
                              {new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 600, color: THEME.ink }}>{custName}</div>
                            <div style={{ fontSize: "10.5px", color: THEME.inkMuted }}>{custEmail}</div>
                            <div style={{ fontSize: "9.5px", color: THEME.inkSubtle }}>{o.shipping_address}</div>
                            {o.discount_code && (
                              <div style={{ marginTop: "3px" }}>
                                <span style={{ fontSize: "9.5px", color: THEME.gold, fontWeight: 700, background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}`, padding: "1px 6px", borderRadius: "3px" }}>
                                  🎟️ {o.discount_code}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {items.length > 0 ? (
                              <div>
                                <div style={{ color: THEME.ink, fontWeight: 500 }}>{items[0].name}</div>
                                {items.length > 1 && <div style={{ fontSize: "10px", color: THEME.inkSubtle }}>+{items.length - 1} more items</div>}
                              </div>
                            ) : (
                              <span style={{ color: THEME.ink }}>{o.items_count || 1} pieces</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 700, color: THEME.ink }}>{formattedTotal}</div>
                            <div style={{ marginTop: "4px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  fontSize: "9.5px",
                                  fontWeight: 700,
                                  background: payBg,
                                  color: payText,
                                }}
                              >
                                {payLabel}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateStatus(o.id, e.target.value as any)}
                              style={{
                                background: "#ffffff",
                                color: THEME.ink,
                                border: `1px solid ${THEME.inkBorder}`,
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                outline: "none",
                              }}
                            >
                              <option value="processing">Processing</option>
                              <option value="dispatched">Dispatched</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {o.tracking_number ? (
                              <span style={{ fontFamily: "monospace", fontSize: "10.5px", color: THEME.gold, background: THEME.cream, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${THEME.inkBorderSubtle}` }}>
                                {o.tracking_number}
                              </span>
                            ) : (
                              <span style={{ fontSize: "10px", color: THEME.inkSubtle }}>Not dispatched</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => setSelectedInvoiceOrder(o)}
                                style={{
                                  background: THEME.cream,
                                  border: `1px solid ${THEME.inkBorder}`,
                                  color: THEME.ink,
                                  padding: "5px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <FileText size={12} /> Tax Invoice
                              </button>
                              <button
                                onClick={() => setSelectedOrderDetails(o)}
                                style={{
                                  background: "#ffffff",
                                  border: `1px solid ${THEME.inkBorder}`,
                                  color: THEME.inkMuted,
                                  padding: "5px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: PRIVILEGES & COUPONS REGISTRY ================= */}
          {activeTab === "coupons" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                    PRIVILEGES & COUPON REGISTRY
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                    Curate exclusive VIP discount vouchers, regulate privileges, dismantle codes in real-time, and monitor live performance rankings.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddCouponModalOpen(true)}
                  style={{
                    background: THEME.ink,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "9px 18px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(33, 19, 15, 0.15)",
                  }}
                >
                  <Plus size={15} /> + Create New Privilege
                </button>
              </div>

              {/* Top 4 KPI Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.inkSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>Active Privileges</span>
                    <Tag size={16} style={{ color: THEME.greenText }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: THEME.ink, fontFamily: THEME.fontSerif, margin: "6px 0 2px" }}>
                    {coupons.filter((c) => c.isActive).length}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.greenText }}>
                    ● Live & redeemable at checkout
                  </div>
                </div>

                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.inkSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>Dismantled Codes</span>
                    <AlertTriangle size={16} style={{ color: THEME.redText }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: THEME.ink, fontFamily: THEME.fontSerif, margin: "6px 0 2px" }}>
                    {coupons.filter((c) => !c.isActive).length}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.redText }}>
                    ○ Blocked from customer use
                  </div>
                </div>

                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.inkSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>#1 Top Used Voucher</span>
                    <Award size={16} style={{ color: THEME.gold }} />
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: THEME.gold, fontFamily: THEME.fontSerif, margin: "8px 0 2px", letterSpacing: "0.04em" }}>
                    {couponRankings[0]?.code || "NONE"}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted }}>
                    {couponRankings[0] ? `${couponRankings[0].timesUsed} redemptions (₹${couponRankings[0].revenueGenerated.toLocaleString("en-IN")})` : "Awaiting first order"}
                  </div>
                </div>

                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.inkSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>Total Savings Granted</span>
                    <TrendingUp size={16} style={{ color: THEME.gold }} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: THEME.ink, fontFamily: THEME.fontSerif, margin: "6px 0 2px" }}>
                    ₹ {couponRankings.reduce((sum, r) => sum + r.totalDiscountGiven, 0).toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted }}>
                    Across all atelier transactions
                  </div>
                </div>
              </div>

              {/* Performance Leaderboard & Management Table */}
              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.inkBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: THEME.creamLight }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink }}>
                      Privilege Leaderboard & Access Controls
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: THEME.inkMuted }}>
                      Ranked by customer utilization and total revenue attribution. Dismantling a code instantly stops customers from applying it.
                    </p>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream }}>
                        <th style={{ padding: "12px 16px", fontWeight: 700, width: "60px" }}>RANK</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>VOUCHER CODE</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>BENEFIT & PRIVILEGE</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>MIN ORDER</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>TIMES USED</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>REVENUE DRIVEN</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>STATUS</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>MANAGEMENT ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couponRankings.map((item) => {
                        const isRank1 = item.rank === 1 && item.timesUsed > 0;
                        return (
                          <tr key={item.code} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}`, background: !item.isActive ? "rgba(250, 232, 232, 0.3)" : undefined }}>
                            <td style={{ padding: "14px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "50%",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: isRank1 ? THEME.gold : item.rank <= 3 ? THEME.cream : "#f0f0f0",
                                  color: isRank1 ? "#ffffff" : THEME.ink,
                                }}
                              >
                                #{item.rank}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: THEME.cream,
                                    border: `1px solid ${THEME.inkBorder}`,
                                    color: THEME.ink,
                                  }}
                                >
                                  {item.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(item.code);
                                    showNotice(`Copied code "${item.code}" to clipboard.`);
                                  }}
                                  title="Copy Code"
                                  style={{ background: "transparent", border: "none", color: THEME.inkSubtle, cursor: "pointer", padding: "2px" }}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                              <div style={{ fontSize: "10.5px", color: THEME.inkSubtle, marginTop: "2px" }}>{item.description}</div>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{ fontWeight: 600, color: THEME.ink }}>
                                {item.discountType === "percentage"
                                  ? `${Math.round(item.discountValue * 100)}% DISCOUNT`
                                  : `₹${item.discountValue.toLocaleString("en-IN")} FLAT OFF`}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", color: THEME.inkMuted }}>
                              {item.minSubtotal > 0 ? `₹${item.minSubtotal.toLocaleString("en-IN")}` : "No minimum"}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{ fontWeight: 700, color: THEME.ink, fontSize: "12px" }}>
                                {item.timesUsed} {item.timesUsed === 1 ? "order" : "orders"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.gold }}>
                              ₹{item.revenueGenerated.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              {item.isActive ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "999px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    background: THEME.greenBg,
                                    color: THEME.greenText,
                                  }}
                                >
                                  ● ACTIVE
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "999px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    background: THEME.redBg,
                                    color: THEME.redText,
                                  }}
                                >
                                  ○ DISMANTLED
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleToggleCoupon(item.code)}
                                  style={{
                                    background: item.isActive ? THEME.amberBg : THEME.greenBg,
                                    color: item.isActive ? THEME.amberText : THEME.greenText,
                                    border: `1px solid ${item.isActive ? "rgba(138, 87, 18, 0.3)" : "rgba(45, 94, 53, 0.3)"}`,
                                    padding: "5px 10px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {item.isActive ? "Dismantle" : "Reactivate"}
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(item.code)}
                                  style={{
                                    background: "transparent",
                                    color: THEME.redText,
                                    border: `1px solid ${THEME.redBg}`,
                                    padding: "5px 8px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    cursor: "pointer",
                                  }}
                                  title="Decommission Voucher"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: CUSTOMERS DIRECTORY (STOREFRONT THEME) ================= */}
          {activeTab === "customers" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                  STUDIO DIRECTOR CONSOLE
                </div>
                <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                  CLIENTS & CUSTOMER DIRECTORY
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                  VIP client engagement, order frequency, total lifetime value, and city tiering.
                </p>
              </div>

              <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: THEME.gold, borderBottom: `1px solid ${THEME.inkBorder}`, background: THEME.cream }}>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>CLIENT NAME</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>EMAIL</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>PHONE</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>LOCATION</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>ORDERS</th>
                      <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700 }}>LIFETIME VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersList.map((c) => (
                      <tr key={c.email} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: THEME.ink }}>{c.name}</td>
                        <td style={{ padding: "14px 16px", color: THEME.inkMuted }}>{c.email}</td>
                        <td style={{ padding: "14px 16px", color: THEME.inkSubtle }}>{c.phone}</td>
                        <td style={{ padding: "14px 16px", color: THEME.inkMuted }}>{c.city}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: THEME.ink }}>{c.orderCount} order{c.orderCount === 1 ? "" : "s"}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.gold, textAlign: "right" }}>
                          ₹ {c.totalSpent.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 7: SETTINGS & STATUTORY TAX ARCHITECTURE (STOREFRONT THEME) ================= */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "900px" }}>
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                  STUDIO DIRECTOR CONSOLE
                </div>
                <h1 style={{ fontFamily: THEME.fontSerif, fontSize: "32px", fontWeight: 600, margin: "4px 0 0", color: THEME.ink }}>
                  STATUTORY TAX & REGULATORY SETTINGS
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: THEME.inkMuted }}>
                  Manage your official GSTIN, legal enterprise credentials, intra-state CGST/SGST splits, and inter-state CST/IGST rates. Changes synchronize dynamically with the backend and customer tax invoices.
                </p>
              </div>

              {taxSuccessNotice && (
                <div
                  style={{
                    background: THEME.greenBg,
                    border: "1px solid rgba(45, 94, 53, 0.3)",
                    color: THEME.greenText,
                    borderRadius: "8px",
                    padding: "12px 18px",
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{taxSuccessNotice}</span>
                </div>
              )}

              <form onSubmit={handleSaveTaxSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 1. Legal Identity & GSTIN Registration */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: `1px solid ${THEME.inkBorderSubtle}`, paddingBottom: "12px" }}>
                    <FileText size={18} style={{ color: THEME.gold }} />
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink }}>
                      Legal Business Identity & Statutory GSTIN
                    </h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Legal Registered Entity Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={taxSettings.legalEntityName}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, legalEntityName: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "12.5px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Brand / Trade Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={taxSettings.brandTradeName}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, brandTradeName: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "12.5px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Statutory 15-Digit GSTIN Number *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="e.g. 07AABCS1429B1Z8"
                        value={taxSettings.gstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                          setTaxSettingsState((prev) => ({
                            ...prev,
                            gstin: val,
                            pan: val.length >= 12 ? val.slice(2, 12) : prev.pan,
                            stateCode: val.length >= 2 ? val.slice(0, 2) : prev.stateCode,
                            stateOfOrigin: val.length >= 2 && INDIAN_STATES_MAP[val.slice(0, 2)] ? INDIAN_STATES_MAP[val.slice(0, 2)] : prev.stateOfOrigin,
                          }));
                        }}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "6px", border: `1px solid ${gstinValidation.valid ? THEME.greenText : THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                      <div style={{ marginTop: "6px", fontSize: "10.5px" }}>
                        {gstinValidation.valid ? (
                          <span style={{ color: THEME.greenText, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={13} /> Valid Statutory GSTIN: Registered State — <b>{gstinValidation.stateName}</b> (State Code: {gstinValidation.stateCode})
                          </span>
                        ) : (
                          <span style={{ color: THEME.redText }}>
                            ⚠️ {gstinValidation.error || "Please enter a valid 15-character GSTIN (e.g. 07AABCS1429B1Z8)."}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Permanent Account Number (PAN) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="e.g. AABCS1429B"
                        value={taxSettings.pan}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                      <div style={{ marginTop: "4px", fontSize: "10.5px", color: THEME.inkSubtle }}>
                        Auto-extracted from characters 3-12 of GSTIN.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Principal Place of Business & Dispatch Atelier *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={taxSettings.registeredAddress}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, registeredAddress: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Dispatch Origin State & Code
                      </label>
                      <select
                        value={taxSettings.stateCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setTaxSettingsState((prev) => ({
                            ...prev,
                            stateCode: code,
                            stateOfOrigin: INDIAN_STATES_MAP[code] || "Delhi",
                          }));
                        }}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      >
                        {Object.entries(INDIAN_STATES_MAP).map(([code, name]) => (
                          <option key={code} value={code}>
                            [{code}] {name}
                          </option>
                        ))}
                      </select>
                      <div style={{ marginTop: "4px", fontSize: "10.5px", color: THEME.inkSubtle }}>
                        Used to automatically distinguish intra-state vs inter-state shipments.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Tax Rates Matrix & Inter-State CST */}
                <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: `1px solid ${THEME.inkBorderSubtle}`, paddingBottom: "12px" }}>
                    <Percent size={18} style={{ color: THEME.gold }} />
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, fontFamily: THEME.fontSerif, color: THEME.ink }}>
                      Statutory Tax Rates Matrix (GST & CST / IGST)
                    </h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Total GST Rate (%) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        max={100}
                        value={taxSettings.defaultGstRate}
                        onChange={(e) => {
                          const rate = Number(e.target.value);
                          const half = Math.round((rate / 2) * 10) / 10;
                          setTaxSettingsState((prev) => ({
                            ...prev,
                            defaultGstRate: rate,
                            cgstRate: half,
                            sgstRate: half,
                            igstRate: rate,
                          }));
                        }}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Intra-State CGST (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={taxSettings.cgstRate}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, cgstRate: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Intra-State SGST (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={taxSettings.sgstRate}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, sgstRate: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Inter-State IGST/CST (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={taxSettings.igstRate}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, igstRate: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>
                  </div>

                  <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorderSubtle}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "18px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: THEME.ink }}>
                      <input
                        type="checkbox"
                        checked={taxSettings.cstInterStateEnabled}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, cstInterStateEnabled: e.target.checked }))}
                        style={{ width: "16px", height: "16px", accentColor: THEME.ink }}
                      />
                      <span>Enable Inter-State Commerce (CST / IGST Single Tax) for deliveries outside {taxSettings.stateOfOrigin}</span>
                    </label>
                    <div style={{ fontSize: "10.5px", color: THEME.inkMuted, marginTop: "4px", marginLeft: "26px" }}>
                      When enabled, orders delivered outside {taxSettings.stateOfOrigin} automatically apply Integrated GST (IGST/CST) instead of the intra-state CGST + SGST split.
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Cosmetics HSN Code
                      </label>
                      <input
                        type="text"
                        value={taxSettings.hsnCosmetics}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, hsnCosmetics: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Perfumery HSN Code
                      </label>
                      <input
                        type="text"
                        value={taxSettings.hsnPerfumery}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, hsnPerfumery: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                        Invoice Number Prefix
                      </label>
                      <input
                        type="text"
                        value={taxSettings.invoicePrefix}
                        onChange={(e) => setTaxSettingsState((prev) => ({ ...prev, invoicePrefix: e.target.value.toUpperCase() }))}
                        style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Live Tax Engine Simulator Preview */}
                <div style={{ background: THEME.cream, border: `1px solid ${THEME.inkBorder}`, borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                    ⚡ Real-Time Tax Engine Calculation Preview (Sample ₹2,198 Order)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "11.5px" }}>
                    <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: `1px solid ${THEME.inkBorderSubtle}` }}>
                      <b style={{ color: THEME.ink, display: "block", marginBottom: "4px" }}>Intra-State Delivery (Within {taxSettings.stateOfOrigin})</b>
                      <div style={{ color: THEME.inkMuted, lineHeight: 1.6 }}>
                        Taxable Subtotal: <b>₹{Math.round((2198 / (1 + taxSettings.defaultGstRate / 100)) * 100) / 100}</b><br />
                        Central GST ({taxSettings.cgstRate}%): <b>₹{Math.round(((2198 - 2198 / (1 + taxSettings.defaultGstRate / 100)) / 2) * 100) / 100}</b><br />
                        State GST ({taxSettings.sgstRate}%): <b>₹{Math.round(((2198 - 2198 / (1 + taxSettings.defaultGstRate / 100)) / 2) * 100) / 100}</b><br />
                        Total Invoice Amount: <b style={{ color: THEME.gold }}>₹2,198.00</b>
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: `1px solid ${THEME.inkBorderSubtle}` }}>
                      <b style={{ color: THEME.ink, display: "block", marginBottom: "4px" }}>Inter-State Delivery (e.g. to Maharashtra/Bengal)</b>
                      <div style={{ color: THEME.inkMuted, lineHeight: 1.6 }}>
                        Taxable Subtotal: <b>₹{Math.round((2198 / (1 + taxSettings.defaultGstRate / 100)) * 100) / 100}</b><br />
                        Inter-State IGST / CST ({taxSettings.igstRate}%): <b>₹{Math.round((2198 - 2198 / (1 + taxSettings.defaultGstRate / 100)) * 100) / 100}</b><br />
                        CGST / SGST: <b>₹0.00 (Exempt)</b><br />
                        Total Invoice Amount: <b style={{ color: THEME.gold }}>₹2,198.00</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="submit"
                    disabled={isSavingTax}
                    style={{
                      background: THEME.ink,
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "12px 28px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(33, 19, 15, 0.2)",
                    }}
                  >
                    <Check size={16} />
                    <span>{isSavingTax ? "Saving & Syncing Cloud..." : "Save & Synchronize Statutory Tax Architecture"}</span>
                  </button>
                </div>

                {/* 4. Security Gateway & Database Status Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "10px" }}>
                  <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: THEME.ink, marginBottom: "6px" }}>
                      Dedicated Gateway Isolation
                    </div>
                    <div style={{ fontSize: "11px", color: THEME.inkMuted, lineHeight: 1.5 }}>
                      Admin console access is strictly guarded at <b>/sheaura/login</b>. Unauthenticated visits to <b>/admin</b> automatically redirect to the isolated login portal with cryptographic signature verification.
                    </div>
                  </div>

                  <div style={{ background: THEME.cardBg, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px", boxShadow: "0 2px 8px rgba(33, 19, 15, 0.04)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: THEME.ink, marginBottom: "6px" }}>
                      Database Synchronization Status
                    </div>
                    <div style={{ fontSize: "11.5px", color: THEME.greenText, display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={16} /> Direct Supabase cloud database connected (PostgreSQL / RLS enabled)
                    </div>
                    <div style={{ fontSize: "10.5px", color: THEME.inkSubtle, marginTop: "4px" }}>
                      Statutory tax records stored in <code>public.app_settings</code> table.
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* ================= ADD NEW CREATION MODAL (STOREFRONT THEME) ================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(33, 19, 15, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            style={{
              background: THEME.cardBg,
              border: `1px solid ${THEME.inkBorder}`,
              borderRadius: "16px",
              maxWidth: "780px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(33, 19, 15, 0.25)",
              padding: "28px 32px",
              color: THEME.ink,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${THEME.inkBorder}`, paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, fontWeight: 700 }}>
                  MAISON PRODUCT ATELIER
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: "24px", color: THEME.ink, fontFamily: THEME.fontSerif, fontWeight: 600 }}>
                  Publish New Cosmetic Creation
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: THEME.inkMuted }}>
                  Instantly available for customer ordering with live Supabase database sync.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.inkMuted, padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Presets Bar */}
            <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.gold, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Sparkles size={12} /> 1-Click Maison Presets
                </span>
                <button
                  type="button"
                  onClick={() => setIsRawImportOpen(!isRawImportOpen)}
                  style={{ background: "transparent", border: "none", color: THEME.gold, fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                >
                  {isRawImportOpen ? "Close Smart Paste" : "Smart Paste / JSON"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {PRODUCT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${THEME.inkBorder}`,
                      borderRadius: "6px",
                      padding: "7px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: THEME.ink,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {isRawImportOpen && (
                <div style={{ marginTop: "12px", borderTop: `1px solid ${THEME.inkBorderSubtle}`, paddingTop: "12px" }}>
                  <textarea
                    rows={4}
                    placeholder="Paste product JSON or 'Key: Value' text..."
                    value={rawImportText}
                    onChange={(e) => setRawImportText(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#ffffff", border: `1px solid ${THEME.inkBorder}`, borderRadius: "6px", color: THEME.ink, fontSize: "11.5px" }}
                  />
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    style={{ marginTop: "6px", background: THEME.ink, color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Apply Parsed Details
                  </button>
                </div>
              )}
            </div>

            {/* Creation Form */}
            <form onSubmit={handleSaveProduct}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Creation Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Velvet Rosebud Satin Lipstick"
                    value={productForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setProductForm((prev) => ({
                        ...prev,
                        name,
                        slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
                      }));
                    }}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c} style={{ background: "#ffffff", color: THEME.ink }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Official Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Stock Level (Pieces)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Arrival"
                    value={productForm.tag}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, tag: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>
              </div>

              {/* Photo & Packshot Section with Prominent Styled Device Upload Button */}
              <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <ImageIcon size={14} /> Multi-Image Photography & Gallery *
                    </label>
                    <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "2px" }}>
                      Add multiple packshots & shade angles for customer PDP thumbnail carousel.
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: "inline-flex", gap: "4px", background: THEME.cream, padding: "3px", borderRadius: "999px", border: `1px solid ${THEME.inkBorderSubtle}` }}>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("upload")}
                      style={{
                        background: imageSourceTab === "upload" ? THEME.ink : "transparent",
                        color: imageSourceTab === "upload" ? "#ffffff" : THEME.inkMuted,
                        border: "none",
                        borderRadius: "999px",
                        padding: "5px 14px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Upload size={12} /> Upload Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("library")}
                      style={{
                        background: imageSourceTab === "library" ? THEME.ink : "transparent",
                        color: imageSourceTab === "library" ? "#ffffff" : THEME.inkMuted,
                        border: "none",
                        borderRadius: "999px",
                        padding: "5px 14px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Sparkles size={12} /> Maison Library
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("url")}
                      style={{
                        background: imageSourceTab === "url" ? THEME.ink : "transparent",
                        color: imageSourceTab === "url" ? "#ffffff" : THEME.inkMuted,
                        border: "none",
                        borderRadius: "999px",
                        padding: "5px 14px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <ExternalLink size={12} /> Direct URLs
                    </button>
                  </div>
                </div>

                {/* Tab 1: Upload Files (PROPERLY STYLED STOREFRONT BUTTON) */}
                {imageSourceTab === "upload" && (
                  <div
                    style={{
                      border: `2px dashed ${THEME.inkBorder}`,
                      borderRadius: "10px",
                      padding: "26px 20px",
                      textAlign: "center",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: THEME.cream, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.gold }}>
                      <Upload size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: THEME.ink }}>
                        Upload Product Packshots & Swatches
                      </div>
                      <div style={{ fontSize: "11.5px", color: THEME.inkMuted, marginTop: "3px" }}>
                        Supports PNG, JPG, WebP. Hold Ctrl / Shift to pick multiple photos from your device.
                      </div>
                    </div>

                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: THEME.ink,
                        color: "#ffffff",
                        padding: "11px 24px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(33, 19, 15, 0.2)",
                        marginTop: "8px",
                      }}
                    >
                      <Upload size={14} />
                      <span>Select Photos From Device</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                )}

                {/* Tab 2: Maison Library */}
                {imageSourceTab === "library" && (
                  <div>
                    <div style={{ fontSize: "11.5px", color: THEME.inkMuted, marginBottom: "8px" }}>
                      Click any packshot below to toggle into/out of product gallery:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      {ASSET_LIBRARY_PICKER.map((asset) => {
                        const imgs = productForm.images || (productForm.image ? [productForm.image] : []);
                        const isSelected = imgs.includes(asset.path);
                        const selIndex = imgs.indexOf(asset.path);
                        const isPrimary = selIndex === 0;

                        return (
                          <div
                            key={asset.path}
                            onClick={() => handleToggleLibraryAsset(asset.path)}
                            style={{
                              border: isSelected ? `2px solid ${THEME.gold}` : `1px solid ${THEME.inkBorder}`,
                              borderRadius: "8px",
                              padding: "6px",
                              background: "#ffffff",
                              cursor: "pointer",
                              textAlign: "center",
                              position: "relative",
                              boxShadow: isSelected ? "0 4px 12px rgba(163, 106, 59, 0.2)" : "none",
                            }}
                          >
                            <img
                              src={asset.path}
                              alt={asset.label}
                              style={{ width: "100%", height: "65px", objectFit: "cover", borderRadius: "6px" }}
                            />
                            <div style={{ fontSize: "10.5px", fontWeight: 600, color: THEME.ink, marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {asset.label}
                            </div>
                            {isSelected && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  right: "6px",
                                  background: isPrimary ? THEME.ink : THEME.gold,
                                  color: isPrimary ? THEME.goldLight : "#ffffff",
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                }}
                              >
                                {isPrimary ? "★ Cover" : `#${selIndex + 1}`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 3: Direct URLs */}
                {imageSourceTab === "url" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Paste image URL (or multiple comma-separated URLs)..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: `1px solid ${THEME.inkBorder}`,
                        background: "#ffffff",
                        color: THEME.ink,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddImageUrl()}
                      style={{
                        background: THEME.ink,
                        color: "#ffffff",
                        border: "none",
                        padding: "9px 16px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + Add to Gallery
                    </button>
                  </div>
                )}

                {/* Gallery Strip Preview */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${THEME.inkBorderSubtle}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Product Gallery ({productForm.images?.length || 0} photo{(productForm.images?.length || 0) === 1 ? "" : "s"})
                    </span>
                    <span style={{ fontSize: "11px", color: THEME.greenText, fontWeight: 600 }}>
                      ✓ Storefront PDP Thumbnail Strip Ready
                    </span>
                  </div>

                  {(!productForm.images || productForm.images.length === 0) ? (
                    <div style={{ padding: "16px", textAlign: "center", fontSize: "11.5px", color: THEME.inkSubtle, background: "#ffffff", borderRadius: "8px", border: `1px dashed ${THEME.inkBorder}` }}>
                      No photos in gallery yet. Select from the library above or upload files.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                      {productForm.images.map((imgUrl, idx) => {
                        const isPrimary = idx === 0;
                        return (
                          <div
                            key={`${imgUrl}-${idx}`}
                            style={{
                              position: "relative",
                              borderRadius: "8px",
                              border: isPrimary ? `2px solid ${THEME.gold}` : `1px solid ${THEME.inkBorder}`,
                              background: "#ffffff",
                              padding: "6px",
                            }}
                          >
                            <img
                              src={imgUrl}
                              alt={`Gallery photo ${idx + 1}`}
                              style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px", background: THEME.cream }}
                            />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: isPrimary ? THEME.ink : THEME.cream,
                                  color: isPrimary ? THEME.goldLight : THEME.inkMuted,
                                }}
                              >
                                {isPrimary ? "★ Primary" : `#${idx + 1}`}
                              </span>
                              <div style={{ display: "inline-flex", gap: "4px" }}>
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(idx)}
                                    title="Make Primary Cover Photo"
                                    style={{
                                      background: THEME.cream,
                                      color: THEME.ink,
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 6px",
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  title="Remove photo"
                                  style={{
                                    background: THEME.redBg,
                                    color: THEME.redText,
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Description & Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Detailed Story & Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Rich botanical description for customer PDP..."
                    value={productForm.description}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "11.5px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    INCI Ingredients List
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Organic Camellia Seed Oil, Plant Squalane, Vitamin E..."
                    value={productForm.ingredients}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "11.5px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: `1px solid ${THEME.inkBorderSubtle}`, paddingTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${THEME.inkBorder}`,
                    borderRadius: "6px",
                    padding: "9px 20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: THEME.inkMuted,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  style={{
                    background: THEME.ink,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "9px 24px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(33, 19, 15, 0.2)",
                  }}
                >
                  {isSubmittingProduct ? "Publishing Creation..." : "Publish Creation to Storefront"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAX INVOICE VIEWER & DOWNLOAD MODAL (STOREFRONT THEME) ================= */}
      {selectedInvoiceOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(33, 19, 15, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoiceOrder(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${THEME.inkBorder}`,
              borderRadius: "14px",
              maxWidth: "850px",
              width: "100%",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(33, 19, 15, 0.3)",
              overflow: "hidden",
            }}
          >
            {/* Invoice Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${THEME.inkBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: THEME.cream,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={18} style={{ color: THEME.gold }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: THEME.ink }}>
                    OFFICIAL TAX INVOICE — {selectedInvoiceOrder.id}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted }}>
                    GSTIN 07AABCS1429B1Z8 · Indian GST Rule 48 Compliant
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => {
                    const data = buildInvoiceDataFromAdminOrder(selectedInvoiceOrder);
                    const html = generateInvoiceHtml(data);
                    printInvoiceHtml(html);
                  }}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${THEME.inkBorder}`,
                    color: THEME.ink,
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Printer size={13} /> Print
                </button>

                <button
                  onClick={() => {
                    const data = buildInvoiceDataFromAdminOrder(selectedInvoiceOrder);
                    const html = generateInvoiceHtml(data);
                    downloadInvoiceHtml(html, `SheAura-Tax-Invoice-${selectedInvoiceOrder.id}.html`);
                    showNotice(`✓ Tax Invoice downloaded for ${selectedInvoiceOrder.id}`);
                  }}
                  style={{
                    background: THEME.ink,
                    border: "none",
                    color: "#ffffff",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 12px rgba(33, 19, 15, 0.15)",
                  }}
                >
                  <Download size={13} /> Download Invoice
                </button>

                <button
                  onClick={() => setSelectedInvoiceOrder(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: THEME.inkMuted,
                    padding: "6px",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded Invoice HTML Preview */}
            <div style={{ flex: 1, background: "#ffffff", overflow: "hidden" }}>
              <iframe
                title="Invoice Preview"
                srcDoc={generateInvoiceHtml(buildInvoiceDataFromAdminOrder(selectedInvoiceOrder))}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD NEW PRIVILEGE / COUPON MODAL ================= */}
      {isAddCouponModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(33, 19, 15, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddCouponModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${THEME.inkBorder}`,
              borderRadius: "14px",
              maxWidth: "520px",
              width: "100%",
              padding: "28px",
              color: THEME.ink,
              boxShadow: "0 25px 60px rgba(33, 19, 15, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: `1px solid ${THEME.inkBorder}`, paddingBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  PRIVILEGE CURATION
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: THEME.ink, fontFamily: THEME.fontSerif, fontWeight: 600 }}>
                  Create New Promotional Code
                </h3>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(false)}
                style={{ background: "transparent", border: "none", color: THEME.inkMuted, cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                  Voucher Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20, VIPGIFT, DIWALI500"
                  value={newCouponForm.code}
                  onChange={(e) => setNewCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                  Benefit Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20% Festive Luxury Discount on all Wardrobes"
                  value={newCouponForm.description}
                  onChange={(e) => setNewCouponForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    Discount Type *
                  </label>
                  <select
                    value={newCouponForm.discountType}
                    onChange={(e) => setNewCouponForm((prev) => ({ ...prev, discountType: e.target.value as any }))}
                    style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed">Flat Amount Off (₹ INR)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                    {newCouponForm.discountType === "percentage" ? "Percentage Rate (e.g. 15 for 15%) *" : "Flat Rupee Discount (₹) *"}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={newCouponForm.discountType === "percentage" ? 90 : 50000}
                    value={newCouponForm.discountValue}
                    onChange={(e) => setNewCouponForm((prev) => ({ ...prev, discountValue: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: THEME.gold, marginBottom: "6px", textTransform: "uppercase" }}>
                  Minimum Order Bag Subtotal (INR ₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0 for no minimum threshold"
                  value={newCouponForm.minSubtotal}
                  onChange={(e) => setNewCouponForm((prev) => ({ ...prev, minSubtotal: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 12px", fontSize: "12px", borderRadius: "6px", border: `1px solid ${THEME.inkBorder}`, background: "#ffffff", color: THEME.ink }}
                />
                <div style={{ fontSize: "10.5px", color: THEME.inkSubtle, marginTop: "4px" }}>
                  Clients will be notified to meet this threshold before checkout unlocks the discount.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: `1px solid ${THEME.inkBorderSubtle}`, paddingTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddCouponModalOpen(false)}
                  style={{ background: THEME.cream, border: `1px solid ${THEME.inkBorder}`, padding: "9px 16px", borderRadius: "6px", fontSize: "12px", color: THEME.ink, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: THEME.ink, color: "#ffffff", border: "none", padding: "9px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Check size={14} /> Save & Activate Privilege
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAILS DOSSIER MODAL (STOREFRONT THEME) ================= */}
      {selectedOrderDetails && (() => {
        const o = selectedOrderDetails;
        const items = parseItems(o.items);
        const { label: payLabel, bg: payBg, text: payText } = getPaymentStatusBadge(o);
        const formattedTotal = formatOrderTotal(o);
        const custName = o.customer_name || o.client_name || "Maison Guest";
        const custEmail = o.customer_email || o.client_email || "guest@sheaura.com";
        const custPhone = o.customer_phone || o.client_phone || "+91 98200 11223";

        // Calculate itemized subtotal
        const calculatedSubtotal = items.reduce((acc, it) => acc + (it.unitPrice * (it.quantity || 1)), 0);
        const subtotal = o.subtotal && o.subtotal > 0 ? o.subtotal : calculatedSubtotal > 0 ? calculatedSubtotal : (o.total_price || 0);
        const discountAmount = o.discount_amount || o.discount || 0;

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1100,
              background: "rgba(33, 19, 15, 0.7)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedOrderDetails(null);
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: `1px solid ${THEME.inkBorder}`,
                borderRadius: "16px",
                maxWidth: "760px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "28px 32px",
                color: THEME.ink,
                boxShadow: "0 25px 70px rgba(33, 19, 15, 0.3)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: `1px solid ${THEME.inkBorder}`, paddingBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      CLIENT ORDER DOSSIER
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: payBg,
                        color: payText,
                      }}
                    >
                      {payLabel}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background:
                          o.status === "delivered"
                            ? THEME.greenBg
                            : o.status === "dispatched"
                            ? THEME.amberBg
                            : THEME.blueBg,
                        color:
                          o.status === "delivered"
                            ? THEME.greenText
                            : o.status === "dispatched"
                            ? THEME.amberText
                            : THEME.blueText,
                      }}
                    >
                      {o.status.toUpperCase()}
                    </span>
                    {o.discount_code && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "10px",
                          fontWeight: 700,
                          background: THEME.cream,
                          border: `1px solid ${THEME.inkBorderSubtle}`,
                          color: THEME.gold,
                        }}
                      >
                        🎟️ {o.discount_code}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: 0, fontSize: "24px", color: THEME.ink, fontFamily: THEME.fontSerif, fontWeight: 600 }}>
                    #{o.id}
                  </h3>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "2px" }}>
                    Placed on {new Date(o.created_at).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  style={{ background: "transparent", border: "none", color: THEME.inkMuted, cursor: "pointer", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* 4 Informational Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "22px" }}>
                {/* 1. Customer Profile */}
                <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={13} /> VIP Client Profile
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: THEME.ink }}>{custName}</div>
                  <div style={{ fontSize: "11.5px", color: THEME.inkMuted, marginTop: "2px" }}>{custEmail}</div>
                  <div style={{ fontSize: "11.5px", color: THEME.inkSubtle, marginTop: "2px" }}>{custPhone}</div>
                  <div style={{ marginTop: "6px" }}>
                    <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: THEME.cream, color: THEME.ink, border: `1px solid ${THEME.inkBorderSubtle}` }}>
                      Verified VIP Member
                    </span>
                  </div>
                </div>

                {/* 2. White-Glove Dispatch */}
                <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Truck size={13} /> White-Glove Dispatch
                  </div>
                  <div style={{ fontSize: "12px", color: THEME.ink, lineHeight: 1.45 }}>{o.shipping_address}</div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "6px" }}>
                    Courier: <b>BlueDart White-Glove Express</b>
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "2px" }}>
                    Tracking: <b style={{ fontFamily: "monospace", color: THEME.gold }}>{o.tracking_number || "Awaiting dispatch assignment"}</b>
                  </div>
                </div>

                {/* 3. Payment Settlement */}
                <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CreditCard size={13} /> Payment Settlement
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: THEME.ink }}>
                    {(o.payment_method || "UPI / ONLINE").toUpperCase()}
                  </div>
                  <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "2px" }}>
                    Settlement Status: <b style={{ color: payText }}>{payLabel}</b>
                  </div>
                  <div style={{ fontSize: "10.5px", color: THEME.inkSubtle, marginTop: "4px", fontFamily: "monospace" }}>
                    Ref: {o.gateway_payment_id || `PAY_REF_${o.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}`}
                  </div>
                </div>

                {/* 4. Privilege & Savings */}
                <div style={{ background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Tag size={13} /> Applied Privilege
                  </div>
                  {o.discount_code ? (
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: THEME.gold }}>
                        🎟️ {o.discount_code.toUpperCase()}
                      </div>
                      <div style={{ fontSize: "11px", color: THEME.greenText, fontWeight: 600, marginTop: "2px" }}>
                        Client Savings: -₹{discountAmount.toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "10.5px", color: THEME.inkMuted, marginTop: "2px" }}>
                        Exclusive VIP promotion applied at checkout
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "12px", color: THEME.inkMuted }}>No promotional voucher code applied.</div>
                      <div style={{ fontSize: "10.5px", color: THEME.inkSubtle, marginTop: "4px" }}>
                        Billed at standard atelier catalog price.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manifest of Ordered Creations Table */}
              <div style={{ marginBottom: "22px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: THEME.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                  MANIFEST OF ORDERED CREATIONS ({items.length || o.items_count || 1} PIECES)
                </div>
                <div style={{ background: "#ffffff", border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: THEME.cream, borderBottom: `1px solid ${THEME.inkBorder}`, color: THEME.gold }}>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>CREATION</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>SHADE / VARIANT</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textAlign: "center" }}>QTY</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textAlign: "right" }}>UNIT PRICE</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textAlign: "right" }}>ITEM TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${THEME.inkBorderSubtle}` }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={it.image || "/products/Peach Blossom Blush.webp"}
                                alt={it.name}
                                style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", background: THEME.cream, border: `1px solid ${THEME.inkBorderSubtle}` }}
                              />
                              <div style={{ fontWeight: 600, color: THEME.ink }}>{it.name}</div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", color: THEME.inkMuted }}>
                            {it.shade || "Standard"}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: THEME.ink }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", color: THEME.inkMuted }}>
                            ₹{it.unitPrice.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: THEME.ink }}>
                            ₹{(it.itemTotal || it.unitPrice * (it.quantity || 1)).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown & Grand Total */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
                <div style={{ width: "320px", background: THEME.creamLight, border: `1px solid ${THEME.inkBorder}`, borderRadius: "10px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: THEME.inkMuted, marginBottom: "8px" }}>
                    <span>Bag Subtotal:</span>
                    <span style={{ fontWeight: 600, color: THEME.ink }}>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: THEME.greenText, marginBottom: "8px" }}>
                      <span>Voucher ({o.discount_code}):</span>
                      <span style={{ fontWeight: 700 }}>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: THEME.inkMuted, marginBottom: "8px" }}>
                    <span>White-Glove Courier:</span>
                    <span style={{ fontWeight: 600, color: THEME.greenText }}>COMPLIMENTARY</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: THEME.inkSubtle, marginBottom: "10px" }}>
                    <span>Statutory 18% GST (CGST 9% + SGST 9%):</span>
                    <span>Included</span>
                  </div>

                  <div style={{ borderTop: `1px solid ${THEME.inkBorder}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: THEME.ink }}>Grand Total:</span>
                    <span style={{ fontSize: "20px", fontWeight: 700, color: THEME.gold, fontFamily: THEME.fontSerif }}>
                      {formattedTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${THEME.inkBorder}`, paddingTop: "18px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: THEME.inkMuted }}>Dispatch Status:</span>
                  <select
                    value={o.status}
                    onChange={(e) => {
                      const newSt = e.target.value as any;
                      handleUpdateStatus(o.id, newSt);
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: newSt } : null));
                    }}
                    style={{
                      background: "#ffffff",
                      color: THEME.ink,
                      border: `1px solid ${THEME.inkBorder}`,
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  >
                    <option value="processing">Processing</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => {
                      setSelectedInvoiceOrder(o);
                      setSelectedOrderDetails(null);
                    }}
                    style={{
                      background: THEME.ink,
                      color: "#ffffff",
                      border: "none",
                      padding: "9px 20px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 4px 12px rgba(33, 19, 15, 0.15)",
                    }}
                  >
                    <FileText size={14} /> View / Print Tax Invoice
                  </button>
                  <button
                    onClick={() => setSelectedOrderDetails(null)}
                    style={{
                      background: THEME.cream,
                      border: `1px solid ${THEME.inkBorder}`,
                      color: THEME.ink,
                      padding: "9px 18px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
