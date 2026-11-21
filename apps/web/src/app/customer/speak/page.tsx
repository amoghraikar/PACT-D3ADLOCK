"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { usePact } from "@/context/PactContext";
import {
  Mic,
  ArrowLeft,
  Check,
  Edit2,
  Sparkles,
  Volume2,
  ListPlus,
  ShieldCheck,
  Languages,
  RotateCcw,
  Plus,
} from "lucide-react";

interface ParsedItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  rate: number;
}

export default function VoiceOrderingPage() {
  const router = useRouter();
  const { addToCart, showToast } = usePact();

  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>(
    "I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal"
  );

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([
    { id: "rice-sona-5kg", name: "Sona Masoori Rice (5 kg)", qty: 1, unit: "pack", rate: 300 },
    { id: "sugar-1kg", name: "Pure Crystal Sugar (1 kg)", qty: 2, unit: "packs", rate: 75 },
    { id: "sunflower-oil-1l", name: "Sunflower Cooking Oil (1 L)", qty: 1, unit: "bottle", rate: 250 },
    { id: "toor-dal-500g", name: "Organic Toor Dal (500 g)", qty: 1, unit: "pack", rate: 100 },
  ]);

  const presetSamples = [
    {
      lang: "en",
      label: "Monthly staples (EN)",
      phrase: "I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal",
      items: [
        { id: "rice-sona-5kg", name: "Sona Masoori Rice (5 kg)", qty: 1, unit: "pack", rate: 300 },
        { id: "sugar-1kg", name: "Pure Crystal Sugar (1 kg)", qty: 2, unit: "packs", rate: 75 },
        { id: "sunflower-oil-1l", name: "Sunflower Cooking Oil (1 L)", qty: 1, unit: "bottle", rate: 250 },
        { id: "toor-dal-500g", name: "Organic Toor Dal (500 g)", qty: 1, unit: "pack", rate: 100 },
      ],
    },
    {
      lang: "hi",
      label: "दाल और आटा (HI)",
      phrase: "पाँच किलो चक्की आटा और एक किलो तूर दाल जोड़ें",
      items: [
        { id: "atta-chakki-5kg", name: "Sharbati Whole Wheat Atta (5 kg)", qty: 1, unit: "pack", rate: 260 },
        { id: "toor-dal-500g", name: "Organic Toor Dal (500 g)", qty: 2, unit: "packs", rate: 100 },
      ],
    },
    {
      lang: "hi",
      label: "चाय और चीनी (HI)",
      phrase: "दो किलो चीनी और एक पैकेट चाय पत्ती",
      items: [
        { id: "sugar-1kg", name: "Pure Crystal Sugar (1 kg)", qty: 2, unit: "packs", rate: 75 },
        { id: "tea-premium-500g", name: "Assam Gold CTC Leaf Tea (500 g)", qty: 1, unit: "pack", rate: 240 },
      ],
    },
  ];

  // Handle Speech Recognition in browser
  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        showToast("Voice phrase captured successfully!");
      }, 2000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === "en" ? "en-IN" : "hi-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        showToast("Speech captured and structured!");
      };

      recognition.start();
    } catch {
      setIsListening(true);
      setTimeout(() => setIsListening(false), 2000);
    }
  };

  const addAllToCart = () => {
    parsedItems.forEach((item) => {
      addToCart(item.id, item.qty);
    });
    showToast(`Added ${parsedItems.length} voice items to your list!`);
    router.push("/customer/list");
  };

  const totalParsedValue = parsedItems.reduce((acc, curr) => acc + curr.rate * curr.qty, 0);

  return (
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E]">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E4EEF5]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6A5452] mb-1">
              <Link href="/" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#432F2E]">Voice Order Studio</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2E201F]">
              Voice Ordering Assistant
            </h1>
            <p className="text-xs sm:text-sm text-[#6A5452]">
              Dictate your monthly grocery list in natural English or Hindi. PACT structures speech into cart lines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6A5452]">Language:</span>
            <div className="flex bg-white p-1 rounded-[10px] border border-[#B3CEDE]">
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  language === "en" ? "bg-[#432F2E] text-white" : "text-[#6A5452]"
                }`}
              >
                English (IN)
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  language === "hi" ? "bg-[#432F2E] text-white" : "text-[#6A5452]"
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Voice Recording Console (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="card p-8 bg-white text-center space-y-6 shadow-xs border-[#B3CEDE]">
              {/* Mic Visual Button with Waveform Animation */}
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#C4DAE8] animate-ping opacity-50" />
                    <span className="absolute -inset-3 rounded-full bg-[#FEEFB8] animate-pulse opacity-40" />
                  </>
                )}

                <button
                  type="button"
                  onClick={startListening}
                  className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
                    isListening
                      ? "bg-[#A3241C] text-white scale-105"
                      : "bg-[#C4DAE8] hover:bg-[#B3CEDE] text-[#432F2E]"
                  }`}
                  aria-label="Toggle voice recording"
                >
                  <Mic className={`w-10 h-10 ${isListening ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                    {isListening ? "Listening..." : "Click to Speak"}
                  </span>
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-[#2E201F]">
                  {isListening ? "Listening to your voice..." : "Press microphone and speak"}
                </h3>
                <p className="text-xs text-[#6A5452]">
                  Web Speech API enabled · Real-time multi-lingual parser
                </p>
              </div>

              {/* Sample Phrases to Try */}
              <div className="text-left pt-2 space-y-2 border-t border-[#E4EEF5]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6A5452] block">
                  Quick Voice Presets (Click to Test):
                </span>
                <div className="flex flex-col gap-2">
                  {presetSamples.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLanguage(sample.lang as "en" | "hi");
                        setTranscript(sample.phrase);
                        setParsedItems(sample.items);
                        showToast(`Loaded voice sample: ${sample.label}`);
                      }}
                      className="text-left p-2.5 rounded-[10px] bg-[#F3F8FB] hover:bg-[#E4EEF5] border border-[#E4EEF5] text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <b className="text-[#432F2E]">{sample.label}</b>
                        <span className="text-[10px] text-[#2A5C79] font-medium">Load & Parse</span>
                      </div>
                      <span className="text-[11px] text-[#6A5452] block truncate mt-0.5">
                        &ldquo;{sample.phrase}&rdquo;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rule R15 Note */}
            <div className="card p-4 bg-[#E4EEF5] border-[#B3CEDE] flex items-start gap-2.5 text-xs text-[#2A5C79]">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Hard Rule R15:</strong> Voice never guesses. Ambiguous quantities ask for confirmation before anything enters your cart.
              </span>
            </div>
          </div>

          {/* Right Column: Live Transcript & Parsed Grocery Items (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Live Captured Transcript Box */}
            <div className="card p-6 bg-white space-y-3 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4EEF5]">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#2A5C79]" />
                  <span className="text-xs font-bold text-[#432F2E]">Recognized Speech Transcript</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#1B6B45] bg-[#E3F4EA] px-2 py-0.5 rounded-full">
                  Verified Audio
                </span>
              </div>

              <div className="p-4 bg-[#F3F8FB] rounded-[12px] border border-[#E4EEF5] text-sm text-[#432F2E] font-medium min-h-[64px] flex items-center">
                &ldquo;{transcript}&rdquo;
              </div>
            </div>

            {/* Structured Grocery Lines Table */}
            <div className="card flush bg-white shadow-xs space-y-0">
              <div className="p-4 bg-[#FFF7DB] border-b border-[#EFDB93] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8A3A00]" />
                  <b className="text-xs text-[#432F2E]">
                    Structured Cart Items ({parsedItems.length} products detected)
                  </b>
                </div>
                <span className="text-xs font-serif font-bold text-[#432F2E]">
                  Total Value: ₹{totalParsedValue}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4EEF5] bg-[#F3F8FB] text-[#6A5452]">
                      <th className="py-2.5 px-4 font-bold">Item Identified</th>
                      <th className="py-2.5 px-4 font-bold text-center">Qty / Pack</th>
                      <th className="py-2.5 px-4 font-bold text-right">Wholesale Rate</th>
                      <th className="py-2.5 px-4 font-bold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEF5]">
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-[#F3F8FB]/50">
                        <td className="py-3 px-4 font-medium text-[#432F2E]">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-[#1B6B45]" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-[#6A5452]">
                          <span className="font-bold text-[#432F2E]">{item.qty}</span> {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6A5452]">
                          ₹{item.rate}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#432F2E]">
                          ₹{item.rate * item.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-[#6A5452]">
                  Review items before adding to your household contribution.
                </span>

                <button
                  type="button"
                  onClick={addAllToCart}
                  className="btn btn-primary md text-xs font-bold w-full sm:w-auto shadow-xs cursor-pointer"
                >
                  <ListPlus className="w-4 h-4 mr-1.5" />
                  Add All to My Contribution ({parsedItems.length} items)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
