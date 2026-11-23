"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState, Modal } from "@/components/ui";
import { platformService, AuditLogItem } from "@/services/platform.service";
import { useToast } from "@/hooks/useToast";
import { Shield, ArrowLeft, Clock, Eye, FileText, CheckCircle2 } from "lucide-react";

export default function PlatformAuditLogsPage() {
  const { error: toastError } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const data = await platformService.getAuditLogs({ limit: 50 });
        setLogs(data || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/platform"
                className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              System Audit Logs
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Append-only tamper-evident audit trail for security compliance and billing events
            </p>
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Audit Records Found"
            description="System operations and mutation events will record here."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor / Phone</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Entity ID</th>
                    <th className="p-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3 text-muted text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-text">
                        {log.user_phone || "System"}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-primary">{log.action}</span>
                      </td>
                      <td className="p-3 text-text">{log.entity_type}</td>
                      <td className="p-3 text-muted text-[11px] truncate max-w-[120px]">
                        {log.entity_id}
                      </td>
                      <td className="p-3 text-right">
                        {(log.payload_before || log.payload_after) && (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-2 py-1 rounded border border-border text-[11px] font-sans font-semibold text-text hover:bg-background cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-muted" />
                            <span>Inspect</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Payload Detail Modal */}
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog?.action} (${selectedLog?.entity_type})`}
          confirmLabel="Close"
          onConfirm={() => setSelectedLog(null)}
          size="lg"
        >
          {selectedLog && (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 text-muted">
                <div>Entity ID: {selectedLog.entity_id}</div>
                <div>Timestamp: {new Date(selectedLog.created_at).toLocaleString()}</div>
              </div>

              {selectedLog.payload_before && (
                <div>
                  <span className="font-bold text-muted block mb-1">Payload Before:</span>
                  <pre className="p-3 bg-background rounded-card border border-border text-[11px] overflow-x-auto text-text">
                    {selectedLog.payload_before}
                  </pre>
                </div>
              )}

              {selectedLog.payload_after && (
                <div>
                  <span className="font-bold text-primary block mb-1">Payload After:</span>
                  <pre className="p-3 bg-background rounded-card border border-border text-[11px] overflow-x-auto text-text">
                    {selectedLog.payload_after}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
