/**
 * She'Aura Statutory Tax & Regulatory Settings Engine (GST / CST)
 * Handles dynamic GSTIN, PAN, intra-state (CGST + SGST) vs inter-state (IGST/CST) configuration,
 * and synchronizes dynamically with Supabase cloud database and backend API.
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export interface TaxSettings {
  legalEntityName: string;
  brandTradeName: string;
  gstin: string;
  pan: string;
  registeredAddress: string;
  stateOfOrigin: string;
  stateCode: string;
  defaultGstRate: number; // e.g. 18
  cgstRate: number; // e.g. 9
  sgstRate: number; // e.g. 9
  igstRate: number; // e.g. 18 (Inter-state CST / IGST)
  cstInterStateEnabled: boolean;
  hsnCosmetics: string;
  hsnPerfumery: string;
  invoicePrefix: string;
  updatedAt: string;
  updatedBy: string;
}

export const INDIAN_STATES_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  legalEntityName: "She'Aura Haute Parfums & Cosmétiques Pvt. Ltd.",
  brandTradeName: "SHE'AURA",
  gstin: "07AABCS1429B1Z8",
  pan: "AABCS1429B",
  registeredAddress: "DLF Promenade, Luxury Mall Wing, Vasant Kunj, New Delhi 110070",
  stateOfOrigin: "Delhi",
  stateCode: "07",
  defaultGstRate: 18,
  cgstRate: 9,
  sgstRate: 9,
  igstRate: 18,
  cstInterStateEnabled: true,
  hsnCosmetics: "33041000",
  hsnPerfumery: "33030010",
  invoicePrefix: "INV-2026",
  updatedAt: "2026-10-27T00:00:00.000Z",
  updatedBy: "System Director",
};

const STORAGE_KEY = "sheaura_tax_settings_v2";
export const TAX_SETTINGS_EVENT = "sheaura:tax-settings-updated";

/** Retrieve current tax settings from localStorage cache with resilient defaults */
export function getTaxSettings(): TaxSettings {
  if (typeof window === "undefined") return DEFAULT_TAX_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.gstin) {
        return { ...DEFAULT_TAX_SETTINGS, ...parsed };
      }
    }
  } catch (err) {
    console.warn("[TaxSettings] Read notice:", err);
  }
  return DEFAULT_TAX_SETTINGS;
}

/** Save updated tax settings and synchronize with Supabase cloud and backend */
export async function saveTaxSettings(
  updates: Partial<TaxSettings>,
  operatorName = "Director of Haute Concierge"
): Promise<TaxSettings> {
  const current = getTaxSettings();
  const cleanGstin = (updates.gstin || current.gstin).trim().toUpperCase();

  // Deduce PAN and state code if GSTIN is provided
  let stateCode = updates.stateCode || current.stateCode;
  let pan = updates.pan || current.pan;
  let stateOfOrigin = updates.stateOfOrigin || current.stateOfOrigin;

  if (cleanGstin.length >= 12) {
    const extractedStateCode = cleanGstin.slice(0, 2);
    const extractedPan = cleanGstin.slice(2, 12);
    if (/^\d{2}$/.test(extractedStateCode) && INDIAN_STATES_MAP[extractedStateCode]) {
      stateCode = extractedStateCode;
      stateOfOrigin = INDIAN_STATES_MAP[extractedStateCode];
    }
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(extractedPan)) {
      pan = extractedPan;
    }
  }

  const defaultGstRate = Number(updates.defaultGstRate ?? current.defaultGstRate) || 18;
  const isCstEnabled = updates.cstInterStateEnabled ?? current.cstInterStateEnabled;

  // By default, split evenly into CGST and SGST unless explicitly overridden
  const cgstRate = updates.cgstRate !== undefined ? Number(updates.cgstRate) : Math.round((defaultGstRate / 2) * 10) / 10;
  const sgstRate = updates.sgstRate !== undefined ? Number(updates.sgstRate) : Math.round((defaultGstRate / 2) * 10) / 10;
  const igstRate = updates.igstRate !== undefined ? Number(updates.igstRate) : defaultGstRate;

  const updatedSettings: TaxSettings = {
    ...current,
    ...updates,
    gstin: cleanGstin,
    pan,
    stateCode,
    stateOfOrigin,
    defaultGstRate,
    cgstRate,
    sgstRate,
    igstRate,
    cstInterStateEnabled: isCstEnabled,
    updatedAt: new Date().toISOString(),
    updatedBy: operatorName,
  };

  // 1. Save to local storage for instant availability across tabs
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      window.dispatchEvent(
        new CustomEvent(TAX_SETTINGS_EVENT, { detail: updatedSettings })
      );
    } catch (e) {
      console.warn("[TaxSettings] Storage write notice:", e);
    }
  }

  // 2. Synchronize with Supabase database (public.app_settings)
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("app_settings")
        .upsert({
          key: "tax_settings",
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        });
    } catch (dbErr) {
      console.warn("[TaxSettings] Cloud database sync warning:", dbErr);
    }
  }

  // 3. Sync with backend API if accessible
  try {
    const adminToken = localStorage.getItem("sheaura_admin_token");
    await fetch("/api/settings/tax", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      body: JSON.stringify(updatedSettings),
    }).catch(() => {});
  } catch {}

  return updatedSettings;
}

/** Fetch remote tax settings from Supabase cloud database to ensure fresh config */
export async function fetchRemoteTaxSettings(): Promise<TaxSettings> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "tax_settings")
        .single();

      if (!error && data?.value && typeof data.value === "object") {
        const remote = data.value as TaxSettings;
        if (remote.gstin) {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
            window.dispatchEvent(
              new CustomEvent(TAX_SETTINGS_EVENT, { detail: remote })
            );
          }
          return remote;
        }
      }
    } catch (err) {
      console.warn("[TaxSettings] Remote fetch notice:", err);
    }
  }
  return getTaxSettings();
}

/** Statutory Indian GSTIN format validator */
export function validateGstin(gstin: string): {
  valid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  error?: string;
} {
  const clean = (gstin || "").trim().toUpperCase();
  if (!clean) {
    return { valid: false, error: "GSTIN number is required." };
  }

  // Standard Indian 15-character GSTIN regex
  // Format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 'Z' + 1 check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return {
      valid: false,
      error:
        "Invalid statutory GSTIN format. Expected 15 characters (e.g. 07AABCS1429B1Z8).",
    };
  }

  const stCode = clean.slice(0, 2);
  const pan = clean.slice(2, 12);
  const stateName = INDIAN_STATES_MAP[stCode] || "Registered State";

  return {
    valid: true,
    stateCode: stCode,
    stateName,
    pan,
  };
}

/** Dynamic Tax Engine: computes taxable subtotal, CGST+SGST or IGST/CST */
export function calculateDynamicTax(
  grossAmount: number,
  destinationState?: string,
  settings: TaxSettings = getTaxSettings()
): {
  taxableAmount: number;
  totalGst: number;
  isInterState: boolean;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  effectiveRate: number;
} {
  const rate = Number(settings.defaultGstRate) || 18;
  const taxableAmount = Math.round((grossAmount / (1 + rate / 100)) * 100) / 100;
  const totalGst = Math.round((grossAmount - taxableAmount) * 100) / 100;

  // Determine if order is Inter-State (CST / IGST) or Intra-State (CGST + SGST)
  const origin = (settings.stateOfOrigin || "Delhi").toLowerCase().trim();
  const dest = (destinationState || "").toLowerCase().trim();

  // If destination state is known and different from dispatch origin -> Inter-state
  const isInterState = Boolean(
    settings.cstInterStateEnabled &&
      dest &&
      !dest.includes(origin) &&
      !origin.includes(dest)
  );

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalGst;
  } else {
    cgstAmount = Math.round((totalGst / 2) * 100) / 100;
    sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;
  }

  return {
    taxableAmount,
    totalGst,
    isInterState,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cgstRate: isInterState ? 0 : settings.cgstRate || rate / 2,
    sgstRate: isInterState ? 0 : settings.sgstRate || rate / 2,
    igstRate: isInterState ? settings.igstRate || rate : 0,
    effectiveRate: rate,
  };
}
