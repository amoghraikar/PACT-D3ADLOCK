"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  ShoppingCart,
  ArrowLeft,
  Volume2,
} from "lucide-react";
import { Button, Card, StatusPill, MoneyText } from "@/components/ui";
import {
  VoiceService,
  InterpretedItem,
  ClarificationOption,
  VoiceInterpretationSummary,
} from "@/lib/services/voice.service";

type RecordingState = "idle" | "listening" | "processing" | "review" | "success" | "error";

export default function VoiceOrderingPage() {
  const [lang, setLang] = useState<"en-IN" | "hi-IN" | "hinglish">("en-IN");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const isSpeechSupported = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    () => true
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [interpretedItems, setInterpretedItems] = useState<InterpretedItem[]>([]);
  const [summary, setSummary] = useState<VoiceInterpretationSummary | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

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

  const startListening = () => {
    setPermissionError(null);
    setErrorMsg(null);
    setCommitResult(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPermissionError("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === "hi-IN" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setRecordingState("listening");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setPermissionError(
            "Microphone access was denied. Please allow microphone permissions in your browser or type your list below."
          );
        } else if (event.error === "no-speech") {
          setPermissionError("No speech was detected. Please try speaking again.");
        } else {
          setPermissionError(`Speech recognition error: ${event.error}`);
        }
        setRecordingState("error");
      };

      recognition.onend = () => {
        if (recordingState === "listening") {
          setRecordingState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setPermissionError(err?.message || "Failed to start speech recognition.");
      setRecordingState("error");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecordingState("idle");
  };

  const handleInterpret = async () => {
    if (!transcript.trim()) return;

    setRecordingState("processing");
    setErrorMsg(null);
    try {
      const resp = await VoiceService.interpret(transcript, lang);
      setInterpretedItems(resp.items);
      setSummary(resp.summary);
      setRecordingState("review");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to interpret voice order.");
      setRecordingState("error");
    }
  };

  const handleSelectClarification = (
    itemIndex: number,
    option: ClarificationOption
  ) => {
    setInterpretedItems((prev) => {
      const next = [...prev];
      const target = next[itemIndex];
      next[itemIndex] = {
        ...target,
        status: "matched",
        product_id: option.product_id,
        product_title: option.product_title,
        variant_id: option.variant_id,
        variant_title: option.variant_title,
        pack_multiplier: 1,
        unit_price_paise: option.price_paise,
        estimated_total_paise: option.price_paise,
        needs_clarification: false,
        clarification_question: undefined,
        clarification_options: [],
      };
      return next;
    });
  };

  const handleUpdateQuantity = (itemIndex: number, delta: number) => {
    setInterpretedItems((prev) => {
      const next = [...prev];
      const target = next[itemIndex];
      const newQty = Math.max(1, target.pack_multiplier + delta);
      const unitPrice = target.unit_price_paise || 0;
      next[itemIndex] = {
        ...target,
        pack_multiplier: newQty,
        estimated_total_paise: unitPrice * newQty,
      };
      return next;
    });
  };

  const handleRemoveItem = (itemIndex: number) => {
    setInterpretedItems((prev) => prev.filter((_, idx) => idx !== itemIndex));
  };

  const handleConfirmCart = async () => {
    const validItems = interpretedItems.filter(
      (it) => it.status === "matched" && it.variant_id
    );

    if (validItems.length === 0) {
      setErrorMsg("Please select or resolve at least one item before adding to cart.");
      return;
    }

    setIsCommitting(true);
    setErrorMsg(null);
    try {
      const payload = validItems.map((it) => ({
        variant_id: it.variant_id!,
        quantity: it.pack_multiplier,
      }));

      const res = await VoiceService.confirmCart(payload);
      setRecordingState("success");
      setCommitResult(
        `Successfully added ${res.added_items.length} items to your shared community cart! (Cart Total: ₹${(
          res.cart_total_paise / 100
        ).toFixed(2)})`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to commit items to cart.");
    } finally {
      setIsCommitting(false);
    }
  };

  const samplePhrases = {
    "en-IN": [
      "Two kg Sona Masoori Rice and one litre Amul Milk",
      "Five kg Aashirvaad Atta and 500g Toor Dal",
      "One pack Parle-G and two bottles of Sunflower Oil",
    ],
    hinglish: [
      "Do kilo sona masoori chawal aur ek litre amul doodh",
      "Aadha kilo toor dal aur ek packet namak",
      "Dedh kilo cheeni aur do packet biscuit",
    ],
    "hi-IN": [
      "दो किलो सोना मसूरी चावल और एक लीटर दूध",
      "आधा किलो तूर दाल और एक पैकेट नमक",
      "डेढ़ किलो चीनी और दो पैकेट बिस्कुट",
    ],
  };

  return (
    <main className="min-h-screen bg-ice-50 text-ink-800 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-ink-500 font-medium">
          <Link href="/" className="hover:text-teal-700 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <span>/</span>
          <span className="text-ink-800 font-semibold">Voice Grocery Ordering</span>
        </div>

        {/* Header Title */}
        <div className="bg-white p-6 rounded-3xl border border-ice-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-ink-800">
                Voice Grocery Ordering
              </h1>
              <p className="text-sm text-ink-500">
                Dictate your monthly groceries in English, Hindi, or Hinglish
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-center bg-ice-100 p-1.5 rounded-2xl border border-ice-200">
            {(
              [
                { id: "en-IN", label: "English" },
                { id: "hinglish", label: "Hinglish" },
                { id: "hi-IN", label: "हिन्दी" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLang(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  lang === opt.id
                    ? "bg-teal-700 text-white shadow-sm font-semibold"
                    : "text-ink-600 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unsupported Browser Alert / Fallback Notice */}
        {!isSpeechSupported && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                Browser Speech Recognition Unavailable
              </p>
              <p>
                Native speech recognition is not supported in this browser or Android WebView.
                You can type or paste your grocery order in English, Hindi, or Hinglish below.
              </p>
            </div>
          </div>
        )}

        {/* Permission Error Alert */}
        {permissionError && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-2xl flex items-start gap-3 text-danger-800">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs">{permissionError}</p>
          </div>
        )}

        {/* Voice Input Card */}
        <Card className="p-6 bg-white rounded-3xl border border-ice-200 shadow-sm space-y-6">
          {/* Mic Button Control */}
          {isSpeechSupported && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <button
                type="button"
                onClick={
                  recordingState === "listening" ? stopListening : startListening
                }
                disabled={recordingState === "processing"}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  recordingState === "listening"
                    ? "bg-danger-600 text-white ring-8 ring-danger-200 animate-pulse scale-105"
                    : "bg-teal-700 text-white hover:bg-teal-800 hover:scale-105 active:scale-95"
                }`}
                aria-label={
                  recordingState === "listening" ? "Stop listening" : "Start voice input"
                }
              >
                {recordingState === "listening" ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
              <div className="text-center">
                <p className="text-base font-bold text-ink-800">
                  {recordingState === "listening"
                    ? "Listening… speak your groceries now"
                    : "Tap microphone to speak"}
                </p>
                <p className="text-xs text-ink-500">
                  {recordingState === "listening"
                    ? "Tap button again when you are finished speaking"
                    : "Supports quantities, pack sizes, Hindi words and brand names"}
                </p>
              </div>
            </div>
          )}

          {/* Transcript Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-ink-600">
              <label htmlFor="voice-transcript-page" className="font-semibold">
                Transcript (Type or Edit Speech):
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => {
                    setTranscript("");
                    setInterpretedItems([]);
                    setSummary(null);
                    setRecordingState("idle");
                  }}
                  className="text-danger-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              id="voice-transcript-page"
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Do kilo sona masoori rice aur ek litre Amul doodh..."
              className="w-full p-4 bg-ice-50/60 border border-ice-300 rounded-2xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-700 text-ink-800 resize-none"
            />

            {/* Quick Sample Phrases */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-ink-400 font-medium self-center mr-1">
                Examples:
              </span>
              {samplePhrases[lang].map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTranscript(phrase)}
                  className="text-[11px] px-3 py-1 bg-ice-100 hover:bg-ice-200 text-ink-700 rounded-lg transition-colors border border-ice-200 truncate max-w-xs"
                >
                  &ldquo;{phrase}&rdquo;
                </button>
              ))}
            </div>

            {/* Parse / Interpret Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleInterpret}
                disabled={!transcript.trim() || recordingState === "processing"}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold shadow-sm text-sm"
              >
                {recordingState === "processing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Matching with Catalogue…</span>
                  </>
                ) : (
                  <>
                    <span>Interpret & Match Items</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Success Banner */}
          {recordingState === "success" && commitResult && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3 text-teal-800 animate-fade-in">
              <CheckCircle2 className="w-6 h-6 text-teal-700 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-sm">{commitResult}</p>
                <p className="text-teal-600 mt-0.5">
                  Items have been confirmed and added to your monthly bulk order.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-2xl flex items-center gap-3 text-danger-800 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}

          {/* Interpreted Results List */}
          {interpretedItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-ice-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-ink-800">
                  Recognized Grocery Items ({interpretedItems.length})
                </h3>
                {summary && (
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    Est. Total: ₹{(summary.estimated_total_paise / 100).toFixed(2)}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {interpretedItems.map((item, idx) => (
                  <Card
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.status === "matched"
                        ? "border-ice-200 bg-white"
                        : item.needs_clarification
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-danger-200 bg-danger-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-ink-500 italic">
                        Heard: &ldquo;{item.heard}&rdquo;
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.status === "matched" && (
                          <StatusPill
                            kind="success"
                            label={`${Math.round(item.confidence * 100)}% match`}
                          />
                        )}
                        {item.needs_clarification && (
                          <StatusPill kind="warning" label="Choice Needed" />
                        )}
                        {item.status === "unmatched" && (
                          <StatusPill kind="danger" label="Unmatched" />
                        )}
                      </div>
                    </div>

                    {item.status === "matched" && (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-ink-800">
                            {item.product_title}
                          </p>
                          <p className="text-xs text-ink-500">
                            {item.variant_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-ice-100 rounded-xl p-1 border border-ice-200">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              className="p-1 hover:bg-white rounded-lg transition-colors text-ink-700"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-ink-800">
                              {item.pack_multiplier}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              className="p-1 hover:bg-white rounded-lg transition-colors text-ink-700"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <MoneyText
                              paise={item.estimated_total_paise || 0}
                              className="text-sm font-bold text-ink-800"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-ink-400 hover:text-danger-600 transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {item.needs_clarification && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>{item.clarification_question}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {item.clarification_options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectClarification(idx, opt)}
                              className="text-left p-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 hover:border-amber-400 transition-all flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-ink-800">
                                  {opt.variant_title}
                                </p>
                                <p className="text-[11px] text-ink-500">
                                  Unit: {opt.unit}
                                </p>
                              </div>
                              <span className="font-bold text-teal-800">
                                ₹{(opt.price_paise / 100).toFixed(2)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.status === "unmatched" && (
                      <div className="flex items-center justify-between text-xs text-danger-700">
                        <p>{item.clarification_question}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-danger-600 hover:underline text-[11px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Confirm & Add to Cart Action */}
              <div className="pt-4 flex items-center justify-end border-t border-ice-200">
                <Button
                  variant="primary"
                  onClick={handleConfirmCart}
                  disabled={
                    isCommitting ||
                    interpretedItems.filter(
                      (it) => it.status === "matched" && it.variant_id
                    ).length === 0
                  }
                  className="flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold shadow-md"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Committing to Cart…</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Confirm & Add to Collective Cart</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
