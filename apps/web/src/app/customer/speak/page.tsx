"use client";

import React, { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, MicButton, StatusPill } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function CustomerSpeakPage() {
  const router = useRouter();
  const [micState, setMicState] = useState<"idle" | "listening" | "error">("idle");
  const transcript =
    "I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal";

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            Voice Ordering
          </h1>
          <p className="text-xs sm:text-sm text-ink-600">
            Speak your grocery list in English or Hindi. (P20 & P21 connect the real speech parser).
          </p>
        </div>

        {/* Mic Button Hero Card */}
        <Card className="flex flex-col items-center justify-center p-8 sm:p-10 space-y-4 text-center">
          <MicButton
            state={micState}
            onClick={() => setMicState(micState === "listening" ? "idle" : "listening")}
          />
        </Card>

        {/* Transcript Box */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-600">What I understood</span>
            <StatusPill kind="info" label="Sample transcript" />
          </div>
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-300 text-sm font-medium text-ink-800">
            &ldquo;{transcript}&rdquo;
          </div>
        </Card>

        {/* Action Button */}
        <Button
          variant="primary"
          fullWidth
          icon={<Sparkles className="w-4 h-4 text-ice-200" />}
          onClick={() => router.push("/customer/list")}
        >
          Add 4 items to my list
        </Button>
      </div>
    </CustomerLayout>
  );
}
