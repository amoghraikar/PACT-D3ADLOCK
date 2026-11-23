import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl text-text tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>

      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
