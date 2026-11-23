import React from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading collective pantry..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center select-none">
      <div className="mb-4">
        <Logo />
      </div>
      <div className="flex items-center gap-2 text-primary font-medium text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  );
}
