import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  formatDateTimeIST,
  type AuditLogDTO,
  type PlatformCommunityDTO,
  type PlatformConfigDTO,
  type PlatformOverviewDTO,
  type PlatformRetailerDTO,
} from "@pact/shared";
import {
  Button,
  Card,
  Input,
  Modal,
  Money,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { platformService } from "@/lib/services";

export function PlatformDashboardPage() {
  const [overview, setOverview] = useState<PlatformOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformService
      .getOverview()
      .then(setOverview)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Operations" subtitle="Multi-community system overview and telemetry" />
      {loading || !overview ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-xs text-muted">Communities</span>
            <div className="text-2xl font-semibold mt-1">{overview.communities_count}</div>
            <span className="text-[11px] text-muted">{overview.active_communities_count} active</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">Partner Retailers</span>
            <div className="text-2xl font-semibold mt-1">{overview.retailers_count}</div>
            <span className="text-[11px] text-muted">{overview.users_count} registered users</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">Platform GMV</span>
            <div className="text-2xl font-semibold mt-1">
              <Money paise={overview.gmv_paise} />
            </div>
            <span className="text-[11px] text-muted">{overview.orders_count} bulk orders</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">PostgreSQL Status</span>
            <div className="mt-2">
              <StatusBadge status={overview.database_status} />
            </div>
            <span className="text-[11px] text-muted block mt-1">
              Collected: <Money paise={overview.collected_paise} />
            </span>
          </Card>
        </div>
      )}
    </div>
  );
}

export function PlatformCommunitiesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PlatformCommunityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [postalCode, setPostalCode] = useState("560102");

  const load = () => {
    setLoading(true);
    platformService
      .getCommunities()
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await platformService.createCommunity({
        name,
        code,
        address,
        city,
        postal_code: postalCode,
      });
      toast.success("Community registered.");
      setOpen(false);
      setName("");
      setCode("");
      setAddress("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create community");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Community
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Community</th>
                <th className="p-3">Code</th>
                <th className="p-3">Mapped Retailer</th>
                <th className="p-3 text-right">Households</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">
                      {c.address}, {c.city}
                    </div>
                  </td>
                  <td className="p-3 text-xs font-mono">{c.code}</td>
                  <td className="p-3 text-xs">{c.mapped_retailer_name ?? "Unassigned"}</td>
                  <td className="p-3 text-right tabular-nums">{c.members_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Register Community">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Invite Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input
              label="Postal Code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PlatformRetailersPage() {
  const toast = useToast();
  const [retailers, setRetailers] = useState<PlatformRetailerDTO[]>([]);
  const [communities, setCommunities] = useState<PlatformCommunityDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  const [mapOpen, setMapOpen] = useState(false);
  const [mapRetailerId, setMapRetailerId] = useState("");
  const [mapCommId, setMapCommId] = useState("");
  const [mapFeeRupees, setMapFeeRupees] = useState("150");

  const load = () => {
    setLoading(true);
    Promise.all([platformService.getRetailers(), platformService.getCommunities()])
      .then(([r, c]) => {
        setRetailers(r);
        setCommunities(c);
        if (r[0]) setMapRetailerId(r[0].id);
        if (c[0]) setMapCommId(c[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await platformService.createRetailer({
        owner_name: ownerName,
        phone,
        store_name: storeName,
        business_address: address,
        gstin: gstin || undefined,
      });
      toast.success("Retailer registered.");
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create retailer");
    }
  };

  const handleMap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await platformService.mapRetailer({
        retailer_id: mapRetailerId,
        community_id: mapCommId,
        delivery_fee_paise: Math.round(Number(mapFeeRupees || 0) * 100),
      });
      toast.success("Retailer mapped to community.");
      setMapOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mapping failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner Retailers"
        action={
          <>
            <Button variant="outline" size="sm" onClick={() => setMapOpen(true)}>
              Map to Community
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Retailer
            </Button>
          </>
        }
      />

      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Store</th>
                <th className="p-3">Owner / Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Mapped Communities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {retailers.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">
                    <div className="font-medium">{r.store_name}</div>
                    <div className="text-xs text-muted">{r.business_address}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {r.owner_name} · {r.phone}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.mapped_communities_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Register Retailer">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          <Input label="Mobile Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
          <Input label="Business Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <Input label="GSTIN (optional)" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Register</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={mapOpen} onClose={() => setMapOpen(false)} title="Map Retailer to Community">
        <form onSubmit={handleMap} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Retailer</label>
            <select
              value={mapRetailerId}
              onChange={(e) => setMapRetailerId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-ctl text-sm bg-surface"
            >
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.store_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Community</label>
            <select
              value={mapCommId}
              onChange={(e) => setMapCommId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-ctl text-sm bg-surface"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Default Delivery Fee (₹)"
            type="number"
            value={mapFeeRupees}
            onChange={(e) => setMapFeeRupees(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMapOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Mapping</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PlatformOrdersPage() {
  const [orders, setOrders] = useState<
    {
      id: string;
      order_number: string;
      cycle_month: string;
      community_name: string;
      retailer_name: string;
      status: string;
      total_requested_items: number;
      total_packed_items: number;
      total_paise: number;
      placed_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformService
      .getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="All Consolidated Orders" />
      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Order</th>
                <th className="p-3">Community / Retailer</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Units</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3">
                    <div className="font-medium">{o.order_number}</div>
                    <div className="text-xs text-muted">Cycle {o.cycle_month}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {o.community_name} &rarr; {o.retailer_name}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {o.total_packed_items}/{o.total_requested_items}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    <Money paise={o.total_paise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogDTO | null>(null);

  useEffect(() => {
    platformService
      .getAuditLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="System Audit Logs" subtitle="Immutable operational & financial history" />
      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Actor</th>
                <th className="p-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="p-3 text-xs text-muted whitespace-nowrap">
                    {formatDateTimeIST(l.created_at)}
                  </td>
                  <td className="p-3 font-mono text-xs">{l.action}</td>
                  <td className="p-3 text-xs">
                    {l.entity_type} ({l.entity_id.slice(0, 8)})
                  </td>
                  <td className="p-3 text-xs">{l.actor_name ?? "System"}</td>
                  <td className="p-3 text-right">
                    {l.payload_after && (
                      <Button variant="ghost" size="sm" onClick={() => setSelected(l)}>
                        Inspect
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.action ?? "Payload"}
      >
        <pre className="text-xs bg-background border border-border rounded-ctl p-3 overflow-x-auto">
          {selected?.payload_after}
        </pre>
      </Modal>
    </div>
  );
}

export function PlatformSettingsPage() {
  const toast = useToast();
  const [cfg, setCfg] = useState<PlatformConfigDTO | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    platformService.getConfig().then(setCfg);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    try {
      setCfg(await platformService.updateConfig(cfg));
      toast.success("Platform configuration updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Configuration" subtitle="Asia/Kolkata cutoff schedule & rate limits" />
      {!cfg ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="p-5 max-w-lg">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Cutoff Day (1-28)"
                type="number"
                min={1}
                max={28}
                value={cfg.cutoff_day}
                onChange={(e) => setCfg({ ...cfg, cutoff_day: Number(e.target.value) })}
              />
              <Input
                label="Hour (IST 0-23)"
                type="number"
                min={0}
                max={23}
                value={cfg.cutoff_hour}
                onChange={(e) => setCfg({ ...cfg, cutoff_hour: Number(e.target.value) })}
              />
              <Input
                label="Minute (0-59)"
                type="number"
                min={0}
                max={59}
                value={cfg.cutoff_minute}
                onChange={(e) => setCfg({ ...cfg, cutoff_minute: Number(e.target.value) })}
              />
            </div>
            <Input
              label="Payment Reminder Rate Limit (minutes)"
              type="number"
              min={1}
              max={1440}
              value={cfg.reminder_rate_limit_minutes}
              onChange={(e) =>
                setCfg({ ...cfg, reminder_rate_limit_minutes: Number(e.target.value) })
              }
            />
            <Button type="submit" isLoading={saving}>
              Save Settings
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
