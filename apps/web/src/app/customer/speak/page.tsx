"use client";

import React, { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, MicButton, StatusPill, Toast } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Sparkles, Check, ArrowRight, Volume2 } from "lucide-react";

const SAMPLE_COMMANDS = [
  { text: "Add 5 kg Sona Masoori Rice", variant_id: "var-rice-sona-5kg", name: "Sona Masoori Rice", brand: "Royal Harvest", variant_label: "5 kg", est_unit_price_paise: 25000, mrp_paise: 28000 },
  { text: "Add 1 litre sunflower oil", variant_id: "var-sunflower-oil-1l", name: "Refined Sunflower Oil", brand: "Sunpure", variant_label: "1 L", est_unit_price_paise: 16000, mrp_paise: 18000 },
  { text: "Add 1 kg Toor Dal", variant_id: "var-toor-dal-1kg", name: "Premium Toor Dal (Arhar)", brand: "Tata Sampann", variant_label: "1 kg", est_unit_price_paise: 14000, mrp_paise: 16000 },
];

export default function CustomerSpeakPage() {
  const router = useRouter();
  const { updateQuantity } = useCart();
  const [micState, setMicState] = useState<"idle" | "listening" | "error">("idle");
  const [transcript, setTranscript] = useState("I need 5 kg rice, 1 litre sunflower oil, and 1 kg toor dal");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggleMic = () => {
    if (micState === "listening") {
      setMicState("idle");
    } else {
      setMicState("listening");
      setTimeout(() => {
        setMicState("idle");
        setTranscript("I need 5 kg rice, 1 litre sunflower oil, and 1 kg toor dal for November");
      }, 2000);
    }
  };

  const handleAddSample = async (cmd: typeof SAMPLE_COMMANDS[0]) => {
    await updateQuantity(cmd.variant_id, 1, {
      name: cmd.name,
      brand: cmd.brand,
      variant_label: cmd.variant_label,
      est_unit_price_paise: cmd.est_unit_price_paise,
      mrp_paise: cmd.mrp_paise,
    });
    setToastMessage(`Added ${cmd.name} (${cmd.variant_label}) to your list`);
  };

  const handleAddAll = async () => {
    for (const cmd of SAMPLE_COMMANDS) {
      await updateQuantity(cmd.variant_id, 1, {
        name: cmd.name,
        brand: cmd.brand,
        variant_label: cmd.variant_label,
        est_unit_price_paise: cmd.est_unit_price_paise,
        mrp_paise: cmd.mrp_paise,
      });
    }
    router.push("/customer/list");
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            Voice Grocery Assistant
          </h1>
          <p className="text-xs sm:text-sm text-ink-600">
            Speak naturally in English or Hindi. PACT converts speech to standard grocery sizes and contributes to the building cart.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mic Column */}
          <div className="md:col-span-2 space-y-4">
            <Card className="flex flex-col items-center justify-center p-8 sm:p-12 space-y-5 text-center bg-white">
              <MicButton
                state={micState}
                onClick={handleToggleMic}
              />
              <div>
                <span className="text-sm font-semibold text-ink-800 block">
                  {micState === "listening" ? "Listening to your groceries..." : "Tap microphone to speak"}
                </span>
                <span className="text-xs text-ink-500">
                  Try saying &ldquo;5 kilo chawal aur ek packet tel&rdquo;
                </span>
              </div>
            </Card>

            {/* Transcript Card */}
            <Card className="p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
                  Speech Recognition Result
                </span>
                <StatusPill kind={micState === "listening" ? "warning" : "success"} label={micState === "listening" ? "Streaming audio" : "Parsed"} />
              </div>

              <div className="p-3.5 bg-ice-50 rounded-ctl border border-ice-200 text-sm font-medium text-ink-800">
                &ldquo;{transcript}&rdquo;
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  icon={<Sparkles className="w-4 h-4 text-ice-200" />}
                  onClick={handleAddAll}
                >
                  Confirm & Add 3 Staples to My List
                </Button>
              </div>
            </Card>
          </div>

          {/* Quick Shortcuts Column */}
          <div className="space-y-4">
            <Card className="p-5 space-y-3 bg-ice-100 border-ice-300">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-xs text-ink-800">Voice Quick-Test</h3>
              </div>
              <p className="text-xs text-ink-600">
                Tap any sample phrase to simulate speech input:
              </p>

              <div className="space-y-2 pt-1">
                {SAMPLE_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.variant_id}
                    type="button"
                    onClick={() => handleAddSample(cmd)}
                    className="w-full p-2.5 bg-white rounded-ctl border border-ice-200 text-left hover:border-teal-700 hover:bg-ice-50 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <span className="font-medium text-ink-800 group-hover:text-teal-700">
                      &ldquo;{cmd.text}&rdquo;
                    </span>
                    <Check className="w-3.5 h-3.5 text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </Card>

            <Card padding="sm" className="space-y-2 bg-white">
              <span className="text-xs font-bold text-ink-800">Ready to review?</span>
              <p className="text-xs text-ink-600">
                Check all contributed items in your household list.
              </p>
              <button
                type="button"
                onClick={() => router.push("/customer/list")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline pt-1 cursor-pointer"
              >
                <span>Go to My List</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </Card>
          </div>
        </div>

        <Toast
          isOpen={!!toastMessage}
          message={toastMessage || ""}
          onClose={() => setToastMessage(null)}
        />
      </div>
    </CustomerLayout>
  );
}
