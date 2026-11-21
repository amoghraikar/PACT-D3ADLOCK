"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { usePact } from "@/context/PactContext";
import {
  Mic,
  ArrowLeft,
  Check,
  Edit2,
  Sparkles,
  Volume2,
  ListPlus,
} from "lucide-react";

interface ParsedItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
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
    { id: "rice-sona-5kg", name: "Sona Masoori Rice (5 kg)", qty: 1, unit: "pack" },
    { id: "sugar-1kg", name: "Pure Crystal Sugar (1 kg)", qty: 2, unit: "packs" },
    { id: "sunflower-oil-1l", name: "Sunflower Cooking Oil (1 L)", qty: 1, unit: "bottle" },
    { id: "toor-dal-500g", name: "Organic Toor Dal (500 g)", qty: 1, unit: "pack" },
  ]);

  // Handle Speech Recognition in browser
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(true);
      // Simulated interactive voice playback
      setTimeout(() => {
        setIsListening(false);
        showToast("Voice phrase captured successfully!");
      }, 2500);
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

  return (
    <div className="min-h-screen pb-24 bg-[#F3F8FB]">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/customer" className="p-1 text-[#432F2E]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="h-title text-xl text-[#2E201F]">Say your list</h1>
        </div>

        {/* Language Segmented Control */}
        <div className="seg">
          <span
            onClick={() => {
              setLanguage("en");
              setTranscript("I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal");
            }}
            className={language === "en" ? "on" : ""}
          >
            English
          </span>
          <span
            onClick={() => {
              setLanguage("hi");
              setTranscript("पाँच किलो चावल, दो किलो चीनी, एक लीटर तेल और 500 ग्राम तूर दाल चाहिए");
            }}
            className={`hi ${language === "hi" ? "on" : ""}`}
          >
            हिंदी
          </span>
        </div>

        {/* Speech Heard Box */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-[#432F2E]">I heard:</label>
            <span className="text-[10px] text-[#2A5C79] font-medium flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Audio transcript
            </span>
          </div>

          <div className="transcript text-xs leading-relaxed bg-white border border-[#948180] p-3 rounded-[12px] shadow-2xs">
            {transcript}
          </div>
        </div>

        {/* Understood Structured Lines */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#432F2E]">This is what I understood:</label>

          <div className="card flush divide-y divide-[#E4EEF5] text-xs">
            {parsedItems.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#E3F4EA] text-[#1B6B45] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <b className="text-xs text-[#432F2E] block">{item.name}</b>
                    <span className="text-[11px] text-[#6A5452]">Quantity: {item.qty} {item.unit}</span>
                  </div>
                </div>
                <button className="text-[#2A5C79] p-1 hover:bg-[#E4EEF5] rounded-full">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tap & Speak Control Area */}
        <div className="card p-4 flex items-center gap-4 bg-white border-[#B3CEDE]">
          <button
            onClick={startListening}
            className={`mic w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
              isListening ? "live animate-pulse" : "hover:bg-[#2E201F]"
            }`}
          >
            <Mic className="w-6 h-6" />
          </button>
          <div className="space-y-0.5">
            <b className="text-xs text-[#432F2E] block">
              {isListening ? "Listening now..." : "Tap to speak more"}
            </b>
            <p className="text-[11px] text-[#6A5452]">
              {isListening ? "Speak naturally into microphone..." : "Say items in English or Hindi. You can review before saving."}
            </p>
          </div>
        </div>

        {/* Add All Button */}
        <button
          onClick={addAllToCart}
          className="btn btn-primary block w-full text-xs py-3"
        >
          <ListPlus className="w-4 h-4 mr-1" />
          Confirm & Add {parsedItems.length} items to my list
        </button>
      </main>

      <CustomerBottomNav />
    </div>
  );
}
