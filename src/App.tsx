import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import BrandIntro from "./BrandIntro";
import CartDrawer from "./CartDrawer";
import CartView from "./CartView";
import WishlistView from "./WishlistView";
import InciDisclosureDrawer from "./InciDisclosureDrawer";
import SheAuraLogo from "./SheAuraLogo";
import { getProductInciDetails } from "./lib/inciData";

// Lazy-load heavy administrative studio console and secondary portals to optimize public bundle
const AdminView = lazy(() => import("./AdminView"));
const AuthAccountView = lazy(() => import("./AuthAccountView"));
const RunwayCinemaView = lazy(() => import("./RunwayCinemaView"));
import {
  CartItem,
  getInitialCart,
  getInitialWishlist,
  parseProductPrice,
} from "./lib/cartWishlistContext";
import {
  photos,
  resolveAsset,
  defaultProducts,
  loadStorefrontCatalog,
  StorefrontProduct,
  normalizeCategory,
  getLocalCustomProducts,
  mapSupabaseToStorefront,
} from "./lib/catalog";
import { getCurrentUser, onAuthStateChanged, SheAuraUser } from "./lib/auth";

export { photos, resolveAsset };
export const products = defaultProducts;
export type Product = StorefrontProduct;

export type IconName = "search" | "user" | "bag" | "arrow" | "leaf" | "drop" | "sparkle" | "instagram" | "play" | "pause" | "volume" | "volumeX" | "close" | "check" | "external" | "lock" | "shield" | "heart" | "package" | "logOut" | "home";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.6-4 2.7-6 6.5-6s5.9 2 6.5 6" /></>,
    bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    arrow: <><path d="M4 12h15" /><path d="m15 8 4 4-4 4" /></>,
    leaf: <><path d="M19 4C10 4 5 8 5 14c0 3 2 5 5 5 6 0 9-6 9-15Z" /><path d="M5 20c2-5 6-8 11-11" /></>,
    drop: <path d="M12 3S6 10 6 15a6 6 0 0 0 12 0c0-5-6-12-6-12Z" />,
    sparkle: <><path d="M12 2c.6 6 2 7.4 8 8-6 .6-7.4 2-8 8-.6-6-2-7.4-8-8 6-.6 7.4-2 8-8Z" /><path d="M19 17c.2 2.2.8 2.8 3 3-2.2.2-2.8.8-3 3-.2-2.2-.8-2.8-3-3 2.2-.2 2.8-.8 3-3Z" /></>,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
    play: <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />,
    pause: <><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" /></>,
    volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
    volumeX: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  };
  return <svg aria-hidden="true" className={`icon ${className || ""}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">{paths[name]}</svg>;
}

export function ArrowLink({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <a className={`arrow-link ${light ? "light" : ""}`} href="#shop">{children}<Icon name="arrow" /></a>;
}

export type Reel = {
  id: string;
  title: string;
  subtitle: string;
  productName: string;
  category: "all" | "blush" | "lips" | "glow" | "routine" | "complexion" | "collection";
  videoUrl: string;
  poster: string;
  instagramUrl: string;
  handle: string;
  avatar: string;
  duration: string;
  views: string;
  likes: string;
  quote: string;
  step: string;
  tone: string;
  productPrice: string;
  productImage: string;
  productTag?: string;
};

export const reels: Reel[] = [
  {
    id: "reel-01",
    title: "The Perfect Everyday Blush",
    subtitle: "Soft-Focus Silk Powder Flush",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-01-perfect-blush.mp4"),
    poster: resolveAsset("/reels/posters/reel-01-perfect-blush.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeV_UkRpvGw/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushPortrait,
    duration: "0:24",
    views: "342K",
    likes: "48.6K",
    quote: "The PERFECT BLUSH for everyday use. Melts effortlessly into skin with buildable rose pigment.",
    step: "Look 01 · Everyday Flush",
    tone: "#a94368",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Bestseller",
  },
  {
    id: "reel-02",
    title: "Couture Red Lip Finish",
    subtitle: "Botanical Emollient Glide",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-02-nothing-better-lipstick.mp4"),
    poster: resolveAsset("/reels/posters/reel-02-nothing-better-lipstick.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeO8B16hEAz/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.scarletPortrait,
    duration: "0:18",
    views: "420K",
    likes: "61.2K",
    quote: "There’s nothing better than this. Rich pigment with hydrating comfort in a single stroke.",
    step: "Look 02 · The Red Statement",
    tone: "#a81920",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Icon",
  },
  {
    id: "reel-03",
    title: "Effortless Everyday Glam",
    subtitle: "From Subtle Nude to Bold Statement",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-03-everyday-glam.mp4"),
    poster: resolveAsset("/reels/posters/reel-03-everyday-glam.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeLrsOLMSyo/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.scarletPortrait,
    duration: "0:16",
    views: "288K",
    likes: "39.4K",
    quote: "Everyday glam made effortless. Layerable formulas crafted for daylight and evening.",
    step: "Look 03 · Nude to Bold",
    tone: "#9a6e56",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Icon",
  },
  {
    id: "reel-04",
    title: "Hydra-Glide Lipstick Ritual",
    subtitle: "Silky Sensation on Bare Lips",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-04-grwm-lipsticks.mp4"),
    poster: resolveAsset("/reels/posters/reel-04-grwm-lipsticks.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeJ0vGmMjxv/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.model,
    duration: "0:21",
    views: "512K",
    likes: "74.1K",
    quote: "GRWM featuring She’Aura lipsticks! Finding a formula that glides smoothly and hydrates all day.",
    step: "Look 04 · Sensorial Glide",
    tone: "#a81920",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Icon",
  },
  {
    id: "reel-05",
    title: "She’Aura Body Highlighter Oil",
    subtitle: "Liquid Shimmer & Luxury Glow",
    productName: "Molten Glow Highlighter",
    category: "glow",
    videoUrl: resolveAsset("/reels/reel-05-body-highlighter-oil.mp4"),
    poster: resolveAsset("/reels/posters/reel-05-body-highlighter-oil.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeG5GujBNVT/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.highlighterPortrait,
    duration: "0:20",
    views: "610K",
    likes: "89.3K",
    quote: "Just gift her the She’Aura Body Highlighter Oil. Smooth application, gorgeous shimmer, and luxury glow.",
    step: "Look 05 · Body Shimmer Veil",
    tone: "#c18847",
    productPrice: "₹1,199.00",
    productImage: photos.highlighterBotanical,
    productTag: "New",
  },
  {
    id: "reel-06",
    title: "Not A Filter, Pure Skin Foundation",
    subtitle: "Second-Skin Complexion Blend",
    productName: "Radiant Fluid Foundation",
    category: "complexion",
    videoUrl: resolveAsset("/reels/reel-06-not-a-filter-foundation.mp4"),
    poster: resolveAsset("/reels/posters/reel-06-not-a-filter-foundation.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeEq7-Azk_P/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.model,
    duration: "0:19",
    views: "395K",
    likes: "52.8K",
    quote: "This is not a filter, it’s my foundation. Featherweight coverage that lets real skin shine through.",
    step: "Look 06 · Second-Skin Base",
    tone: "#dfb895",
    productPrice: "₹1,299.00",
    productImage: photos.foundation,
    productTag: "Base Edit",
  },
  {
    id: "reel-07",
    title: "Traditional Festive Radiance",
    subtitle: "Natural Glow with Heritage Elegance",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-07-traditional-glow.mp4"),
    poster: resolveAsset("/reels/posters/reel-07-traditional-glow.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Dd_2YLhR6P4/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushPortrait,
    duration: "0:17",
    views: "478K",
    likes: "67.0K",
    quote: "Pair your traditional look with She’aura to get the natural glow and festive elegance.",
    step: "Look 07 · Festive Glow",
    tone: "#a94368",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Festive Edit",
  },
  {
    id: "reel-08",
    title: "Orchid Lip & Peach Blossom Blush",
    subtitle: "Signature Minimal GRWM Routine",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-08-orchid-peach-grwm.mp4"),
    poster: resolveAsset("/reels/posters/reel-08-orchid-peach-grwm.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Dd-wD1Oz39K/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushStill,
    duration: "0:25",
    views: "530K",
    likes: "78.4K",
    quote: "Perfect GRWM featuring Orchid Lipstick and Peach Blossom Blush. Fresh, blooming, and effortless.",
    step: "Look 08 · Orchid & Peach",
    tone: "#dda196",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "GRWM Edit",
  },
  {
    id: "reel-09",
    title: "Moonflower Highlighter Glow",
    subtitle: "Full Bebo Vibes & Liquid Light",
    productName: "Molten Glow Highlighter",
    category: "glow",
    videoUrl: resolveAsset("/reels/reel-09-moonflower-highlighter.mp4"),
    poster: resolveAsset("/reels/posters/reel-09-moonflower-highlighter.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Dd6SWx_tJjp/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.highlighterPortrait,
    duration: "0:28",
    views: "812K",
    likes: "115K",
    quote: "Giving full Bebo vibes! The Moonflower Highlighter by SHE’AURA is all about that dreamy, molten glow.",
    step: "Look 09 · Moonflower Dream",
    tone: "#c18847",
    productPrice: "₹1,199.00",
    productImage: photos.highlighterBotanical,
    productTag: "Viral",
  },
  {
    id: "reel-10",
    title: "PR Review & Unboxing",
    subtitle: "Complete Luxury Beauty Wardrobe",
    productName: "She’Aura Discovery Wardrobe",
    category: "collection",
    videoUrl: resolveAsset("/reels/reel-10-pr-review-unboxing.mp4"),
    poster: resolveAsset("/reels/posters/reel-10-pr-review-unboxing.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Dd62wF7SbMG/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.model,
    duration: "0:22",
    views: "640K",
    likes: "92.3K",
    quote: "Unboxing the luxury SHE’AURA collection. Sculpted packaging, sensory formulas, and radiant payoff.",
    step: "Look 10 · The Complete Edit",
    tone: "#dfb895",
    productPrice: "₹3,299.00",
    productImage: photos.makeup,
    productTag: "PR Unboxing",
  },
  {
    id: "reel-11",
    title: "Petal Radiance: Shade Blush Rose",
    subtitle: "Soft-Focus Fresh Floral Flush",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-11-shade-blush-rose.mp4"),
    poster: resolveAsset("/reels/posters/reel-11-shade-blush-rose.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Dd1LXAoSxAk/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushPortrait,
    duration: "0:15",
    views: "375K",
    likes: "51.2K",
    quote: "Shade Blush Rose! Exploring effortless gifting and everyday botanical radiance with natural cheek glow.",
    step: "Look 11 · Petal Tint",
    tone: "#e28c8d",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Floral Edit",
  },
  {
    id: "reel-12",
    title: "Bullet Lipstick But Make It Luxury",
    subtitle: "Sculpted Packaging & Velveteen Glide",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-12-bullet-lipstick-luxury.mp4"),
    poster: resolveAsset("/reels/posters/reel-12-bullet-lipstick-luxury.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DdyuxBAPQMs/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.scarletPortrait,
    duration: "0:20",
    views: "520K",
    likes: "79.8K",
    quote: "Bullet lipstick but make it luxury! The detailing, the shade, the finish — everything is top notch.",
    step: "Look 12 · Haute Bullet",
    tone: "#8b1820",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Luxury Edit",
  },
  {
    id: "reel-13",
    title: "Unveil Your Inner Confidence",
    subtitle: "Bold, Timeless Scarlet Rose Touch",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-13-scarlet-rose-confidence.mp4"),
    poster: resolveAsset("/reels/posters/reel-13-scarlet-rose-confidence.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DdyjIg-tdpw/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.model,
    duration: "0:18",
    views: "410K",
    likes: "58.4K",
    quote: "Unveil your inner confidence with SheAura’s Scarlet Rose Lipstick—the perfect touch of bold, timeless beauty.",
    step: "Look 13 · Scarlet Confidence",
    tone: "#a81920",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Confidence",
  },
  {
    id: "reel-14",
    title: "Viral Runway GRWM Routine",
    subtitle: "Trending Layering & Effortless Glow",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-14-grwm-viral-trend.mp4"),
    poster: resolveAsset("/reels/posters/reel-14-grwm-viral-trend.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Debtm5PypqV/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushStill,
    duration: "0:26",
    views: "890K",
    likes: "134K",
    quote: "Get ready with me for office featuring the SheAura keepsake gold compact blush.",
    step: "Look 14 · Keepsake Compact",
    tone: "#dfb895",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Viral Trend",
  },
  {
    id: "reel-15",
    title: "A Little Colour, A Lot of Confidence",
    subtitle: "The Perfect Nude Lip Hits Different",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-15-colour-confidence-lip.mp4"),
    poster: resolveAsset("/reels/posters/reel-15-colour-confidence-lip.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DebGeA6vwb7/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.scarletPortrait,
    duration: "0:22",
    views: "630K",
    likes: "91.5K",
    quote: "A little colour, a lot of confidence! The perfect lip shade just hits different on every skin tone.",
    step: "Look 15 · Statement Nude",
    tone: "#965b4c",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Confidence",
  },
  {
    id: "reel-16",
    title: "Try SheAura Body Oil Highlighter",
    subtitle: "Molten Shimmer & Sunkissed Glow",
    productName: "Molten Glow Highlighter",
    category: "glow",
    videoUrl: resolveAsset("/reels/reel-16-sheaura-body-oil-highlighter.mp4"),
    poster: resolveAsset("/reels/posters/reel-16-sheaura-body-oil-highlighter.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DeZ2Y7OvRQs/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.highlighterPortrait,
    duration: "0:14",
    views: "340K",
    likes: "47.2K",
    quote: "What do you think about this? Try SheAura Body Oil Highlighter for that goddess molten shine on collarbones and shoulders.",
    step: "Look 16 · Liquid Light",
    tone: "#c18847",
    productPrice: "₹1,199.00",
    productImage: photos.highlighterBotanical,
    productTag: "Goddess Glow",
  },
  {
    id: "reel-17",
    title: "Y’all Need To Steal This Vegan Luxe",
    subtitle: "Clean Ingredients & Heavyweight Elegance",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-17-vegan-luxe-lipstick-steal.mp4"),
    poster: resolveAsset("/reels/posters/reel-17-vegan-luxe-lipstick-steal.jpg"),
    instagramUrl: "https://www.instagram.com/reel/Ddi1IzLo90u/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.model,
    duration: "0:15",
    views: "415K",
    likes: "59.0K",
    quote: "Y’all need to steal this! It’s vegan, has luxe packaging and goes on smooth as silk without feeling heavy.",
    step: "Look 17 · Conscious Luxe",
    tone: "#b72e39",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Vegan Luxe",
  },
  {
    id: "reel-18",
    title: "3 Reasons to Fall in Love Trio",
    subtitle: "Because One Is Never Enough",
    productName: "Scarlet Rose Lipstick",
    category: "lips",
    videoUrl: resolveAsset("/reels/reel-18-three-reasons-love-bundle.mp4"),
    poster: resolveAsset("/reels/posters/reel-18-three-reasons-love-bundle.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DdllwnOBVms/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.scarletPortrait,
    duration: "0:16",
    views: "380K",
    likes: "53.8K",
    quote: "Because one is never enough... so we’re giving you 3 reasons to fall in love with She’Aura beauty.",
    step: "Look 18 · The Trio Edit",
    tone: "#a81920",
    productPrice: "₹1,099.00",
    productImage: photos.scarletBotanical,
    productTag: "Trio Edit",
  },
  {
    id: "reel-19",
    title: "The Signature Blush & Lipstick Duo",
    subtitle: "Effortless Harmonic Monochrome Pairing",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-19-perfect-blush-and-lipstick.mp4"),
    poster: resolveAsset("/reels/posters/reel-19-perfect-blush-and-lipstick.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DdjIZCsovzC/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushStill,
    duration: "0:24",
    views: "585K",
    likes: "84.3K",
    quote: "Got my hands on the perfect blush and lipstick! Harmonic hues that bring natural vitality to skin.",
    step: "Look 19 · Harmonic Duo",
    tone: "#d26d74",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Duo Edit",
  },
  {
    id: "reel-20",
    title: "The Complete Look Finishing Blush",
    subtitle: "Buildable Flush on Velvet Canvas",
    productName: "Pink Blossom Blush",
    category: "blush",
    videoUrl: resolveAsset("/reels/reel-20-complete-makeup-blush.mp4"),
    poster: resolveAsset("/reels/posters/reel-20-complete-makeup-blush.jpg"),
    instagramUrl: "https://www.instagram.com/reel/DdvUvMJS-Ui/?utm_source=ig_web_copy_link",
    handle: "@sheauracosmeticsofficial",
    avatar: photos.blushPortrait,
    duration: "0:17",
    views: "460K",
    likes: "66.7K",
    quote: "The perfect blush from SheAura to complete my makeup look. Soft, romantic, and all-day wear.",
    step: "Look 20 · The Final Flush",
    tone: "#c25a62",
    productPrice: "₹899.00",
    productImage: photos.blushStill,
    productTag: "Final Flush",
  },
];



function ReelViewerModal({
  reel,
  onClose,
  onSelectProduct,
  onAddBag,
  reels,
  onSwitchReel,
  catalog,
}: {
  reel: Reel;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddBag: (product: Product) => void;
  reels: Reel[];
  onSwitchReel: (reel: Reel) => void;
  catalog?: Product[];
}) {
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [addedToast, setAddedToast] = useState(false);
  const matchingProduct = (catalog || products).find((p) => p.name === reel.productName) || (catalog && catalog[0]) || products[0];

  const currentIndex = reels.findIndex((r) => r.id === reel.id);

  const touchStartXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length > 0) {
      const diff = touchStartXRef.current - e.changedTouches[0].clientX;
      if (diff > 45) {
        nextReel();
      } else if (diff < -45) {
        prevReel();
      }
    }
  };

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const width = rect.width;
    if (tapX < width * 0.28) {
      prevReel();
    } else if (tapX > width * 0.72) {
      nextReel();
    } else {
      togglePlay();
    }
  };

  const prevReel = () => {
    const nextIndex = (currentIndex - 1 + reels.length) % reels.length;
    onSwitchReel(reels[nextIndex]);
    setProgress(0);
  };

  const nextReel = () => {
    const nextIndex = (currentIndex + 1) % reels.length;
    onSwitchReel(reels[nextIndex]);
    setProgress(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevReel();
      if (e.key === "ArrowRight") nextReel();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    if (modalVideoRef.current) {
      modalVideoRef.current.currentTime = 0;
      modalVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [reel.id]);

  const handleTimeUpdate = () => {
    if (modalVideoRef.current && modalVideoRef.current.duration) {
      const p = (modalVideoRef.current.currentTime / modalVideoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const togglePlay = () => {
    if (modalVideoRef.current) {
      if (isPlaying) {
        modalVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        modalVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleSound = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleAddToCart = () => {
    onAddBag(matchingProduct);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2400);
  };

  return (
    <div className="reel-modal-backdrop" onClick={onClose}>
      <div className="reel-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="reel-modal-close" onClick={onClose} aria-label="Close story viewer">
          <Icon name="close" />
        </button>

        <button className="reel-nav-btn prev" onClick={prevReel} aria-label="Previous reel">
          <Icon name="arrow" />
        </button>

        <div
          className="reel-modal-theater"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="reel-story-progress-bar">
            {reels.map((r, idx) => (
              <div key={r.id} className="progress-track" onClick={() => onSwitchReel(r)}>
                <div
                  className="progress-fill"
                  style={{
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="reel-theater-header">
            <div className="reel-creator-info">
              <img src={reel.avatar} alt={reel.handle} className="reel-avatar" />
              <div>
                <b>{reel.handle}</b>
                <span>{reel.step}</span>
              </div>
            </div>
            <div className="theater-controls">
              <a
                href={reel.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="theater-ig-badge"
                title="Open on Instagram"
              >
                <Icon name="instagram" />
                <span>Instagram</span>
                <Icon name="external" />
              </a>
              <button onClick={toggleSound} className="theater-icon-btn" aria-label="Toggle sound">
                <Icon name={isMuted ? "volumeX" : "volume"} />
              </button>
              <button onClick={togglePlay} className="theater-icon-btn" aria-label="Play or pause">
                <Icon name={isPlaying ? "pause" : "play"} />
              </button>
            </div>
          </div>

          <video
            ref={modalVideoRef}
            src={reel.videoUrl}
            poster={reel.poster}
            playsInline
            loop
            autoPlay
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onClick={handleVideoTap}
            className="theater-video"
          />

          {!isPlaying && (
            <div className="theater-paused-overlay" onClick={togglePlay}>
              <div className="theater-paused-circle"><Icon name="play" /></div>
            </div>
          )}

          <div className="theater-caption-overlay">
            <div className="theater-badge">
              <Icon name="instagram" />
              <span>Verified Look · @sheauracosmeticsofficial</span>
            </div>
            <h3>{reel.title}</h3>
            <p className="theater-caption-text">{reel.quote}</p>
          </div>
        </div>

        <div className="reel-modal-sidebar">
          <div>
            <div className="sidebar-header">
              <p className="eyebrow dark">Featured Piece in Reel</p>
              <span className="sidebar-step">{reel.step}</span>
            </div>

            <div className="sidebar-product-hero">
              <img src={reel.productImage || matchingProduct.image} alt={matchingProduct.name} />
              <div className="sidebar-prod-badge" style={{ background: reel.tone || matchingProduct.tone }}>
                {matchingProduct.category}
              </div>
            </div>

            <div className="sidebar-info">
              <h3>{matchingProduct.name}</h3>
              <div className="sidebar-price-row">
                <b>{reel.productPrice || matchingProduct.price}</b>
                <span>{matchingProduct.finish} finish</span>
              </div>
              <p className="sidebar-desc">{matchingProduct.description}</p>
            </div>

            <div className="sidebar-attributes">
              <div><span>Tone</span><b>{matchingProduct.name.split(" ")[0]}</b></div>
              <div><span>Wear</span><b>Buildable</b></div>
              <div><span>Standard</span><b>Botanical</b></div>
            </div>
          </div>

          <div className="sidebar-actions-wrap">
            <div className="sidebar-actions">
              <button className="sidebar-add-bag" onClick={handleAddToCart}>
                {addedToast ? "Added to Bag ✓" : `Add to Bag — ${reel.productPrice || matchingProduct.price}`}
              </button>
              <button
                className="sidebar-view-details"
                onClick={() => {
                  onClose();
                  onSelectProduct(matchingProduct);
                  window.scrollTo(0, 0);
                }}
              >
                Explore Full Details <Icon name="arrow" />
              </button>
              <a
                href={reel.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="sidebar-ig-link"
              >
                <Icon name="instagram" /> View Reel on Instagram <Icon name="external" />
              </a>
            </div>

            {addedToast && (
              <div className="sidebar-toast">
                <Icon name="check" /> {matchingProduct.name} added to your shopping bag!
              </div>
            )}
          </div>
        </div>

        <button className="reel-nav-btn next" onClick={nextReel} aria-label="Next reel">
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function ReelsSection({
  catalog,
  onSelectProduct,
  onAddBag,
  onOpenReel,
  onOpenRunway,
}: {
  catalog?: Product[];
  onSelectProduct: (product: Product) => void;
  onAddBag: (product: Product) => void;
  onOpenReel: (reel: Reel) => void;
  onOpenRunway?: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState(reels[0].id);
  const [isMuted, setIsMuted] = useState(true);
  const [addedToast, setAddedToast] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const dynamicReels = useMemo(() => {
    if (!catalog || catalog.length === 0) return reels;
    const dynamicList: Reel[] = [];
    catalog.forEach((prod) => {
      if (Array.isArray(prod.videos) && prod.videos.length > 0) {
        prod.videos.forEach((v, idx) => {
          if (v.video_url || v.instagram_url) {
            dynamicList.push({
              id: v.id || `dyn-reel-${(prod.slug || prod.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
              title: v.title || `${prod.name} · Motion Look`,
              subtitle: prod.finish || "Sensorial Glide",
              productName: prod.name,
              category: prod.category.toLowerCase().includes("lip")
                ? "lips"
                : prod.category.toLowerCase().includes("blush")
                ? "blush"
                : prod.category.toLowerCase().includes("glow") || prod.category.toLowerCase().includes("high")
                ? "glow"
                : prod.category.toLowerCase().includes("foundation") || prod.category.toLowerCase().includes("complexion")
                ? "complexion"
                : prod.category.toLowerCase().includes("wardrobe") || prod.category.toLowerCase().includes("collection")
                ? "collection"
                : "all",
              videoUrl: v.video_url || resolveAsset("/reels/reel-01-perfect-blush.mp4"),
              poster: v.poster_url || prod.campaign || prod.image,
              instagramUrl: v.instagram_url || "https://www.instagram.com/sheauracosmeticsofficial/",
              handle: v.social_handle || "@sheauracosmeticsofficial",
              avatar: prod.image,
              duration: "0:25",
              views: "310K",
              likes: "42K",
              quote: v.quote || `Finding a formula that glides smoothly and hydrates all day.`,
              step: v.title || `Look 0${idx + 1}`,
              tone: prod.tone,
              productPrice: prod.price,
              productImage: prod.image,
              productTag: prod.tag,
            });
          }
        });
      }
    });

    const combined = [...reels];
    for (const d of dynamicList) {
      if (!combined.some((r) => r.productName === d.productName && r.videoUrl === d.videoUrl)) {
        combined.push(d);
      }
    }
    return combined;
  }, [catalog]);

  const filteredReels = useMemo(() => {
    return filter === "all" ? dynamicReels : dynamicReels.filter((r) => r.category === filter);
  }, [filter, dynamicReels]);

  useEffect(() => {
    if (!filteredReels.some((reel) => reel.id === activeId)) {
      setActiveId(filteredReels[0]?.id || reels[0].id);
    }
  }, [filter, filteredReels, activeId]);

  const activeIndex = Math.max(0, filteredReels.findIndex((reel) => reel.id === activeId));
  const activeReel = filteredReels[activeIndex] || filteredReels[0] || reels[0];
  const matchingProduct = useMemo(() => {
    return (catalog || products).find((p) => p.name === activeReel.productName) || (catalog && catalog[0]) || products[0];
  }, [activeReel.productName, catalog]);

  const move = (direction: number) => {
    const nextIdx = (activeIndex + direction + filteredReels.length) % filteredReels.length;
    setActiveId(filteredReels[nextIdx].id);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [activeReel.id]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const openInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(activeReel.instagramUrl, "_blank", "noopener,noreferrer");
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddBag(matchingProduct);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  };

  return (
    <section className="reels-section" id="rituals">
      <div className="shell reels-header-wrap">
        <div className="section-heading reels-heading-block">
          <div className="reels-heading-copy">
            <div className="reels-eyebrow-row">
              <span className="reels-haute-pill">
                <Icon name="sparkle" />
                <span>Haute Couture Runway</span>
              </span>
              <span className="reels-live-pulse"><i /> {filteredReels.length} RITUALS RUNNING LIVE</span>
            </div>
            <h2>Aura in Motion.</h2>
            <p>Real skin, botanical textures, unedited swatches. Watch our 20 official Instagram reels flowing live—tap any piece to shop the exact shades worn in motion.</p>
          </div>

          <div className="reels-header-controls">
            <div className="reels-filters">
              {[
                { id: "all", label: `All Looks (${filteredReels.length})` },
                { id: "lips", label: "Lipsticks" },
                { id: "blush", label: "Blush" },
                { id: "glow", label: "Highlighter & Oil" },
                { id: "complexion", label: "Foundation" },
                { id: "collection", label: "Wardrobe Edit" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={filter === tab.id ? "active" : ""}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="reels-stepper-counter" aria-label={`Look ${activeIndex + 1} of ${filteredReels.length}`}>
              <span className="current">{String(activeIndex + 1).padStart(2, "0")}</span>
              <span className="divider">/</span>
              <span className="total">{String(filteredReels.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="shell">
        <div className="reels-atelier-stage">
          {/* LEFT: 9:16 Authentic Portrait Cinema Column */}
          <div className="reels-cinema-column">
            <div
              className="reels-cinema-bezel"
              onClick={() => onOpenReel(activeReel)}
              title="Tap to watch fullscreen"
            >
              <video
                ref={videoRef}
                src={activeReel.videoUrl}
                poster={activeReel.poster}
                muted={isMuted}
                playsInline
                autoPlay
                loop
                preload="metadata"
                className="reels-cinema-video"
              />
              <div className="reels-cinema-gradient" />

              <div className="reels-cinema-top">
                <button
                  className="reels-cinema-creator-pill"
                  onClick={openInstagram}
                  title="Open original reel on Instagram"
                  aria-label="Open original reel on Instagram"
                >
                  <Icon name="instagram" />
                  <span>{activeReel.handle}</span>
                  <Icon name="external" />
                </button>

                <div className="reels-cinema-actions">
                  <button
                    className="reels-sound-visualizer"
                    onClick={toggleSound}
                    aria-label={isMuted ? "Sound muted, click to unmute" : "Sound active, click to mute"}
                    title={isMuted ? "Unmute audio" : "Mute audio"}
                  >
                    <div className={`sound-bars ${!isMuted ? "playing" : ""}`}>
                      <span /><span /><span /><span />
                    </div>
                    <span>{isMuted ? "MUTED" : "LIVE"}</span>
                  </button>

                  <button
                    className="reels-cinema-icon-btn"
                    onClick={toggleSound}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    <Icon name={isMuted ? "volumeX" : "volume"} />
                  </button>
                </div>
              </div>

              <div className="reels-cinema-center-cue">
                <div className="reels-cinema-play-disc">
                  <Icon name="play" />
                  <span>Tap to Expand</span>
                </div>
              </div>

              <div className="reels-cinema-bottom">
                <div className="reels-cinema-step-pill">
                  <span
                    className="dot"
                    style={{ backgroundColor: matchingProduct.tone || "#a81920" }}
                  />
                  <span>{activeReel.step}</span>
                </div>
                <div className="reels-cinema-views-pill">
                  <span>{activeReel.views} watches</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Haute Couture Editorial Companion */}
          <div className="reels-editorial-column">
            <div className="reels-editorial-header">
              <div className="reels-editorial-step-badge">
                <span className="reels-editorial-category">{activeReel.category.toUpperCase()}</span>
                <span>{activeReel.step.toUpperCase()}</span>
              </div>
              <h3 className="reels-editorial-title">{activeReel.title}</h3>
              <p className="reels-editorial-subtitle">{activeReel.subtitle}</p>
            </div>

            {/* Editorial Creator Quote */}
            <div className="reels-editorial-quote-box">
              <span className="quote-mark" aria-hidden="true">“</span>
              <p className="reels-editorial-quote-text">“{activeReel.quote}”</p>
              <div className="quote-author-row">
                <img src={activeReel.avatar} alt={activeReel.handle} className="quote-avatar" />
                <div>
                  <b>{activeReel.handle}</b>
                  <small>Verified SheAura Creator · {activeReel.views} watches</small>
                </div>
              </div>
            </div>

            {/* Product Card in Editorial */}
            <div className="reels-editorial-product-card">
              <div className="prod-card-top">
                <div
                  className="prod-card-thumb-wrap"
                  onClick={() => {
                    onSelectProduct(matchingProduct);
                    window.scrollTo(0, 0);
                  }}
                  title="View product details"
                >
                  <img
                    src={activeReel.productImage || matchingProduct.image}
                    alt={matchingProduct.name}
                    className="prod-card-thumb"
                  />
                </div>
                <div className="prod-card-meta">
                  <div className="prod-card-tag-row">
                    {activeReel.productTag && <span className="prod-card-tag">{activeReel.productTag}</span>}
                    <span className="prod-card-finish">{matchingProduct.finish} Finish</span>
                  </div>
                  <h4
                    className="prod-card-name"
                    onClick={() => {
                      onSelectProduct(matchingProduct);
                      window.scrollTo(0, 0);
                    }}
                  >
                    {matchingProduct.name}
                  </h4>
                  <div className="prod-card-swatch-row">
                    <span
                      className="prod-swatch-circle"
                      style={{ backgroundColor: matchingProduct.tone || "#c18847" }}
                    />
                    <span className="prod-swatch-name">{matchingProduct.name}</span>
                    <span className="prod-card-price">{activeReel.productPrice || matchingProduct.price}</span>
                  </div>
                </div>
              </div>

              <div className="prod-card-actions">
                <button
                  className={`prod-card-add-btn ${addedToast ? "added" : ""}`}
                  onClick={handleAddToCart}
                >
                  {addedToast ? "Added to Bag ✓" : `Add to Bag — ${activeReel.productPrice || matchingProduct.price}`}
                </button>
                <button
                  className="prod-card-details-btn"
                  onClick={() => {
                    onSelectProduct(matchingProduct);
                    window.scrollTo(0, 0);
                  }}
                >
                  <span>Explore Formula</span>
                  <Icon name="arrow" />
                </button>
              </div>
            </div>

            {/* Stepper Navigation Pills */}
            <div className="reels-editorial-nav-row">
              <button
                className="reels-nav-pill-btn prev"
                onClick={() => move(-1)}
                aria-label="Previous look"
              >
                <Icon name="arrow" />
                <span>Previous Look</span>
              </button>
              <button
                className="reels-nav-pill-btn next"
                onClick={() => move(1)}
                aria-label="Next look"
              >
                <span>Next Look</span>
                <Icon name="arrow" />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM: Runway Lookbook Ribbon (Filmstrip) */}
        <div className="reels-runway-ribbon-wrap">
          <div className="reels-ribbon-head">
            <span className="reels-ribbon-label">RUNWAY LOOKBOOK FILMSTRIP</span>
            <span className="reels-ribbon-hint">Scroll to explore all 10 looks</span>
          </div>

          <div className="reels-runway-ribbon" role="region" aria-label="Runway looks">
            {filteredReels.map((reel, idx) => {
              const prod = (catalog || products).find((p) => p.name === reel.productName);
              const isSelected = reel.id === activeReel.id;
              return (
                <button
                  key={reel.id}
                  className={`reels-ribbon-card ${isSelected ? "active" : ""}`}
                  onClick={() => setActiveId(reel.id)}
                  aria-pressed={isSelected}
                  title={reel.title}
                >
                  <div className="ribbon-card-media">
                    <img src={reel.poster} alt={reel.title} loading="lazy" />
                    <span className="ribbon-card-num">{String(idx + 1).padStart(2, "0")}</span>
                    <span
                      className="ribbon-swatch-dot"
                      style={{ backgroundColor: prod?.tone || "#a81920" }}
                    />
                    {isSelected && (
                      <div className="ribbon-card-playing-indicator">
                        <span />
                      </div>
                    )}
                  </div>
                  <div className="ribbon-card-info">
                    <b>{reel.title}</b>
                    <small>{reel.step}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="reels-bottom-note shell">
        <div className="note-left">
          <Icon name="instagram" />
          <span>Featuring 20 official reels from <b>@sheauracosmeticsofficial</b>. Tag <b>#MySheAura</b> to be featured.</span>
        </div>
        <a href="https://www.instagram.com/sheauracosmeticsofficial/" target="_blank" rel="noreferrer" className="follow-link">
          Visit @sheauracosmeticsofficial <Icon name="external" />
        </a>
      </div>
    </section>
  );
}

function PdpReelHighlight({
  product,
  onOpenReel,
}: {
  product: Product;
  onOpenReel: (reel: Reel) => void;
}) {
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  // Extract multiple videos if assigned from Admin Studio, or legacy single video
  const rawVideos = (product as unknown as Record<string, any>)?.videos;
  let customReels: Reel[] = [];

  if (Array.isArray(rawVideos) && rawVideos.length > 0) {
    customReels = rawVideos
      .filter((v) => v && (v.video_url || v.instagram_url))
      .map((v, idx) => ({
        id: v.id || `custom-reel-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
        title: v.title || `Look 0${idx + 1} · Sensorial Glide`,
        subtitle: product.finish || "Sensorial Glide",
        productName: product.name,
        category: (product.category?.toLowerCase().includes("lip")
          ? "lips"
          : product.category?.toLowerCase().includes("blush")
          ? "blush"
          : product.category?.toLowerCase().includes("highlighter") || product.category?.toLowerCase().includes("glow")
          ? "glow"
          : product.category?.toLowerCase().includes("foundation") || product.category?.toLowerCase().includes("complexion")
          ? "complexion"
          : product.category?.toLowerCase().includes("wardrobe") || product.category?.toLowerCase().includes("collection")
          ? "collection"
          : "all") as any,
        videoUrl: v.video_url || "",
        poster: v.poster_url || (product as unknown as Record<string, string>)?.campaign_image_url || product.campaign || product.image,
        instagramUrl: v.instagram_url || "https://www.instagram.com/sheauracosmeticsofficial/",
        handle: v.social_handle || "@sheauracosmeticsofficial",
        avatar: product.image,
        duration: "0:24",
        views: "480K",
        likes: "68K",
        quote: v.quote || `Sensorial application of ${product.name}. Layerable, skin-first texture.`,
        step: v.title || `Look 0${idx + 1}`,
        tone: product.tone,
        productPrice: product.price,
        productImage: product.image,
        productTag: product.tag,
      }));
  }

  // Fallback if no array was provided, but legacy single video columns exist
  if (customReels.length === 0) {
    const assignedVideo = (product as unknown as Record<string, string>)?.video_url || (product as unknown as Record<string, string>)?.videoUrl;
    const assignedInstagram = (product as unknown as Record<string, string>)?.instagram_url || (product as unknown as Record<string, string>)?.instagramUrl;
    if (assignedVideo || assignedInstagram) {
      customReels = [{
        id: `custom-reel-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: (product as unknown as Record<string, string>)?.video_title || `See ${product.name} in Motion`,
        subtitle: product.finish || "Sensorial Glide",
        productName: product.name,
        category: (product.category?.toLowerCase().includes("lip")
          ? "lips"
          : product.category?.toLowerCase().includes("blush")
          ? "blush"
          : product.category?.toLowerCase().includes("highlighter") || product.category?.toLowerCase().includes("glow")
          ? "glow"
          : product.category?.toLowerCase().includes("foundation") || product.category?.toLowerCase().includes("complexion")
          ? "complexion"
          : product.category?.toLowerCase().includes("wardrobe") || product.category?.toLowerCase().includes("collection")
          ? "collection"
          : "all") as any,
        videoUrl: assignedVideo || "",
        poster: (product as unknown as Record<string, string>)?.campaign_image_url || product.campaign || product.image,
        instagramUrl: assignedInstagram || "https://www.instagram.com/sheauracosmeticsofficial/",
        handle: (product as unknown as Record<string, string>)?.social_handle || "@sheauracosmeticsofficial",
        avatar: product.image,
        duration: "0:20",
        views: "520K",
        likes: "74K",
        quote: (product as unknown as Record<string, string>)?.video_quote || `Sensorial application of ${product.name}. Layerable, skin-first texture.`,
        step: (product as unknown as Record<string, string>)?.video_title || "Featured Look",
        tone: product.tone,
        productPrice: product.price,
        productImage: product.image,
        productTag: product.tag,
      }];
    }
  }

  // Find matching default reels strictly if customReels is empty
  const matchingReels = reels.filter(
    (r) =>
      r.productName.toLowerCase() === product.name.toLowerCase() ||
      (product.category?.toLowerCase().includes("lip") && r.category === "lips") ||
      (product.category?.toLowerCase().includes("blush") && r.category === "blush") ||
      (product.category?.toLowerCase().includes("highlighter") && r.category === "glow") ||
      ((product.category?.toLowerCase().includes("foundation") || product.category?.toLowerCase().includes("complexion")) && r.category === "complexion") ||
      ((product.category?.toLowerCase().includes("wardrobe") || product.category?.toLowerCase().includes("collection")) && r.category === "collection")
  );
  const availableReels = customReels.length > 0 ? customReels : matchingReels;
  if (availableReels.length === 0) {
    return null;
  }
  const activeReel = availableReels[activeReelIndex] || availableReels[0];

  return (
    <section className="pdp-motion shell">
      <div className="pdp-motion-card">
        <div className="pdp-motion-video-wrap" onClick={() => onOpenReel(activeReel)}>
          <video
            key={activeReel.videoUrl}
            src={activeReel.videoUrl}
            poster={activeReel.poster}
            playsInline
            muted
            loop
            autoPlay
            className="pdp-motion-video"
            onCanPlay={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          />
          <div className="pdp-motion-play-badge">
            <Icon name="play" />
            <span>Watch Fullscreen Story</span>
          </div>
        </div>
        <div className="pdp-motion-copy">
          <div className="pdp-motion-eyebrow">
            <Icon name="instagram" />
            <span>Official Reel · Real Application & Swatch</span>
          </div>
          <h2>See {product.name} on Real Skin.</h2>

          {availableReels.length > 1 && (
            <div className="pdp-motion-tabs">
              {availableReels.map((r, idx) => (
                <button
                  key={r.id || idx}
                  type="button"
                  className={`pdp-motion-tab ${activeReelIndex === idx ? "active" : ""}`}
                  onClick={() => setActiveReelIndex(idx)}
                >
                  <span className="pdp-motion-tab-dot" />
                  <span>{r.step || `Look 0${idx + 1}`}</span>
                </button>
              ))}
            </div>
          )}

          <p className="pdp-motion-desc">"{activeReel.quote}"</p>
          <div className="pdp-motion-meta">
            <div>
              <span>Official Channel</span>
              <b>{activeReel.handle}</b>
            </div>
            <div>
              <span>Application Finish</span>
              <b>{product.finish}</b>
            </div>
            <div>
              <span>Featured Look</span>
              <b>{activeReel.step}</b>
            </div>
          </div>
          <div className="pdp-motion-actions">
            <button className="pdp-motion-btn" onClick={() => onOpenReel(activeReel)}>
              <Icon name="play" /> Watch Reel in Fullscreen
            </button>
            <a
              href={activeReel.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="pdp-motion-ig-btn"
            >
              <Icon name="instagram" /> Open on Instagram <Icon name="external" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityStrip() {
  return (
    <section className="community-strip">
      <div className="community-marquee">
        <span>AS SEEN ON INSTAGRAM · TAG #MYSHEAURA TO BE FEATURED · 100% BOTANICAL EXTRACTS · SCULPTED TEXTURES · VEGAN & CRUELTY FREE · YOUR AURA, YOUR STORY ·&nbsp;</span>
        <span>AS SEEN ON INSTAGRAM · TAG #MYSHEAURA TO BE FEATURED · 100% BOTANICAL EXTRACTS · SCULPTED TEXTURES · VEGAN & CRUELTY FREE · YOUR AURA, YOUR STORY ·&nbsp;</span>
      </div>
    </section>
  );
}


function ProductPage({
  product,
  catalog,
  onBack,
  onAdd,
  onSelect,
  onOpenReel,
  onOpenAccount,
  onOpenCart,
  onOpenWishlist,
  isWishlisted,
  onToggleWishlist,
  cartCount,
  wishlistCount,
}: {
  product: Product;
  catalog?: Product[];
  onBack: () => void;
  onAdd: (qty: number, shade?: string, tone?: string) => void;
  onSelect: (product: Product) => void;
  onOpenReel: (reel: Reel) => void;
  onOpenAccount?: () => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  cartCount: number;
  wishlistCount: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState("formula");
  const [activeImage, setActiveImage] = useState(product.image);
  const [inciDrawerOpen, setInciDrawerOpen] = useState(false);

  const inciDetails = useMemo(() => getProductInciDetails(product), [product]);

  // Sync active image & quantity when product changes
  useEffect(() => {
    setActiveImage(product.image);
    setQuantity(1);
  }, [product]);

  // Gallery of multi-angle images
  const galleryImages = useMemo(() => {
    if (product.gallery && product.gallery.length > 0) {
      return Array.from(new Set(product.gallery));
    }
    return Array.from(
      new Set([product.image, product.still, product.campaign].filter(Boolean))
    );
  }, [product]);

  const related = useMemo(() => {
    return (catalog || products)
      .filter((item) => (item.slug || item.name) !== (product.slug || product.name))
      .slice(0, 4);
  }, [catalog, product]);

  const isCollection = (product.category || "").toLowerCase() === "collection";

  return (
    <main className="product-page">
      <header className="product-nav shell">
        <button className="back-link" onClick={onBack} aria-label="Back to collection"><Icon name="arrow" /> <span>Back to collection</span></button>
        <button className="brand product-brand" onClick={onBack} aria-label="SHE'AURA Home">
          <SheAuraLogo className="brand-logo-svg" height={26} />
        </button>
        <div className="product-nav-actions">
          <button aria-label="Search"><Icon name="search" /></button>
          <button
            type="button"
            aria-label="Wishlist Sanctuary"
            onClick={onOpenWishlist}
            className="wishlist-nav-btn"
            title={`Wishlist Sanctuary (${wishlistCount})`}
          >
            <Icon name="heart" />
            {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </button>
          {onOpenAccount && (
            <button aria-label="Account" onClick={onOpenAccount} title="Member Account">
              <Icon name="user" />
            </button>
          )}
          <button
            type="button"
            aria-label="Shopping bag"
            onClick={onOpenCart}
            className="bag"
            title={`Shopping Bag (${cartCount})`}
          >
            <Icon name="bag" />
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <section className="pdp-hero">
        <div className={`pdp-gallery ${isCollection ? "pdp-gallery-collection" : ""}`}>
          <span className="pdp-index">LOOK 01 — {(product.category || "Couture").toUpperCase()}</span>
          <div className="pdp-main-photo-wrap">
            <img className="pdp-product-photo" src={activeImage} alt={product.name} />
          </div>
          <div className="pdp-photo-shade" />

          {/* Interactive Multi-Angle Gallery Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="pdp-thumbnails-strip" aria-label="Product photography gallery">
              {galleryImages.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  className={`pdp-thumb-pill ${activeImage === img ? "active" : ""}`}
                  onClick={() => setActiveImage(img)}
                  title={`View angle ${idx + 1}`}
                  aria-label={`View angle ${idx + 1}`}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}

          <div className="pdp-caption">
            <span>Object of desire</span>
            <b>SHE’AURA / 2025 · {product.category}</b>
          </div>
        </div>

        <div className="pdp-info">
          <p className="eyebrow dark">{product.mood}</p>
          <h1>{product.name}</h1>
          <div className="pdp-price">
            <span>{product.price}</span>
            <small>Inclusive of all taxes</small>
            {product.size && <span className="pdp-size-badge">{product.size}</span>}
          </div>
          {product.reviews && product.reviews.length > 0 && (
            <div className="pdp-rating-badge" onClick={() => setDetailsOpen("reviews")} role="button" tabIndex={0}>
              <span className="pdp-stars">★★★★★</span>
              <span className="pdp-rating-score">5.0</span>
              <span className="pdp-rating-count">({product.reviews.length} verified reviews from sheaura.shop)</span>
            </div>
          )}
          <p className="pdp-description">{product.description}</p>
          
          <div className="wear-profile">
            <div><span>Finish</span><b>{product.finish}</b></div>
            <div><span>Wear</span><b>Buildable</b></div>
            <div><span>Conscious edit</span><b>Ingredient-led</b></div>
          </div>

          {/* Interactive Shade Selector */}
          {product.shades && product.shades.length > 0 ? (
            <div className="shade-selector-section">
              <div className="shade-selector-header">
                <span>Select Shade Palette</span>
                <b>{product.name.split(" ").slice(0, 2).join(" ")}</b>
              </div>
              <div className="shade-swatches-grid">
                {product.shades.map((shade) => {
                  const isSelected =
                    shade.slug === product.slug ||
                    shade.name.toLowerCase() === product.name.toLowerCase() ||
                    product.name.toLowerCase().includes(shade.name.toLowerCase());
                  return (
                    <button
                      key={shade.name}
                      type="button"
                      className={`shade-option-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        const targetProd = (catalog || products).find(
                          (p) =>
                            p.slug === shade.slug ||
                            p.name.toLowerCase() === shade.name.toLowerCase() ||
                            p.name.toLowerCase().includes(shade.name.toLowerCase())
                        );
                        if (targetProd) {
                          onSelect(targetProd);
                        }
                      }}
                      title={shade.name}
                      aria-label={shade.name}
                    >
                      <span className="shade-circle" style={{ background: shade.tone }} />
                      <span className="shade-label">{shade.name}</span>
                      {isSelected && <span className="shade-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="shade-selector">
              <div><span>Selected shade</span><b>{product.name.split(" ").slice(0, 2).join(" ")}</b></div>
              <button className="shade active" style={{ background: product.tone }} aria-label="Selected shade" />
            </div>
          )}

          {/* Benefit tags */}
          {product.benefits && (
            <div className="pdp-benefits-tags">
              {(Array.isArray(product.benefits) ? product.benefits : [product.benefits]).map((b) => (
                <span key={b} className="benefit-tag">
                  <Icon name="check" /> {b}
                </span>
              ))}
            </div>
          )}

          <div className="purchase-row">
            <div className="quantity">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button>
            </div>
            <div className="pdp-actions-cta">
              <button
                type="button"
                className="add-bag"
                onClick={() => onAdd(quantity, product.name.split(" ").slice(0, 2).join(" "), product.tone)}
              >
                <span>Add to bag</span>
                <span className="add-bag-sep">·</span>
                <span>{product.price}</span>
              </button>
              <button
                type="button"
                className={`pdp-wishlist-toggle-btn ${isWishlisted ? "active" : ""}`}
                onClick={onToggleWishlist}
                title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist Sanctuary"}
                aria-label="Wishlist"
              >
                <Icon name="heart" />
              </button>
            </div>
          </div>
          <p className="delivery-note"><Icon name="sparkle" /> Complimentary delivery on orders above ₹1,499</p>
          <div className="pdp-accordions">
            {[
              [
                "formula",
                "The formula & verified INCI",
                product.ingredients
                  ? product.ingredients
                  : "A sensorial, buildable texture created to layer comfortably and wear beautifully with botanical waxes and pure mineral pigments.",
              ],
              [
                "ritual",
                "How to wear",
                product.how_to_use
                  ? product.how_to_use
                  : `Wear ${product.name} alone as a statement or layer it into your routine for a more dimensional finish.`,
              ],
              [
                "conscious",
                "Conscious standard & policy",
                "Designed with ingredient transparency in mind. Formulated 100% vegan, cruelty-free, and paraben-free. Store policy: No exchanges, no returns.",
              ],
            ].map(([id, title, copy]) => (
              <div className={detailsOpen === id ? "open" : ""} key={id}>
                <button onClick={() => setDetailsOpen(detailsOpen === id ? "" : id)}><span>{title}</span><b>{detailsOpen === id ? "−" : "+"}</b></button>
                <p>{copy}</p>
              </div>
            ))}
            {product.reviews && product.reviews.length > 0 && (
              <div className={`pdp-reviews-accordion ${detailsOpen === "reviews" ? "open" : ""}`} key="reviews">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(detailsOpen === "reviews" ? "" : "reviews")}
                >
                  <span>Verified Client Reflections ({product.reviews.length})</span>
                  <b>{detailsOpen === "reviews" ? "−" : "+"}</b>
                </button>
                <div className="pdp-reviews-drawer">
                  {product.reviews.map((r, idx) => (
                    <div key={idx} className="pdp-review-card">
                      <div className="pdp-review-meta">
                        <span className="pdp-review-author">{r.author}</span>
                        <span className="pdp-review-stars">★★★★★</span>
                        {r.date && <span className="pdp-review-date">{r.date}</span>}
                      </div>
                      <p className="pdp-review-text">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="campaign-break">
        <img src={product.still} alt={`${product.name} botanical campaign`} />
        <div>
          <p className="eyebrow">Campaign 01 / 2025</p>
          <h2>{product.mood}.<br /><i>Captured.</i></h2>
          <p>Beauty as adornment—colour, light, texture, and gold composed as one complete look.</p>
        </div>
        <span>{product.name}</span>
      </section>

      <section className="fashion-formula">
        <div className="fashion-panel">
          <img src={product.campaign} alt={`${product.name} fashion campaign`} />
          <div><p className="eyebrow">The style note</p><h2>Wear your<br />own aura.</h2><p>Not trend-led. Self-led. SHE’AURA colour is designed like fashion: expressive, layerable, and entirely personal.</p></div>
        </div>
        <div className="formula-panel">
          <p className="eyebrow dark">The conscious formula</p>
          <h2>What’s inside<br />matters.</h2>
          <p className="formula-lead">We pair performance with transparency. Product-specific ingredient lists will be shown in full—no vague claims, no hidden story.</p>
          <div className="formula-principles">
            <div><span>01</span><Icon name="leaf" /><h3>Purposeful inputs</h3><p>Every ingredient should have a clear role in texture, colour, care, or wear.</p></div>
            <div><span>02</span><Icon name="drop" /><h3>Skin-first texture</h3><p>Sensory formulas created for comfortable layering and expressive application.</p></div>
            <div><span>03</span><Icon name="sparkle" /><h3>Full transparency</h3><p>Complete verified INCI information, presented clearly before purchase.</p></div>
          </div>
        </div>
      </section>

      <PdpReelHighlight product={product} onOpenReel={onOpenReel} />

      <section className="pdp-ingredients">
        <div className="ingredient-marquee">FASHION CONSCIOUS <i>·</i> INGREDIENT CONSCIOUS <i>·</i> YOUR AURA, YOUR STORY</div>
        <div className="ingredient-bento shell">
          <div className="bento-title"><p className="eyebrow dark">The ingredient wardrobe</p><h2>Formula,<br /><i>undressed.</i></h2></div>
          <div className="bento-card bento-botanical"><Icon name="leaf" /><span>01</span><h3>Botanical emollients</h3><p>For glide, comfort and a polished feel.</p></div>
          <div className="bento-card bento-pigment"><span>02</span><div className="pigment-smear" /><h3>Considered pigments</h3><p>For expressive colour with buildable payoff.</p></div>
          <div className="bento-card bento-inci">
            <span>03</span>
            <h3>Know every layer.</h3>
            <p>{inciDetails.summary}</p>
            <div className="bento-inci-tags">
              {inciDetails.badges.map((badge) => (
                <span key={badge} className="bento-inci-pill">{badge}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setInciDrawerOpen(true)}
              aria-label="View verified INCI laboratory disclosure"
            >
              View INCI standard <Icon name="arrow" />
            </button>
          </div>
        </div>
      </section>

      <InciDisclosureDrawer
        isOpen={inciDrawerOpen}
        onClose={() => setInciDrawerOpen(false)}
        product={product}
      />

      <section className="related shell">
        <div className="section-heading compact"><div><p className="eyebrow dark">Complete the look</p><h2>The finishing pieces.</h2></div></div>
        <div className="related-grid">
          {related.map((item) => (
            <button
              onClick={() => {
                onSelect(item);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              key={item.id || item.slug || item.name}
            >
              <div><img src={item.image} alt={item.name} /></div>
              <span>{item.category}</span>
              <h3>{item.name}</h3>
              <p>{item.price}</p>
            </button>
          ))}
        </div>
      </section>
      <footer className="pdp-footer"><span>SHE’AURA</span><p>Fashion conscious. Ingredient conscious. Always you.</p><button onClick={onBack}>Return home <Icon name="arrow" /></button></footer>
    </main>
  );
}

function MobileBottomBar({
  onOpenStore,
  onOpenWishlist,
  onOpenCart,
  onOpenAccount,
  cartCount,
  wishlistCount,
  currentUser,
  hidden,
}: {
  onOpenStore: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  cartCount: number;
  wishlistCount: number;
  currentUser: SheAuraUser | null;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <aside className="mobile-dock-nav" aria-label="Quick mobile navigation">
      <button
        type="button"
        className="mobile-dock-item"
        onClick={onOpenStore}
        aria-label="Storefront Home"
      >
        <div className="mobile-dock-icon-wrap">
          <Icon name="home" />
        </div>
        <span className="mobile-dock-label">Maison</span>
      </button>

      <button
        type="button"
        className="mobile-dock-item"
        onClick={onOpenWishlist}
        aria-label="Wishlist Sanctuary"
      >
        <div className="mobile-dock-icon-wrap">
          <Icon name="heart" />
          {wishlistCount > 0 && (
            <span className="mobile-dock-badge">{wishlistCount}</span>
          )}
        </div>
        <span className="mobile-dock-label">Wishlist</span>
      </button>

      <button
        type="button"
        className="mobile-dock-item mobile-dock-cart"
        onClick={onOpenCart}
        aria-label="Haute Shopping Bag"
      >
        <div className="mobile-dock-icon-wrap">
          <Icon name="bag" />
          {cartCount > 0 && (
            <span className="mobile-dock-badge mobile-dock-cart-badge">{cartCount}</span>
          )}
        </div>
        <span className="mobile-dock-label">Cart</span>
      </button>

      <button
        type="button"
        className="mobile-dock-item"
        onClick={onOpenAccount}
        aria-label="Member Profile"
      >
        <div className="mobile-dock-icon-wrap">
          {currentUser ? (
            <span className="mobile-dock-avatar">
              {currentUser.fullName.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Icon name="user" />
          )}
        </div>
        <span className="mobile-dock-label">
          {currentUser ? currentUser.fullName.split(" ")[0] : "Profile"}
        </span>
      </button>
    </aside>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<"storefront" | "account" | "admin" | "runway" | "cart" | "wishlist">(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/admin") return "admin";
      if (window.location.pathname === "/login" || window.location.pathname === "/account") return "account";
      if (window.location.pathname === "/runway" || window.location.pathname === "/cinema") return "runway";
      if (window.location.pathname === "/cart" || window.location.pathname === "/bag") return "cart";
      if (window.location.pathname === "/wishlist") return "wishlist";
    }
    return "storefront";
  });

  const navigateTo = (view: "storefront" | "account" | "admin" | "runway" | "cart" | "wishlist") => {
    setCurrentView(view);
    const path =
      view === "admin"
        ? "/admin"
        : view === "account"
        ? "/account"
        : view === "runway"
        ? "/runway"
        : view === "cart"
        ? "/cart"
        : view === "wishlist"
        ? "/wishlist"
        : "/";
    window.history.pushState({}, "", path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === "/admin") setCurrentView("admin");
      else if (window.location.pathname === "/login" || window.location.pathname === "/account") setCurrentView("account");
      else if (window.location.pathname === "/runway" || window.location.pathname === "/cinema") setCurrentView("runway");
      else if (window.location.pathname === "/cart" || window.location.pathname === "/bag") setCurrentView("cart");
      else if (window.location.pathname === "/wishlist") setCurrentView("wishlist");
      else setCurrentView("storefront");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>(() => {
    try {
      const localRaw = getLocalCustomProducts();
      if (Array.isArray(localRaw) && localRaw.length > 0) {
        const localProds = localRaw.map(mapSupabaseToStorefront);
        const seen = new Set(localProds.map((p) => p.slug || p.id));
        return [...localProds, ...defaultProducts.filter((p) => !seen.has(p.slug) && !seen.has(p.id))];
      }
    } catch {}
    return defaultProducts;
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeModalReel, setActiveModalReel] = useState<Reel | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [shopCategory, setShopCategory] = useState<string>("All Pieces");

  // Cart & Wishlist State with LocalStorage Persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getInitialCart(defaultProducts));
  const [wishlist, setWishlist] = useState<Product[]>(() => getInitialWishlist(defaultProducts));
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<SheAuraUser | null>(() => getCurrentUser());
  useEffect(() => {
    const unsub = onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }, []);

  // Sync cart items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sheaura_cart_v2", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Sync wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sheaura_wishlist_v2", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const addToCart = useCallback((product: Product, quantity = 1, shade?: string, tone?: string) => {
    const selectedShade = shade || product.name.split(" ").slice(0, 2).join(" ");
    const selectedTone = tone || product.tone || "#a81920";
    const itemId = `${product.id || product.slug || product.name}-${selectedShade}`;
    const priceNum = parseProductPrice(product);

    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          product,
          quantity,
          selectedShade,
          selectedTone,
          priceNum,
        },
      ];
    });
    setIsCartDrawerOpen(true);
    showToast(`✓ Added ${product.name} to your Haute Bag`);
  }, [showToast]);

  const updateCartQuantity = useCallback((id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    showToast("Removed piece from bag");
  }, [showToast]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    const key = product.id || product.slug || product.name;
    setWishlist((prev) => {
      const exists = prev.some((p) => (p.id || p.slug || p.name) === key);
      if (exists) {
        showToast(`Removed ${product.name} from Wishlist`);
        return prev.filter((p) => (p.id || p.slug || p.name) !== key);
      } else {
        showToast(`✓ Saved ${product.name} to Wishlist Sanctuary`);
        return [...prev, product];
      }
    });
  }, [showToast]);

  const isInWishlist = useCallback((productIdOrSlug: string) => {
    return wishlist.some((p) => (p.id || p.slug || p.name) === productIdOrSlug);
  }, [wishlist]);

  const moveCartItemToWishlist = useCallback((item: CartItem) => {
    removeFromCart(item.id);
    toggleWishlist(item.product);
  }, [removeFromCart, toggleWishlist]);

  const moveAllWishlistToCart = useCallback(() => {
    wishlist.forEach((p) => {
      addToCart(p, 1);
    });
    setIsCartDrawerOpen(true);
  }, [wishlist, addToCart]);

  useEffect(() => {
    let mounted = true;
    const fetchCatalog = () => {
      loadStorefrontCatalog().then((items) => {
        if (mounted && items && items.length > 0) {
          setCatalog(items);
        }
      });
    };
    fetchCatalog();

    window.addEventListener("sheaura:catalog-updated", fetchCatalog);
    window.addEventListener("focus", fetchCatalog);
    return () => {
      mounted = false;
      window.removeEventListener("sheaura:catalog-updated", fetchCatalog);
      window.removeEventListener("focus", fetchCatalog);
    };
  }, []);

  if (currentView === "admin") {
    return (
      <Suspense
        fallback={
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#fcf9f5", color: "#361a12", fontFamily: "Cormorant Garamond, serif", fontSize: "22px" }}>
            Loading She’Aura Studio Console...
          </div>
        }
      >
        <AdminView
          onBack={() => navigateTo("storefront")}
          reels={reels}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            navigateTo("storefront");
          }}
        />
      </Suspense>
    );
  }

  if (currentView === "account") {
    return (
      <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#fcf9f5", color: "#361a12", fontFamily: "Cormorant Garamond, serif", fontSize: "22px" }}>Opening Account Sanctuary...</div>}>
        <AuthAccountView
          onBack={() => navigateTo("storefront")}
          onOpenAdmin={() => navigateTo("admin")}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            navigateTo("storefront");
          }}
          onAddToCart={(product) => addToCart(product, 1)}
          onOpenCart={() => navigateTo("cart")}
        />
      </Suspense>
    );
  }

  if (currentView === "runway") {
    return (
      <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#1c0d09", color: "#dfb895", fontFamily: "Cormorant Garamond, serif", fontSize: "22px" }}>Entering Runway Cinema...</div>}>
        <RunwayCinemaView
          reels={reels}
          catalog={catalog}
          onBack={() => navigateTo("storefront")}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            navigateTo("storefront");
          }}
          onAddBag={(product) => addToCart(product, 1)}
          cartCount={cartCount}
        />
      </Suspense>
    );
  }

  if (currentView === "cart") {
    return (
      <CartView
        cartItems={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onMoveToWishlist={moveCartItemToWishlist}
        onBackToStore={() => navigateTo("storefront")}
        onOpenWishlist={() => navigateTo("wishlist")}
        onOpenAccount={() => navigateTo("account")}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
          navigateTo("storefront");
        }}
        onClearCart={clearCart}
      />
    );
  }

  if (currentView === "wishlist") {
    return (
      <>
        <WishlistView
          wishlist={wishlist}
          onRemoveFromWishlist={(id) =>
            setWishlist((prev) => prev.filter((p) => (p.id || p.slug || p.name) !== id))
          }
          onAddToCart={(product) => addToCart(product, 1)}
          onMoveAllToCart={moveAllWishlistToCart}
          onBackToStore={() => navigateTo("storefront")}
          onOpenCart={() => navigateTo("cart")}
          onOpenAccount={() => navigateTo("account")}
          onOpenRunway={() => navigateTo("runway")}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            navigateTo("storefront");
          }}
          cartCount={cartCount}
        />
        <CartDrawer
          isOpen={isCartDrawerOpen}
          onClose={() => setIsCartDrawerOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onMoveToWishlist={moveCartItemToWishlist}
          onOpenFullCart={() => {
            setIsCartDrawerOpen(false);
            navigateTo("cart");
          }}
          onOpenCheckout={() => {
            setIsCartDrawerOpen(false);
            navigateTo("cart");
          }}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            setIsCartDrawerOpen(false);
          }}
        />
      </>
    );
  }

  if (selectedProduct) {
    return (
      <>
        {showIntro && <BrandIntro onComplete={() => setShowIntro(false)} />}
        <ProductPage
          product={selectedProduct}
          catalog={catalog}
          onBack={() => {
            setSelectedProduct(null);
            setTimeout(() => document.getElementById("shop")?.scrollIntoView(), 0);
          }}
          onAdd={(qty, shade, tone) => addToCart(selectedProduct, qty, shade, tone)}
          onSelect={setSelectedProduct}
          onOpenReel={setActiveModalReel}
          onOpenAccount={() => navigateTo("account")}
          onOpenCart={() => setIsCartDrawerOpen(true)}
          onOpenWishlist={() => navigateTo("wishlist")}
          isWishlisted={isInWishlist(selectedProduct.id || selectedProduct.slug || selectedProduct.name)}
          onToggleWishlist={() => toggleWishlist(selectedProduct)}
          cartCount={cartCount}
          wishlistCount={wishlist.length}
        />
        {activeModalReel && (
          <ReelViewerModal
            reel={activeModalReel}
            onClose={() => setActiveModalReel(null)}
            onSelectProduct={setSelectedProduct}
            onAddBag={(matchedProduct) => addToCart(matchedProduct, 1)}
            reels={reels}
            onSwitchReel={setActiveModalReel}
            catalog={catalog}
          />
        )}
        <CartDrawer
          isOpen={isCartDrawerOpen}
          onClose={() => setIsCartDrawerOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onMoveToWishlist={moveCartItemToWishlist}
          onOpenFullCart={() => {
            setIsCartDrawerOpen(false);
            navigateTo("cart");
          }}
          onOpenCheckout={() => {
            setIsCartDrawerOpen(false);
            navigateTo("cart");
          }}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            setIsCartDrawerOpen(false);
          }}
        />
      </>
    );
  }

  const featuredProduct =
    catalog.find((p) => p.slug === "scarlet-rose-lipstick") ??
    catalog.find((p) => /scarlet rose/i.test(p.name));

  return (
    <>
      {showIntro && <BrandIntro onComplete={() => setShowIntro(false)} />}
      <main className="storefront-main">
      <section className="hero hero-elevated-lipstick">
        <div className="hero-plain-backdrop" />

        <header className="nav shell">
           <a className="brand brand-animated" href="#" aria-label="SHE'AURA">
             <SheAuraLogo className="brand-logo-svg" height={30} />
           </a>
          <nav className={menuOpen ? "nav-links open" : "nav-links"}>
            <div className="mobile-nav-hub">
              <div
                className="mobile-hub-user-card"
                onClick={() => {
                  setMenuOpen(false);
                  navigateTo("account");
                }}
              >
                <div className="mobile-hub-avatar">
                  {currentUser ? (
                    <span className="mobile-hub-initials">
                      {currentUser.fullName.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <Icon name="user" />
                  )}
                </div>
                <div className="mobile-hub-info">
                  <span className="mobile-hub-name">
                    {currentUser ? currentUser.fullName : "Maison Member"}
                  </span>
                  <span className="mobile-hub-status">
                    {currentUser ? "Aura Beauty Passport Active" : "Sign In / Join Maison"}
                  </span>
                </div>
                <Icon name="arrow" />
              </div>

              <div className="mobile-hub-actions-row">
                <button
                  type="button"
                  className="mobile-hub-btn mobile-hub-cart-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsCartDrawerOpen(true);
                  }}
                >
                  <div className="mobile-hub-btn-icon">
                    <Icon name="bag" />
                    {cartCount > 0 && <span className="mobile-hub-badge">{cartCount}</span>}
                  </div>
                  <div className="mobile-hub-btn-label">
                    <strong>Haute Bag</strong>
                    <span>{cartCount} {cartCount === 1 ? "Piece" : "Pieces"}</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="mobile-hub-btn mobile-hub-wishlist-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    navigateTo("wishlist");
                  }}
                >
                  <div className="mobile-hub-btn-icon">
                    <Icon name="heart" />
                    {wishlist.length > 0 && <span className="mobile-hub-badge">{wishlist.length}</span>}
                  </div>
                  <div className="mobile-hub-btn-label">
                    <strong>Wishlist</strong>
                    <span>{wishlist.length} Saved</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="mobile-nav-categories">
              {["Shop", "Collections", "Skincare", "Makeup", "About", "Journal"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item}</span>
                  <Icon name="arrow" />
                </a>
              ))}
            </div>
          </nav>
          <div className="nav-actions">
            <button aria-label="Search"><Icon name="search" /></button>
            <button
              type="button"
              aria-label="Wishlist Sanctuary"
              onClick={() => navigateTo("wishlist")}
              className="wishlist-nav-btn"
              title={`Wishlist Sanctuary (${wishlist.length})`}
            >
              <Icon name="heart" />
              {wishlist.length > 0 && <span className="wishlist-badge">{wishlist.length}</span>}
            </button>
            <button
              aria-label="Account"
              onClick={() => navigateTo("account")}
              className={`account-nav-btn ${currentUser ? "is-logged" : ""}`}
              title={currentUser ? `Maison Member: ${currentUser.fullName}` : "Member Account / Sign In"}
            >
              {currentUser ? (
                <span className="account-nav-initials">
                  {currentUser.fullName.slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <Icon name="user" />
              )}
            </button>
            <button
              type="button"
              aria-label="Shopping bag"
              className="bag"
              onClick={() => setIsCartDrawerOpen(true)}
              title={`Shopping Bag (${cartCount})`}
            >
              <Icon name="bag" />
              <span>{cartCount}</span>
            </button>
            <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><i /><i /></button>
          </div>
        </header>

        {/* Elevated Lipstick Showcase Stage */}
        <div className="hero-content shell hero-split-stage">
          {/* Left Column: Editorial Copy & Purchase Action */}
          <div className="hero-copy-column">
            <div className="hero-eyebrow-badge">
              <span className="hero-badge-dot" />
              <span>Maison Icon · Bare Lip Sensorial Glide</span>
            </div>
            <h1 className="hero-headline">
              A Ritual<br />Beyond<br />Beauty.
            </h1>
            <p className="hero-copy">
              Sculpted botanical colour with 16h sensory comfort. Enriched with cold-pressed Damask Rose wax and micronized mineral pigments for an unmistakable signature glide.
            </p>

            <div className="hero-specs-row">
              <div className="hero-spec-chip">
                <span className="chip-swatch" style={{ background: "#a81920" }} />
                <span>Scarlet Rose</span>
              </div>
              <div className="hero-spec-chip">
                <span>Hydrating Matte</span>
              </div>
              <div className="hero-spec-chip">
                <span>Min 8H Wear</span>
              </div>
              <div className="hero-spec-chip">
                <span>100% Vegan</span>
              </div>
            </div>

            <div className="hero-actions-group">
              <button
                type="button"
                className="hero-primary-shop-btn"
                onClick={() => {
                  if (featuredProduct) {
                    setSelectedProduct(featuredProduct);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }
                }}
              >
                <span>Shop Scarlet Rose · ₹1,099.00</span>
                <Icon name="arrow" />
              </button>
              <a href="#collections" className="hero-secondary-explore-btn">
                <span>Explore Collections</span>
              </a>
            </div>
          </div>

          {/* Right Column: Hero Elevated Lipstick Showcase */}
          <div className="hero-lipstick-stage">
            <div className="lipstick-halo-glow" />
            <div
              className="lipstick-pedestal-card"
              onClick={() => {
                if (featuredProduct) {
                  setSelectedProduct(featuredProduct);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }
              }}
              title="Click to view Scarlet Rose Lipstick"
            >
              <img
                src={resolveAsset("/products/Minimal_design/Scarlet Rose Lipstick_still.png")}
                alt="She'Aura Scarlet Rose Lipstick elevated on travertine pedestal"
                className="hero-elevated-photo"
              />
              <div className="hero-floating-shimmer-tag">
                <span className="shimmer-dot" />
                <div className="shimmer-text">
                  <strong>Scarlet Rose Lipstick</strong>
                  <span>Hand-Embossed Floral Bullet · Gold Brass Casing</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-note">
          <span>Scroll to explore</span>
          <span className="scroll-bar-indicator" />
        </div>
      </section>

      <section className="categories" id="collections">
        {[
          { name: "Lipsticks", image: photos.lipstick, cat: "Lipsticks" },
          { name: "Blushes", image: photos.blushStill, cat: "Blushes" },
          { name: "Body Highlighter Oil", image: photos.highlighterBotanical, cat: "Body Highlighter Oil" },
          { name: "Foundation", image: photos.foundation, cat: "Foundation" },
        ].map(({ name, image, cat }) => (
          <a
            className="category category-photo"
            href="#shop"
            key={name}
            onClick={() => setShopCategory(cat)}
          >
            <img className="category-foreground" src={image} alt={name} />
            <div className="category-overlay" />
            <div><h3>{name}</h3><span>Explore {name} <Icon name="arrow" /></span></div>
          </a>
        ))}
      </section>

      <section className="manifesto" id="about">
        <div className="manifesto-image"><img src={photos.blushPortrait} alt="SHE’AURA Pink Blossom campaign portrait" /></div>
        <div className="manifesto-copy">
          <div>
            <p className="eyebrow dark">Our philosophy</p>
            <h2>More<br />Than Beauty.</h2>
            <p>We create high-performance formulas that celebrate your individuality — expressive colour, conscious ingredients, and skin that still feels like you.</p>
            <ArrowLink>Our story</ArrowLink>
          </div>
          <div className="image-pair">
            <img src={photos.blushStill} alt="Pink Blossom Blush keepsake compact" />
            <img src={photos.highlighterBotanical} alt="Molten Glow Highlighter botanical still" />
          </div>
          <div className="values">
            {[["leaf", "Cruelty Free"], ["drop", "Vegan Formulas"], ["sparkle", "Paraben Free"], ["leaf", "Skin Safe"]].map(([icon, label]) => (
              <div key={label}><Icon name={icon as IconName} /><span>{label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="shop shell" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">The complete luxury collection</p>
            <h2>The SHE’AURA Wardrobe.</h2>
            <p>{catalog.length} signature pieces. Botanical-rich formulas. Made to be worn your way.</p>
          </div>
          <button
            type="button"
            className="shop-all-pill-btn"
            onClick={() => setShopCategory("All Pieces")}
          >
            <span>View All ({catalog.length})</span>
            <Icon name="arrow" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="shop-category-bar" role="tablist" aria-label="Product categories">
          {[
            { label: "All Pieces", count: catalog.length },
            { label: "Lipsticks", count: catalog.filter((p) => normalizeCategory(p.category) === "Lipsticks").length },
            { label: "Blushes", count: catalog.filter((p) => normalizeCategory(p.category) === "Blushes").length },
            { label: "Body Highlighter Oil", count: catalog.filter((p) => normalizeCategory(p.category) === "Body Highlighter Oil").length },
            { label: "Foundation", count: catalog.filter((p) => normalizeCategory(p.category) === "Foundation").length },
            { label: "Wardrobe Collection", count: catalog.filter((p) => normalizeCategory(p.category) === "Collection").length },
          ].map((cat) => {
            const isSelected =
              shopCategory === cat.label ||
              (cat.label === "All Pieces" && (shopCategory === "All Pieces" || !shopCategory)) ||
              (cat.label !== "All Pieces" && normalizeCategory(shopCategory) === normalizeCategory(cat.label));

            return (
              <button
                key={cat.label}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`shop-category-pill ${isSelected ? "active" : ""}`}
                onClick={() => setShopCategory(cat.label)}
              >
                <span>{cat.label}</span>
                <span className="pill-count">{cat.count}</span>
              </button>
            );
          })}
        </div>

        <div className="product-grid">
          {(shopCategory === "All Pieces" || !shopCategory
            ? catalog
            : catalog.filter((p) => normalizeCategory(p.category) === normalizeCategory(shopCategory))
          ).map((product) => {
            const key = product.id || product.slug || product.name;
            const wishlisted = isInWishlist(key);
            return (
              <article
                className="product-card"
                key={key}
                onClick={() => {
                  setSelectedProduct(product);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <div
                  className={`product-image product-image-${(product.category || "lip-colour")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {product.tag && <span className="tag">{product.tag}</span>}
                  <img className="product-photo" src={product.image} alt={product.name} loading="lazy" />

                  {/* Luxury Wishlist Heart Toggle Button */}
                  <button
                    type="button"
                    className={`card-wishlist-btn ${wishlisted ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product);
                    }}
                    title={wishlisted ? "Remove from Wishlist" : "Save to Wishlist Sanctuary"}
                    aria-label="Wishlist"
                  >
                    <Icon name="heart" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, 1);
                    }}
                    aria-label={`Add ${product.name} to bag`}
                    title="Add to Haute Bag"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="quick-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    View piece
                  </button>
                </div>
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <div className="product-meta">
                  <p>{product.price}</p>
                  <span>{product.note}</span>
                </div>
                <div className="swatches">
                  {product.shades && product.shades.length > 0 ? (
                    product.shades.map((s) => (
                      <i
                        key={s.name}
                        style={{ background: s.tone }}
                        title={s.name}
                        className={s.slug === product.slug ? "active-swatch" : ""}
                      />
                    ))
                  ) : (
                    <i style={{ background: product.tone }} />
                  )}
                  <span>
                    {product.shades && product.shades.length > 1
                      ? `${product.shades.length} shades available`
                      : product.finish || "Signature formula"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ReelsSection
        catalog={catalog}
        onSelectProduct={setSelectedProduct}
        onAddBag={(prod) => addToCart(prod || catalog[0], 1)}
        onOpenReel={setActiveModalReel}
        onOpenRunway={() => navigateTo("runway")}
      />

      <section className="ingredient-wardrobe">
        <div className="ingredient-intro">
          <p className="eyebrow">Inside the formula</p>
          <h2>Ingredients,<br /><i>styled.</i></h2>
          <p>Beauty should look extraordinary and feel considered. Every hero ingredient is chosen for the way it wears, cares, and performs.</p>
          <span className="vertical-note">Traceable · Skin-loving · Intentional</span>
        </div>
        <div className="ingredient-stage">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <img className="ingredient-product" src={photos.scarletBotanical} alt="Scarlet Rose Lipstick botanical campaign" />
          <div className="ingredient-token token-rose">
            <img src={photos.floral} alt="" />
            <span><b>01</b> Botanical waxes</span>
            <p>Comforting glide</p>
          </div>
          <div className="ingredient-token token-vitamin">
            <span className="vitamin-symbol">E</span>
            <span><b>02</b> Antioxidant care</span>
            <p>Antioxidant care</p>
          </div>
          <div className="ingredient-token token-oil">
            <span className="oil-drop" />
            <span><b>03</b> Conditioning oils</span>
            <p>Weightless moisture</p>
          </div>
          <div className="formula-stamp"><Icon name="leaf" /><span>Conscious<br />colour</span></div>
        </div>
      </section>

      <section className="ingredients">
        <img src={photos.ingredients} alt="Dark botanical ingredients and amber glass" />
        <div className="ingredients-shade" />
        <div className="ingredients-copy">
          <p className="eyebrow">Science meets nature</p>
          <h2>Ingredients<br />with Intention.</h2>
          <p>Botanicals, actives and advanced formulations come together to give you real, visible results.</p>
          <ArrowLink light>Discover ingredients</ArrowLink>
        </div>
        <div className="ingredient-list">
          <span>Botanical emollients</span><span>Antioxidant support</span><span>Considered pigments</span><span>Conditioning oils</span>
        </div>
      </section>

      <section className="formulas">
        <div className="formula-copy">
          <p className="eyebrow dark">Why SHE’AURA</p>
          <h2>Thoughtful<br />Formulas.<br />Real Results.</h2>
          <p>Every product is designed to fit into your life — with textures you love, results you can see, and an essential experience that stays with you.</p>
          <ArrowLink>Our process</ArrowLink>
        </div>
        <div className="formula-visual">
          <img src={photos.makeup} alt="SHE’AURA luxury beauty collection" />
          <div className="formula-points">
            <div><b>01</b><span>Sensory<br />textures</span></div>
            <div><b>02</b><span>Skin-loving<br />ingredients</span></div>
            <div><b>03</b><span>Visible<br />results</span></div>
          </div>
        </div>
      </section>

      <section className="journal shell" id="journal">
        <div className="section-heading compact">
          <div><p className="eyebrow dark">The SHE’AURA journal</p><h2>Stories, Rituals and More.</h2></div>
          <ArrowLink>Explore all</ArrowLink>
        </div>
        <div className="journal-grid">
          {[
            ["The Scarlet Statement", photos.scarletPortrait, "The Look"],
            ["The Art of Golden Hour", photos.highlighterPortrait, "Beauty"],
            ["Pink Blossom, In Full Bloom", photos.blushStill, "Campaign"],
          ].map(([title, image, tag]) => (
            <article key={title}><img src={image} alt="" /><span>{tag}</span><h3>{title}</h3><ArrowLink>Read more</ArrowLink></article>
          ))}
        </div>
      </section>

      <CommunityStrip />

      <section className="closing">
        <img src={photos.highlighterBotanical} alt="SHE’AURA Molten Glow Highlighter minimal still" />
        <div><h2>A More Radiant<br />You, Every Day.</h2><ArrowLink>Shop now</ArrowLink></div>
      </section>

      <footer>
        <div className="footer-main shell">
          <a className="brand footer-brand" href="#" aria-label="SHE'AURA">
            <SheAuraLogo className="brand-logo-svg" height={26} fill="white" />
          </a>
          <div className="footer-links">
            <div><b>Shop</b><a href="#shop">Makeup</a><a href="#shop">Skincare</a><a href="#shop">Body Care</a></div>
            <div><b>About</b><a href="#about">Our Story</a><a href="#journal">Journal</a><a href="#">Sustainability</a></div>
            <div>
              <b>Maison & Staff</b>
              <button type="button" className="footer-action-link" onClick={() => navigateTo("account")}>Member Login</button>
              <button type="button" className="footer-action-link" onClick={() => navigateTo("admin")}>Admin Studio</button>
              <a href="#">Concierge</a>
            </div>
          </div>
          <div className="newsletter"><h3>Join Our Circle</h3><p>Our edit of beauty, new launches and more.</p><div><input type="email" placeholder="Your email" aria-label="Your email" /><button aria-label="Subscribe"><Icon name="arrow" /></button></div></div>
        </div>
        <div className="footer-bottom shell"><span>© 2025 SHE’AURA. All rights reserved.</span><div><a href="#">Privacy</a><a href="#">Terms</a><Icon name="instagram" /></div></div>
      </footer>

      {activeModalReel && (
        <ReelViewerModal
          reel={activeModalReel}
          onClose={() => setActiveModalReel(null)}
          onSelectProduct={setSelectedProduct}
          onAddBag={(matchedProduct) => addToCart(matchedProduct, 1)}
          reels={reels}
          onSwitchReel={setActiveModalReel}
          catalog={catalog}
        />
      )}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onMoveToWishlist={moveCartItemToWishlist}
        onOpenFullCart={() => {
          setIsCartDrawerOpen(false);
          navigateTo("cart");
        }}
        onOpenCheckout={() => {
          setIsCartDrawerOpen(false);
          navigateTo("cart");
        }}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
          setIsCartDrawerOpen(false);
        }}
      />
      <MobileBottomBar
        onOpenStore={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenWishlist={() => navigateTo("wishlist")}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        onOpenAccount={() => navigateTo("account")}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        currentUser={currentUser}
        hidden={Boolean(activeModalReel || isCartDrawerOpen)}
      />
      {toastMessage && (
        <div className="storefront-toast-pill">
          <span>{toastMessage}</span>
        </div>
      )}
      </main>
    </>
  );
}
