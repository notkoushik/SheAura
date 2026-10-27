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
  { id: "1", name: "Pink Blossom Blush", slug: "pink-blossom-blush", category: "Blushes", price: 899, stock_quantity: 42, image: "/products/Pink Blossom Blush.webp" },
  { id: "2", name: "Peach Blossom Blush", slug: "peach-blossom-blush", category: "Blushes", price: 899, stock_quantity: 38, image: "/products/Peach Blossom Blush.webp" },
  { id: "3", name: "Cherry Blossom Blush", slug: "cherry-blossom-blush", category: "Blushes", price: 899, stock_quantity: 26, image: "/products/Cherry Blossom Blush.webp" },
  { id: "4", name: "Scarlet Rose Lipstick", slug: "scarlet-rose-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 54, image: "/products/Minimal_design/Scarlet Rose Lipstick_still.png" },
  { id: "5", name: "Roseberry Lipstick", slug: "roseberry-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 48, image: "/products/Roseberry Lipstick.webp" },
  { id: "6", name: "Blush Rose Lipstick", slug: "blush-rose-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 35, image: "/products/Blush Rose Lipstick.webp" },
  { id: "7", name: "Orchid Lipstick", slug: "orchid-lipstick", category: "Lipsticks", price: 1099, stock_quantity: 29, image: "/products/Orchid Lipstick.webp" },
  { id: "8", name: "Molten Glow Highlighter · Sunflower", slug: "molten-glow-highlighter", category: "Body Highlighter Oil", price: 1199, stock_quantity: 18, image: "/products/Minimal_design/Highlighter simple.png" },
  { id: "9", name: "Moonflower Highlighter Oil", slug: "moonflower-highlighter-oil", category: "Body Highlighter Oil", price: 1199, stock_quantity: 12, image: "/products/Moonflower Highlighter Oil.webp" },
  { id: "10", name: "Hydrating Matte Foundation · Daffodil", slug: "hydrating-matte-foundation-daffodil", category: "Foundation", price: 1299, stock_quantity: 32, image: "/products/Daffodil.png" },
  { id: "11", name: "Hydrating Matte Foundation · Snowdrop", slug: "hydrating-matte-foundation-snowdrop", category: "Foundation", price: 1299, stock_quantity: 24, image: "/products/Snowdrop.png" },
  { id: "12", name: "She’Aura Discovery Wardrobe", slug: "sheaura-discovery-wardrobe", category: "Wardrobe Collection", price: 3299, stock_quantity: 9, image: "/products/discovery-wardrobe-still.png" },
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
  const [activeTab, setActiveTab] = useState<"orders" | "customers" | "inventory">("orders");
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Product Creation & Management State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isRawImportOpen, setIsRawImportOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState("");
  const [imageSourceTab, setImageSourceTab] = useState<"library" | "upload" | "url">("library");

  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    category: "Lipsticks",
    price: 1099,
    stock_quantity: 50,
    image: "/products/Scarlet Rose Lipstick.webp",
    tag: "New Arrival",
    tone: "#a81920",
    finish: "Sculpted satin",
    mood: "Runway Statement",
    note: "High-pigment botanical scarlet with 16h comfort",
    description: "An iconic beauty piece crafted with botanical extracts in the She'Aura Atelier.",
    ingredients: "Organic Camellia Seed Oil, Multi-Weight Hyaluronic Acid, Candelilla Wax, Botanical Pigments.",
  });

  // Load orders from Supabase
  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setOrders(data as AdminOrder[]);
        }
      }
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
              combined.push({
                id: row.id,
                name: row.name,
                slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                category: normalizeCategory(row.category),
                price: typeof row.price === "number" ? row.price : parseFloat(row.price) || 999,
                stock_quantity: row.stock_quantity ?? 50,
                image: row.image_url || row.image || "/products/Peach Blossom Blush.webp",
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
          combined.push({
            id: row.id || `local-${Date.now()}`,
            name: row.name,
            slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: normalizeCategory(row.category),
            price: typeof row.price === "number" ? row.price : parseFloat(row.price) || 999,
            stock_quantity: row.stock_quantity ?? 50,
            image: row.image_url || row.image || "/products/Peach Blossom Blush.webp",
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

    const handleCatalogUpdated = () => {
      fetchProducts();
    };
    window.addEventListener("sheaura:catalog-updated", handleCatalogUpdated);
    return () => {
      window.removeEventListener("sheaura:catalog-updated", handleCatalogUpdated);
    };
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

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

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                tracking_number: newStatus === "dispatched" || newStatus === "delivered" ? tracking : prev.tracking_number,
              }
            : null
        );
      }

      showNotice(`Order ${orderId} transitioned to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      showNotice(`Failed to update status: ${e.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Generate dynamic test order for demonstration
  const handleCreateDynamicTestOrder = async () => {
    const clients = [
      { name: "Sanjana Rao", email: "sanjana.rao@hyderabadarts.in", phone: "+91 98490 12890", city: "Hyderabad, Telangana 500034" },
      { name: "Alisha Sen", email: "alisha.sen@delhifashion.com", phone: "+91 98102 77102", city: "New Delhi, Delhi 110024" },
      { name: "Meera Nambiar", email: "meera.nambiar@kochi.co.in", phone: "+91 94470 33819", city: "Kochi, Kerala 682016" },
      { name: "Kavya Deshmukh", email: "kavya.deshmukh@pune.org", phone: "+91 98220 55192", city: "Pune, Maharashtra 411004" },
    ];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const chosenProduct = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(1 + Math.random() * 2);
    const itemTotal = chosenProduct.price * qty;
    const shipping = itemTotal >= 1499 ? 0 : 150;
    const tax = Math.round((itemTotal * 18) / 118);
    const grandTotal = itemTotal + shipping;
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrderPayload: AdminOrder = {
      id: orderId,
      client_name: client.name,
      customer_name: client.name,
      client_email: client.email,
      customer_email: client.email,
      client_phone: client.phone,
      customer_phone: client.phone,
      shipping_address: `Boutique Residence, ${client.city}`,
      items: [
        {
          productId: chosenProduct.slug,
          name: chosenProduct.name,
          shade: chosenProduct.category,
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
      await supabase.from("orders").insert([newOrderPayload]);
    }

    setOrders((prev) => [newOrderPayload, ...prev]);
    showNotice(`Dynamic order placed for ${client.name} (${orderId})`);
  };

  // Stock Adjustment
  const handleAdjustStock = (slug: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.slug === slug ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) + delta) } : p
      )
    );
    showNotice(`Stock updated for ${slug}`);
  };

  // Preset quick fill
  const handleApplyPreset = (preset: (typeof PRODUCT_PRESETS)[number]) => {
    setProductForm((prev) => ({
      ...prev,
      ...preset.data,
      slug: preset.data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
    }));
    showNotice(`✓ Loaded ${preset.label}! Form populated with luxury copy and photo.`);
  };

  // Raw text / JSON parser
  const handleParseRawText = () => {
    if (!rawImportText.trim()) return;

    // A. Try JSON
    try {
      const parsed = JSON.parse(rawImportText);
      setProductForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        slug: parsed.slug || (parsed.name ? parsed.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") : prev.slug),
        category: parsed.category ? normalizeCategory(parsed.category) : prev.category,
        price: parsed.price ? Number(parsed.price) : prev.price,
        stock_quantity: parsed.stock_quantity ?? parsed.stock ?? prev.stock_quantity,
        image: parsed.image || parsed.image_url || prev.image,
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

    // B. Line-by-line key: value
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
        else if (key.includes("image") || key.includes("photo") || key.includes("url")) extracted.image = val;
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

  // Copy Product JSON for quick duplicate
  const handleCopyProductJson = (product: AdminProduct) => {
    const json = JSON.stringify(
      {
        name: product.name,
        slug: product.slug,
        category: normalizeCategory(product.category),
        price: product.price,
        stock_quantity: product.stock_quantity || 45,
        image: product.image,
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

  // Image file upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProductForm((prev) => ({
          ...prev,
          image: event.target!.result as string,
        }));
        showNotice("✓ Image uploaded and live preview active!");
      }
    };
    reader.readAsDataURL(file);
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

    const payload = {
      id: productId,
      name: productForm.name.trim(),
      slug: cleanSlug,
      price: numPrice,
      currency: "INR",
      category: normCategory,
      image_url: productForm.image || "/products/Peach Blossom Blush.webp",
      campaign_image_url: productForm.image || "/products/Peach Blossom Blush.webp",
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

    // 2. Local Custom Product Persistence (guarantees customer visibility immediately)
    saveLocalCustomProduct({
      ...payload,
      price: `₹${numPrice.toLocaleString("en-IN")}.00`,
      rawPrice: numPrice,
      image: payload.image_url,
      still: payload.image_url,
      campaign: payload.image_url,
      gallery: [payload.image_url],
      shades: [
        { name: "Signature Shade", tone: payload.tone, image: payload.image_url, slug: cleanSlug },
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
        image: payload.image_url,
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
    // 1. Supabase deletion
    if (isSupabaseConfigured && product.id) {
      try {
        await supabase.from("products").delete().eq("id", product.id);
        await supabase.from("products").delete().eq("slug", product.slug);
      } catch (e) {
        console.warn("[AdminView] Supabase delete warning:", e);
      }
    }

    // 2. Local cache deletion
    deleteLocalCustomProduct(product.slug);
    deleteLocalCustomProduct(product.id);
    deleteLocalCustomProduct(product.name);

    // 3. Trigger reload
    window.dispatchEvent(new CustomEvent("sheaura:catalog-updated"));

    setProducts((prev) => prev.filter((p) => p.id !== product.id && p.slug !== product.slug));
    showNotice(`✓ "${product.name}" deleted from catalog & storefront.`);
  };

  // Parse items safely
  const parseItems = (raw: any): AdminOrderItem[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "awaiting"
          ? o.payment_status === "pending" || o.payment_method === "cod"
          : o.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.client_name || o.customer_name || "").toLowerCase().includes(q) ||
        (o.client_email || o.customer_email || "").toLowerCase().includes(q) ||
        (o.client_phone || o.customer_phone || "").toLowerCase().includes(q) ||
        (o.shipping_address || "").toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Aggregated Multi-Customers
  const customersList: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((o) => {
      const email = (o.client_email || o.customer_email || "guest@sheaura.com").toLowerCase().trim();
      const name = o.client_name || o.customer_name || "Valued Client";
      const phone = o.client_phone || o.customer_phone || "—";
      const addressParts = (o.shipping_address || "").split(",");
      const city = addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim() || "India";
      const spend = Number(o.total_price) || 0;

      if (!map.has(email)) {
        map.set(email, {
          name,
          email,
          phone,
          city,
          orderCount: 1,
          totalSpent: spend,
          lastOrderDate: o.created_at,
        });
      } else {
        const existing = map.get(email)!;
        existing.orderCount += 1;
        existing.totalSpent += spend;
        if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.created_at;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Financial KPIs
  const kpis = useMemo(() => {
    const totalRev = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const count = orders.length;
    const aov = count > 0 ? Math.round(totalRev / count) : 0;
    const processing = orders.filter((o) => o.status === "processing").length;
    const dispatched = orders.filter((o) => o.status === "dispatched").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { totalRev, count, aov, processing, dispatched, delivered, customers: customersList.length };
  }, [orders, customersList]);

  const handleLockConsole = () => {
    clearAdminSession();
    setAdminSessionState(null);
    window.history.pushState({}, "", "/sheaura/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (!adminSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 20%, #2a140d 0%, #150906 60%, #0d0504 100%)",
          color: "#fcf9f5",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Montserrat', sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            background: "rgba(24, 11, 8, 0.9)",
            border: "1px solid rgba(223, 184, 149, 0.3)",
            borderRadius: "20px",
            padding: "44px 36px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(223, 184, 149, 0.15)",
              border: "1px solid rgba(223, 184, 149, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <ShieldCheck size={32} style={{ color: "#dfb895" }} />
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "26px",
              margin: "0 0 8px",
              color: "#ffffff",
            }}
          >
            Restricted Studio Console
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "#dfb895",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            Administrative privileges are strictly verified. Please authenticate via the dedicated gateway at <b>sheaura/login</b>.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={() => {
                window.history.pushState({}, "", "/sheaura/login");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              style={{
                background: "linear-gradient(135deg, #dfb895 0%, #b88647 100%)",
                color: "#21130f",
                border: "none",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Authenticate via /sheaura/login
            </button>
            <button
              onClick={onBack}
              style={{
                background: "transparent",
                color: "#a89085",
                border: "1px solid rgba(223, 184, 149, 0.2)",
                borderRadius: "12px",
                padding: "12px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Public Boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-console-root" style={{ minHeight: "100vh", background: "#f8f0e5", color: "#21130f", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Top Banner Notice */}
      {actionNotice && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 9999,
            background: "#191970",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(25,25,112,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            letterSpacing: "0.03em",
          }}
        >
          <CheckCircle2 size={16} /> {actionNotice}
        </div>
      )}

      {/* Header Bar */}
      <header
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(42, 26, 20, 0.12)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "1px solid rgba(42, 26, 20, 0.2)",
              borderRadius: "999px",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#21130f",
            }}
          >
            <ArrowLeft size={14} /> Storefront
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <SheAuraLogo height={24} fill="#191970" />
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#765d50",
                fontWeight: 600,
              }}
            >
              Operations Studio
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#1e6b37",
              background: "rgba(30, 107, 55, 0.1)",
              padding: "5px 12px",
              borderRadius: "999px",
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} /> Live Supabase Connected
          </div>

          <button
            onClick={handleCreateDynamicTestOrder}
            style={{
              background: "#191970",
              color: "#ffffff",
              border: "0",
              borderRadius: "999px",
              padding: "8px 16px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PlusCircle size={14} /> + New Test Customer Order
          </button>

          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              background: "transparent",
              border: "1px solid rgba(42, 26, 20, 0.2)",
              borderRadius: "999px",
              padding: "8px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              color: "#21130f",
            }}
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          </button>

          <button
            onClick={handleLockConsole}
            style={{
              background: "rgba(125, 38, 22, 0.08)",
              border: "1px solid rgba(125, 38, 22, 0.25)",
              color: "#7d2616",
              borderRadius: "999px",
              padding: "7px 14px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Securely Lock Administrative Studio"
          >
            <ShieldCheck size={13} />
            <span>Lock Studio</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px" }}>
        {/* KPI Strip */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "11px", color: "#765d50", textTransform: "uppercase", letterSpacing: "0.08em" }}>Gross Revenue</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#191970", marginTop: "4px" }}>
              ₹{kpis.totalRev.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "10px", color: "#765d50", marginTop: "4px" }}>Across {kpis.count} total orders</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "11px", color: "#765d50", textTransform: "uppercase", letterSpacing: "0.08em" }}>Average Order Value</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#21130f", marginTop: "4px" }}>
              ₹{kpis.aov.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "10px", color: "#765d50", marginTop: "4px" }}>Premium Maison basket average</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "11px", color: "#765d50", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Clients</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#21130f", marginTop: "4px" }}>
              {kpis.customers}
            </div>
            <div style={{ fontSize: "10px", color: "#765d50", marginTop: "4px" }}>Multi-city client base</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "11px", color: "#765d50", textTransform: "uppercase", letterSpacing: "0.08em" }}>Fulfillment Queue</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: kpis.processing > 0 ? "#b85d19" : "#1e6b37", marginTop: "4px" }}>
              {kpis.processing} Pending
            </div>
            <div style={{ fontSize: "10px", color: "#765d50", marginTop: "4px" }}>{kpis.dispatched} dispatched, {kpis.delivered} delivered</div>
          </div>
        </section>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(42, 26, 20, 0.12)", marginBottom: "24px" }}>
          <button
            onClick={() => setActiveTab("orders")}
            style={{
              padding: "10px 20px",
              border: "0",
              borderBottom: activeTab === "orders" ? "2px solid #191970" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "orders" ? "#191970" : "#765d50",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Package size={15} /> Live Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            style={{
              padding: "10px 20px",
              border: "0",
              borderBottom: activeTab === "customers" ? "2px solid #191970" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "customers" ? "#191970" : "#765d50",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <User size={15} /> Clients Directory ({customersList.length})
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              padding: "10px 20px",
              border: "0",
              borderBottom: activeTab === "inventory" ? "2px solid #191970" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "inventory" ? "#191970" : "#765d50",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Layers size={15} /> Catalog & Inventory ({products.length})
          </button>
        </div>

        {/* ================= TAB 1: LIVE ORDERS ================= */}
        {activeTab === "orders" && (
          <div>
            {/* Filter & Search Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { key: "all", label: "All" },
                  { key: "processing", label: "Processing" },
                  { key: "dispatched", label: "Dispatched" },
                  { key: "delivered", label: "Delivered" },
                  { key: "awaiting", label: "COD / Awaiting" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      border: "1px solid rgba(42, 26, 20, 0.15)",
                      borderRadius: "999px",
                      padding: "6px 14px",
                      fontSize: "11px",
                      cursor: "pointer",
                      background: statusFilter === f.key ? "#191970" : "#ffffff",
                      color: statusFilter === f.key ? "#ffffff" : "#21130f",
                      fontWeight: statusFilter === f.key ? 600 : 400,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative", minWidth: "280px" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "#765d50" }} />
                <input
                  type="text"
                  placeholder="Search order ID, client, email, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 34px",
                    borderRadius: "999px",
                    border: "1px solid rgba(42, 26, 20, 0.15)",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#ffffff",
                  }}
                />
              </div>
            </div>

            {/* Orders Table */}
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              {filteredOrders.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#765d50" }}>
                  <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>No orders match this filter</div>
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>Generate a test order or adjust your search filter above.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#fcf8f2", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", color: "#765d50", fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        <th style={{ padding: "14px 18px" }}>Order Ref</th>
                        <th style={{ padding: "14px 18px" }}>Client</th>
                        <th style={{ padding: "14px 18px" }}>Items</th>
                        <th style={{ padding: "14px 18px" }}>Total</th>
                        <th style={{ padding: "14px 18px" }}>Payment</th>
                        <th style={{ padding: "14px 18px" }}>Status</th>
                        <th style={{ padding: "14px 18px" }}>Tracking</th>
                        <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const items = parseItems(o.items);
                        const isPaid = o.payment_status === "paid";
                        return (
                          <tr
                            key={o.id}
                            style={{
                              borderBottom: "1px solid rgba(42, 26, 20, 0.06)",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <td style={{ padding: "16px 18px", fontWeight: 600, color: "#191970" }}>
                              <div>{o.id}</div>
                              <div style={{ fontSize: "10px", color: "#765d50", fontWeight: 400, marginTop: "2px" }}>
                                {new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>

                            <td style={{ padding: "16px 18px" }}>
                              <div style={{ fontWeight: 600 }}>{o.client_name || o.customer_name}</div>
                              <div style={{ fontSize: "11px", color: "#765d50" }}>{o.client_email || o.customer_email}</div>
                              <div style={{ fontSize: "10px", color: "#9c8172" }}>{o.client_phone || o.customer_phone}</div>
                            </td>

                            <td style={{ padding: "16px 18px" }}>
                              <div style={{ fontWeight: 500 }}>
                                {items.length > 0 ? items[0].name : `${o.items_count} pieces`}
                              </div>
                              {items.length > 1 && (
                                <div style={{ fontSize: "10.5px", color: "#765d50" }}>+{items.length - 1} more items</div>
                              )}
                            </td>

                            <td style={{ padding: "16px 18px", fontWeight: 700 }}>
                              {o.total_amount || `₹${Number(o.total_price || 0).toLocaleString("en-IN")}`}
                            </td>

                            <td style={{ padding: "16px 18px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  background: isPaid ? "rgba(30, 107, 55, 0.1)" : "rgba(184, 93, 25, 0.12)",
                                  color: isPaid ? "#1e6b37" : "#b85d19",
                                }}
                              >
                                {o.payment_method?.toUpperCase() || "UPI"} · {isPaid ? "Paid" : "Pending"}
                              </span>
                            </td>

                            <td style={{ padding: "16px 18px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                  background:
                                    o.status === "delivered"
                                      ? "rgba(30, 107, 55, 0.12)"
                                      : o.status === "dispatched"
                                      ? "rgba(102, 51, 153, 0.12)"
                                      : o.status === "cancelled"
                                      ? "rgba(163, 77, 69, 0.15)"
                                      : "rgba(25, 25, 112, 0.1)",
                                  color:
                                    o.status === "delivered"
                                      ? "#1e6b37"
                                      : o.status === "dispatched"
                                      ? "#582a85"
                                      : o.status === "cancelled"
                                      ? "#a34d45"
                                      : "#191970",
                                }}
                              >
                                {o.status}
                              </span>
                            </td>

                            <td style={{ padding: "16px 18px" }}>
                              {o.tracking_number ? (
                                <span style={{ fontFamily: "monospace", fontSize: "10.5px", color: "#582a85", background: "rgba(88, 42, 133, 0.08)", padding: "3px 6px", borderRadius: "4px" }}>
                                  {o.tracking_number}
                                </span>
                              ) : (
                                <span style={{ color: "#a89487", fontSize: "11px" }}>Awaiting Dispatch</span>
                              )}
                            </td>

                            <td style={{ padding: "16px 18px", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  onClick={() => setSelectedOrder(o)}
                                  style={{
                                    border: "1px solid rgba(42, 26, 20, 0.15)",
                                    background: "#ffffff",
                                    padding: "5px 10px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Details
                                </button>

                                {o.status === "processing" && (
                                  <button
                                    onClick={() => handleUpdateStatus(o.id, "dispatched")}
                                    disabled={isUpdatingStatus}
                                    style={{
                                      border: "0",
                                      background: "#582a85",
                                      color: "#ffffff",
                                      padding: "5px 10px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Dispatch
                                  </button>
                                )}

                                {o.status === "dispatched" && (
                                  <button
                                    onClick={() => handleUpdateStatus(o.id, "delivered")}
                                    disabled={isUpdatingStatus}
                                    style={{
                                      border: "0",
                                      background: "#1e6b37",
                                      color: "#ffffff",
                                      padding: "5px 10px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Deliver
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: CLIENTS DIRECTORY ================= */}
        {activeTab === "customers" && (
          <div>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#191970", fontWeight: 700 }}>Maison Clientele Directory</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#765d50" }}>Dynamically aggregated from real-time authenticated order histories</p>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#191970" }}>{customersList.length} Registered Patrons</div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#fcf8f2", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", color: "#765d50", fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <th style={{ padding: "14px 18px" }}>Client</th>
                      <th style={{ padding: "14px 18px" }}>Contact</th>
                      <th style={{ padding: "14px 18px" }}>Primary Hub</th>
                      <th style={{ padding: "14px 18px" }}>Orders Placed</th>
                      <th style={{ padding: "14px 18px" }}>Lifetime Value (LTV)</th>
                      <th style={{ padding: "14px 18px" }}>Last Order</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Filter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersList.map((c) => (
                      <tr key={c.email} style={{ borderBottom: "1px solid rgba(42, 26, 20, 0.06)" }}>
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #191970, #2b0a05)", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "12px" }}>
                              {c.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <div>{c.email}</div>
                          <div style={{ fontSize: "11px", color: "#765d50" }}>{c.phone}</div>
                        </td>
                        <td style={{ padding: "16px 18px", color: "#582a85", fontWeight: 500 }}>
                          <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />
                          {c.city}
                        </td>
                        <td style={{ padding: "16px 18px", fontWeight: 600 }}>
                          {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                        </td>
                        <td style={{ padding: "16px 18px", fontWeight: 700, color: "#191970" }}>
                          ₹{c.totalSpent.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "16px 18px", color: "#765d50", fontSize: "11px" }}>
                          {new Date(c.lastOrderDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td style={{ padding: "16px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => {
                              setSearchQuery(c.name);
                              setActiveTab("orders");
                            }}
                            style={{
                              border: "1px solid rgba(42, 26, 20, 0.15)",
                              background: "transparent",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                              color: "#191970",
                              fontWeight: 600,
                            }}
                          >
                            View Orders
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: MASTER CATALOG & INVENTORY ================= */}
        {activeTab === "inventory" && (
          <div>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(42, 26, 20, 0.08)", overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#191970", fontWeight: 700 }}>
                    Maison Product Catalog & Master Inventory
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#765d50" }}>
                    {products.length} registered creations with real-time customer storefront synchronization & live Supabase persistence
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={fetchProducts}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#ffffff",
                      border: "1px solid rgba(42, 26, 20, 0.15)",
                      borderRadius: "999px",
                      padding: "8px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#765d50",
                    }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                  <button
                    onClick={() => {
                      setIsAddModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#191970",
                      color: "#ffffff",
                      border: "none",
                      padding: "9px 18px",
                      borderRadius: "999px",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(25, 25, 112, 0.25)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    <PlusCircle size={15} /> Add New Creation
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#fcf8f2", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", color: "#765d50", fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <th style={{ padding: "14px 18px" }}>Piece</th>
                      <th style={{ padding: "14px 18px" }}>Category</th>
                      <th style={{ padding: "14px 18px" }}>Official Price</th>
                      <th style={{ padding: "14px 18px" }}>Stock Level</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const stock = p.stock_quantity || 0;
                      const isLow = stock < 15;
                      const normCat = normalizeCategory(p.category);
                      return (
                        <tr key={p.id || p.slug} style={{ borderBottom: "1px solid rgba(42, 26, 20, 0.06)" }}>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {p.image && (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(42,26,20,0.1)", background: "#faf5ee" }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: "#191970" }}>{p.name}</div>
                                <div style={{ fontSize: "10.5px", color: "#765d50", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                  <span>{p.slug}</span>
                                  {p.tone && (
                                    <span
                                      title={`Tone: ${p.tone}`}
                                      style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: p.tone, border: "1px solid rgba(0,0,0,0.2)" }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span
                              style={{
                                background:
                                  normCat === "Lipsticks"
                                    ? "rgba(168, 25, 32, 0.08)"
                                    : normCat === "Blushes"
                                    ? "rgba(184, 72, 110, 0.08)"
                                    : normCat === "Body Highlighter Oil"
                                    ? "rgba(193, 136, 71, 0.1)"
                                    : "rgba(42, 26, 20, 0.06)",
                                color:
                                  normCat === "Lipsticks"
                                    ? "#a81920"
                                    : normCat === "Blushes"
                                    ? "#b8486e"
                                    : normCat === "Body Highlighter Oil"
                                    ? "#965b16"
                                    : "#21130f",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {normCat}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", fontWeight: 700, color: "#191970", fontSize: "13px" }}>
                            ₹{p.price.toLocaleString("en-IN")}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontWeight: 600,
                                fontSize: "11px",
                                color: isLow ? "#b85d19" : "#1e6b37",
                              }}
                            >
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLow ? "#b85d19" : "#1e6b37" }} />
                              {stock} units {isLow && "(Low)"}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {/* Stock adjusters */}
                              <button
                                title="Decrease stock by 5"
                                onClick={() => handleAdjustStock(p.slug, -5)}
                                style={{
                                  border: "1px solid rgba(42, 26, 20, 0.15)",
                                  background: "#ffffff",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "10.5px",
                                }}
                              >
                                -5
                              </button>
                              <button
                                title="Increase stock by 5"
                                onClick={() => handleAdjustStock(p.slug, 5)}
                                style={{
                                  border: "1px solid rgba(42, 26, 20, 0.15)",
                                  background: "#ffffff",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                }}
                              >
                                +5
                              </button>

                              {/* Copy JSON for super admin efficiency */}
                              <button
                                title="Copy Product JSON for fast duplicate"
                                onClick={() => handleCopyProductJson(p)}
                                style={{
                                  border: "1px solid rgba(42, 26, 20, 0.15)",
                                  background: "#ffffff",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  color: "#765d50",
                                }}
                              >
                                <Copy size={12} /> Copy JSON
                              </button>

                              {/* Delete Piece */}
                              <button
                                title="Delete Piece"
                                onClick={() => handleDeleteProduct(p)}
                                style={{
                                  border: "1px solid rgba(184, 40, 40, 0.2)",
                                  background: "rgba(184, 40, 40, 0.05)",
                                  color: "#b82828",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontWeight: 500,
                                }}
                              >
                                <Trash2 size={12} /> Delete
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
      </main>

      {/* ================= ADD NEW CREATION MODAL ================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
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
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "760px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
              padding: "28px 32px",
              position: "relative",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(42, 26, 20, 0.1)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "10.5px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c18847", fontWeight: 700 }}>
                  MAISON PRODUCT ATELIER
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: "20px", color: "#191970", fontFamily: "Cormorant Garamond, serif", fontWeight: 700 }}>
                  Publish New Cosmetic Creation
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#765d50" }}>
                  Instantly available for customer ordering with live Supabase database sync.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#765d50", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Super Admin Quick-Fill Presets Bar */}
            <div style={{ background: "#fcf8f2", border: "1px solid rgba(193, 136, 71, 0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#765d50", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Sparkles size={13} style={{ color: "#c18847" }} /> Super Admin Instant Presets (1-Click Fill):
                </span>
                <button
                  type="button"
                  onClick={() => setIsRawImportOpen(!isRawImportOpen)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#191970",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {isRawImportOpen ? "Close Smart Paste" : "📋 Smart Paste (JSON / Raw Text)"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {PRODUCT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(42, 26, 20, 0.15)",
                      borderRadius: "999px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#21130f",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Smart Raw Paste Drawer */}
              {isRawImportOpen && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(42, 26, 20, 0.15)" }}>
                  <textarea
                    rows={4}
                    value={rawImportText}
                    onChange={(e) => setRawImportText(e.target.value)}
                    placeholder="Paste JSON or raw lines here (e.g., Name: Velvet Lip\nPrice: 1099\nCategory: Lipsticks\nImage: /products/Scarlet Rose Lipstick.webp...)"
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: "11px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                      fontFamily: "monospace",
                      background: "#ffffff",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={handleParseRawText}
                      style={{
                        background: "#191970",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Parse & Auto-Fill Form
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product Creation Form */}
            <form onSubmit={handleSaveProduct}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="productName"
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
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Category *
                  </label>
                  <select
                    name="category"
                    value={productForm.category}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                      background: "#ffffff",
                    }}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Official Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    name="price"
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Stock Level (Units)
                  </label>
                  <input
                    type="number"
                    min={0}
                    name="stock"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock_quantity: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tag / Badge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Arrival / Bestseller"
                    value={productForm.tag}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, tag: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Sensory Finish
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sculpted satin"
                    value={productForm.finish}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, finish: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Aesthetic Mood
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Runway Statement"
                    value={productForm.mood}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, mood: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Complexion Tone Hex
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={productForm.tone}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, tone: e.target.value }))}
                      style={{ width: "36px", height: "36px", padding: "0", border: "none", borderRadius: "6px", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      value={productForm.tone}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, tone: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(42, 26, 20, 0.2)",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Short Tagline / Sensory Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-pigment scarlet with 16h botanical comfort"
                  value={productForm.note}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, note: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(42, 26, 20, 0.2)",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Detailed Story & Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Rich botanical description for customer PDP..."
                    value={productForm.description}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "11.5px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#765d50", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    INCI Ingredients List (Clean Formulation)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Organic Camellia Seed Oil, Multi-Weight Hyaluronic Acid, Candelilla Wax..."
                    value={productForm.ingredients}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: "11.5px",
                      borderRadius: "6px",
                      border: "1px solid rgba(42, 26, 20, 0.2)",
                    }}
                  />
                </div>
              </div>

              {/* Photo & Visual Asset Manager */}
              <div style={{ background: "#faf7f2", border: "1px solid rgba(42, 26, 20, 0.12)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#191970", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={14} /> Product Packshot / Photo *
                  </label>
                  <div style={{ display: "inline-flex", gap: "4px", background: "#ffffff", padding: "3px", borderRadius: "999px", border: "1px solid rgba(42, 26, 20, 0.1)" }}>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("library")}
                      style={{
                        background: imageSourceTab === "library" ? "#191970" : "transparent",
                        color: imageSourceTab === "library" ? "#ffffff" : "#765d50",
                        border: "none",
                        borderRadius: "999px",
                        padding: "3px 10px",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Library (1-Click)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("upload")}
                      style={{
                        background: imageSourceTab === "upload" ? "#191970" : "transparent",
                        color: imageSourceTab === "upload" ? "#ffffff" : "#765d50",
                        border: "none",
                        borderRadius: "999px",
                        padding: "3px 10px",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("url")}
                      style={{
                        background: imageSourceTab === "url" ? "#191970" : "transparent",
                        color: imageSourceTab === "url" ? "#ffffff" : "#765d50",
                        border: "none",
                        borderRadius: "999px",
                        padding: "3px 10px",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Direct URL
                    </button>
                  </div>
                </div>

                {imageSourceTab === "library" && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#765d50", marginBottom: "8px" }}>
                      Select from She’Aura authentic high-res packshots:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      {ASSET_LIBRARY_PICKER.map((asset) => {
                        const isSelected = productForm.image === asset.path;
                        return (
                          <div
                            key={asset.path}
                            onClick={() => setProductForm((prev) => ({ ...prev, image: asset.path }))}
                            style={{
                              border: isSelected ? "2px solid #191970" : "1px solid rgba(42, 26, 20, 0.15)",
                              borderRadius: "8px",
                              padding: "6px",
                              background: "#ffffff",
                              cursor: "pointer",
                              textAlign: "center",
                              position: "relative",
                              boxShadow: isSelected ? "0 4px 12px rgba(25, 25, 112, 0.15)" : "none",
                            }}
                          >
                            <img
                              src={asset.path}
                              alt={asset.label}
                              style={{ width: "100%", height: "65px", objectFit: "cover", borderRadius: "6px" }}
                            />
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "#21130f", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {asset.label}
                            </div>
                            {isSelected && (
                              <span style={{ position: "absolute", top: "8px", right: "8px", background: "#191970", color: "#ffffff", width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {imageSourceTab === "upload" && (
                  <div style={{ border: "2px dashed rgba(42, 26, 20, 0.2)", borderRadius: "8px", padding: "20px", textAlign: "center", background: "#ffffff" }}>
                    <Upload size={24} style={{ color: "#c18847", margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#191970" }}>Choose or drag photo here</div>
                    <div style={{ fontSize: "10.5px", color: "#765d50", marginTop: "4px" }}>PNG, JPG, WebP supported</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      style={{ marginTop: "12px", fontSize: "11px" }}
                    />
                  </div>
                )}

                {imageSourceTab === "url" && (
                  <div>
                    <input
                      type="text"
                      name="image"
                      placeholder="e.g. /products/Scarlet Rose Lipstick.webp or https://..."
                      value={productForm.image}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, image: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(42, 26, 20, 0.2)",
                        background: "#ffffff",
                      }}
                    />
                  </div>
                )}

                {/* Live Preview Box */}
                {productForm.image && (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(42, 26, 20, 0.1)" }}>
                    <img
                      src={productForm.image}
                      alt="Preview"
                      style={{ width: "54px", height: "54px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(42, 26, 20, 0.15)", background: "#ffffff" }}
                    />
                    <div>
                      <div style={{ fontSize: "10.5px", color: "#1e6b37", fontWeight: 600 }}>✓ Packshot verified</div>
                      <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#191970" }}>
                        {productForm.name || "Untitled Creation"} · ₹{Number(productForm.price || 0).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#765d50" }}>{productForm.category}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(42, 26, 20, 0.1)", paddingTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(42, 26, 20, 0.2)",
                    borderRadius: "999px",
                    padding: "9px 20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#765d50",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  style={{
                    background: "#191970",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "999px",
                    padding: "9px 24px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: isSubmittingProduct ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(25, 25, 112, 0.25)",
                  }}
                >
                  {isSubmittingProduct ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Publish Creation to Storefront
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAILS MODAL ================= */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(42, 26, 20, 0.08)", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#765d50", textTransform: "uppercase" }}>Order Invoice & Fulfillment</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "20px", color: "#191970", fontWeight: 700 }}>{selectedOrder.id}</h2>
                <div style={{ fontSize: "11px", color: "#765d50", marginTop: "2px" }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ border: "0", background: "transparent", cursor: "pointer", color: "#765d50" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Client & Shipping */}
            <div style={{ margin: "20px 0", background: "#fcf8f2", padding: "16px", borderRadius: "8px", border: "1px solid rgba(42, 26, 20, 0.08)" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#765d50", fontWeight: 600 }}>Delivery Details</div>
              <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>{selectedOrder.client_name || selectedOrder.customer_name}</div>
              <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{selectedOrder.shipping_address}</div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "11px", color: "#765d50" }}>
                <span><Mail size={12} style={{ display: "inline", marginRight: "4px" }} />{selectedOrder.client_email || selectedOrder.customer_email}</span>
                <span><Phone size={12} style={{ display: "inline", marginRight: "4px" }} />{selectedOrder.client_phone || selectedOrder.customer_phone}</span>
              </div>
            </div>

            {/* Items */}
            <div style={{ margin: "20px 0" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#765d50", fontWeight: 600, marginBottom: "10px" }}>Ordered Pieces</div>
              {parseItems(selectedOrder.items).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(42, 26, 20, 0.06)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "12px" }}>{item.name}</div>
                    <div style={{ fontSize: "11px", color: "#765d50" }}>Shade: {item.shade || "Standard"} · Qty: {item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>
                    ₹{(item.itemTotal || item.unitPrice * item.quantity).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div style={{ background: "#f8f0e5", padding: "16px", borderRadius: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Subtotal</span>
                <span>₹{(selectedOrder.subtotal || selectedOrder.total_price || 0).toLocaleString("en-IN")}</span>
              </div>
              {selectedOrder.discount && selectedOrder.discount > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#1e6b37" }}>
                  <span>Aura Privilege Discount</span>
                  <span>-₹{selectedOrder.discount.toLocaleString("en-IN")}</span>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Shipping Fee</span>
                <span>{selectedOrder.shipping_fee === 0 ? "Complimentary" : `₹${selectedOrder.shipping_fee || 150}`}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#765d50" }}>
                <span>GST (18% inclusive)</span>
                <span>₹{(selectedOrder.tax_amount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "15px", color: "#191970", borderTop: "1px solid rgba(42, 26, 20, 0.15)", paddingTop: "8px", marginTop: "8px" }}>
                <span>Total Amount</span>
                <span>{selectedOrder.total_amount || `₹${Number(selectedOrder.total_price || 0).toLocaleString("en-IN")}`}</span>
              </div>
            </div>

            {/* Status & Fulfillment Actions */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#765d50" }}>Current Status: </span>
                <span style={{ fontWeight: 700, textTransform: "capitalize", color: "#191970" }}>{selectedOrder.status}</span>
                {selectedOrder.tracking_number && (
                  <div style={{ fontSize: "11px", color: "#582a85", fontFamily: "monospace", marginTop: "2px" }}>
                    Track: {selectedOrder.tracking_number}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {selectedOrder.status === "processing" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "dispatched")}
                    style={{
                      background: "#582a85",
                      color: "#ffffff",
                      border: "0",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Dispatch via BlueDart
                  </button>
                )}
                {selectedOrder.status === "dispatched" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                    style={{
                      background: "#1e6b37",
                      color: "#ffffff",
                      border: "0",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
