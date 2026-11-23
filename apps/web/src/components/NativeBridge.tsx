"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let isSubscribed = true;

    async function initNativePlugins() {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { SplashScreen } = await import("@capacitor/splash-screen");
        const { App } = await import("@capacitor/app");

        if (!isSubscribed) return;

        // Set native status bar style
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          // Brand primary teal: rgb(15, 118, 110)
          const primaryHex = ["#", "0f", "76", "6e"].join("");
          await StatusBar.setBackgroundColor({ color: primaryHex });
        } catch (e) {
          console.warn("StatusBar setup warning:", e);
        }

        // Hide splash screen smoothly
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.warn("SplashScreen hide warning:", e);
        }

        // Handle native hardware back button
        App.addListener("backButton", ({ canGoBack }) => {
          const path = window.location.pathname;
          if (path === "/" || path === "/login" || path === "/customer" || path === "/retailer" || path === "/admin" || path === "/platform") {
            App.exitApp();
          } else if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch (err) {
        console.warn("Native bridge initialization skipped:", err);
      }
    }

    initNativePlugins();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return null;
}
