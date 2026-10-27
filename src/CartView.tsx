import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Heart,
  Sparkles,
  ShieldCheck,
  Gift,
  CheckCircle2,
  Check,
  CreditCard,
  Smartphone,
  Truck,
  Building,
  Tag,
  Download,
  Share2,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import {
  CartItem,
  Product,
  VALID_PROMOS,
  DELUXE_SAMPLES,
} from "./lib/cartWishlistContext";
import { getCurrentUser, recordUserOrder, OrderHistoryItem } from "./lib/auth";
import { generateInvoiceHtml, InvoiceData, numberToWords } from "./lib/invoice";
import { submitOrderToBackend } from "./lib/api";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onMoveToWishlist: (item: CartItem) => void;
  onBackToStore: () => void;
  onOpenWishlist: () => void;
  onSelectProduct: (product: Product) => void;
  onClearCart: () => void;
  onOpenAccount?: () => void;
}

export default function CartView({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onMoveToWishlist,
  onBackToStore,
  onOpenWishlist,
  onSelectProduct,
  onClearCart,
  onOpenAccount,
}: CartViewProps) {
  // Steps: "bag" | "shipping" | "payment" | "confirmed"
  const [step, setStep] = useState<"bag" | "shipping" | "payment" | "confirmed">("bag");

  // Promo Code State
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>("SHEAURA10");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("10% Couture Welcome Discount Applied");

  // Gift & Sample Options
  const [selectedSampleId, setSelectedSampleId] = useState<string>(DELUXE_SAMPLES[0].id);
  const [packagingType, setPackagingType] = useState<"box" | "pouch">("box");
  const [isGiftNoteOpen, setIsGiftNoteOpen] = useState(false);
  const [giftNoteMessage, setGiftNoteMessage] = useState("");

  // Shipping Form State (Auto-populated from logged in Maison Member Profile)
  const [shippingForm, setShippingForm] = useState(() => {
    const active = getCurrentUser();
    const addr = active?.addressBook?.[0];
    return {
      fullName: addr?.fullName || active?.fullName || "Aaradhya Sharma",
      phone: addr?.phone?.replace(/[^0-9]/g, "") || active?.phone?.replace(/[^0-9]/g, "") || "9876543210",
      email: active?.email || "aaradhya.sharma@example.com",
      address: addr?.street || "74 Haute Boulevard, Jubilee Hills",
      city: addr?.city || "Hyderabad",
      state: addr?.state || "Telangana",
      pincode: addr?.postalCode || "500033",
      deliverySpeed: "standard", // "standard" | "express"
    };
  });

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "cod">("upi");
  const [cardDetails, setCardDetails] = useState({
    number: "4532 •••• •••• 8829",
    name: "AARADHYA SHARMA",
    expiry: "09/28",
    cvv: "•••",
  });
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>("");

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.priceNum * item.quantity, 0);
  }, [cartItems]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const freeShippingThreshold = 1500;
  const isFreeShipping = subtotal >= freeShippingThreshold || subtotal === 0;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const shippingCost = useMemo(() => {
    if (subtotal === 0) return 0;
    if (shippingForm.deliverySpeed === "express") {
      return subtotal >= 3000 ? 0 : 200;
    }
    return isFreeShipping ? 0 : 150;
  }, [subtotal, shippingForm.deliverySpeed, isFreeShipping]);

  // Discount Calculation
  const discountAmount = useMemo(() => {
    if (!appliedPromoCode || !VALID_PROMOS[appliedPromoCode]) return 0;
    const promo = VALID_PROMOS[appliedPromoCode];
    if (promo.minSubtotal && subtotal < promo.minSubtotal) return 0;

    if (promo.discountType === "percentage") {
      return Math.round(subtotal * promo.discountValue);
    }
    return Math.min(subtotal, promo.discountValue);
  }, [appliedPromoCode, subtotal]);

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  // Apply Promo
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;

    const promo = VALID_PROMOS[clean];
    if (!promo) {
      setPromoError("Invalid promo code. Try 'SHEAURA10' or 'HAUTE500'");
      return;
    }
    if (promo.minSubtotal && subtotal < promo.minSubtotal) {
      setPromoError(`Requires a minimum bag subtotal of ₹${promo.minSubtotal.toLocaleString("en-IN")}`);
      return;
    }
    setAppliedPromoCode(clean);
    setPromoSuccess(promo.description);
    setPromoInput("");
  };

  const handleRemovePromo = () => {
    setAppliedPromoCode(null);
    setPromoSuccess("");
    setPromoError("");
  };

  // Place Order Action: records order with server-side validation and fallback
  const handlePlaceOrder = async () => {
    setIsProcessingOrder(true);
    const currentUser = getCurrentUser();

    // Map items for secure backend pricing calculation
    const orderItemsPayload = cartItems.map((item) => ({
      productId: item.product.slug || item.product.id || item.product.name,
      name: item.product.name,
      shade: item.selectedShade || item.product.name.split(" ").slice(0, 2).join(" "),
      quantity: item.quantity,
    }));

    let serverOrderId = `SH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const serverRes = await submitOrderToBackend({
        items: orderItemsPayload,
        customer: {
          name: shippingForm.fullName || currentUser?.fullName || "SheAura Client",
          email: currentUser?.email || "guest@sheaura.com",
          phone: shippingForm.phone || "9876543210",
          address: shippingForm.address || "Haute Parfums Atelier",
          city: shippingForm.city || "Mumbai",
          postalCode: shippingForm.pincode || "400001",
          state: shippingForm.state || "Maharashtra",
        },
        paymentMethod: paymentMethod === "cod" ? "cod" : "upi",
        promoCode: appliedPromoCode || undefined,
      });

      if (serverRes?.order?.id) {
        serverOrderId = serverRes.order.id;
      }
    } catch (apiErr) {
      console.warn("[CartView] Backend API offline or preview mode, persisting to client store:", apiErr);
    }

    setConfirmedOrderId(serverOrderId);

    const generatedTracking = `EXP-BLUEDART-${Math.floor(10000 + Math.random() * 90000)}`;
    const customerFullName = shippingForm.fullName || currentUser?.fullName || "Aaradhya Sharma";
    const customerEmailAddr = currentUser?.email || "client@sheaura.com";
    const customerPhoneNum = shippingForm.phone || currentUser?.phone || "+91 98765 43210";
    const fullShippingAddr = `${shippingForm.address || "74 Haute Boulevard, Jubilee Hills"}, ${shippingForm.city || "Hyderabad"}, ${shippingForm.state || "Telangana"} - ${shippingForm.pincode || "500033"}`;

    const newOrder: OrderHistoryItem = {
      id: serverOrderId,
      date: new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }),
      itemsCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
      totalAmount: `₹${grandTotal.toLocaleString("en-IN")}`,
      status: "processing",
      trackingNumber: generatedTracking,
      eta: "Arriving in 2-3 Business Days",
      items: cartItems.map((item) => ({
        name: item.product.name,
        shade: item.selectedShade || item.product.name.split(" ").slice(0, 2).join(" "),
        price: item.product.price,
        image: item.product.image,
      })),
    };

    const orderPayload = {
      id: serverOrderId,
      client_name: customerFullName,
      customer_name: customerFullName,
      client_email: customerEmailAddr,
      customer_email: customerEmailAddr,
      client_phone: customerPhoneNum,
      customer_phone: customerPhoneNum,
      shipping_address: fullShippingAddr,
      items: cartItems.map((item) => ({
        productId: item.product.slug || item.product.id || item.product.name,
        name: item.product.name,
        shade: item.selectedShade || item.product.name.split(" ").slice(0, 2).join(" "),
        quantity: item.quantity,
        unitPrice: item.product.price,
        itemTotal: item.product.price * item.quantity,
        image: item.product.image,
      })),
      items_count: cartItems.reduce((acc, i) => acc + i.quantity, 0),
      total_amount: `₹${grandTotal.toLocaleString("en-IN")}`,
      subtotal: subtotal,
      discount: discount,
      shipping_fee: shippingFee,
      tax_amount: gstAmount,
      total_price: grandTotal,
      currency: "INR",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "awaiting_delivery" : "paid",
      status: "processing",
      tracking_number: generatedTracking,
      eta: "Arriving in 2-3 Business Days",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Insert directly into Supabase orders table for instant live sync
    if (isSupabaseConfigured) {
      try {
        await supabase.from("orders").insert([orderPayload]);
      } catch (dbErr) {
        console.warn("[CartView] Direct Supabase order insert fallback:", dbErr);
      }
    }

    // 2. Persist to shared live orders cache ensuring cross-view instant sync
    try {
      const existingRaw = localStorage.getItem("sheaura_live_orders_v2");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("sheaura_live_orders_v2", JSON.stringify([orderPayload, ...existing.filter((o: any) => o.id !== orderPayload.id)]));
    } catch {}

    // 3. Dispatch real-time live event for Admin Panel and Analytics
    window.dispatchEvent(new CustomEvent("sheaura:order-created", { detail: orderPayload }));

    recordUserOrder(newOrder, {
      fullName: customerFullName,
      phone: customerPhoneNum,
      address: fullShippingAddr,
      email: customerEmailAddr,
    });

    onClearCart();
    setIsProcessingOrder(false);
    setStep("confirmed");
    window.scrollTo(0, 0);
  };

  // Download Official Indian GST Tax Invoice (Print-ready & Downloadable)
  const handleDownloadInvoice = () => {
    // 18% GST (9% CGST + 9% SGST) breakdown
    const taxableSubtotal = Math.round((grandTotal / 1.18) * 100) / 100;
    const totalGst = Math.round((grandTotal - taxableSubtotal) * 100) / 100;
    const cgstTotal = Math.round((totalGst / 2) * 100) / 100;
    const sgstTotal = Math.round((totalGst - cgstTotal) * 100) / 100;

    const invoiceItems = cartItems.map((item, idx) => {
      const lineTotal = item.priceNum * item.quantity;
      const itemTaxable = Math.round((lineTotal / 1.18) * 100) / 100;
      const itemGst = Math.round((lineTotal - itemTaxable) * 100) / 100;
      const itemCgst = Math.round((itemGst / 2) * 100) / 100;
      const itemSgst = Math.round((itemGst - itemCgst) * 100) / 100;

      return {
        slNo: idx + 1,
        productName: item.product.name,
        variantOrShade: item.selectedShade || "Couture Standard",
        hsnCode: item.product.category.toLowerCase().includes("perfume") ? "3303" : "3304",
        quantity: item.quantity,
        unitPrice: item.priceNum,
        taxableAmount: itemTaxable,
        cgstRate: "9%",
        cgstAmount: itemCgst,
        sgstRate: "9%",
        sgstAmount: itemSgst,
        totalAmount: lineTotal,
      };
    });

    const active = getCurrentUser();
    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      orderId: confirmedOrderId,
      date: new Date().toLocaleDateString("en-IN", { dateStyle: "long" }),
      seller: {
        legalName: "She'Aura Haute Parfums & Cosmétiques Pvt. Ltd.",
        brand: "SHE'AURA",
        address: "DLF Promenade, Luxury Mall Wing, Vasant Kunj",
        cityState: "New Delhi, Delhi 110070, India",
        gstin: "07AABCS1429B1Z8",
        pan: "AABCS1429B",
        email: "concierge@sheaura.com",
        phone: "+91 11 4982 0000",
      },
      buyer: {
        fullName: shippingForm.fullName,
        email: active?.email || "client@sheaura.com",
        phone: shippingForm.phone,
        address: shippingForm.address,
        city: shippingForm.city,
        state: shippingForm.state,
        pincode: shippingForm.pincode,
      },
      payment: {
        method: paymentMethod,
        status: "Confirmed & Verified",
        transactionRef: `TXN-${Math.floor(100000000 + Math.random() * 900000000)}`,
      },
      items: invoiceItems,
      deluxeSample: DELUXE_SAMPLES.find((s) => s.id === selectedSampleId)?.name,
      packaging: packagingType === "box" ? "She'Aura Silk Gift Box (Gold Ribbon)" : "Eco-Luxe Linen Travel Pouch",
      summary: {
        subtotal,
        discountAmount,
        discountCode: appliedPromoCode,
        taxableSubtotal,
        cgstTotal,
        sgstTotal,
        totalGst,
        shippingFee: shippingCost,
        grandTotal,
        amountInWords: numberToWords(grandTotal),
      },
    };

    const invoiceHtml = generateInvoiceHtml(invoiceData);

    // Open print preview window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
    } else {
      // Fallback: Download HTML file
      const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SheAura-Tax-Invoice-${confirmedOrderId}.html`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // =========================================================================
  // VIEW: ORDER CONFIRMATION SCREEN
  // =========================================================================
  if (step === "confirmed") {
    return (
      <main className="cart-page-wrapper">
        <div className="cart-container shell">
          <div className="order-confirmed-card">
            <div className="order-confirmed-icon">
              <CheckCircle2 size={56} strokeWidth={1.8} style={{ color: "#10b981" }} />
            </div>

            <div className="order-confirmed-header">
              <span className="order-confirmed-eyebrow">
                <Sparkles size={13} strokeWidth={2} style={{ color: "#c18847" }} />
                <span>ORDER PLACED WITH HAUTE MAISON</span>
              </span>
              <h1 className="order-confirmed-title">A Ritual Beyond Beauty Awaits.</h1>
              <p className="order-confirmed-subtitle">
                Thank you, <b>{shippingForm.fullName}</b>. Your order <b>{confirmedOrderId}</b> has been received and is being hand-wrapped in our signature silk gold-foil presentation box.
              </p>
            </div>

            {/* Timeline Tracking */}
            <div className="order-timeline-box">
              <div className="order-timeline-step active">
                <div className="timeline-dot"><Check size={12} strokeWidth={2.5} /></div>
                <span>Order Placed</span>
                <small>Today</small>
              </div>
              <div className="timeline-connector active" />
              <div className="order-timeline-step active">
                <div className="timeline-dot"><Clock size={12} strokeWidth={2.5} /></div>
                <span>Atelier Wrapping</span>
                <small>In Progress</small>
              </div>
              <div className="timeline-connector" />
              <div className="order-timeline-step">
                <div className="timeline-dot"><Truck size={12} strokeWidth={2.5} /></div>
                <span>Courier Dispatched</span>
                <small>Tomorrow</small>
              </div>
              <div className="timeline-connector" />
              <div className="order-timeline-step">
                <div className="timeline-dot"><Building size={12} strokeWidth={2.5} /></div>
                <span>Delivered</span>
                <small>In 2-3 Days</small>
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="order-details-grid">
              <div className="order-info-card">
                <h3>Delivery Address</h3>
                <p>
                  <b>{shippingForm.fullName}</b><br />
                  {shippingForm.address}<br />
                  {shippingForm.city}, {shippingForm.state} - {shippingForm.pincode}<br />
                  Phone: +91 {shippingForm.phone}
                </p>
              </div>

              <div className="order-info-card">
                <h3>Payment & Perks</h3>
                <p>
                  <b>Method:</b> {paymentMethod.toUpperCase()}<br />
                  <b>Status:</b> Confirmed & Secured<br />
                  <b>Total Paid:</b> ₹{grandTotal.toLocaleString("en-IN")}<br />
                  <b>Complimentary Mini:</b> {DELUXE_SAMPLES.find((s) => s.id === selectedSampleId)?.name}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="order-confirmed-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {onOpenAccount && (
                <button
                  type="button"
                  className="order-btn-primary"
                  onClick={() => {
                    onClearCart();
                    onOpenAccount();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    borderRadius: "999px",
                    background: "#2b130c",
                    color: "#ffffff",
                    border: "none",
                    font: "700 11px/1 'Plus Jakarta Sans', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(43, 19, 12, 0.2)",
                  }}
                >
                  <Truck size={15} strokeWidth={2} />
                  <span>Track Order in My Account</span>
                </button>
              )}

              <button
                type="button"
                className="order-btn-primary"
                onClick={() => {
                  onClearCart();
                  onBackToStore();
                }}
              >
                <span>Continue Exploring</span>
                <ArrowRight size={15} strokeWidth={2} />
              </button>

              <button
                type="button"
                className="order-btn-secondary"
                onClick={handleDownloadInvoice}
              >
                <Download size={15} strokeWidth={2} />
                <span>Download Official Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: MAIN CART & CHECKOUT PAGE
  // =========================================================================
  return (
    <main className="cart-page-wrapper">
      {/* Top Luxury Cart Navigation Header */}
      <header className="cart-page-header">
        <div className="cart-header-inner shell">
          <button
            type="button"
            className="cart-back-btn"
            onClick={step === "bag" ? onBackToStore : () => setStep(step === "payment" ? "shipping" : "bag")}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>{step === "bag" ? "Back to Storefront" : "Back to Previous Step"}</span>
          </button>

          <div className="cart-brand-center" onClick={onBackToStore}>
            <span className="cart-brand-title">SHE’AURA</span>
            <span className="cart-brand-sub">ATELIER BAG & CHECKOUT</span>
          </div>

          <div className="cart-header-actions">
            <button
              type="button"
              className="cart-wishlist-link-btn"
              onClick={onOpenWishlist}
              title="View Wishlist Sanctuary"
            >
              <Heart size={16} strokeWidth={1.8} />
              <span className="wishlist-link-text">Wishlist</span>
            </button>
            <div className="cart-secure-pill">
              <ShieldCheck size={14} strokeWidth={2} style={{ color: "#10b981" }} />
              <span>256-Bit SSL Secured</span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Steps Indicator */}
      <div className="cart-steps-nav shell">
        <button
          type="button"
          className={`cart-step-pill ${step === "bag" ? "active" : "completed"}`}
          onClick={() => setStep("bag")}
        >
          <span className="step-num">1</span>
          <span>Review Bag ({totalItemsCount})</span>
        </button>
        <span className="step-arrow">→</span>
        <button
          type="button"
          className={`cart-step-pill ${step === "shipping" ? "active" : step === "payment" ? "completed" : ""}`}
          onClick={() => cartItems.length > 0 && setStep("shipping")}
          disabled={cartItems.length === 0}
        >
          <span className="step-num">2</span>
          <span>Shipping & Gifting</span>
        </button>
        <span className="step-arrow">→</span>
        <button
          type="button"
          className={`cart-step-pill ${step === "payment" ? "active" : ""}`}
          onClick={() => cartItems.length > 0 && setStep("payment")}
          disabled={cartItems.length === 0}
        >
          <span className="step-num">3</span>
          <span>Payment & Authorize</span>
        </button>
      </div>

      <div className="cart-container shell">
        {cartItems.length === 0 ? (
          /* Empty Bag State */
          <div className="cart-empty-full-page">
            <div className="cart-empty-icon-wrap">
              <ShoppingBag size={54} strokeWidth={1.1} style={{ color: "#a88272" }} />
            </div>
            <h2>Your Haute Bag is Empty</h2>
            <p>
              Your collection has no pieces yet. Indulge in our botanical lipsticks, rose-water blush powders, and sensorial formulas.
            </p>
            <div className="cart-empty-actions">
              <button type="button" className="cart-primary-action-btn" onClick={onBackToStore}>
                <span>Explore Luxury Storefront</span>
                <ArrowRight size={15} strokeWidth={2} />
              </button>
              <button type="button" className="cart-secondary-action-btn" onClick={onOpenWishlist}>
                <Heart size={15} strokeWidth={2} />
                <span>View Saved Wishlist</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="cart-layout-grid">
            {/* LEFT COLUMN: ACTIVE STEP WORKFLOW */}
            <div className="cart-main-column">
              {/* Free Delivery Bar Banner */}
              <div className="cart-free-shipping-card full-page">
                <div className="cart-free-shipping-top">
                  <span className="cart-free-shipping-label">
                    <Sparkles size={14} strokeWidth={2} style={{ color: "#c18847" }} />
                    {isFreeShipping ? (
                      <b>✓ You have unlocked Complimentary Haute Delivery across India!</b>
                    ) : (
                      <span>
                        Add <b>₹{freeShippingRemaining.toLocaleString("en-IN")}</b> more for Complimentary White-Glove Delivery
                      </span>
                    )}
                  </span>
                  <span className="cart-free-shipping-pct">{progressPercent}%</span>
                </div>
                <div className="cart-free-shipping-bar">
                  <div
                    className="cart-free-shipping-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* STEP 1: REVIEW BAG ITEMS */}
              {step === "bag" && (
                <div className="cart-step-section">
                  <div className="cart-section-header">
                    <h2>Curated Pieces ({totalItemsCount})</h2>
                    <span className="cart-category-tag">Couture Collection</span>
                  </div>

                  <div className="cart-items-master-list">
                    {cartItems.map((item) => (
                      <div key={item.id} className="cart-row-card">
                        <div
                          className="cart-row-thumb-wrap"
                          onClick={() => onSelectProduct(item.product)}
                          title={`View ${item.product.name}`}
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="cart-row-thumb"
                          />
                          {item.selectedTone && (
                            <span
                              className="cart-row-tone-dot"
                              style={{ backgroundColor: item.selectedTone }}
                              title={`Tone: ${item.selectedTone}`}
                            />
                          )}
                        </div>

                        <div className="cart-row-meta">
                          <div className="cart-row-top-info">
                            <span className="cart-row-category">{item.product.category}</span>
                            <b className="cart-row-price">
                              ₹{(item.priceNum * item.quantity).toLocaleString("en-IN")}
                            </b>
                          </div>

                          <h3
                            className="cart-row-title"
                            onClick={() => onSelectProduct(item.product)}
                          >
                            {item.product.name}
                          </h3>

                          <div className="cart-row-details">
                            {item.selectedShade && (
                              <span className="cart-row-shade-pill">
                                Shade: <b>{item.selectedShade}</b>
                              </span>
                            )}
                            <span className="cart-row-unit-price">
                              ₹{item.priceNum.toLocaleString("en-IN")} / piece
                            </span>
                          </div>

                          {/* Stepper & Actions */}
                          <div className="cart-row-controls">
                            <div className="cart-stepper pro">
                              <button
                                type="button"
                                className="cart-stepper-btn"
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} strokeWidth={2} />
                              </button>
                              <span className="cart-stepper-value">{item.quantity}</span>
                              <button
                                type="button"
                                className="cart-stepper-btn"
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} strokeWidth={2} />
                              </button>
                            </div>

                            <div className="cart-row-actions">
                              <button
                                type="button"
                                className="cart-action-link-btn"
                                onClick={() => onMoveToWishlist(item)}
                              >
                                <Heart size={14} strokeWidth={1.8} />
                                <span>Move to Wishlist</span>
                              </button>
                              <button
                                type="button"
                                className="cart-action-link-btn delete"
                                onClick={() => onRemoveItem(item.id)}
                              >
                                <Trash2 size={14} strokeWidth={1.8} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Complimentary Deluxe Mini Selection */}
                  <div className="cart-sample-section">
                    <div className="cart-sample-header">
                      <div className="sample-title-icon">
                        <Gift size={16} strokeWidth={2} style={{ color: "#c18847" }} />
                        <h3>Select Your Complimentary Deluxe Miniature</h3>
                      </div>
                      <span className="sample-badge">FREE WITH ORDER</span>
                    </div>

                    <div className="cart-sample-grid">
                      {DELUXE_SAMPLES.map((sample) => {
                        const isSelected = selectedSampleId === sample.id;
                        return (
                          <div
                            key={sample.id}
                            className={`cart-sample-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedSampleId(sample.id)}
                          >
                            <img src={sample.image} alt={sample.name} className="sample-thumb" />
                            <div className="sample-card-body">
                              <span className="sample-size">{sample.size}</span>
                              <h4 className="sample-name">{sample.name}</h4>
                              <span className="sample-worth">{sample.value}</span>
                            </div>
                            <div className="sample-radio">
                              {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Luxury Packaging Options */}
                  <div className="cart-packaging-section">
                    <div className="packaging-header">
                      <Sparkles size={16} strokeWidth={2} style={{ color: "#dfb895" }} />
                      <h3>Haute Signature Presentation</h3>
                    </div>
                    <div className="packaging-options-grid">
                      <div
                        className={`packaging-card ${packagingType === "box" ? "active" : ""}`}
                        onClick={() => setPackagingType("box")}
                      >
                        <div className="packaging-indicator">
                          {packagingType === "box" && <div className="indicator-dot" />}
                        </div>
                        <div className="packaging-text">
                          <b>Signature She’Aura Silk Gift Box (Free)</b>
                          <p>Embossed with gold foil monogram, scented tissue, and satin closure ribbon.</p>
                        </div>
                      </div>

                      <div
                        className={`packaging-card ${packagingType === "pouch" ? "active" : ""}`}
                        onClick={() => setPackagingType("pouch")}
                      >
                        <div className="packaging-indicator">
                          {packagingType === "pouch" && <div className="indicator-dot" />}
                        </div>
                        <div className="packaging-text">
                          <b>Eco-Couture Linen Travel Pouch (Free)</b>
                          <p>100% Organic unbleached linen with reusable gold zipper pull.</p>
                        </div>
                      </div>
                    </div>

                    {/* Optional Gift Calligraphy Card */}
                    <div className="gift-note-accordion">
                      <button
                        type="button"
                        className="gift-note-toggle"
                        onClick={() => setIsGiftNoteOpen(!isGiftNoteOpen)}
                      >
                        <Tag size={13} strokeWidth={2} />
                        <span>{isGiftNoteOpen ? "− Remove Hand-Calligraphed Gift Card" : "+ Add Hand-Calligraphed Gift Card (Complimentary)"}</span>
                      </button>
                      {isGiftNoteOpen && (
                        <div className="gift-note-input-wrap">
                          <textarea
                            className="gift-note-textarea"
                            placeholder="Write your custom luxury message to the recipient (e.g. 'Happy Birthday my love, stay radiant always…')"
                            rows={3}
                            value={giftNoteMessage}
                            onChange={(e) => setGiftNoteMessage(e.target.value)}
                            maxLength={240}
                          />
                          <span className="gift-note-count">{giftNoteMessage.length}/240 characters</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proceed to Shipping Button */}
                  <div className="cart-step-action-bar">
                    <button
                      type="button"
                      className="cart-primary-action-btn full-width"
                      onClick={() => {
                        setStep("shipping");
                        window.scrollTo(0, 0);
                      }}
                    >
                      <span>Proceed to Shipping & Delivery</span>
                      <ArrowRight size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: SHIPPING & DELIVERY ADDRESS */}
              {step === "shipping" && (
                <div className="cart-step-section">
                  <div className="cart-section-header">
                    <h2>White-Glove Delivery Details</h2>
                    <span className="cart-category-tag">Step 2 of 3</span>
                  </div>

                  <form className="cart-shipping-form" onSubmit={(e) => { e.preventDefault(); setStep("payment"); window.scrollTo(0, 0); }}>
                    <div className="form-row-two">
                      <div className="form-field">
                        <label>FULL NAME</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.fullName}
                          onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                          placeholder="e.g. Aaradhya Sharma"
                        />
                      </div>
                      <div className="form-field">
                        <label>CONTACT PHONE (+91)</label>
                        <input
                          type="tel"
                          required
                          value={shippingForm.phone}
                          onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                          placeholder="e.g. 9876543210"
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>EMAIL FOR TRACKING NOTIFICATIONS</label>
                      <input
                        type="email"
                        required
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                        placeholder="e.g. aaradhya.sharma@example.com"
                      />
                    </div>

                    <div className="form-field">
                      <label>STREET ADDRESS & RESIDENCE</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.address}
                        onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                        placeholder="Flat / Villa / Apartment, Street, Landmark"
                      />
                    </div>

                    <div className="form-row-three">
                      <div className="form-field">
                        <label>CITY</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div className="form-field">
                        <label>STATE</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.state}
                          onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                          placeholder="State"
                        />
                      </div>
                      <div className="form-field">
                        <label>PIN CODE</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.pincode}
                          onChange={(e) => setShippingForm({ ...shippingForm, pincode: e.target.value })}
                          placeholder="6-Digit PIN"
                          maxLength={6}
                        />
                      </div>
                    </div>

                    {/* Delivery Speed Options */}
                    <div className="delivery-speed-group">
                      <label className="delivery-speed-title">SELECT COUTURE TRANSIT SPEED</label>
                      <div className="delivery-speed-grid">
                        <div
                          className={`delivery-speed-card ${shippingForm.deliverySpeed === "standard" ? "active" : ""}`}
                          onClick={() => setShippingForm({ ...shippingForm, deliverySpeed: "standard" })}
                        >
                          <div className="speed-icon-wrap"><Truck size={16} /></div>
                          <div className="speed-meta">
                            <b>Haute Standard (2-3 Business Days)</b>
                            <span>{isFreeShipping ? "FREE (Complimentary)" : "₹150"}</span>
                          </div>
                        </div>

                        <div
                          className={`delivery-speed-card ${shippingForm.deliverySpeed === "express" ? "active" : ""}`}
                          onClick={() => setShippingForm({ ...shippingForm, deliverySpeed: "express" })}
                        >
                          <div className="speed-icon-wrap"><Clock size={16} /></div>
                          <div className="speed-meta">
                            <b>Next-Day Priority VIP Courier</b>
                            <span>{subtotal >= 3000 ? "FREE" : "₹200"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="cart-step-action-bar">
                      <button type="submit" className="cart-primary-action-btn full-width">
                        <span>Continue to Secure Payment</span>
                        <ArrowRight size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3: PAYMENT METHOD & AUTHORIZE */}
              {step === "payment" && (
                <div className="cart-step-section">
                  <div className="cart-section-header">
                    <h2>Encrypted Payment Method</h2>
                    <span className="cart-category-tag">Step 3 of 3</span>
                  </div>

                  <div className="payment-tabs-row">
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "upi" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("upi")}
                    >
                      <Smartphone size={16} strokeWidth={2} />
                      <span>Instant UPI / QR</span>
                    </button>
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "card" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("card")}
                    >
                      <CreditCard size={16} strokeWidth={2} />
                      <span>Cards</span>
                    </button>
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "netbanking" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("netbanking")}
                    >
                      <Building size={16} strokeWidth={2} />
                      <span>Net Banking</span>
                    </button>
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "cod" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("cod")}
                    >
                      <Truck size={16} strokeWidth={2} />
                      <span>Cash on Delivery</span>
                    </button>
                  </div>

                  <div className="payment-body-card">
                    {/* UPI TAB */}
                    {paymentMethod === "upi" && (
                      <div className="upi-payment-view">
                        <div className="upi-qr-box">
                          {/* SVG QR Code Simulation */}
                          <div className="upi-qr-code">
                            <div className="qr-simulated-pattern">
                              <span className="qr-corner tl" />
                              <span className="qr-corner tr" />
                              <span className="qr-corner bl" />
                              <div className="qr-center-logo">
                                <Sparkles size={20} strokeWidth={2} style={{ color: "#c18847" }} />
                              </div>
                            </div>
                          </div>
                          <span className="upi-scan-note">Scan with any UPI app to pay ₹{grandTotal.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="upi-app-badges">
                          <span className="upi-badge">Google Pay</span>
                          <span className="upi-badge">PhonePe</span>
                          <span className="upi-badge">Paytm</span>
                          <span className="upi-badge">CRED UPI</span>
                          <span className="upi-badge">BHIM</span>
                        </div>
                      </div>
                    )}

                    {/* CARD TAB */}
                    {paymentMethod === "card" && (
                      <div className="card-payment-view">
                        <div className="form-field">
                          <label>CARD NUMBER</label>
                          <input
                            type="text"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                            placeholder="4532 0000 0000 0000"
                          />
                        </div>
                        <div className="form-field">
                          <label>CARDHOLDER NAME</label>
                          <input
                            type="text"
                            value={cardDetails.name}
                            onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                            placeholder="Full name as printed"
                          />
                        </div>
                        <div className="form-row-two">
                          <div className="form-field">
                            <label>EXPIRY (MM/YY)</label>
                            <input
                              type="text"
                              value={cardDetails.expiry}
                              onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                              placeholder="MM/YY"
                              maxLength={5}
                            />
                          </div>
                          <div className="form-field">
                            <label>CVV / CVC</label>
                            <input
                              type="password"
                              value={cardDetails.cvv}
                              onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                              placeholder="•••"
                              maxLength={4}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NET BANKING */}
                    {paymentMethod === "netbanking" && (
                      <div className="netbanking-view">
                        <label className="form-label">CHOOSE PREFERRED BANK</label>
                        <div className="bank-select-grid">
                          {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"].map((bank) => (
                            <button
                              key={bank}
                              type="button"
                              className={`bank-pill ${selectedBank === bank ? "active" : ""}`}
                              onClick={() => setSelectedBank(bank)}
                            >
                              <Building size={14} />
                              <span>{bank}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CASH ON DELIVERY */}
                    {paymentMethod === "cod" && (
                      <div className="cod-view">
                        <div className="cod-note-box">
                          <ShieldCheck size={20} strokeWidth={2} style={{ color: "#059669" }} />
                          <div>
                            <h4>Cash on Delivery Available</h4>
                            <p>Please keep exact cash (₹{grandTotal.toLocaleString("en-IN")}) or UPI ready at the time of delivery.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final Authorize Button */}
                  <div className="cart-step-action-bar">
                    <button
                      type="button"
                      className="cart-primary-action-btn full-width"
                      disabled={isProcessingOrder}
                      onClick={handlePlaceOrder}
                    >
                      <Lock size={15} strokeWidth={2} />
                      <span>{isProcessingOrder ? "Authorizing Secure Order…" : `Authorize & Place Order — ₹${grandTotal.toLocaleString("en-IN")}`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: REAL-TIME LUXURY ORDER SUMMARY */}
            <aside className="cart-summary-column">
              <div className="cart-summary-sticky-card">
                <div className="summary-card-header">
                  <h3>Order Summary</h3>
                  <span className="summary-pieces-count">{totalItemsCount} Pieces</span>
                </div>

                {/* Promo Code Form */}
                <form className="summary-promo-form" onSubmit={handleApplyPromo}>
                  <div className="promo-input-row">
                    <input
                      type="text"
                      className="promo-input"
                      placeholder="Enter promo code (SHEAURA10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <button type="submit" className="promo-apply-btn">
                      Apply
                    </button>
                  </div>
                  {promoError && <span className="promo-msg-error">{promoError}</span>}
                  {promoSuccess && (
                    <div className="promo-msg-success">
                      <span>✓ {promoSuccess}</span>
                      <button type="button" onClick={handleRemovePromo} className="promo-remove-btn" title="Remove promo code">
                        ✕
                      </button>
                    </div>
                  )}
                </form>

                {/* Breakdown Lines */}
                <div className="summary-breakdown">
                  <div className="summary-line">
                    <span>Couture Bag Subtotal</span>
                    <b>₹{subtotal.toLocaleString("en-IN")}</b>
                  </div>

                  {discountAmount > 0 && (
                    <div className="summary-line discount">
                      <span>VIP Promo Discount ({appliedPromoCode})</span>
                      <b>−₹{discountAmount.toLocaleString("en-IN")}</b>
                    </div>
                  )}

                  <div className="summary-line">
                    <span>Haute Maison Shipping</span>
                    <span className={shippingCost === 0 ? "free-tag" : ""}>
                      {shippingCost === 0 ? "FREE" : `₹${shippingCost}`}
                    </span>
                  </div>

                  <div className="summary-line">
                    <span>Signature Silk Gift Packaging</span>
                    <span className="free-tag">COMPLIMENTARY</span>
                  </div>

                  <div className="summary-line">
                    <span>Deluxe Miniature Perk</span>
                    <span className="free-tag">FREE</span>
                  </div>

                  <div className="summary-divider" />

                  <div className="summary-line grand-total-line">
                    <div className="grand-label">
                      <span>Grand Total</span>
                      <small>Inclusive of all applicable taxes</small>
                    </div>
                    <span className="grand-amount">
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Direct Advance CTA */}
                {step === "bag" && (
                  <button
                    type="button"
                    className="summary-checkout-cta"
                    onClick={() => {
                      setStep("shipping");
                      window.scrollTo(0, 0);
                    }}
                  >
                    <span>Proceed to Shipping</span>
                    <ArrowRight size={15} strokeWidth={2} />
                  </button>
                )}

                {/* Security and Trust Callouts */}
                <div className="summary-trust-bullets">
                  <div className="trust-item">
                    <Check size={13} strokeWidth={2.5} style={{ color: "#10b981" }} />
                    <span>100% Authentic Botanical Formulations</span>
                  </div>
                  <div className="trust-item">
                    <Check size={13} strokeWidth={2.5} style={{ color: "#10b981" }} />
                    <span>Discreet Luxury Packaging with Wax Seal</span>
                  </div>
                  <div className="trust-item">
                    <Check size={13} strokeWidth={2.5} style={{ color: "#10b981" }} />
                    <span>Complimentary 14-Day Returns & Exchanges</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
