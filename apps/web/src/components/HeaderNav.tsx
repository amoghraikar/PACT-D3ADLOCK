"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";

// Unify HeaderNav with AppHeader for seamless desktop navigation
export function HeaderNav() {
  return <AppHeader />;
}
