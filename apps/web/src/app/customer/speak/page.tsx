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
  "5 kg Sona Masoori Rice, 1 litre sunflower oil, and 1 kg toor dal",
  "10 kg wheat atta, 2 kg sugar, and 500g ghee",
  "1 kg moong dal, 200g turmeric powder, and 1 kg poha",
  "5 kg basmati rice and 1 kg dragon fruit", // contains an unavailable item to demonstrate notification
];

export default function CustomerSpeakPage() {
  const router = useRouter();
  const { updateQuantity } = useCart();

  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [micState, setMicState] = useState<"idle" | "listening" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [previewItems, setPreviewItems] = useState<ParsedItem[]>([]);
  const [notFoundItems, setNotFoundItems] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recognitionRef = useRef<any>(null);

  // Fetch central catalogue
  useEffect(() => {
    fetch("/api/v1/catalogue/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {});
  }, []);

  // Intelligent speech & text parser for grocery items
  const parseSpokenText = (text: string) => {
    if (!text.trim()) return;

    const lower = text.toLowerCase();
    const matched: ParsedItem[] = [];
    const notFound: string[] = [];

    // Check for common staples and synonyms
    const phrases = lower.split(/,|\band\b|\baur\b|\bplus\b|\btatha\b/);

    for (let phrase of phrases) {
      phrase = phrase.trim();
      if (!phrase) continue;

      // Extract quantity: numbers or words
      let qty = 1;
      const numMatch = phrase.match(/(\d+)/);
      if (numMatch) {
        qty = parseInt(numMatch[1], 10) || 1;
      } else if (/\btwo\b|\bdo\b/.test(phrase)) qty = 2;
      else if (/\bthree\b|\bteen\b/.test(phrase)) qty = 3;
      else if (/\bfour\b|\bchaar\b/.test(phrase)) qty = 4;
      else if (/\bfive\b|\bpaanch\b/.test(phrase)) qty = 5;
      else if (/\bten\b|\bdas\b/.test(phrase)) qty = 10;

      // Match against products
      let foundProd: Product | null = null;
      let foundVariant: Variant | null = null;

      for (const prod of products) {
        const prodName = prod.name.toLowerCase();
        const brand = prod.brand.toLowerCase();
        const words = prodName.split(" ").concat(brand.split(" "));

        const isMatch = words.some((w) => w.length > 2 && phrase.includes(w));
        if (isMatch) {
          foundProd = prod;
          // Prefer variant matching requested weight / pack
          if (phrase.includes("10 kg") || phrase.includes("10kg") || phrase.includes("10 kilo")) {
            foundVariant = prod.variants.find((v) => v.label.includes("10 kg")) || prod.variants[0];
          } else if (phrase.includes("5 kg") || phrase.includes("5kg") || phrase.includes("5 kilo") || phrase.includes("5 l") || phrase.includes("5l")) {
            foundVariant = prod.variants.find((v) => v.label.includes("5 kg") || v.label.includes("5 L")) || prod.variants[0];
          } else if (phrase.includes("500") || phrase.includes("half")) {
            foundVariant = prod.variants.find((v) => v.label.includes("500")) || prod.variants[0];
          } else if (phrase.includes("1 kg") || phrase.includes("1kg") || phrase.includes("1 litre") || phrase.includes("1 l") || phrase.includes("1l")) {
            foundVariant = prod.variants.find((v) => v.label.includes("1 kg") || v.label.includes("1 L")) || prod.variants[0];
          } else {
            foundVariant = prod.variants[0];
          }
          break;
        }
      }

      if (foundProd && foundVariant) {
        // Prevent duplicate variant in preview
        const existing = matched.find((m) => m.variant_id === foundVariant!.id);
        if (existing) {
          existing.quantity += qty;
        } else {
          matched.push({
            id: `preview-${foundVariant.id}-${Date.now()}-${Math.random()}`,
            product_id: foundProd.id,
            variant_id: foundVariant.id,
            name: foundProd.name,
            brand: foundProd.brand,
            variant_label: foundVariant.label,
            quantity: qty,
            est_unit_price_paise: foundVariant.selling_price_paise || foundProd.est_unit_price_paise || 20000,
            mrp_paise: foundVariant.mrp_paise || foundProd.mrp_paise || 24000,
            image_url: foundProd.image_url || "/brand/pact-mark.png",
          });
        }
      } else {
        // Check if user specifically requested an exotic/unavailable item
        const knownExotics = ["dragon fruit", "avocado", "muesli", "olive oil", "soya milk", "strawberries", "kiwi", "broccoli", "tofu", "quinoa"];
        for (const ex of knownExotics) {
          if (phrase.includes(ex)) {
            notFound.push(ex);
          }
        }
        if (!notFound.length && phrase.length > 3 && !phrase.includes("need") && !phrase.includes("want") && !phrase.includes("please")) {
          // generic unmatched phrase
          const cleanPhrase = phrase.replace(/^(i need|please add|i want|add)\s*/i, "").trim();
          if (cleanPhrase.length > 2 && !cleanPhrase.includes("november") && !cleanPhrase.includes("order")) {
            notFound.push(cleanPhrase);
          }
        }
      }
    }

    setPreviewItems(matched);
    setNotFoundItems(Array.from(new Set(notFound)));
  };

  // Real Web Speech API Handler
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
      // Fallback for browsers without Web Speech
      setMicState("listening");
      const defaultSample = "5 kg Sona Masoori Rice, 1 litre sunflower oil, 1 kg toor dal";
      setTranscript(defaultSample);
      setTimeout(() => {
        setMicState("idle");
        parseSpokenText(defaultSample);
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (India) with Hindi accents

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
        parseSpokenText(clean);
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
    parseSpokenText(sampleText);
  };

  // Add all previewed items to the actual user cart
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
      }, 600);
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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            Voice Grocery Assistant
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 mt-1">
            Dictate naturally in English or Hindi. PACT converts speech to standard grocery sizes and contributes to your building cart.
          </p>
        </div>

        {/* Largely Visible Microphone Hero Card */}
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 space-y-6 text-center bg-white border-ice-200 shadow-sm relative overflow-hidden">
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
            title={micState === "listening" ? "Click to stop listening" : "Click to speak your groceries"}
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
                ? "Listening... Speak your grocery items and quantities now"
                : micState === "error"
                ? "Microphone access issue. Tap above to try again or click a sample phrase."
                : "Click the microphone and say your order"}
            </span>
            <p className="text-xs text-ink-500">
              For example: &ldquo;5 kg sona masoori rice, 1 litre sunflower oil, and 2 kg atta&rdquo;
            </p>
          </div>
        </Card>

        {/* Live Speech Recognition Transcript */}
        {transcript && (
          <Card className="p-4 sm:p-5 space-y-2 bg-ice-50 border-ice-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-600 uppercase tracking-wider">
                Live Speech Recognition Transcript
              </span>
              <StatusPill
                kind={micState === "listening" ? "warning" : "success"}
                label={micState === "listening" ? "Streaming audio" : "Parsed"}
              />
            </div>
            <p className="font-mono text-sm text-ink-800 bg-white p-3 rounded-ctl border border-ice-200 italic">
              &ldquo;{transcript}&rdquo;
            </p>
          </Card>
        )}

        {/* Notification when item said does not exist in any store */}
        {notFoundItems.length > 0 && (
          <div className="p-4 rounded-card bg-warning-50 border border-warning-300 text-warning-900 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-warning-700 shrink-0" />
              <span>Items Not Found in Store Catalogue:</span>
            </div>
            <p className="text-xs text-warning-800 leading-relaxed">
              We couldn&apos;t find{" "}
              <b className="font-semibold text-warning-950">
                {notFoundItems.map((item) => `"${item}"`).join(", ")}
              </b>{" "}
              in your community kirana store. Only standard grocery staples in stock are available for pooling.
            </p>
          </div>
        )}

        {/* Preview of all items ordered through voice before processing further */}
        {previewItems.length > 0 ? (
          <Card className="p-6 space-y-5 bg-white border-ice-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-ice-100 pb-3">
              <div>
                <h3 className="font-display text-lg text-ink-800">
                  Voice Order Preview ({previewItems.length} items detected)
                </h3>
                <p className="text-xs text-ink-500">
                  Review and adjust quantities before confirming into your Cart.
                </p>
              </div>
              <StatusPill kind="success" label="Ready to Add" />
            </div>

            {/* Itemized Table */}
            <div className="divide-y divide-ice-100">
              {previewItems.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-ctl overflow-hidden bg-ice-100 shrink-0 relative border border-ice-200">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-ink-800 truncate">{item.name}</h4>
                      <p className="text-xs text-ink-500">
                        {item.brand} · {item.variant_label}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5 text-xs">
                        <span className="font-semibold text-teal-700">
                          ₹{Math.round(item.est_unit_price_paise / 100)}
                        </span>
                        <span className="line-through text-ink-400 text-[11px]">
                          ₹{Math.round(item.mrp_paise / 100)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper and Line Total */}
                  <div className="flex items-center gap-4 shrink-0">
                    <Stepper
                      value={item.quantity}
                      onChange={(q) => {
                        if (q === 0) {
                          setPreviewItems((prev) => prev.filter((p) => p.id !== item.id));
                        } else {
                          setPreviewItems((prev) =>
                            prev.map((p) => (p.id === item.id ? { ...p, quantity: q } : p))
                          );
                        }
                      }}
                      min={0}
                      max={99}
                    />

                    <div className="text-right min-w-[70px]">
                      <span className="font-bold text-sm text-ink-800 block">
                        ₹{Math.round((item.est_unit_price_paise * item.quantity) / 100)}
                      </span>
                      <span className="text-[11px] text-ink-400">
                        MRP ₹{Math.round((item.mrp_paise * item.quantity) / 100)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewItems((prev) => prev.filter((p) => p.id !== item.id))}
                      className="p-1.5 text-ink-400 hover:text-danger-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Calculations */}
            <div className="border-t border-ice-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Standard Market MRP Total</span>
                <span className="line-through">₹{Math.round(totalMrpPaise / 100)}</span>
              </div>
              <div className="flex justify-between text-teal-700 font-bold text-sm">
                <span>Wholesale Collective Rate</span>
                <span>₹{Math.round(totalEstPaise / 100)}</span>
              </div>
              <div className="flex justify-between text-xs text-teal-700 font-semibold bg-teal-50 p-2 rounded-ctl">
                <span>Total Wholesale Savings</span>
                <span>Save ₹{Math.round((totalMrpPaise - totalEstPaise) / 100)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                fullWidth
                size="default"
                icon={<ShoppingCart className="w-4 h-4" />}
                onClick={handleConfirmAndAddToCart}
                isLoading={isPending}
              >
                Confirm & Add {previewItems.length} Items to Cart
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={() => {
                  setPreviewItems([]);
                  setTranscript("");
                  setNotFoundItems([]);
                }}
              >
                Clear Preview
              </Button>
            </div>
          </Card>
        ) : (
          /* Empty Preview State */
          <Card className="p-6 text-center space-y-2 bg-white border-ice-200">
            <Package className="w-8 h-8 text-ink-400 mx-auto" />
            <h3 className="font-semibold text-sm text-ink-800">No items in preview</h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              Tap the microphone above and speak what you need, or click any sample phrase below to test speech recognition.
            </p>
          </Card>
        )}

        {/* Quick Test Sample Commands */}
        <Card className="p-5 space-y-3 bg-ice-100 border-ice-300">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-xs text-ink-800">Quick-Test Sample Commands</h3>
          </div>
          <p className="text-xs text-ink-600">
            Click any sample voice command to test instant recognition and unavailable item detection:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {SAMPLE_COMMANDS.map((cmd, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(cmd)}
                className="p-3 bg-white rounded-ctl border border-ice-200 text-left hover:border-teal-700 hover:bg-ice-50 transition-colors flex items-center justify-between text-xs cursor-pointer group"
              >
                <span className="font-medium text-ink-800 group-hover:text-teal-700">
                  &ldquo;{cmd}&rdquo;
                </span>
                <Check className="w-3.5 h-3.5 text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </Card>

        <Toast
          isOpen={!!toastMessage}
          message={toastMessage || ""}
          onClose={() => setToastMessage(null)}
        />
      </div>
    </CustomerLayout>
  );
}
