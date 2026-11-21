"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, MonthTimeline, Banner, Skeleton, Stepper, MoneyText, StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { copy } from "@/lib/copy/en";
import { ShoppingBag, ShoppingCart, Users, Lock, Mic, ArrowRight, Sparkles, Receipt, CheckCircle2, PackageCheck, Keyboard } from "lucide-react";

export default function CustomerHomePage() {
  const { user, membership } = useAuth();
  const { isLocked, status, community, isLoading, getItemQuantity, updateQuantity } = useCart();
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.invoices && data.invoices.length > 0) {
          setInvoice(data.invoices[0]);
        }
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4">
          <Skeleton height={32} width="60%" />
          <Skeleton height={80} className="w-full" />
          <Skeleton height={140} className="w-full" />
        </div>
      </CustomerLayout>
    );
  }

  const timelineStep =
    invoice?.status === "paid"
      ? 4
      : invoice?.status === "issued" || invoice?.status === "payment_pending"
        ? 3
        : status === "submitted" || status === "locked"
          ? 2
          : 1;
  const totalBuildingPacks = community.items.reduce(
    (acc, curr) => acc + curr.total_quantity,
    0
  );

  return (
    <CustomerLayout>
      <div className="space-y-6">
        {/* Greeting in Serif per U8 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
              Hello, {user?.name || "Neighbour"}
            </h1>
            <p className="text-xs text-ink-600">
              Flat {membership?.unit_label || "A-101"} · {membership?.community.name || "Green Meadows Apartments"}
            </p>
          </div>
          <div className="hidden sm:block">
            <Link href="/customer/shop">
              <Button variant="quiet" size="sm" icon={<ShoppingBag className="w-4 h-4" />}>
                Browse Catalogue
              </Button>
            </Link>
          </div>
        </div>

        {/* Month Timeline per U5 / U8 */}
        <Card className="p-4 sm:p-5">
          <MonthTimeline
            currentStep={timelineStep}
            explanation={
              isLocked
                ? copy.customer.home.closedNotice
                : undefined
            }
          />
        </Card>

        {/* Desktop Responsive Grid: 2-column main area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Action Column */}
          <div className="md:col-span-2 space-y-4">
            {!isLocked ? (
              <>
                <Banner
                  kind="info"
                  message={copy.customer.home.orderClosingBanner(6)}
                />

                {/* "How would you like to order?" Mode Selection Card */}
                <Card className="p-5 space-y-3 bg-white border-ice-300">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Fast Ordering</span>
                    <h2 className="font-display text-xl text-ink-800">How would you like to order?</h2>
                    <p className="text-xs text-ink-600">Choose between typing from catalogue or speaking directly with voice.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Link href="/customer/shop" className="block">
                      <div className="p-3.5 rounded-ctl border border-ice-200 hover:border-teal-700 bg-ice-50/50 hover:bg-ice-100 transition-colors flex items-center gap-3 cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-white border border-ice-300 flex items-center justify-center text-ink-700 group-hover:text-teal-700 shrink-0">
                          <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                          <b className="block text-xs text-ink-800 group-hover:text-teal-700">Type & Browse</b>
                          <span className="text-[11px] text-ink-500">Search 60+ staples</span>
                        </div>
                      </div>
                    </Link>

                    <Link href="/customer/speak" className="block">
                      <div className="p-3.5 rounded-ctl border border-teal-700/40 bg-teal-50/30 hover:bg-teal-50 hover:border-teal-700 transition-colors flex items-center gap-3 cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Mic className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <b className="block text-xs text-ink-800 group-hover:text-teal-700">Speak (Voice Order)</b>
                          <span className="text-[11px] text-teal-700 font-medium">Instant mic order</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                </Card>

                <Card className="p-6 sm:p-8 space-y-4 bg-ice-100 border-ice-300">
                  <div className="space-y-1.5">
                    <h2 className="font-display text-xl sm:text-2xl text-ink-800">
                      Add this month&apos;s staple groceries
                    </h2>
                    <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                      Choose what you need for home before ordering locks. The building orders together for wholesale savings.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link href="/customer/shop" className="flex-1">
                      <Button variant="primary" fullWidth icon={<ShoppingBag className="w-4 h-4" />}>
                        {copy.customer.home.browseShop}
                      </Button>
                    </Link>
                    <Link href="/customer/list" className="flex-1">
                      <Button variant="secondary" fullWidth icon={<ShoppingCart className="w-4 h-4" />}>
                        View Cart ({getItemQuantity("var-rice-sona-5kg") > 0 ? "Items Added" : "0 Items"})
                      </Button>
                    </Link>
                  </div>
                </Card>

                {/* Popular Staples Quick-Add */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-ink-800">Popular building staples</h3>
                    <Link href="/customer/shop" className="text-xs font-semibold text-teal-700 hover:underline">
                      See all 12 categories →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Item 1: Sona Masoori Rice */}
                    <Card padding="sm" className="space-y-2 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-xs text-ink-800">Sona Masoori Rice (5 kg)</h4>
                        <p className="text-[11px] text-ink-500">Royal Harvest</p>
                        <div className="pt-1">
                          <MoneyText paise={25000} approx size="sm" />
                        </div>
                      </div>
                      <div>
                        {getItemQuantity("var-rice-sona-5kg") > 0 ? (
                          <Stepper
                            value={getItemQuantity("var-rice-sona-5kg")}
                            onChange={(q) =>
                              updateQuantity("var-rice-sona-5kg", q, {
                                name: "Sona Masoori Rice",
                                brand: "Royal Harvest",
                                variant_label: "5 kg",
                                est_unit_price_paise: 25000,
                                mrp_paise: 28000,
                              })
                            }
                            min={0}
                            max={99}
                            className="w-full justify-between"
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              updateQuantity("var-rice-sona-5kg", 1, {
                                name: "Sona Masoori Rice",
                                brand: "Royal Harvest",
                                variant_label: "5 kg",
                                est_unit_price_paise: 25000,
                                mrp_paise: 28000,
                              })
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </Card>

                    {/* Item 2: Sunflower Oil */}
                    <Card padding="sm" className="space-y-2 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-xs text-ink-800">Sunflower Oil (1 L)</h4>
                        <p className="text-[11px] text-ink-500">Sunpure</p>
                        <div className="pt-1">
                          <MoneyText paise={16000} approx size="sm" />
                        </div>
                      </div>
                      <div>
                        {getItemQuantity("var-sunflower-oil-1l") > 0 ? (
                          <Stepper
                            value={getItemQuantity("var-sunflower-oil-1l")}
                            onChange={(q) =>
                              updateQuantity("var-sunflower-oil-1l", q, {
                                name: "Refined Sunflower Oil",
                                brand: "Sunpure",
                                variant_label: "1 L",
                                est_unit_price_paise: 16000,
                                mrp_paise: 18000,
                              })
                            }
                            min={0}
                            max={99}
                            className="w-full justify-between"
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              updateQuantity("var-sunflower-oil-1l", 1, {
                                name: "Refined Sunflower Oil",
                                brand: "Sunpure",
                                variant_label: "1 L",
                                est_unit_price_paise: 16000,
                                mrp_paise: 18000,
                              })
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Card className="p-6 space-y-4 bg-ice-100 border-ice-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ice-200 flex items-center justify-center text-ink-600 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-ink-800">
                      Ordering for this month has closed
                    </h2>
                    <p className="text-xs text-ink-600">
                      Your building&apos;s order has been consolidated and sent to the store.
                    </p>
                  </div>
                </div>

                <Link href="/customer/list" className="block pt-2">
                  <Button variant="secondary" fullWidth icon={<ShoppingCart className="w-4 h-4" />}>
                    View Cart
                  </Button>
                </Link>
              </Card>
            )}
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-4">
            {/* Community Order Summary Bar */}
            <Card className="p-5 space-y-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-ink-800">Our Building&apos;s Cart</h3>
                  <span className="text-[11px] text-ink-500">Anonymous aggregated order</span>
                </div>
              </div>

              <div className="p-3 bg-ice-50 rounded-ctl border border-ice-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Active households:</span>
                  <span className="font-bold text-ink-800">{community.participants} flats</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Total staples packed:</span>
                  <span className="font-bold text-ink-800">{totalBuildingPacks} items</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Negotiated wholesale rate:</span>
                  <span className="font-bold text-teal-700">10% bulk discount</span>
                </div>
              </div>

              <p className="text-[11px] text-ink-500 leading-relaxed">
                {copy.customer.home.buildingOrderSummary(community.participants, totalBuildingPacks)}
              </p>
            </Card>

            {/* Voice Assistant Shortcut Card */}
            <Card className="p-5 space-y-3 bg-ice-200 border-ice-300">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-xs text-ink-800">Prefer speaking?</h3>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Dictate your monthly grocery list in Hindi or English. PACT automatically maps items to sizes.
              </p>
              <Link href="/customer/speak" className="block pt-1">
                <Button variant="secondary" size="sm" fullWidth icon={<Sparkles className="w-3.5 h-3.5" />}>
                  Try Voice Order
                </Button>
              </Link>
            </Card>

            {/* Split Bill Shortcut Card */}
            <Card className="p-5 space-y-2 bg-white">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-ink-800">November Split Bill</span>
                <span className="text-[11px] text-teal-700 font-semibold">Fair Split</span>
              </div>
              <p className="text-xs text-ink-600">
                Review your fair share breakdown with transparent GST and delivery split.
              </p>
              <Link
                href="/customer/bill"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline pt-1"
              >
                <span>View Monthly Bill Breakdown</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
