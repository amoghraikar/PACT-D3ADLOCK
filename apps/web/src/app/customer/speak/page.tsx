"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, StatusPill, Toast, MoneyText, Stepper } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { FALLBACK_PRODUCTS, Product, Variant } from "@/lib/catalogue-data";
import {
  Sparkles,
  Check,
  ArrowRight,
  Volume2,
  Mic,
  MicOff,
  AlertTriangle,
  ShoppingCart,
  Trash2,
  Package,
  Globe,
  Radio,
} from "lucide-react";
import Image from "next/image";

interface ParsedItem {
  id: string;
  product_id: string;
  variant_id: string;
  name: string;
  brand: string;
  variant_label: string;
  quantity: number;
  est_unit_price_paise: number;
  mrp_paise: number;
  image_url: string;
}

const SAMPLE_COMMANDS = [
  "I want 2 packets of milk, 5 kg atta, and 1 kg sugar, please add them",
  "give me 5 kg Sona Masoori Rice, 1 litre sunflower oil, and 1 kg toor dal",
  "add 2 packets milk, 1 packet tata salt, and 500g haldi powder",
  "please add 5 kg basmati rice and 1 kg dragon fruit", // contains unavailable item to demonstrate alert
];

// Conversational filler & noise words to completely ignore in the middle of speech
const FILLER_WORDS = new Set([
  "i", "want", "need", "please", "can", "you", "could", "add", "to", "cart",
  "give", "me", "also", "and", "then", "um", "uh", "like", "actually", "hey",
  "pact", "order", "put", "take", "bring", "for", "home", "fast", "today",
  "aur", "tatha", "bhai", "kripya", "chahiye", "kar", "do", "dena", "lagana",
  "dalna", "in", "my", "some", "the", "a", "an", "of", "listen", "item",
  "items", "grocery", "groceries", "bhi", "saath", "mein", "bhejo", "rakho",
]);

// Number words to digits
const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, an: 1, single: 1, ek: 1,
  two: 2, couple: 2, do: 2,
  three: 3, teen: 3,
  four: 4, chaar: 4,
  five: 5, paanch: 5,
  six: 6, chhah: 6,
  seven: 7, saat: 7,
  eight: 8, aath: 8,
  nine: 9, nau: 9,
  ten: 10, das: 10,
};

// Known unavailable/exotic items not carried in local community kirana
const UNAVAILABLE_ITEMS = [
  "dragon fruit", "avocado", "broccoli", "tofu", "strawberries", "kiwi",
  "quinoa", "olive oil", "muesli", "soya milk", "mushrooms", "mayonnaise",
  "kale", "chia seeds", "asparagus", "blueberry", "blueberries",
];

export default function CustomerSpeakPage() {
  const router = useRouter();
  const { updateQuantity } = useCart();

  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [selectedLang, setSelectedLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [micState, setMicState] = useState<"idle" | "listening" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [previewItems, setPreviewItems] = useState<ParsedItem[]>([]);
  const [notFoundItems, setNotFoundItems] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recognitionRef = useRef<any>(null);

  // Fetch central catalogue
  useEffect(() => {
    const loadProds = () => {
      fetch("/api/v1/catalogue/products", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.products && data.products.length > 0) {
            setProducts(data.products);
          }
        })
        .catch(() => {});
    };
    loadProds();
    const interval = setInterval(loadProds, 4000);
    return () => clearInterval(interval);
  }, []);

  // Natural Language Multi-Product Parser: ignores middle filler words and extracts all products at once
  const parseMultiProductSpeech = (rawText: string) => {
    if (!rawText.trim()) return;

    let text = rawText.toLowerCase();

    // 1. Replace word numbers with digits
    for (const [w, num] of Object.entries(NUMBER_WORDS)) {
      const regex = new RegExp(`\\b${w}\\b`, "g");
      text = text.replace(regex, num.toString());
    }

    // 2. Normalize units
    text = text
      .replace(/\b(kilograms|kilogram|kilos|kilo|kgs)\b/g, "kg")
      .replace(/\b(litres|litre|liters|liter|ltrs|ltr)\b/g, "l")
      .replace(/\b(packets|packet|pkts|pkt|pouches|pouch|bags|bag|bottles|bottle)\b/g, "pack")
      .replace(/\b(grams|gram|gms|gm)\b/g, "g")
      .replace(/\b(half|aadha)\b/g, "500 g");

    // 3. Check for genuine unavailable items
    const detectedUnavailable: string[] = [];
    for (const unavail of UNAVAILABLE_ITEMS) {
      if (text.includes(unavail)) {
        detectedUnavailable.push(unavail);
        text = text.replace(new RegExp(unavail, "g"), " ");
      }
    }

    // 4. Split speech stream into item candidate chunks based on separators and quantity transitions
    // Handles multi-product sentences: "2 packets milk, 5 kg atta, and 1 kg sugar" or "2 pack milk 5 kg atta 1 kg sugar"
    const segments = text.split(/(?:,|\band\b|\baur\b|\bplus\b|\btatha\b|\balso\b|\bthen\b)/);

    // Further split if multiple numbers and products were spoken without conjunctions
    const chunks: string[] = [];
    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      // If segment contains multiple quantity indicators like "2 pack milk 5 kg atta"
      const subParts = trimmed.split(/(?=\b\d+\s*(?:kg|l|g|pack)?\b)/);
      if (subParts.length > 1) {
        for (const sp of subParts) {
          if (sp.trim()) chunks.push(sp.trim());
        }
      } else {
        chunks.push(trimmed);
      }
    }

    const matched: ParsedItem[] = [];

    // Keyword mapping for Indian staples
    const PRODUCT_KEYWORDS: { keywords: string[]; prodMatch: (p: Product) => boolean }[] = [
      {
        keywords: ["milk", "doodh", "nandini", "amul milk"],
        prodMatch: (p) => p.name.toLowerCase().includes("milk") || p.id.includes("milk"),
      },
      {
        keywords: ["atta", "wheat flour", "aashirvaad", "chakki", "gehun"],
        prodMatch: (p) => p.name.toLowerCase().includes("atta") || p.name.toLowerCase().includes("wheat"),
      },
      {
        keywords: ["sona masoori", "sonamasoori", "rice", "chawal", "sona masuri"],
        prodMatch: (p) => p.name.toLowerCase().includes("sona masoori") || (p.name.toLowerCase().includes("rice") && !p.name.toLowerCase().includes("basmati")),
      },
      {
        keywords: ["basmati", "biryani rice", "daawat", "india gate"],
        prodMatch: (p) => p.name.toLowerCase().includes("basmati"),
      },
      {
        keywords: ["sugar", "cheeni", "shakkar", "madhur"],
        prodMatch: (p) => p.name.toLowerCase().includes("sugar"),
      },
      {
        keywords: ["sunflower oil", "sunpure", "cooking oil", "sunflower", "oil", "tel"],
        prodMatch: (p) => p.name.toLowerCase().includes("sunflower") || p.name.toLowerCase().includes("oil"),
      },
      {
        keywords: ["toor dal", "tur dal", "arhar dal", "tuvar", "toor", "tur"],
        prodMatch: (p) => p.name.toLowerCase().includes("toor") || p.name.toLowerCase().includes("tur"),
      },
      {
        keywords: ["moong dal", "mung dal", "moong"],
        prodMatch: (p) => p.name.toLowerCase().includes("moong"),
      },
      {
        keywords: ["chana dal", "chana"],
        prodMatch: (p) => p.name.toLowerCase().includes("chana"),
      },
      {
        keywords: ["salt", "namak", "tata salt"],
        prodMatch: (p) => p.name.toLowerCase().includes("salt"),
      },
      {
        keywords: ["turmeric", "haldi"],
        prodMatch: (p) => p.name.toLowerCase().includes("turmeric") || p.name.toLowerCase().includes("haldi"),
      },
      {
        keywords: ["chilli powder", "mirch", "lal mirch", "chili"],
        prodMatch: (p) => p.name.toLowerCase().includes("chilli"),
      },
      {
        keywords: ["coriander powder", "dhaniya"],
        prodMatch: (p) => p.name.toLowerCase().includes("coriander"),
      },
      {
        keywords: ["tea", "chai", "tea powder", "tata tea", "red label"],
        prodMatch: (p) => p.name.toLowerCase().includes("tea"),
      },
      {
        keywords: ["ghee", "amul ghee", "cow ghee", "desi ghee"],
        prodMatch: (p) => p.name.toLowerCase().includes("ghee"),
      },
      {
        keywords: ["curd", "dahi"],
        prodMatch: (p) => p.name.toLowerCase().includes("curd") || p.name.toLowerCase().includes("dahi"),
      },
      {
        keywords: ["paneer", "cottage cheese"],
        prodMatch: (p) => p.name.toLowerCase().includes("paneer"),
      },
      {
        keywords: ["poha", "aval", "flattened rice"],
        prodMatch: (p) => p.name.toLowerCase().includes("poha"),
      },
      {
        keywords: ["coffee", "bru", "nescafe"],
        prodMatch: (p) => p.name.toLowerCase().includes("coffee"),
      },
    ];

    for (const chunk of chunks) {
      // Filter out words that are fillers
      const words = chunk.split(/\s+/).filter((w) => !FILLER_WORDS.has(w));
      const cleanedChunk = words.join(" ");

      if (!cleanedChunk) continue;

      // Extract quantity: default 1
      let quantity = 1;
      const numMatch = cleanedChunk.match(/\b(\d+)\b/);
      if (numMatch) {
        quantity = parseInt(numMatch[1], 10) || 1;
      }

      // Find matching product
      let matchedProd: Product | null = null;
      let matchedVariant: Variant | null = null;

      for (const mapping of PRODUCT_KEYWORDS) {
        const hasKeyword = mapping.keywords.some((k) => cleanedChunk.includes(k));
        if (hasKeyword) {
          const prod = products.find(mapping.prodMatch) || products.find((p) => mapping.keywords.some((k) => p.name.toLowerCase().includes(k)));
          if (prod) {
            matchedProd = prod;
            break;
          }
        }
      }

      // If not found in mapping, search directly in products name and variants
      if (!matchedProd) {
        for (const prod of products) {
          const pName = prod.name.toLowerCase();
          const pBrand = prod.brand.toLowerCase();
          const terms = pName.split(" ").concat(pBrand.split(" "));
          if (terms.some((t) => t.length > 2 && cleanedChunk.includes(t))) {
            matchedProd = prod;
            break;
          }
        }
      }

      if (matchedProd && matchedProd.variants && matchedProd.variants.length > 0) {
        // Find best variant according to size mentioned
        if (cleanedChunk.includes("10 kg") || cleanedChunk.includes("10kg")) {
          matchedVariant = matchedProd.variants.find((v) => v.label.includes("10 kg")) || matchedProd.variants[0];
        } else if (cleanedChunk.includes("5 kg") || cleanedChunk.includes("5kg") || cleanedChunk.includes("5 l") || cleanedChunk.includes("5l")) {
          matchedVariant = matchedProd.variants.find((v) => v.label.includes("5 kg") || v.label.includes("5 L")) || matchedProd.variants[0];
        } else if (cleanedChunk.includes("500") || cleanedChunk.includes("half")) {
          matchedVariant = matchedProd.variants.find((v) => v.label.includes("500")) || matchedProd.variants[0];
        } else if (cleanedChunk.includes("1 kg") || cleanedChunk.includes("1kg") || cleanedChunk.includes("1 l") || cleanedChunk.includes("1l") || cleanedChunk.includes("1 pack")) {
          matchedVariant = matchedProd.variants.find((v) => v.label.includes("1 kg") || v.label.includes("1 L")) || matchedProd.variants[0];
        } else {
          matchedVariant = matchedProd.variants[0];
        }

        // Add or update quantity in matched list
        const existing = matched.find((m) => m.variant_id === matchedVariant!.id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          matched.push({
            id: `preview-${matchedVariant.id}-${Date.now()}-${Math.random()}`,
            product_id: matchedProd.id,
            variant_id: matchedVariant.id,
            name: matchedProd.name,
            brand: matchedProd.brand,
            variant_label: matchedVariant.label,
            quantity: quantity,
            est_unit_price_paise: matchedVariant.selling_price_paise || matchedProd.est_unit_price_paise || 20000,
            mrp_paise: matchedVariant.mrp_paise || matchedProd.mrp_paise || 24000,
            image_url: matchedProd.image_url || "/brand/pact-mark.png",
          });
        }
      } else {
        // Check if user spoke a non-filler unmatched item
        const remainingClean = cleanedChunk
          .replace(/\b\d+\s*(?:kg|l|g|pack)?\b/g, "")
          .trim();
        if (
          remainingClean.length > 2 &&
          !FILLER_WORDS.has(remainingClean) &&
          !detectedUnavailable.includes(remainingClean) &&
          !remainingClean.includes("order") &&
          !remainingClean.includes("november")
        ) {
          detectedUnavailable.push(remainingClean);
        }
      }
    }

    setPreviewItems(matched);
    setNotFoundItems(Array.from(new Set(detectedUnavailable)));
  };

  // Real Web Speech API with explicit English (India) / Hindi language selection
  const handleToggleMic = () => {
    if (micState === "listening") {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setMicState("idle");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Browser fallback simulation
      setMicState("listening");
      const defaultSample = "2 packets milk, 5 kg atta, and 1 kg sugar";
      setTranscript(defaultSample);
      setTimeout(() => {
        setMicState("idle");
        parseMultiProductSpeech(defaultSample);
      }, 1400);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Language configured specifically for Indian English pronunciations & vernacular grocery terms
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setMicState("listening");
        setNotFoundItems([]);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
        const clean = currentTranscript.trim();
        setTranscript(clean);
        parseMultiProductSpeech(clean);
      };

      recognition.onerror = () => {
        setMicState("error");
      };

      recognition.onend = () => {
        setMicState("idle");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setMicState("error");
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Quick Sample Phrases Handler
  const handleSelectSample = (sampleText: string) => {
    setTranscript(sampleText);
    parseMultiProductSpeech(sampleText);
  };

  // Stepper handlers for preview items
  const handleUpdatePreviewQty = (variantId: string, newQty: number) => {
    if (newQty <= 0) {
      setPreviewItems((prev) => prev.filter((item) => item.variant_id !== variantId));
    } else {
      setPreviewItems((prev) =>
        prev.map((item) => (item.variant_id === variantId ? { ...item, quantity: newQty } : item))
      );
    }
  };

  // Add all previewed items to the user cart
  const handleConfirmAndAddToCart = async () => {
    if (previewItems.length === 0) return;

    startTransition(async () => {
      for (const item of previewItems) {
        await updateQuantity(item.variant_id, item.quantity, {
          name: item.name,
          brand: item.brand,
          variant_label: item.variant_label,
          est_unit_price_paise: item.est_unit_price_paise,
          mrp_paise: item.mrp_paise,
        });
      }
      setToastMessage(`Added ${previewItems.length} items to your Cart!`);
      setTimeout(() => {
        router.push("/customer/list");
      }, 500);
    });
  };

  const totalEstPaise = previewItems.reduce(
    (sum, item) => sum + item.est_unit_price_paise * item.quantity,
    0
  );
  const totalMrpPaise = previewItems.reduce(
    (sum, item) => sum + item.mrp_paise * item.quantity,
    0
  );

  return (
    <CustomerLayout>
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Header with Language Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800 truncate">
              Voice Grocery Assistant
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-1">
              Speak multiple products at once. PACT recognizes Indian staples, ignores conversational filler words, and adds them to your cart.
            </p>
          </div>

          {/* Language Selector: English (India) vs Hindi */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-ice-300 rounded-ctl shrink-0 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-teal-700 ml-1.5" />
            <button
              type="button"
              onClick={() => setSelectedLang("en-IN")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-ctl transition-colors cursor-pointer ${
                selectedLang === "en-IN"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-ink-600 hover:text-ink-800"
              }`}
            >
              English (India)
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang("hi-IN")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-ctl transition-colors cursor-pointer ${
                selectedLang === "hi-IN"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-ink-600 hover:text-ink-800"
              }`}
            >
              Hindi (हिन्दी)
            </button>
          </div>
        </div>

        {/* Large Prominent Microphone Hero Card */}
        <Card className="flex flex-col items-center justify-center p-6 sm:p-10 space-y-6 text-center bg-white border-ice-200 shadow-sm relative overflow-hidden w-full">
          {/* Pulsing ring indicator when listening */}
          {micState === "listening" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-48 h-48 rounded-full bg-teal-100 animate-ping opacity-60" />
            </div>
          )}

          {/* Large, Prominent Mic Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 cursor-pointer relative z-10 shadow-lg ${
              micState === "listening"
                ? "bg-danger-600 text-white ring-8 ring-danger-200 animate-pulse"
                : micState === "error"
                ? "bg-warning-600 text-white ring-8 ring-warning-200"
                : "bg-teal-700 hover:bg-teal-800 text-white ring-8 ring-teal-100"
            }`}
            title={micState === "listening" ? "Click to stop listening" : "Click to speak multiple groceries"}
          >
            {micState === "listening" ? (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-bold uppercase mt-1 tracking-wider">Listening</span>
              </>
            ) : micState === "error" ? (
              <>
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-bold uppercase mt-1 tracking-wider">Retry</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-bold uppercase mt-1 tracking-wider">Tap to Speak</span>
              </>
            )}
          </button>

          <div className="space-y-1 relative z-10 max-w-md">
            <span className="text-base font-bold text-ink-800 block">
              {micState === "listening"
                ? "Listening... Speak all products and quantities now"
                : micState === "error"
                ? "Microphone access issue. Tap above to try again or click a sample phrase."
                : "Click the microphone and say multiple products at once"}
            </span>
            <p className="text-xs text-ink-500">
              For example: &ldquo;I want 2 packets of milk, 5 kg atta, and 1 kg sugar, please add them&rdquo;
            </p>
            <div className="pt-1">
              <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 inline-block">
                Configured: {selectedLang === "en-IN" ? "English (India) · en-IN" : "Hindi · hi-IN"}
              </span>
            </div>
          </div>
        </Card>

        {/* Live Speech Recognition Transcript */}
        {transcript && (
          <Card className="p-4 sm:p-5 space-y-2 bg-ice-50 border-ice-200 w-full">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-600 uppercase tracking-wider">
                Live Speech Recognition Transcript
              </span>
              <StatusPill
                kind={micState === "listening" ? "warning" : "success"}
                label={micState === "listening" ? "Streaming audio" : "Parsed"}
              />
            </div>
            <p className="font-mono text-sm text-ink-800 bg-white p-3 rounded-ctl border border-ice-200 break-words">
              &ldquo;{transcript}&rdquo;
            </p>
          </Card>
        )}

        {/* Store Availability Warning Banner */}
        {notFoundItems.length > 0 && (
          <Card className="p-4 bg-warning-50 border-warning-300 space-y-2 w-full">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-ink-800">
                  Item Not Found in Neighborhood Catalogue
                </h4>
                <p className="text-xs text-ink-700 leading-relaxed">
                  We could not find{" "}
                  <b className="text-warning-800">
                    &ldquo;{notFoundItems.join(", ")}&rdquo;
                  </b>{" "}
                  in Sri Lakshmi Stores. PACT supports everyday neighborhood staples (atta, rice, dal, oils, spices, milk, sugar, tea).
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* MULTI-PRODUCT ORDER PREVIEW CARD */}
        {previewItems.length > 0 && (
          <Card className="p-4 sm:p-6 space-y-4 bg-white border-teal-700 shadow-md w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ice-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-700" />
                <h3 className="font-display text-lg text-ink-800">
                  Voice Order Preview ({previewItems.length} products detected)
                </h3>
              </div>
              <span className="text-xs font-semibold text-teal-700">
                Review items before adding to cart
              </span>
            </div>

            {/* List of Detected Items with Steppers & Realistic Thumbnails */}
            <div className="divide-y divide-ice-100">
              {previewItems.map((item) => (
                <div
                  key={item.variant_id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-ctl overflow-hidden bg-ice-100 border border-ice-200 shrink-0 relative">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-ink-800 truncate">{item.name}</h4>
                      <p className="text-xs text-ink-500">
                        {item.brand} · <span className="font-semibold text-ink-700">{item.variant_label}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-ink-500 mt-0.5">
                        <span>Wholesale: <MoneyText paise={item.est_unit_price_paise} size="sm" /></span>
                        <span>·</span>
                        <span className="text-ink-400">MRP: ₹{Math.round(item.mrp_paise / 100)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <Stepper
                      value={item.quantity}
                      min={0}
                      max={20}
                      onChange={(newQty) => handleUpdatePreviewQty(item.variant_id, newQty)}
                    />
                    <div className="text-right min-w-[70px]">
                      <div className="font-bold text-xs sm:text-sm text-ink-800">
                        <MoneyText paise={item.est_unit_price_paise * item.quantity} size="sm" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdatePreviewQty(item.variant_id, 0)}
                      className="text-ink-400 hover:text-danger-600 p-1 rounded transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Estimated Subtotal & Confirm CTA */}
            <div className="border-t border-ice-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs text-ink-500 block">Estimated Wholesale Total</span>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-ink-800">
                  <MoneyText paise={totalEstPaise} />
                </div>
                <span className="text-[11px] text-teal-700 font-medium block">
                  Est. MRP: ₹{Math.round(totalMrpPaise / 100)} · You save ~₹{Math.round((totalMrpPaise - totalEstPaise) / 100)}
                </span>
              </div>

              <Button
                variant="primary"
                size="default"
                isLoading={isPending}
                icon={<ShoppingCart className="w-4 h-4" />}
                onClick={handleConfirmAndAddToCart}
              >
                Confirm & Add All ({previewItems.length}) to Cart
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Sample Phrases */}
        <div className="space-y-3 w-full">
          <h3 className="font-bold text-xs uppercase tracking-wider text-ink-500">
            Or Click a Multi-Product Example to Test
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SAMPLE_COMMANDS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="p-3 text-left bg-white hover:bg-ice-100 border border-ice-300 rounded-ctl text-xs text-ink-700 transition-colors flex items-center justify-between gap-2 group cursor-pointer shadow-2xs"
              >
                <span className="italic group-hover:text-teal-800 break-words">&ldquo;{sample}&rdquo;</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-400 group-hover:text-teal-700 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          isOpen={!!toastMessage}
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </CustomerLayout>
  );
}
