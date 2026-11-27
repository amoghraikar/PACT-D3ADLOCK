import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Clock, Mic, Receipt, ShoppingBag, Store, Users } from "lucide-react";
import {
  formatDateTimeIST,
  type CartResponseDTO,
  type NotificationItemDTO,
  type VoiceInterpretResponseDTO,
} from "@pact/shared";
import {
  Button,
  Card,
  EmptyState,
  Money,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { cartService, notificationsService, voiceService } from "@/lib/services";

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Cutoff reached";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState<CartResponseDTO | null>(null);
  const [notifs, setNotifs] = useState<NotificationItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickSeconds, setTickSeconds] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [cartRes, notifRes] = await Promise.all([
          cartService.getCart(),
          notificationsService.list(false),
        ]);
        if (active) {
          setCart(cartRes);
          setTickSeconds(cartRes.cycle.time_remaining_seconds);
          setNotifs(notifRes.slice(0, 4));
        }
      } catch (err) {
        if (active) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (tickSeconds <= 0) return;
    const id = setInterval(() => {
      setTickSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [tickSeconds]);

  const primaryComm = user?.communities[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user?.full_name ?? "Resident"}`}
        subtitle={
          primaryComm
            ? `${primaryComm.community_name}${primaryComm.unit_number ? ` · Flat ${primaryComm.unit_number}` : ""}`
            : "Household Workspace"
        }
        action={
          <>
            <Link to="/customer/voice">
              <Button variant="outline" size="sm">
                <Mic className="w-4 h-4 mr-1.5 text-primary" />
                Voice Order
              </Button>
            </Link>
            <Link to="/customer/shop">
              <Button variant="primary" size="sm">
                <Store className="w-4 h-4 mr-1.5" />
                Browse Catalogue
              </Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 md:col-span-3" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !cart ? (
        <EmptyState
          title="Community Cycle Unavailable"
          description="Verify your apartment membership to access this month's collective basket."
          action={
            <Link to="/onboarding">
              <Button size="sm">Join Community</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Monthly Cycle {cart.cycle.cycle_month}
                </span>
                <StatusBadge status={cart.cycle.status} />
              </div>
              <h2 className="text-lg font-semibold text-text">{cart.cycle.community_name}</h2>
              <p className="text-xs text-muted">
                Cutoff: {formatDateTimeIST(cart.cycle.cutoff_at)} IST
              </p>
            </div>

            <div className="flex flex-wrap gap-4 bg-background border border-border rounded-ctl p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-[11px] text-muted">Time Remaining</div>
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {formatCountdown(tickSeconds)}
                  </div>
                </div>
              </div>
              <div className="w-px bg-border" />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-[11px] text-muted">Households Participating</div>
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {cart.community_summary.participating_households_count}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-muted text-xs font-medium">
                  <span>Personal Basket</span>
                  <ShoppingBag className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-semibold text-text mt-2">
                  <Money paise={cart.personal_total_paise} />
                </div>
                <p className="text-xs text-muted mt-1">{cart.items.length} distinct items</p>
              </div>
              <Link to="/customer/cart" className="text-xs font-semibold text-primary hover:underline">
                Manage personal items &rarr;
              </Link>
            </Card>

            <Card className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-muted text-xs font-medium">
                  <span>Community Bulk Pool</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-semibold text-text mt-2">
                  <Money paise={cart.community_summary.estimated_total_paise} approx />
                </div>
                <p className="text-xs text-muted mt-1">
                  {cart.community_summary.total_units_count} total units across{" "}
                  {cart.community_summary.participating_households_count} households
                </p>
              </div>
              <Link to="/customer/cart" className="text-xs font-semibold text-primary hover:underline">
                View community totals &rarr;
              </Link>
            </Card>

            <Card className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-muted text-xs font-medium">
                  <span>Settlement &amp; Bills</span>
                  <Receipt className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-text mt-2">
                  View finalized F7 invoices with proportional discounts and actual packed quantities.
                </p>
              </div>
              <Link to="/customer/bill" className="text-xs font-semibold text-primary hover:underline">
                Open current bill &rarr;
              </Link>
            </Card>
          </div>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-text">
                <Bell className="w-4 h-4 text-primary" />
                <span>Recent Updates</span>
              </div>
              <Link to="/customer/notifications" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            {notifs.length === 0 ? (
              <p className="text-xs text-muted py-2">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {notifs.map((n) => (
                  <div key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text">{n.title}</p>
                      <p className="text-xs text-muted">{n.message}</p>
                    </div>
                    {!n.is_read && <StatusBadge status="NEW" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export function CustomerVoicePage() {
  const toast = useToast();
  const [language, setLanguage] = useState<"en-IN" | "hinglish" | "hi-IN">("hinglish");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<VoiceInterpretResponseDTO | null>(null);
  const [selectedClarifications, setSelectedClarifications] = useState<
    Record<number, { variant_id: string; quantity: number; title: string; price: number }>
  >({});

  const toggleMic = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      toast.info("Browser speech recognition unavailable here; type your grocery list below.");
      return;
    }
    const rec = new SpeechRec();
    rec.lang = language === "hi-IN" ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error("Could not capture speech audio.");
    };
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text) setTranscript((prev) => (prev ? `${prev}, ${text}` : text));
    };
    rec.start();
  };

  const handleInterpret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    setInterpreting(true);
    setSelectedClarifications({});
    try {
      const res = await voiceService.interpret(transcript.trim(), language);
      setResult(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to interpret list");
    } finally {
      setInterpreting(false);
    }
  };

  const itemsToConfirm = result
    ? result.items
        .map((item, idx) => {
          if (item.status === "matched" && item.variant_id) {
            return { variant_id: item.variant_id, quantity: item.pack_multiplier || 1 };
          }
          const picked = selectedClarifications[idx];
          if (picked) {
            return { variant_id: picked.variant_id, quantity: Math.max(1, Math.round(picked.quantity)) };
          }
          return null;
        })
        .filter((x): x is { variant_id: string; quantity: number } => x !== null)
    : [];

  const handleConfirm = async () => {
    if (itemsToConfirm.length === 0) return;
    setCommitting(true);
    try {
      const res = await voiceService.confirm(itemsToConfirm);
      toast.success(`Added ${res.added_count} item(s) to your personal cart.`);
      setResult(null);
      setTranscript("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add items to cart");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice Order Assistant"
        subtitle="Speak or type in English, Hindi (Devanagari), or Hinglish. Nothing is added until you confirm."
      />

      <Card className="p-5 space-y-4">
        <form onSubmit={handleInterpret} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(["hinglish", "en-IN", "hi-IN"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-medium border cursor-pointer ${
                    language === lang
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text border-border"
                  }`}
                >
                  {lang === "hinglish" ? "Hinglish" : lang === "hi-IN" ? "Hindi" : "English"}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={toggleMic}>
              <Mic className={`w-4 h-4 mr-1.5 ${listening ? "text-danger-700 animate-pulse" : "text-primary"}`} />
              {listening ? "Listening..." : "Speak List"}
            </Button>
          </div>

          <textarea
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="e.g., do kilo chawal, aadha kilo cheeni aur ek litre amul milk"
            className="w-full p-3 bg-surface border border-border rounded-ctl text-sm text-text focus-ring"
            style={{ fontFamily: language === "hi-IN" ? "var(--font-hindi)" : undefined }}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={interpreting} disabled={!transcript.trim()}>
              Interpret Items
            </Button>
          </div>
        </form>
      </Card>

      {result && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">Review Before Adding to Cart</h2>
              <p className="text-xs text-muted">
                Matched {result.summary.matched_count} · Needs selection{" "}
                {result.summary.clarification_needed_count} · Unmatched{" "}
                {result.summary.unmatched_count}
              </p>
            </div>
            <Button
              onClick={handleConfirm}
              isLoading={committing}
              disabled={itemsToConfirm.length === 0}
            >
              Confirm &amp; Add ({itemsToConfirm.length})
            </Button>
          </div>

          <div className="divide-y divide-border">
            {result.items.map((item, idx) => {
              const picked = selectedClarifications[idx];
              return (
                <div key={idx} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">
                          Heard: &ldquo;{item.heard}&rdquo;
                        </span>
                        <StatusBadge status={picked ? "matched" : item.status} />
                      </div>
                      {item.status === "matched" && (
                        <p className="text-xs text-muted mt-1">
                          {item.product_title} — {item.variant_title} &times; {item.pack_multiplier}{" "}
                          (<Money paise={item.estimated_total_paise} />)
                        </p>
                      )}
                      {picked && (
                        <p className="text-xs text-success-700 mt-1">
                          Selected: {picked.title} &times; {picked.quantity} (
                          <Money paise={picked.price * picked.quantity} />)
                        </p>
                      )}
                      {item.clarification_question && !picked && (
                        <p className="text-xs text-muted mt-1">{item.clarification_question}</p>
                      )}
                    </div>
                  </div>

                  {item.needs_clarification && item.clarification_options.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.clarification_options.map((opt) => (
                        <button
                          key={opt.variant_id}
                          type="button"
                          onClick={() =>
                            setSelectedClarifications((prev) => ({
                              ...prev,
                              [idx]: {
                                variant_id: opt.variant_id,
                                quantity: opt.quantity,
                                title: opt.variant_title,
                                price: opt.price_paise,
                              },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-ctl border text-xs cursor-pointer ${
                            picked?.variant_id === opt.variant_id
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background text-text hover:border-primary"
                          }`}
                        >
                          {opt.variant_title} (<Money paise={opt.price_paise} />)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
