/**
 * She'Aura Haute Parfums & Cosmétiques
 * Luxury Indian GST Tax Invoice Generator
 * Follows statutory Indian GST guidelines (HSN 3304 / 3303, CGST 9% + SGST 9% = 18%)
 */

import { getTaxSettings, calculateDynamicTax, TaxSettings } from "./taxSettings";

export interface InvoiceItem {
  slNo: number;
  productName: string;
  variantOrShade: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  cgstRate: string;
  cgstAmount: number;
  sgstRate: string;
  sgstAmount: number;
  totalAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  date: string;
  seller: {
    legalName: string;
    brand: string;
    address: string;
    cityState: string;
    gstin: string;
    pan: string;
    email: string;
    phone: string;
  };
  buyer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment: {
    method: string;
    status: string;
    transactionRef: string;
  };
  items: InvoiceItem[];
  deluxeSample?: string;
  packaging?: string;
  summary: {
    subtotal: number;
    discountAmount: number;
    discountCode: string | null;
    taxableSubtotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal?: number;
    isInterState?: boolean;
    gstRate?: number;
    totalGst: number;
    shippingFee: number;
    grandTotal: number;
    amountInWords: string;
  };
}

export function numberToWords(amount: number): string {
  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertHundreds(num: number): string {
    let result = "";
    if (num >= 100) {
      result += units[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    }
    if (num > 0) {
      result += units[num] + " ";
    }
    return result.trim();
  }

  const intPart = Math.floor(amount);
  if (intPart === 0) return "Rupees Zero Only";

  let words = "";
  const crores = Math.floor(intPart / 10000000);
  const lakhs = Math.floor((intPart % 10000000) / 100000);
  const thousands = Math.floor((intPart % 100000) / 1000);
  const hundreds = intPart % 1000;

  if (crores > 0) words += convertHundreds(crores) + " Crore ";
  if (lakhs > 0) words += convertHundreds(lakhs) + " Lakh ";
  if (thousands > 0) words += convertHundreds(thousands) + " Thousand ";
  if (hundreds > 0) words += convertHundreds(hundreds) + " ";

  return `Rupees ${words.trim()} Only`;
}

/** Escapes text for HTML */
const esc = (val: unknown) =>
  String(val ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

export function generateInvoiceHtml(data: InvoiceData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tax Invoice · ${esc(data.invoiceNumber)} — SHE'AURA</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      background: #fdfbf7;
      padding: 32px 16px;
      line-height: 1.5;
      font-size: 13px;
    }
    .action-bar {
      max-width: 860px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-gold {
      background: #9d7b42;
      color: #ffffff;
      border: 1px solid #9d7b42;
    }
    .btn-gold:hover {
      background: #856633;
    }
    .btn-outline {
      background: transparent;
      color: #1a1a1a;
      border: 1px solid #d1d1d6;
    }
    .btn-outline:hover {
      background: #eee;
    }
    .invoice-wrapper {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border: 1px solid #e8e3d8;
      box-shadow: 0 10px 40px rgba(157, 123, 66, 0.08);
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #9d7b42;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 26px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 11px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #9d7b42;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .seller-meta {
      font-size: 11.5px;
      color: #555;
      line-height: 1.6;
    }
    .invoice-badge-box {
      text-align: right;
    }
    .invoice-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9d7b42;
      margin-bottom: 8px;
    }
    .invoice-meta {
      font-size: 12px;
      color: #444;
      line-height: 1.7;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f0ece3;
    }
    .party-card h4 {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #9d7b42;
      margin-bottom: 8px;
      border-bottom: 1px solid #eedec3;
      padding-bottom: 4px;
    }
    .party-card p {
      font-size: 12.5px;
      line-height: 1.6;
      color: #333;
    }
    .table-container {
      margin-bottom: 28px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #faf7f2;
      color: #4a3e2e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      font-weight: 600;
      border-top: 1px solid #e8e3d8;
      border-bottom: 1px solid #e8e3d8;
      text-align: left;
    }
    th.right, td.right {
      text-align: right;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f0ece3;
      vertical-align: top;
    }
    .item-name {
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .item-sub {
      font-size: 11px;
      color: #777;
    }
    .perks-box {
      background: #fdfbf7;
      border: 1px dashed #d9cbba;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #5d4e3a;
      line-height: 1.6;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .words-box {
      font-size: 12px;
      background: #faf7f2;
      border-left: 3px solid #9d7b42;
      padding: 14px;
      border-radius: 0 4px 4px 0;
    }
    .words-label {
      font-weight: 600;
      color: #9d7b42;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .summary-table {
      width: 100%;
    }
    .summary-table td {
      padding: 6px 0;
      border: none;
      font-size: 12.5px;
    }
    .summary-table .total-row td {
      border-top: 2px solid #9d7b42;
      padding-top: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #9d7b42;
    }
    .footer {
      border-top: 1px solid #e8e3d8;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11.5px;
      color: #666;
    }
    .signature-box {
      text-align: right;
    }
    .signature-line {
      width: 160px;
      border-bottom: 1px solid #1a1a1a;
      margin-bottom: 6px;
      margin-left: auto;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .action-bar { display: none; }
      .invoice-wrapper { border: none; box-shadow: none; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div style="font-size: 13px; color: #666;">
      Official GST Tax Invoice (Computer Generated)
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-gold" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-outline" onclick="window.close()">
        Close
      </button>
    </div>
  </div>

  <div class="invoice-wrapper">
    <div class="header">
      <div>
        <div class="brand-title">${esc(data.seller.brand)}</div>
        <div class="brand-sub">Haute Parfums &amp; Cosm&eacute;tiques · Paris · New Delhi</div>
        <div class="seller-meta">
          <b>${esc(data.seller.legalName)}</b><br />
          ${esc(data.seller.address)}<br />
          ${esc(data.seller.cityState)}<br />
          <b>GSTIN:</b> ${esc(data.seller.gstin)} · <b>PAN:</b> ${esc(data.seller.pan)}<br />
          <b>Concierge:</b> ${esc(data.seller.email)} · ${esc(data.seller.phone)}
        </div>
      </div>
      <div class="invoice-badge-box">
        <div class="invoice-title">Tax Invoice</div>
        <div class="invoice-meta">
          <b>Invoice No:</b> ${esc(data.invoiceNumber)}<br />
          <b>Order ID:</b> ${esc(data.orderId)}<br />
          <b>Date:</b> ${esc(data.date)}<br />
          <b>Payment:</b> ${esc(data.payment.method.toUpperCase())} (${esc(data.payment.status)})<br />
          <b>Transaction Ref:</b> ${esc(data.payment.transactionRef)}
        </div>
      </div>
    </div>

    <div class="parties-grid">
      <div class="party-card">
        <h4>Billed &amp; Shipped To (Client)</h4>
        <p>
          <b>${esc(data.buyer.fullName)}</b><br />
          ${esc(data.buyer.address)}<br />
          ${esc(data.buyer.city)}, ${esc(data.buyer.state)} - ${esc(data.buyer.pincode)}<br />
          <b>Phone:</b> ${esc(data.buyer.phone)}<br />
          <b>Email:</b> ${esc(data.buyer.email)}
        </p>
      </div>
      <div class="party-card">
        <h4>Dispatch &amp; Courier Logistics</h4>
        <p>
          <b>Haute Courier:</b> BlueDart Apex Express<br />
          <b>Tracking:</b> ${esc(data.orderId.replace("SH-", "EXP-BLUEDART-"))}<br />
          <b>Delivery Type:</b> Complimentary White-Glove<br />
          <b>Estimated Transit:</b> 2-3 Business Days
        </p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 36px;">#</th>
            <th>Description of Goods</th>
            <th style="width: 80px;">HSN/SAC</th>
            <th class="right" style="width: 50px;">Qty</th>
            <th class="right" style="width: 90px;">Taxable (₹)</th>
            <th class="right" style="width: 70px;">CGST (9%)</th>
            <th class="right" style="width: 70px;">SGST (9%)</th>
            <th class="right" style="width: 100px;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (it) => `
          <tr>
            <td>${it.slNo}</td>
            <td>
              <div class="item-name">${esc(it.productName)}</div>
              <div class="item-sub">Shade/Variant: ${esc(it.variantOrShade)}</div>
            </td>
            <td>${esc(it.hsnCode)}</td>
            <td class="right">${it.quantity}</td>
            <td class="right">₹${it.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="right">₹${it.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="right">₹${it.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="right"><b>₹${it.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${
      data.deluxeSample || data.packaging
        ? `
    <div class="perks-box">
      <b>Complimentary Maison Inclusions:</b><br />
      ${data.deluxeSample ? `✨ Deluxe Miniature Sample: <b>${esc(data.deluxeSample)}</b> (Value ₹0 / Complimentary)<br />` : ""}
      ${data.packaging ? `🎁 Signature Packaging: <b>${esc(data.packaging)}</b> (Complimentary Gold Ribbon Presentation)` : ""}
    </div>`
        : ""
    }

    <div class="summary-grid">
      <div class="words-box">
        <div class="words-label">Amount in Words (INR)</div>
        <div style="font-weight: 600; color: #222; font-size: 13px;">${esc(data.summary.amountInWords)}</div>
        <div style="margin-top: 12px; font-size: 11px; color: #666;">
          ${
            data.summary.isInterState
              ? `GST/CST Breakdown: Total Taxable ₹${data.summary.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} + Inter-State IGST/CST (${data.summary.gstRate || 18}%) ₹${(data.summary.igstTotal || data.summary.totalGst).toLocaleString("en-IN", { minimumFractionDigits: 2 })} = Total Tax ₹${data.summary.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`
              : `GST Breakdown: Total Taxable ₹${data.summary.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} + CGST ₹${data.summary.cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} + SGST ₹${data.summary.sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} = Total GST ₹${data.summary.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${data.summary.gstRate || 18}%).`
          }
        </div>
      </div>

      <div>
        <table class="summary-table">
          <tr>
            <td style="color: #666;">Items Subtotal:</td>
            <td class="right">₹${data.summary.subtotal.toLocaleString("en-IN")}</td>
          </tr>
          ${
            data.summary.discountAmount > 0
              ? `<tr>
            <td style="color: #9d7b42;">Discount (${esc(data.summary.discountCode || "Promo")}):</td>
            <td class="right" style="color: #9d7b42;">-₹${data.summary.discountAmount.toLocaleString("en-IN")}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="color: #666;">Taxable Value:</td>
            <td class="right">₹${data.summary.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          ${
            data.summary.isInterState
              ? `<tr>
            <td style="color: #666;">Integrated GST / CST (${data.summary.gstRate || 18}%):</td>
            <td class="right">₹${(data.summary.igstTotal || data.summary.totalGst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>`
              : `<tr>
            <td style="color: #666;">Central GST (${Math.round(((data.summary.gstRate || 18) / 2) * 10) / 10}%):</td>
            <td class="right">₹${data.summary.cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #666;">State GST (${Math.round(((data.summary.gstRate || 18) / 2) * 10) / 10}%):</td>
            <td class="right">₹${data.summary.sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>`
          }
          <tr>
            <td style="color: #666;">White-Glove Shipping:</td>
            <td class="right">${data.summary.shippingFee === 0 ? "FREE" : `₹${data.summary.shippingFee}`}</td>
          </tr>
          <tr class="total-row">
            <td>GRAND TOTAL:</td>
            <td class="right">₹${data.summary.grandTotal.toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <div>
        <b>Terms &amp; Authentic Certification:</b><br />
        All items are 100% genuine couture cosmetics certified dermatologically safe.<br />
        This is a computer-generated tax invoice and requires no physical seal under Rule 48 of CGST Rules 2017.
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <b>Authorized Signatory</b><br />
        For ${esc(data.seller.legalName)}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds a compliant InvoiceData object from any AdminOrder or Supabase order payload
 */
export function buildInvoiceDataFromAdminOrder(order: any): InvoiceData {
  let rawItems: any[] = [];
  if (Array.isArray(order.items)) {
    rawItems = order.items;
  } else if (typeof order.items === "string") {
    try {
      rawItems = JSON.parse(order.items);
    } catch {}
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    rawItems = [
      {
        name: "She'Aura Couture Collection",
        shade: "Signature Edit",
        quantity: order.items_count || 1,
        unitPrice: typeof order.total_price === "number" ? order.total_price : 1099,
      },
    ];
  }

  let totalNum = typeof order.total_price === "number" ? order.total_price : 0;
  if (!totalNum && order.total_amount) {
    totalNum = parseFloat(String(order.total_amount).replace(/[^0-9.]/g, "")) || 0;
  }
  if (!totalNum) totalNum = 1099;

  const discountAmount = Number(order.discount || 0);
  const subtotal = Number(order.subtotal || totalNum + discountAmount);
  const shippingFee = Number(order.shipping_fee || 0);
  const grandTotal = totalNum;

  // Retrieve dynamic statutory tax settings
  const settings = getTaxSettings();
  const gstRate = Number(settings.defaultGstRate) || 18;

  const clientName = order.client_name || order.customer_name || "Maison Member";
  const clientEmail = order.client_email || order.customer_email || "client@sheaura.com";
  const clientPhone = order.client_phone || order.customer_phone || "+91 98200 11223";
  const addr = order.shipping_address || "Haute Luxury Boulevard, Mumbai, Maharashtra 400001";

  const addrParts = addr.split(",").map((s: string) => s.trim());
  const city = addrParts.length >= 2 ? addrParts[addrParts.length - 2] : "Mumbai";
  const state = addrParts.length >= 1 ? addrParts[addrParts.length - 1].split("-")[0].trim() : "Maharashtra";
  const pincodeMatch = addr.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : "400001";

  const taxBreakdown = calculateDynamicTax(grandTotal, state, settings);
  const taxableSubtotal = taxBreakdown.taxableAmount;
  const totalGst = taxBreakdown.totalGst;
  const cgstTotal = taxBreakdown.cgstAmount;
  const sgstTotal = taxBreakdown.sgstAmount;
  const igstTotal = taxBreakdown.igstAmount;

  const invoiceItems: InvoiceItem[] = rawItems.map((item: any, idx: number) => {
    const qty = Number(item.quantity) || 1;
    const unitP =
      typeof item.unitPrice === "number"
        ? item.unitPrice
        : parseFloat(String(item.unitPrice || item.price || 0).replace(/[^0-9.]/g, "")) ||
          Math.round(grandTotal / Math.max(1, qty));
    const lineTotal =
      typeof item.itemTotal === "number"
        ? item.itemTotal
        : typeof item.priceNum === "number"
        ? item.priceNum * qty
        : unitP * qty;

    const itemTax = calculateDynamicTax(lineTotal, state, settings);

    const cat = String(item.name || "").toLowerCase();
    const isPerfume = cat.includes("perfume") || cat.includes("extrait") || cat.includes("scent");

    return {
      slNo: idx + 1,
      productName: item.name || "Maison Creation",
      variantOrShade: item.shade || "Haute Finish",
      hsnCode: isPerfume ? (settings.hsnPerfumery || "33030010") : (settings.hsnCosmetics || "33041000"),
      quantity: qty,
      unitPrice: unitP,
      taxableAmount: itemTax.taxableAmount,
      cgstRate: `${itemTax.cgstRate}%`,
      cgstAmount: itemTax.cgstAmount,
      sgstRate: `${itemTax.sgstRate}%`,
      sgstAmount: itemTax.sgstAmount,
      totalAmount: lineTotal,
    };
  });

  const cleanOrderId = order.id || `SH-${Date.now()}`;
  const invCode = cleanOrderId.includes("-") ? cleanOrderId.split("-").pop() : cleanOrderId.slice(-6);

  return {
    invoiceNumber: `${settings.invoicePrefix || "INV-2026"}-${String(invCode).toUpperCase()}`,
    orderId: cleanOrderId,
    date: order.created_at
      ? new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })
      : new Date().toLocaleDateString("en-IN", { dateStyle: "long" }),
    seller: {
      legalName: settings.legalEntityName || "She'Aura Haute Parfums & Cosmétiques Pvt. Ltd.",
      brand: settings.brandTradeName || "SHE'AURA",
      address: settings.registeredAddress || "DLF Promenade, Luxury Mall Wing, Vasant Kunj",
      cityState: `${settings.stateOfOrigin || "Delhi"}, India (State Code: ${settings.stateCode || "07"})`,
      gstin: settings.gstin || "07AABCS1429B1Z8",
      pan: settings.pan || "AABCS1429B",
      email: "concierge@sheaura.com",
      phone: "+91 11 4982 0000",
    },
    buyer: {
      fullName: clientName,
      email: clientEmail,
      phone: clientPhone,
      address: addr,
      city,
      state,
      pincode,
    },
    payment: {
      method: (order.payment_method || "UPI").toUpperCase(),
      status:
        (order.payment_status || "paid").toLowerCase() === "paid"
          ? "Confirmed & Verified"
          : "Pending / Awaiting Delivery",
      transactionRef: order.gateway_payment_id || `TXN-${Math.floor(100000000 + Math.random() * 900000000)}`,
    },
    items: invoiceItems,
    deluxeSample: "Damask Rose Botanical Elixir Miniature (Complimentary)",
    packaging: "She'Aura Signature Gold Keepsake Presentation",
    summary: {
      subtotal,
      discountAmount,
      discountCode: discountAmount > 0 ? (order.discount_code || "WELCOME10") : null,
      taxableSubtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      isInterState: taxBreakdown.isInterState,
      gstRate,
      totalGst,
      shippingFee,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
    },
  };
}

export function downloadInvoiceHtml(invoiceOrHtml: InvoiceData | string, filename = "SheAura-Tax-Invoice.html") {
  if (typeof window === "undefined") return;
  const html = typeof invoiceOrHtml === "string" ? invoiceOrHtml : generateInvoiceHtml(invoiceOrHtml);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printInvoiceHtml(html: string) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}
