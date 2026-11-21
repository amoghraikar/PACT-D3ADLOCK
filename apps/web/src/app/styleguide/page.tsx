"use client";

import React, { useState } from "react";
import {
  Logo,
  Mark,
  Button,
  TextField,
  PhoneField,
  OtpInput,
  Stepper,
  Card,
  StatusPill,
  MoneyText,
  ProgressBar,
  MonthTimeline,
  Chip,
  DataTable,
  Dialog,
  Sheet,
  Toast,
  Banner,
  EmptyState,
  Skeleton,
  MicButton,
} from "@/components/ui";
import { ShoppingBag } from "lucide-react";

export default function StyleguidePage() {
  const [phoneVal, setPhoneVal] = useState("9999900001");
  const [otpVal, setOtpVal] = useState("123456");
  const [stepperVal, setStepperVal] = useState(2);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [, setMicState] = useState<"idle" | "listening" | "error">("idle");

  const sampleTableData = [
    { id: "1", product: "Sona Masoori Rice (5 kg)", requested: "2", packed: "2", price: "₹600", status: "Packed" },
    { id: "2", product: "Toor Dal (500 g)", requested: "1", packed: "0", price: "₹0", status: "Out of stock" },
    { id: "3", product: "Sunflower Oil (1 L)", requested: "1", packed: "1", price: "₹250", status: "Packed" },
  ];

  const tableColumns = [
    { key: "product", header: "Product" },
    { key: "requested", header: "Asked", align: "center" as const },
    { key: "packed", header: "Packed", align: "center" as const },
    { key: "price", header: "Total", isNumeric: true },
    {
      key: "status",
      header: "Status",
      render: (item: (typeof sampleTableData)[0]) => (
        <StatusPill
          kind={item.status === "Packed" ? "success" : "warning"}
          label={item.status}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-ice-50 py-10 px-4 sm:px-8 space-y-12">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-2 border-b border-ice-300 pb-6">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-ice-200 text-teal-700">
            UI Kit & Tokens (U1–U9)
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink-800">PACT Design System & Styleguide</h1>
        <p className="text-sm text-ink-600">
          Living documentation of all accessible components in every state, rendered on ice-50 and white cards.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Section 1: Brand & Logo */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">1. Brand & Mark (U1)</h2>
          <Card className="flex flex-wrap items-center gap-8 bg-ice-200 border-ice-300">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-ink-600">Logo Lockup (Large)</span>
              <div><Logo size="lg" /></div>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-ink-600">Logo Lockup (Medium)</span>
              <div><Logo size="md" /></div>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-ink-600">Logo Lockup (Small)</span>
              <div><Logo size="sm" /></div>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-ink-600">Mark Alone (P glyph)</span>
              <div><Mark size={40} /></div>
            </div>
          </Card>
        </section>

        {/* Section 2: Typography & Money */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">2. Typography & Money (U3, C6)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-ink-500 tracking-wider">Type Stack</h3>
              <p className="font-display text-3xl text-ink-800">DM Serif Display (30/36)</p>
              <p className="font-display text-xl text-ink-800">Card & Section Titles (22/28)</p>
              <p className="text-base text-ink-800">Interface body font in DM Sans (16/24). Clean and high contrast.</p>
              <p className="text-sm text-ink-600">Secondary text and helper labels in ink-600.</p>
              <p className="font-hindi text-base text-ink-800">हिंदी वर्णमाला (Noto Sans Devanagari fallback: चावल, दाल, आटा, तेल)</p>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-ink-500 tracking-wider">MoneyText (Paise & Tabular)</h3>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Display / Headline:</span>
                  <MoneyText paise={72000} size="display" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Non-zero paise:</span>
                  <MoneyText paise={71667} size="xl" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Indian Grouping (Crores):</span>
                  <MoneyText paise={1234567890} size="lg" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Estimated (approx):</span>
                  <MoneyText paise={30000} approx size="base" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Struck-through MRP:</span>
                  <MoneyText paise={34000} strikeThrough size="sm" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Section 3: Buttons */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">3. Buttons (U5)</h2>
          <Card className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-ink-500 mb-3">52px Primary & Secondary (Mobile Standard)</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary (ink-800)</Button>
                <Button variant="secondary">Secondary (White)</Button>
                <Button variant="quiet">Quiet (teal-700)</Button>
                <Button variant="danger">Danger (danger-700)</Button>
                <Button variant="primary" isLoading>Loading...</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-ink-500 mb-3">44px Compact Size</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="sm">Primary Sm</Button>
                <Button variant="secondary" size="sm">Secondary Sm</Button>
                <Button variant="quiet" size="sm">Quiet Sm</Button>
                <Button variant="danger" size="sm">Danger Sm</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 4: Form Controls */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">4. Inputs & Controls (U5)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-4">
              <PhoneField
                label="Mobile number (PhoneField)"
                value={phoneVal}
                onChange={setPhoneVal}
                helperText="We will send a 6-digit verification code."
              />

              <TextField
                label="Building join code (TextField)"
                placeholder="e.g. GREEN1"
                defaultValue="GREEN1"
                helperText="Ask your building committee for the code."
              />

              <TextField
                label="Error State Example"
                defaultValue="Invalid"
                error="GSTIN checksum did not match format."
              />
            </Card>

            <Card className="space-y-6 flex flex-col justify-between">
              <div>
                <label className="text-sm font-medium text-ink-800 block mb-2">
                  6-Digit OTP Code (OtpInput)
                </label>
                <OtpInput value={otpVal} onChange={setOtpVal} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-ice-100">
                <span className="text-sm font-medium text-ink-800">Stepper (U5)</span>
                <Stepper value={stepperVal} onChange={setStepperVal} min={0} max={10} />
              </div>
            </Card>
          </div>
        </section>

        {/* Section 5: Status Pills & Chips */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">5. Status Pills & Chips (U5)</h2>
          <Card className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-ink-500 mb-3">Status Pills (5 Kinds)</h4>
              <div className="flex flex-wrap gap-2">
                <StatusPill kind="neutral" label="Draft" />
                <StatusPill kind="info" label="Sent to store" />
                <StatusPill kind="warning" label="Closing soon" />
                <StatusPill kind="success" label="Paid & Packed" />
                <StatusPill kind="danger" label="Payment failed" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-ink-500 mb-3">Category & Variant Chips</h4>
              <div className="flex flex-wrap gap-2">
                <Chip selected>All Groceries</Chip>
                <Chip>Rice & Grains</Chip>
                <Chip>Flours & Atta</Chip>
                <Chip>Cooking Oils & Ghee</Chip>
                <Chip size="sm" selected>5 kg</Chip>
                <Chip size="sm">1 kg</Chip>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 6: Timeline & Progress */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">6. Timeline & Progress (U5)</h2>
          <Card className="space-y-6">
            <MonthTimeline currentStep={3} />
            <div className="pt-4 border-t border-ice-100">
              <ProgressBar
                value={1890}
                max={2250}
                label="₹1,890 of ₹2,250 received"
              />
            </div>
          </Card>
        </section>

        {/* Section 7: Banners & Toast */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">7. Banners & Notifications (U5)</h2>
          <div className="space-y-3">
            <Banner
              kind="info"
              message="Ordering for Nov 2026 closes on 24 Nov at midnight."
              actionLabel="View building order"
              onAction={() => alert("Action triggered")}
            />
            <Banner
              kind="warning"
              message="The store had less than requested: 1 of 2 bags packed."
              actionLabel="Check bill"
              onAction={() => alert("Action triggered")}
            />
            <Banner
              kind="danger"
              message="Your payment did not go through. You have not been charged. Try again."
              actionLabel="Retry"
              onAction={() => alert("Action triggered")}
            />
            <div className="pt-2">
              <Button variant="secondary" onClick={() => setIsToastOpen(true)}>
                Show Bottom Toast (5s with Undo)
              </Button>
            </div>
          </div>
        </section>

        {/* Section 8: DataTable */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">8. Data Table (Desktop & Mobile Stack)</h2>
          <DataTable
            columns={tableColumns}
            data={sampleTableData}
            keyExtractor={(item) => item.id}
          />
        </section>

        {/* Section 9: Empty States & Skeletons */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">9. Empty States & Skeletons (U5, U9)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8" />}
              title="Your list is empty"
              description="Add your monthly staple groceries before 24 Nov midnight."
              actionLabel="Browse catalogue"
              onAction={() => alert("Navigate to shop")}
            />

            <Card className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-ink-500">Skeleton Loading States</h4>
              <div className="flex items-center gap-3">
                <Skeleton circle width={48} height={48} />
                <div className="space-y-2 flex-1">
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={12} width="40%" />
                </div>
              </div>
              <Skeleton height={64} className="w-full" />
              <Skeleton height={32} width="80%" />
            </Card>
          </div>
        </section>

        {/* Section 10: MicButton (Voice) */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">10. Voice Mic Button (U5)</h2>
          <Card className="flex flex-wrap items-center justify-around gap-6">
            <div className="space-y-2 text-center">
              <span className="text-xs font-semibold text-ink-500">Idle</span>
              <MicButton state="idle" onClick={() => setMicState("listening")} />
            </div>
            <div className="space-y-2 text-center">
              <span className="text-xs font-semibold text-ink-500">Listening (Pulse)</span>
              <MicButton state="listening" onClick={() => setMicState("error")} />
            </div>
            <div className="space-y-2 text-center">
              <span className="text-xs font-semibold text-ink-500">Error Outline</span>
              <MicButton state="error" onClick={() => setMicState("idle")} />
            </div>
          </Card>
        </section>

        {/* Section 11: Modals */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-ink-800">11. Dialog & Bottom Sheet (U5)</h2>
          <Card className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
              Open Confirmation Dialog
            </Button>
            <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
              Open Slide-out Sheet
            </Button>
          </Card>
        </section>
      </div>

      {/* Interactive Modal Instances */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Finalise this month's bill?"
        description="This will lock all prices and quantities, generate 4 individual customer bills, and notify residents to pay."
        confirmLabel="Finalise bill"
        cancelLabel="Go back"
        onConfirm={() => {
          alert("Bill finalised");
          setIsDialogOpen(false);
        }}
      />

      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Stock Movement History"
      >
        <p className="text-sm text-ink-600">
          Recent stock movements for Sona Masoori Rice (5 kg):
        </p>
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-300 text-xs">
            <b>+100 packs</b> replenishment on 1 Nov
          </div>
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-300 text-xs">
            <b>-6 packs</b> reserved for Green Meadows
          </div>
        </div>
      </Sheet>

      <Toast
        isOpen={isToastOpen}
        onClose={() => setIsToastOpen(false)}
        message="Item removed from your list"
        undoLabel="Undo"
        onUndo={() => alert("Item restored")}
      />
    </div>
  );
}
