"use client";

import React, { useState } from "react";
import {
  Package,
  Sparkles,
  Trash2,
  Plus,
  Mail,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  BottomSheet,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  MicButton,
  Modal,
  MoneyText,
  MonthTimeline,
  NotificationBell,
  OTPInput,
  SearchBar,
  Select,
  Skeleton,
  StatusPill,
} from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export default function StyleguidePage() {
  const { showToast, success, error, warning, info } = useToast();

  // Component demo state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [otpValue, setOtpValue] = useState("1234");
  const [timelineStep, setTimelineStep] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState("");

  const sampleTableData = [
    { id: "1", name: "Sona Masoori Rice (5kg)", qty: 3, pricePaise: 45000, status: "packed" },
    { id: "2", name: "Amul Taaza Milk (1L)", qty: 6, pricePaise: 39600, status: "packed" },
    { id: "3", name: "Aashirvaad Atta (10kg)", qty: 2, pricePaise: 88000, status: "short" },
    { id: "4", name: "Tata Salt (1kg)", qty: 4, pricePaise: 11200, status: "packed" },
  ];

  return (
    <AppShell communityName="Green Meadows, Apts (Design System)">
      <div className="space-y-12">
        {/* Page Header */}
        <PageHeader
          title="PACT Design System & UI Kit"
          description="Foundation tokens, accessible components, and responsive mobile-first patterns for Pantry Collective Commerce."
          badge={
            <StatusPill kind="info" size="sm">
              Milestone 10
            </StatusPill>
          }
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => success("Design system tokens verified!")}
            >
              Test Notification
            </Button>
          }
        />

        {/* 1. BRAND & TYPOGRAPHY & COLOR TOKENS */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Brand & Design Tokens</h2>
            <p className="text-sm text-muted">
              Semantic colors, typography pairings, and layout primitives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Typography */}
            <Card className="space-y-4">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                Typography Scale
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted block mb-0.5">DM Serif Display (Editorial)</span>
                  <p className="font-display text-3xl text-text">Pantry Collective Commerce</p>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-0.5">DM Sans (Interface)</span>
                  <p className="font-sans text-base text-text">
                    One Building · One Shared Cart · One Consolidated Bill
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-0.5">Noto Sans Devanagari (Hindi)</span>
                  <p className="font-hindi text-lg text-text">
                    हिंदी किराना: २ किलो बासमती चावल, १ लीटर अमूल दूध
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-0.5">Tabular Numerals</span>
                  <p className="font-mono text-base tabular-nums font-bold text-primary">
                    ₹1,475.00 · 12 Units · 24 Households
                  </p>
                </div>
              </div>
            </Card>

            {/* Semantic Color Swatches */}
            <Card className="space-y-4">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                Semantic Color Tokens
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-primary mb-2" />
                  <p className="text-xs font-bold text-text">Primary</p>
                  <p className="text-[11px] text-muted">var(--primary)</p>
                </div>
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-primary-hover mb-2" />
                  <p className="text-xs font-bold text-text">Primary Hover</p>
                  <p className="text-[11px] text-muted">var(--primary-hover)</p>
                </div>
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-background border border-border mb-2" />
                  <p className="text-xs font-bold text-text">Background</p>
                  <p className="text-[11px] text-muted">var(--background)</p>
                </div>
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-surface border border-border mb-2" />
                  <p className="text-xs font-bold text-text">Surface</p>
                  <p className="text-[11px] text-muted">var(--surface)</p>
                </div>
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-text mb-2" />
                  <p className="text-xs font-bold text-text">Text Ink</p>
                  <p className="text-[11px] text-muted">var(--text)</p>
                </div>
                <div className="p-3 rounded-ctl bg-surface border border-border">
                  <div className="w-full h-8 rounded bg-muted mb-2" />
                  <p className="text-xs font-bold text-text">Muted</p>
                  <p className="text-[11px] text-muted">var(--muted)</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* 2. BUTTONS & ACTIONS */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Buttons & Touch Targets</h2>
            <p className="text-sm text-muted">
              Accessible 44px+ minimum touch targets, distinct semantic hierarchy, and loading states.
            </p>
          </div>

          <Card className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Variants (Default Size: 52px)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="quiet">Quiet / Ghost</Button>
                <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                  Danger Button
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Sizes & States
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">
                  Small (44px)
                </Button>
                <Button variant="primary" size="default">
                  Default (52px)
                </Button>
                <Button variant="primary" isLoading>
                  Loading State
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
                  With Leading Icon
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 3. FORM CONTROLS: INPUT, SELECT, SEARCHBAR, OTPINPUT */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Form Controls & Inputs</h2>
            <p className="text-sm text-muted">
              Input, Select dropdowns, debounced SearchBar, and split OTP input with paste support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Inputs & Selects
              </h4>

              <Input
                label="Full Name"
                placeholder="Asha Sharma"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                leadingIcon={<User className="w-4 h-4" />}
                helperText="Name as registered with your apartment association"
              />

              <Input
                label="Email Address"
                placeholder="asha@example.com"
                defaultValue="invalid-email"
                error="Please enter a valid apartment member email."
                leadingIcon={<Mail className="w-4 h-4" />}
              />

              <Select
                label="Grocery Category"
                placeholder="Select category..."
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: "staples", label: "Staples & Grains" },
                  { value: "dairy", label: "Dairy & Milk" },
                  { value: "oils", label: "Edible Oils & Ghee" },
                  { value: "spices", label: "Spices & Masalas" },
                ]}
                helperText="Filtered by available community catalog"
              />

              <Input label="Disabled Field" value="Flat 402, Tower B" disabled />
            </Card>

            <Card className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Live Debounced SearchBar
                </h4>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={(q) => {
                    if (q) showToast(`Searching for: "${q}"`, "info", 2000);
                  }}
                  placeholder="Search catalogue (e.g. rice, atta, sugar)..."
                />
                {searchQuery && (
                  <p className="text-xs text-muted mt-2">
                    Active Query: <span className="font-semibold text-primary">{searchQuery}</span>
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  6-Digit Split OTP Input
                </h4>
                <p className="text-xs text-muted mb-3">
                  Auto-advances focus, handles backspace navigation, and supports full clipboard paste.
                </p>
                <OTPInput
                  value={otpValue}
                  onChange={setOtpValue}
                  length={6}
                  error={otpValue.length === 6 && otpValue !== "123456" ? "Try test dev OTP: 123456" : undefined}
                />
                <p className="text-xs text-muted mt-2">
                  Current OTP: <span className="font-mono font-bold text-text">{otpValue || "Empty"}</span>
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. OVERLAYS: MODAL, BOTTOMSHEET, TOAST */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Overlays & Feedback</h2>
            <p className="text-sm text-muted">
              Accessible dialogs, mobile slide-up sheets, and toast notifications.
            </p>
          </div>

          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Confirmation Modal
              </Button>
              <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
                Open Mobile BottomSheet
              </Button>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Trigger Toast Alerts (via useToast hook)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => success("Payment received successfully! ₹1,475 settled.")}
                >
                  Success Toast
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => error("Payment verification signature mismatch. HTTP 400.")}
                >
                  Error Toast
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => warning("Cutoff timer approaching: 2 hours left.")}
                >
                  Warning Toast
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => info("Your collective order was packed by retailer.")}
                >
                  Info Toast
                </Button>
              </div>
            </div>

            {/* Interactive Modal */}
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Finalise Collective Grocery Bill?"
              description="This will lock all quantities, apply wholesale bulk discounts, and generate individual invoices for all 24 households."
              confirmLabel="Finalise Bill"
              onConfirm={() => {
                setIsModalOpen(false);
                success("Bulk bill finalised and resident invoices issued!");
              }}
            >
              <div className="p-4 bg-background rounded-ctl border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Total Bulk Items:</span>
                  <span className="font-bold text-text">142 items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Combined Retailer Bill:</span>
                  <span className="font-bold text-text">₹38,450.00</span>
                </div>
                <div className="flex justify-between text-success-700 font-bold">
                  <span>Collective Savings:</span>
                  <span>-₹4,200.00 (10.9%)</span>
                </div>
              </div>
            </Modal>

            {/* Interactive BottomSheet */}
            <BottomSheet
              isOpen={isSheetOpen}
              onClose={() => setIsSheetOpen(false)}
              title="Collective Shopping Cart Summary"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  You are shopping together with <strong className="text-text">24 neighbors</strong> in
                  Green Meadows, Tower B.
                </p>

                <div className="p-4 bg-background rounded-card border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Personal Subtotal:</span>
                    <MoneyText paise={147500} />
                  </div>
                  <div className="flex justify-between text-sm text-success-700 font-medium">
                    <span>Bulk Tier Discount:</span>
                    <span>-₹50.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Split Delivery Fee:</span>
                    <MoneyText paise={2500} />
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between font-bold text-base">
                    <span>Total Amount Due:</span>
                    <MoneyText paise={147500} size="lg" />
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setIsSheetOpen(false);
                    success("Proceeded to checkout!");
                  }}
                >
                  Confirm & Checkout
                </Button>
              </div>
            </BottomSheet>
          </Card>
        </section>

        {/* 5. DATA DISPLAY & SPECIALIZED PACT COMPONENTS */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">
              Domain & Specialized Components
            </h2>
            <p className="text-sm text-muted">
              MoneyText (integer paise), MonthTimeline cycle states, StatusPills, and MicButton.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MoneyText & StatusPills */}
            <Card className="space-y-4">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                MoneyText (Integer Paise Formatting)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Display Size:</span>
                  <MoneyText paise={147500} size="display" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Strikethrough Original:</span>
                  <MoneyText paise={165000} strikeThrough />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Approximate Estimated:</span>
                  <MoneyText paise={95000} approx />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  StatusPills
                </h4>
                <div className="flex flex-wrap gap-2">
                  <StatusPill kind="neutral" label="DRAFT" />
                  <StatusPill kind="info" label="PENDING" />
                  <StatusPill kind="success" label="PAID IN FULL" />
                  <StatusPill kind="warning" label="CUTOFF LOCKED" />
                  <StatusPill kind="danger" label="NEEDS REFUND" />
                </div>
              </div>
            </Card>

            {/* MicButton & Voice Ordering Affordance */}
            <Card className="space-y-4">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                Voice Ordering MicButton
              </h3>
              <p className="text-xs text-muted">
                Tap to toggle listening pulse animation for multilingual speech ordering.
              </p>

              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-card border border-border">
                <MicButton
                  isRecording={isMicRecording}
                  onClick={() => {
                    const next = !isMicRecording;
                    setIsMicRecording(next);
                    if (next) info("Listening in Hindi, Hinglish, and English...");
                  }}
                />
                <p className="text-xs font-medium text-text mt-3">
                  {isMicRecording ? "Listening: 'do kilo chawal aur ek packet doodh'..." : "Tap mic to speak"}
                </p>
              </div>

              {/* Notification Bell Preview */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted">Header Notification Bell:</span>
                <NotificationBell
                  unreadCount={3}
                  notifications={[
                    {
                      id: "n1",
                      title: "Your bill of ₹1,475 is ready",
                      message: "Monthly cycle completed. Please pay before cutoff.",
                      is_read: false,
                      created_at: new Date().toISOString(),
                    },
                  ]}
                />
              </div>
            </Card>
          </div>
        </section>

        {/* 6. MONTH TIMELINE CYCLE STAGES */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Shopping Cycle Timeline</h2>
            <p className="text-sm text-muted">
              5-step synchronized cycle progress: Open → Sent to store → Packed → Pay → Delivered.
            </p>
          </div>

          <Card className="space-y-6">
            <MonthTimeline currentStep={timelineStep} />

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted font-medium mr-2">Simulate Stage:</span>
              {([1, 2, 3, 4, 5] as const).map((step) => (
                <Button
                  key={step}
                  variant={timelineStep === step ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setTimelineStep(step)}
                >
                  Step {step}
                </Button>
              ))}
            </div>
          </Card>
        </section>

        {/* 7. RESPONSIVE DATA TABLE */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Responsive DataTable</h2>
            <p className="text-sm text-muted">
              Renders standard table on desktop and responsive stacked cards on mobile devices.
            </p>
          </div>

          <DataTable
            data={sampleTableData}
            keyExtractor={(item) => item.id}
            columns={[
              { key: "name", header: "Item Description" },
              {
                key: "qty",
                header: "Qty",
                isNumeric: true,
                render: (item) => `${item.qty} units`,
              },
              {
                key: "pricePaise",
                header: "Total (₹)",
                isNumeric: true,
                render: (item) => <MoneyText paise={item.pricePaise} />,
              },
              {
                key: "status",
                header: "Status",
                render: (item) => (
                  <StatusPill
                    kind={item.status === "packed" ? "success" : "warning"}
                    size="sm"
                    label={item.status === "packed" ? "Packed" : "Short-packed"}
                  />
                ),
              },
            ]}
          />
        </section>

        {/* 8. SKELETON & EMPTY STATES */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-text mb-1">Loading Skeletons & Empty States</h2>
            <p className="text-sm text-muted">
              Perceived performance placeholders and contextual empty screens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skeleton Card */}
            <Card className="space-y-4">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Skeleton Loading State
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton width={48} height={48} circle />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton height={16} width="60%" />
                    <Skeleton height={12} width="40%" />
                  </div>
                </div>
                <Skeleton height={20} width="100%" />
                <Skeleton height={20} width="85%" />
                <Skeleton height={44} width="100%" />
              </div>
            </Card>

            {/* Empty State */}
            <EmptyState
              icon={<Package className="w-8 h-8 text-primary" />}
              title="Your Cart is Empty"
              description="Browse the community catalogue and add items to pool demand with your neighbors."
              actionLabel="Browse Catalogue"
              onAction={() => showToast("Navigating to grocery catalogue...", "info")}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
