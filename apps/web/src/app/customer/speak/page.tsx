"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, MicButton, Skeleton } from "@/components/ui";
import {
  voiceService,
  VoiceInterpretResponse,
  InterpretedItem,
  ClarificationOption,
} from "@/services/voice.service";
import { useToast } from "@/hooks/useToast";
import {
  Mic,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

type SpeechLang = "en-IN" | "hi-IN" | "hinglish";

export default function VoiceOrderingPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [lang, setLang] = useState<SpeechLang>("en-IN");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [isInterpreting, setIsInterpreting] = useState<boolean>(false);
  const [result, setResult] = useState<VoiceInterpretResponse | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  const isSpeechSupported = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    () => true
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toastError("Speech recognition is not supported in this browser. Please use Chrome or type below.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === "hi-IN" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        info("Listening... Speak your grocery items now");
      };

      recognition.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };

      recognition.onerror = (err: any) => {
        setIsListening(false);
        toastError(err?.error ? `Mic error: ${err.error}` : "Could not hear audio");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toastError("Failed to access microphone. Please check browser permissions.");
    }
  };

  const handleInterpret = async () => {
    if (!transcript.trim()) {
      toastError("Please speak or enter an order transcript first");
      return;
    }

    setIsInterpreting(true);
    try {
      const res = await voiceService.interpret(transcript.trim(), lang);
      setResult(res);
      setConfirmedCount(null);
      if (res.items.length === 0) {
        info("No grocery products recognized. Try words like 'rice', 'cheeni', 'doodh', 'oil'.");
      }
    } catch (err: any) {
      toastError(err?.message || "Failed to interpret voice order");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSelectClarification = (itemIndex: number, option: ClarificationOption) => {
    if (!result) return;
    const updated = [...result.items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      variant_id: option.variant_id,
      variant_title: option.variant_title,
      product_title: option.product_title,
      unit_price_paise: option.price_paise,
      estimated_total_paise: option.price_paise * (updated[itemIndex].requested_quantity || 1),
      status: "matched",
      needs_clarification: false,
    };
    setResult({ ...result, items: updated });
    info(`Selected ${option.product_title} (${option.variant_title})`);
  };

  const handleConfirmOrder = async () => {
    if (!result) return;

    const matchedItems = result.items
      .filter((i) => i.variant_id && i.requested_quantity)
      .map((i) => ({
        variant_id: i.variant_id!,
        quantity: i.requested_quantity!,
      }));

    if (matchedItems.length === 0) {
      toastError("No matched items ready to add. Please clarify ambiguous items first.");
      return;
    }

    setIsCommitting(true);
    try {
      const res = await voiceService.confirmCart(matchedItems);
      setConfirmedCount(res.cart_items_count);
      success(`Added ${matchedItems.length} grocery items directly into your shared cart!`);
    } catch (err: any) {
      toastError(err?.message || "Failed to commit items into cart");
    } finally {
      setIsCommitting(false);
    }
  };

  const samplePrompts = [
    { label: "Hindi", text: "do kilo basmati chawal aur ek packet amul doodh" },
    { label: "Hinglish", text: "aadha kilo cheeni aur teen litre fortune mustard oil" },
    { label: "English", text: "5kg sona masoori rice and two packets of tata salt" },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="pb-2 border-b border-border">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
            Multilingual Voice Ordering
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Order groceries naturally in Hindi, Hinglish, or English with automated catalogue matching
          </p>
        </div>

        {/* Language & Mic Section */}
        <Card className="p-6 text-center space-y-6 bg-surface border-border">
          {/* Language Selector */}
          <div className="inline-flex p-1 bg-background rounded-pill border border-border">
            {(
              [
                { id: "en-IN", label: "English (en-IN)" },
                { id: "hi-IN", label: "हिन्दी (hi-IN)" },
                { id: "hinglish", label: "Hinglish (Latin)" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors cursor-pointer ${
                  lang === l.id
                    ? "bg-primary text-white font-semibold"
                    : "text-muted hover:text-text"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Big Mic Button */}
          <div className="flex flex-col items-center justify-center py-4">
            <MicButton
              isRecording={isListening}
              onClick={toggleListening}
              errorLabel="Microphone busy, tap to retry"
            />
            <p className="text-xs text-muted mt-2">
              {isListening
                ? "Listening... Tap button when finished speaking"
                : "Tap the microphone to speak your order"}
            </p>
          </div>

          {/* Transcript Box */}
          <div className="space-y-3 text-left">
            <label className="text-xs font-semibold text-text uppercase tracking-wider block">
              Speech Transcript
            </label>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Or type your order here (e.g. 'do kilo chawal, ek kilo cheeni aur aadha litre tel')..."
              className="w-full p-3 rounded-card border border-border bg-background text-sm text-text focus-ring resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted">Try sample:</span>
                {samplePrompts.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTranscript(s.text);
                      if (s.label === "Hindi") setLang("hi-IN");
                      else if (s.label === "Hinglish") setLang("hinglish");
                      else setLang("en-IN");
                    }}
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-primary hover:bg-surface cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                onClick={handleInterpret}
                isLoading={isInterpreting}
                disabled={!transcript.trim()}
                className="h-9 px-4 text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Interpret Voice Order</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Interpretation Results */}
        {result && (
          <Card className="p-6 space-y-5 bg-surface border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-text">Interpreted Grocery Basket</h2>
                <p className="text-xs text-muted">
                  Normalized and matched against the Green Glen Residency catalogue
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">
                  Total Estimated:{" "}
                  <strong className="text-text">
                    <MoneyText paise={result.summary.estimated_total_paise} />
                  </strong>
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {result.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-card border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text text-sm">
                        {item.product_title || item.heard}
                      </span>
                      {item.status === "matched" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-primary text-primary">
                          <CheckCircle2 className="w-3 h-3" /> Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-amber-600 text-amber-700">
                          <HelpCircle className="w-3 h-3" /> Clarification Needed
                        </span>
                      )}
                    </div>

                    <p className="text-muted text-[11px]">
                      Heard: &ldquo;{item.heard}&rdquo; · Qty: {item.requested_quantity}{" "}
                      {item.requested_unit}
                      {item.variant_title && ` · Pack: ${item.variant_title}`}
                    </p>

                    {/* Clarification Options if Ambiguous */}
                    {item.needs_clarification && item.clarification_options?.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[11px] font-semibold text-amber-800 block">
                          Please select which product variant you intended:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.clarification_options.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectClarification(idx, opt)}
                              className="px-2 py-1 rounded bg-surface border border-border hover:border-primary text-text font-medium text-[11px] transition-colors cursor-pointer"
                            >
                              {opt.product_title} ({opt.variant_title}) ·{" "}
                              <MoneyText paise={opt.price_paise} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-text block">
                      <MoneyText paise={item.estimated_total_paise || 0} />
                    </span>
                    <span className="text-[10px] text-muted">
                      {item.unit_price_paise ? `₹${(item.unit_price_paise / 100).toFixed(0)}/unit` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Confirmation Section */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted">
                <span className="font-semibold text-text block">
                  User Confirmation Required:
                </span>
                Items will only be added to your cart after you click confirm.
              </div>

              {confirmedCount !== null ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Added to Shared Cart!
                  </span>
                  <Link href="/customer/list">
                    <Button variant="primary" size="sm" className="h-9">
                      <ShoppingBag className="w-4 h-4 mr-1.5" />
                      <span>View Cart</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleConfirmOrder}
                  isLoading={isCommitting}
                  className="h-10 px-5 text-xs font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Confirm & Add Items to Collective Cart</span>
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
