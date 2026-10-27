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

export default function AdminView({ onBack }: AdminViewProps) {
  const [adminSession, setAdminSessionState] = useState(() => getAdminSession());
  const [activeTab, setActiveTab] = useState<"overview" | "creations" | "inventory" | "orders" | "customers" | "settings">("overview");
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

    // 3. Supabase Realtime Stream for Orders (if online)
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
      const val = typeof o.total_price === "number" ? o.total_price : parseFloat(String(o.total_amount).replace(/[^0-9.]/g, "")) || 0;
      return acc + val;
    }, 0);
  }, [orders]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "processing" || o.status === "dispatched" || o.status === "pending").length;
  }, [orders]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.stock_quantity ?? 50) < 15).length;
  }, [products]);

  const customersList = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    orders.forEach((o) => {
      const name = o.client_name || o.customer_name || "Maison Member";
      const email = o.client_email || o.customer_email || "concierge@sheaura.com";
      const phone = o.client_phone || o.customer_phone || "+91 98200 11223";
      const city = o.shipping_address?.split(",")[1]?.trim() || "India";
      const amt = typeof o.total_price === "number" ? o.total_price : parseFloat(String(o.total_amount).replace(/[^0-9.]/g, "")) || 0;

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
          background: "#0c0c0f",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "#141418",
            border: "1px solid rgba(223, 184, 149, 0.2)",
            borderRadius: "16px",
            padding: "40px 32px",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(193, 136, 71, 0.15)",
              border: "1px solid rgba(193, 136, 71, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <ShieldCheck size={32} style={{ color: "#c18847" }} />
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", margin: "0 0 8px", color: "#ffffff" }}>
            Restricted Studio Console
          </h2>
          <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, marginBottom: "28px" }}>
            Administrative privileges are strictly isolated. Please authenticate via the dedicated gateway at <b>sheaura/login</b>.
          </p>
          <button
            onClick={() => {
              window.history.pushState({}, "", "/sheaura/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #c18847 0%, #9a652a 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(193, 136, 71, 0.3)",
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
        background: "#0c0c0f",
        color: "#f8fafc",
        fontFamily: "'Montserrat', sans-serif",
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
            background: "#181820",
            border: "1px solid rgba(193, 136, 71, 0.4)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            letterSpacing: "0.03em",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "#c18847" }} /> {actionNotice}
        </div>
      )}

      {/* ================= TOP BAR (MATCHING SCREENSHOT 2) ================= */}
      <header
        style={{
          height: "64px",
          background: "#111116",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
            <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "0.15em", color: "#f8fafc" }}>
              SHE'AURA
            </span>
            <span style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#c18847", fontWeight: 600 }}>
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
              color: "#10b981",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "3px 10px",
              borderRadius: "999px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            DATABASE LIVE
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ position: "relative", width: "420px", maxWidth: "100%" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Search clients, orders, creations, SKUs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px 9px 38px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "#181820",
              color: "#f8fafc",
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
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "6px",
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#e2e8f0",
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
                background: "linear-gradient(135deg, #c18847 0%, #765d50 100%)",
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
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc" }}>Studio Director</div>
              <div style={{ fontSize: "9.5px", color: "#64748b" }}>STUDIO DIRECTOR</div>
            </div>
          </div>

          <button
            onClick={handleLockConsole}
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
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
            background: "#111116",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
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
                    border: isActive ? "1px solid rgba(193, 136, 71, 0.35)" : "1px solid transparent",
                    background: isActive ? "rgba(193, 136, 71, 0.1)" : "transparent",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontSize: "12.5px",
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? "#c18847" : "#64748b" }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mini Brand Banner Card at Bottom */}
          <div
            style={{
              background: "#16161d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "12px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#c18847", letterSpacing: "0.1em" }}>
              SHE'AURA ATELIER
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>
              COUTURE BEAUTY · ART MEETS FORMULATION
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto", background: "#0c0c0f" }}>
          {/* ================= TAB 1: STUDIO OVERVIEW (SCREENSHOT 2 & 3) ================= */}
          {activeTab === "overview" && (
            <div>
              {/* Header section with Date picker and + Add Creation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff", letterSpacing: "-0.01em" }}>
                    STUDIO OVERVIEW
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Real-time insights into your creations, orders, inventory and customers.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      background: "#16161c",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "11.5px",
                      color: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Calendar size={13} style={{ color: "#c18847" }} /> 22 Oct 2026 – 28 Oct 2026 ▾
                  </div>

                  <button
                    onClick={handleCreateDynamicTestOrder}
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#10b981",
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
                      background: "linear-gradient(135deg, #c18847 0%, #a86b2b 100%)",
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
                      boxShadow: "0 4px 14px rgba(193, 136, 71, 0.25)",
                    }}
                  >
                    <Plus size={14} /> + Add Creation
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards (Matching Screenshot 2) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
                {/* 1. Total Revenue */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>
                      TOTAL REVENUE
                    </span>
                    <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(193, 136, 71, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c18847", fontSize: "11px", fontWeight: 700 }}>
                      ₹
                    </span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "10px 0 4px" }}>
                    ₹ {totalRevenue.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                    <TrendingUp size={12} /> from {orders.length} customer orders
                  </div>
                </div>

                {/* 2. Active Orders */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>
                      ACTIVE ORDERS
                    </span>
                    <ShoppingBag size={14} style={{ color: "#3b82f6" }} />
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "10px 0 4px" }}>
                    {activeOrdersCount}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#3b82f6" }}>
                    On track in fulfillment
                  </div>
                </div>

                {/* 3. Low-Stock SKUs */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>
                      LOW-STOCK SKUS
                    </span>
                    <Boxes size={14} style={{ color: "#f59e0b" }} />
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "10px 0 4px" }}>
                    {lowStockCount}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={11} /> Needs attention
                  </div>
                </div>

                {/* 4. Total Customers */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>
                      TOTAL CUSTOMERS
                    </span>
                    <User size={14} style={{ color: "#10b981" }} />
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "10px 0 4px" }}>
                    {customersList.length}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#10b981" }}>
                    ↑ Active VIP clients
                  </div>
                </div>
              </div>

              {/* Middle Section: Orders Requiring Attention + Inventory Alerts */}
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "20px", marginBottom: "28px" }}>
                {/* Orders Requiring Attention */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#f8fafc", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      ORDERS REQUIRING ATTENTION
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      style={{ background: "transparent", border: "none", color: "#c18847", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      View all →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                      No pending orders. All client orders are dispatched.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                        <thead>
                          <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "left" }}>
                            <th style={{ padding: "8px 10px" }}>ORDER ID</th>
                            <th style={{ padding: "8px 10px" }}>CUSTOMER</th>
                            <th style={{ padding: "8px 10px" }}>TOTAL</th>
                            <th style={{ padding: "8px 10px" }}>PAYMENT</th>
                            <th style={{ padding: "8px 10px" }}>FULFILLMENT</th>
                            <th style={{ padding: "8px 10px", textAlign: "right" }}>INVOICE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((o) => {
                            const isPaid = (o.payment_status || "paid").toLowerCase() === "paid";
                            return (
                              <tr key={o.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                <td style={{ padding: "10px", fontWeight: 600, color: "#c18847" }}>{o.id}</td>
                                <td style={{ padding: "10px" }}>{o.client_name || o.customer_name}</td>
                                <td style={{ padding: "10px", fontWeight: 700 }}>{o.total_amount || `₹${o.total_price}`}</td>
                                <td style={{ padding: "10px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      background: isPaid ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                      color: isPaid ? "#10b981" : "#ef4444",
                                    }}
                                  >
                                    {isPaid ? "PAID" : "FAILED"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      background:
                                        o.status === "delivered"
                                          ? "rgba(16, 185, 129, 0.15)"
                                          : o.status === "dispatched"
                                          ? "rgba(168, 85, 247, 0.15)"
                                          : "rgba(59, 130, 246, 0.15)",
                                      color:
                                        o.status === "delivered"
                                          ? "#10b981"
                                          : o.status === "dispatched"
                                          ? "#c084fc"
                                          : "#60a5fa",
                                    }}
                                  >
                                    {o.status.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(o)}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.06)",
                                      border: "1px solid rgba(255, 255, 255, 0.1)",
                                      color: "#f8fafc",
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
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

                {/* Inventory Alerts (Matching Screenshot 2 right widget) */}
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#f8fafc", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      INVENTORY ALERTS
                    </h3>
                    <button
                      onClick={() => setActiveTab("inventory")}
                      style={{ background: "transparent", border: "none", color: "#c18847", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      View inventory →
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                            padding: "10px",
                            background: "#181820",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={p.image}
                              alt={p.name}
                              style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", background: "#222" }}
                            />
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 600, color: "#f8fafc" }}>{p.name}</div>
                              <div style={{ fontSize: "9.5px", color: "#64748b" }}>{p.category}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: isLow ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                color: isLow ? "#ef4444" : "#10b981",
                              }}
                            >
                              {stock} units
                            </span>
                            <button
                              onClick={() => handleAdjustStock(p.slug, 10)}
                              style={{
                                background: "rgba(193, 136, 71, 0.12)",
                                color: "#c18847",
                                border: "none",
                                borderRadius: "4px",
                                padding: "2px 6px",
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

              {/* Lower Section: Recent Orders (Screenshot 3) */}
              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#f8fafc", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    RECENT ORDERS
                  </h3>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      style={{
                        background: "#181820",
                        color: "#e2e8f0",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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
                        background: "#181820",
                        color: "#94a3b8",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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
                      <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                        <th style={{ padding: "12px" }}>ORDER ID</th>
                        <th style={{ padding: "12px" }}>CUSTOMER</th>
                        <th style={{ padding: "12px" }}>DATE</th>
                        <th style={{ padding: "12px" }}>ITEMS</th>
                        <th style={{ padding: "12px" }}>TOTAL</th>
                        <th style={{ padding: "12px" }}>PAYMENT</th>
                        <th style={{ padding: "12px" }}>STATUS</th>
                        <th style={{ padding: "12px", textAlign: "right" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const items = parseItems(o.items);
                        const isPaid = (o.payment_status || "paid").toLowerCase() === "paid";
                        return (
                          <tr key={o.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                            <td style={{ padding: "12px", fontWeight: 600, color: "#c18847" }}>{o.id}</td>
                            <td style={{ padding: "12px" }}>
                              <div style={{ fontWeight: 600, color: "#ffffff" }}>{o.client_name || o.customer_name}</div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>{o.client_email || o.customer_email}</div>
                            </td>
                            <td style={{ padding: "12px", color: "#94a3b8" }}>
                              {new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px" }}>{items.length || o.items_count || 1}</td>
                            <td style={{ padding: "12px", fontWeight: 700 }}>{o.total_amount || `₹${o.total_price}`}</td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  background: isPaid ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  color: isPaid ? "#10b981" : "#ef4444",
                                }}
                              >
                                {isPaid ? "PAID" : "FAILED"}
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
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : o.status === "dispatched"
                                      ? "rgba(168, 85, 247, 0.15)"
                                      : "rgba(59, 130, 246, 0.15)",
                                  color:
                                    o.status === "delivered"
                                      ? "#10b981"
                                      : o.status === "dispatched"
                                      ? "#c084fc"
                                      : "#60a5fa",
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
                                    background: "rgba(193, 136, 71, 0.12)",
                                    border: "1px solid rgba(193, 136, 71, 0.3)",
                                    color: "#c18847",
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
                                    background: "rgba(255, 255, 255, 0.06)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "#f8fafc",
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

          {/* ================= TAB 2: CREATIONS CATALOGUE (SCREENSHOT 4) ================= */}
          {activeTab === "creations" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff" }}>
                    CREATIONS CATALOGUE
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Manage your archival creations, photoshoot releases, pricing, and shade availability.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    background: "linear-gradient(135deg, #c18847 0%, #a86b2b 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(193, 136, 71, 0.3)",
                  }}
                >
                  <Plus size={14} /> + Add New Creation
                </button>
              </div>

              {/* Filters & Search */}
              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px 18px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                  CATALOGUE ({filteredProducts.length})
                </span>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      background: "#181820",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
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
                      background: "#181820",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
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

              {/* Table Matching Screenshot 4 */}
              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#16161b" }}>
                      <th style={{ padding: "12px 16px" }}>SKU</th>
                      <th style={{ padding: "12px 16px" }}>CREATION NAME</th>
                      <th style={{ padding: "12px 16px" }}>CATEGORY</th>
                      <th style={{ padding: "12px 16px" }}>SELLING PRICE</th>
                      <th style={{ padding: "12px 16px" }}>VARIANTS</th>
                      <th style={{ padding: "12px 16px" }}>TOTAL STOCK</th>
                      <th style={{ padding: "12px 16px" }}>STATUS</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, idx) => {
                      const sku = String(idx + 1).padStart(2, "0");
                      const stock = p.stock_quantity ?? 50;
                      return (
                        <tr key={p.slug || p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                          <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "monospace" }}>{sku}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: "38px", height: "38px", objectFit: "cover", borderRadius: "6px", background: "#222" }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: "#ffffff" }}>{p.name}</div>
                                <div style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                  <span>{p.slug}</span>
                                  {p.images && p.images.length > 1 && (
                                    <span style={{ fontSize: "9px", background: "rgba(193, 136, 71, 0.15)", color: "#c18847", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                      📷 {p.images.length} photos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{p.category}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#ffffff" }}>
                            ₹ {p.price.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ background: "#1c1c24", padding: "2px 6px", borderRadius: "4px", fontSize: "9.5px" }}>Full Size</span>
                              <span style={{ background: "#1c1c24", padding: "2px 6px", borderRadius: "4px", fontSize: "9.5px" }}>Travel</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{stock} units</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                              ACTIVE
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => handleCopyProductJson(p)}
                                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                title="Copy JSON"
                              >
                                <Copy size={11} /> Copy JSON
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
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

          {/* ================= TAB 3: INVENTORY & SKU MATRIX (SCREENSHOT 5) ================= */}
          {activeTab === "inventory" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff" }}>
                    INVENTORY & SKU MATRIX
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
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
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
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

              {/* Table Matching Screenshot 5 */}
              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                  VARIANT MATRIX ({skuMatrix.length})
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#16161b" }}>
                      <th style={{ padding: "12px 16px" }}>VARIANT SKU</th>
                      <th style={{ padding: "12px 16px" }}>CREATION</th>
                      <th style={{ padding: "12px 16px" }}>SHADE / SIZE</th>
                      <th style={{ padding: "12px 16px" }}>ON HAND</th>
                      <th style={{ padding: "12px 16px" }}>RESERVED</th>
                      <th style={{ padding: "12px 16px" }}>AVAILABLE TO SELL</th>
                      <th style={{ padding: "12px 16px" }}>HEALTH</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>ADJUST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuMatrix.map((item) => (
                      <tr key={item.sku} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#c18847" }}>{item.sku}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{item.product.name}</div>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>{item.product.category}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: "4px", fontSize: "10.5px" }}>
                            {item.shadeName}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>{item.onHand}</td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{item.reserved}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>{item.available}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              background: item.health === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: item.health === "ACTIVE" ? "#10b981" : "#ef4444",
                            }}
                          >
                            {item.health}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => handleAdjustStock(item.product.slug, -5)}
                              style={{ background: "#1c1c24", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#e2e8f0", padding: "3px 7px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleAdjustStock(item.product.slug, 5)}
                              style={{ background: "#1c1c24", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#10b981", padding: "3px 7px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}
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

          {/* ================= TAB 4: ORDERS & DISPATCH ================= */}
          {activeTab === "orders" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                    STUDIO DIRECTOR CONSOLE
                  </div>
                  <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff" }}>
                    ORDERS & DISPATCH MANAGEMENT
                  </h1>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Live customer order dispatch pipeline, courier tracking, and GST tax invoice generation.
                  </p>
                </div>

                <button
                  onClick={handleCreateDynamicTestOrder}
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10b981",
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
                      background: orderStatusFilter === st ? "#c18847" : "#131317",
                      color: orderStatusFilter === st ? "#ffffff" : "#94a3b8",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
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
              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#16161b" }}>
                      <th style={{ padding: "14px 16px" }}>ORDER ID</th>
                      <th style={{ padding: "14px 16px" }}>CUSTOMER & ADDRESS</th>
                      <th style={{ padding: "14px 16px" }}>ITEMS</th>
                      <th style={{ padding: "14px 16px" }}>TOTAL</th>
                      <th style={{ padding: "14px 16px" }}>STATUS</th>
                      <th style={{ padding: "14px 16px" }}>TRACKING</th>
                      <th style={{ padding: "14px 16px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const items = parseItems(o.items);
                      return (
                        <tr key={o.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: "#c18847" }}>
                            <div>{o.id}</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                              {new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#ffffff" }}>{o.client_name || o.customer_name}</div>
                            <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>{o.client_email || o.customer_email}</div>
                            <div style={{ fontSize: "9.5px", color: "#64748b" }}>{o.shipping_address}</div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {items.length > 0 ? (
                              <div>
                                <div style={{ color: "#f8fafc", fontWeight: 500 }}>{items[0].name}</div>
                                {items.length > 1 && <div style={{ fontSize: "10px", color: "#64748b" }}>+{items.length - 1} more items</div>}
                              </div>
                            ) : (
                              <span>{o.items_count || 1} pieces</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: "#ffffff" }}>
                            {o.total_amount || `₹${o.total_price}`}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateStatus(o.id, e.target.value as any)}
                              style={{
                                background: "#1c1c24",
                                color: "#f8fafc",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
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
                              <span style={{ fontFamily: "monospace", fontSize: "10.5px", color: "#c084fc", background: "rgba(168, 85, 247, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                {o.tracking_number}
                              </span>
                            ) : (
                              <span style={{ fontSize: "10px", color: "#64748b" }}>Not dispatched</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => setSelectedInvoiceOrder(o)}
                                style={{
                                  background: "rgba(193, 136, 71, 0.15)",
                                  border: "1px solid rgba(193, 136, 71, 0.35)",
                                  color: "#c18847",
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

          {/* ================= TAB 5: CUSTOMERS DIRECTORY ================= */}
          {activeTab === "customers" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                  STUDIO DIRECTOR CONSOLE
                </div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff" }}>
                  CLIENTS & CUSTOMER DIRECTORY
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                  VIP client engagement, order frequency, total lifetime value, and city tiering.
                </p>
              </div>

              <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#16161b" }}>
                      <th style={{ padding: "14px 16px" }}>CLIENT NAME</th>
                      <th style={{ padding: "14px 16px" }}>EMAIL</th>
                      <th style={{ padding: "14px 16px" }}>PHONE</th>
                      <th style={{ padding: "14px 16px" }}>LOCATION</th>
                      <th style={{ padding: "14px 16px" }}>ORDERS</th>
                      <th style={{ padding: "14px 16px", textAlign: "right" }}>LIFETIME VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersList.map((c) => (
                      <tr key={c.email} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#ffffff" }}>{c.name}</td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8" }}>{c.email}</td>
                        <td style={{ padding: "14px 16px", color: "#64748b" }}>{c.phone}</td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8" }}>{c.city}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{c.orderCount} order{c.orderCount === 1 ? "" : "s"}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#c18847", textAlign: "right" }}>
                          ₹ {c.totalSpent.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 6: SETTINGS & GATEWAY ================= */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "800px" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                  STUDIO DIRECTOR CONSOLE
                </div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "4px 0 0", color: "#ffffff" }}>
                  SYSTEM & SECURITY SETTINGS
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                  Administrative credentials, Supabase database synchronization, and gateway protection.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "20px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
                    Dedicated Gateway Isolation
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.6 }}>
                    Direct admin panel login is strictly routed through <b>/sheaura/login</b>. Unauthenticated visits to <b>/admin</b> automatically redirect to the isolated login portal with cryptographic signature verification.
                  </div>
                </div>

                <div style={{ background: "#131317", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "20px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
                    Database Synchronization Status
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={16} /> Direct Supabase cloud database connected (PostgreSQL / RLS enabled)
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= ADD NEW CREATION MODAL (WITH PROPER PHOTO UPLOAD BUTTON) ================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
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
              background: "#141418",
              border: "1px solid rgba(223, 184, 149, 0.25)",
              borderRadius: "16px",
              maxWidth: "780px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
              padding: "28px 32px",
              color: "#f8fafc",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                  MAISON PRODUCT ATELIER
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: "20px", color: "#ffffff", fontFamily: "Cormorant Garamond, serif", fontWeight: 700 }}>
                  Publish New Cosmetic Creation
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#94a3b8" }}>
                  Instantly available for customer ordering with live Supabase database sync.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Presets Bar */}
            <div style={{ background: "#1a1a22", border: "1px solid rgba(193, 136, 71, 0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#c18847", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Sparkles size={12} /> 1-Click Maison Presets
                </span>
                <button
                  type="button"
                  onClick={() => setIsRawImportOpen(!isRawImportOpen)}
                  style={{ background: "transparent", border: "none", color: "#c18847", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
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
                      background: "#141418",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "7px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#f8fafc",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {isRawImportOpen && (
                <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                  <textarea
                    rows={4}
                    placeholder="Paste product JSON or 'Key: Value' text..."
                    value={rawImportText}
                    onChange={(e) => setRawImportText(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#111116", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#fff", fontSize: "11.5px" }}
                  />
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    style={{ marginTop: "6px", background: "#c18847", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
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
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c} style={{ background: "#1c1c24", color: "#fff" }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    Official Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    Stock Level (Pieces)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Arrival"
                    value={productForm.tag}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, tag: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>
              </div>

              {/* Photo & Packshot Section with Proper Aligned Buttons */}
              <div style={{ background: "#181820", border: "1px solid rgba(193, 136, 71, 0.3)", borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#c18847", textTransform: "uppercase", letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <ImageIcon size={14} /> Multi-Image Photography & Gallery *
                    </label>
                    <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>
                      Add multiple packshots & shade angles for customer PDP thumbnail carousel.
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: "inline-flex", gap: "4px", background: "#111116", padding: "3px", borderRadius: "999px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("upload")}
                      style={{
                        background: imageSourceTab === "upload" ? "#c18847" : "transparent",
                        color: imageSourceTab === "upload" ? "#ffffff" : "#94a3b8",
                        border: "none",
                        borderRadius: "999px",
                        padding: "4px 12px",
                        fontSize: "10.5px",
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
                        background: imageSourceTab === "library" ? "#c18847" : "transparent",
                        color: imageSourceTab === "library" ? "#ffffff" : "#94a3b8",
                        border: "none",
                        borderRadius: "999px",
                        padding: "4px 12px",
                        fontSize: "10.5px",
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
                        background: imageSourceTab === "url" ? "#c18847" : "transparent",
                        color: imageSourceTab === "url" ? "#ffffff" : "#94a3b8",
                        border: "none",
                        borderRadius: "999px",
                        padding: "4px 12px",
                        fontSize: "10.5px",
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

                {/* Tab 1: Upload Files (PROPERLY ALIGNED PROMINENT BUTTON) */}
                {imageSourceTab === "upload" && (
                  <div
                    style={{
                      border: "2px dashed rgba(193, 136, 71, 0.35)",
                      borderRadius: "10px",
                      padding: "24px 20px",
                      textAlign: "center",
                      background: "#14141a",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(193, 136, 71, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c18847" }}>
                      <Upload size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                        Upload Product Packshots & Swatches
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                        Supports PNG, JPG, WebP. Hold Ctrl / Shift to pick multiple photos.
                      </div>
                    </div>

                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "linear-gradient(135deg, #c18847 0%, #9a652a 100%)",
                        color: "#ffffff",
                        padding: "10px 22px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(193, 136, 71, 0.3)",
                        marginTop: "6px",
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
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>
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
                              border: isSelected ? "2px solid #c18847" : "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              padding: "6px",
                              background: "#14141a",
                              cursor: "pointer",
                              textAlign: "center",
                              position: "relative",
                              boxShadow: isSelected ? "0 4px 12px rgba(193, 136, 71, 0.25)" : "none",
                            }}
                          >
                            <img
                              src={asset.path}
                              alt={asset.label}
                              style={{ width: "100%", height: "65px", objectFit: "cover", borderRadius: "6px" }}
                            />
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "#f8fafc", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {asset.label}
                            </div>
                            {isSelected && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  right: "6px",
                                  background: isPrimary ? "#c18847" : "#191970",
                                  color: "#ffffff",
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
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        background: "#1c1c24",
                        color: "#fff",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddImageUrl()}
                      style={{
                        background: "#c18847",
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
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#c18847", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Product Gallery ({productForm.images?.length || 0} photo{(productForm.images?.length || 0) === 1 ? "" : "s"})
                    </span>
                    <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 600 }}>
                      ✓ Storefront PDP Thumbnail Strip Ready
                    </span>
                  </div>

                  {(!productForm.images || productForm.images.length === 0) ? (
                    <div style={{ padding: "16px", textAlign: "center", fontSize: "11.5px", color: "#64748b", background: "#14141a", borderRadius: "8px", border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
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
                              border: isPrimary ? "2px solid #c18847" : "1px solid rgba(255, 255, 255, 0.12)",
                              background: "#14141a",
                              padding: "6px",
                            }}
                          >
                            <img
                              src={imgUrl}
                              alt={`Gallery photo ${idx + 1}`}
                              style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px", background: "#222" }}
                            />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: isPrimary ? "#c18847" : "rgba(255, 255, 255, 0.08)",
                                  color: "#ffffff",
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
                                      background: "rgba(193, 136, 71, 0.15)",
                                      color: "#c18847",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 5px",
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
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "#ef4444",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "2px 5px",
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    Detailed Story & Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Rich botanical description for customer PDP..."
                    value={productForm.description}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "11.5px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
                    INCI Ingredients List
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Organic Camellia Seed Oil, Plant Squalane, Vitamin E..."
                    value={productForm.ingredients}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "11.5px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#1c1c24", color: "#fff" }}
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    padding: "9px 20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  style={{
                    background: "linear-gradient(135deg, #c18847 0%, #9a652a 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "9px 24px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(193, 136, 71, 0.35)",
                  }}
                >
                  {isSubmittingProduct ? "Publishing Creation..." : "Publish Creation to Storefront"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAX INVOICE VIEWER & DOWNLOAD MODAL ================= */}
      {selectedInvoiceOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
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
              background: "#16161c",
              border: "1px solid rgba(193, 136, 71, 0.3)",
              borderRadius: "14px",
              maxWidth: "850px",
              width: "100%",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              overflow: "hidden",
            }}
          >
            {/* Invoice Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#121216",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={18} style={{ color: "#c18847" }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                    OFFICIAL TAX INVOICE — {selectedInvoiceOrder.id}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
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
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "11px",
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
                    background: "linear-gradient(135deg, #c18847 0%, #a86b2b 100%)",
                    border: "none",
                    color: "#ffffff",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Download size={13} /> Download Invoice
                </button>

                <button
                  onClick={() => setSelectedInvoiceOrder(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
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

      {/* ================= ORDER DETAILS MODAL ================= */}
      {selectedOrderDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0, 0, 0, 0.75)",
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
              background: "#141418",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px 28px",
              color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#c18847", letterSpacing: "0.1em" }}>
                  ORDER DETAILS
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "#ffffff" }}>
                  #{selectedOrderDetails.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "12px" }}>
              <div>
                <b style={{ color: "#c18847" }}>Customer:</b> {selectedOrderDetails.client_name || selectedOrderDetails.customer_name} ({selectedOrderDetails.client_email || selectedOrderDetails.customer_email})
              </div>
              <div>
                <b style={{ color: "#c18847" }}>Contact Phone:</b> {selectedOrderDetails.client_phone || selectedOrderDetails.customer_phone}
              </div>
              <div>
                <b style={{ color: "#c18847" }}>Shipping Address:</b> {selectedOrderDetails.shipping_address}
              </div>
              <div>
                <b style={{ color: "#c18847" }}>Grand Total:</b> {selectedOrderDetails.total_amount || `₹${selectedOrderDetails.total_price}`} (Paid via {(selectedOrderDetails.payment_method || "UPI").toUpperCase()})
              </div>
              <div>
                <b style={{ color: "#c18847" }}>Courier Tracking:</b> {selectedOrderDetails.tracking_number || "Awaiting dispatch assignment"}
              </div>

              <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                <b style={{ display: "block", marginBottom: "8px", color: "#94a3b8" }}>Items In Order:</b>
                {parseItems(selectedOrderDetails.items).map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <span>{it.quantity}x {it.name} ({it.shade || "Standard"})</span>
                    <span style={{ fontWeight: 600 }}>₹{it.unitPrice}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button
                  onClick={() => {
                    setSelectedInvoiceOrder(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  style={{
                    background: "#c18847",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FileText size={13} /> View Tax Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
