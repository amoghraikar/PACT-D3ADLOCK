import React from "react";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: "default" | "sm";
  icon?: React.ReactNode;
}

export function Chip({
  children,
  selected = false,
  size = "default",
  icon,
  className = "",
  ...props
}: ChipProps) {
  const sizeClasses = size === "default" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs";

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-pill font-medium select-none cursor-pointer transition-all duration-150 whitespace-nowrap focus-ring ${sizeClasses} ${
        selected
          ? "bg-ink-800 text-white hover:bg-ink-900"
          : "bg-white text-ink-800 border border-ice-300 hover:bg-ice-100"
      } ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export interface TabsProps {
  items: { id: string; label: string; count?: number }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {items.map((item) => (
        <Chip key={item.id} selected={item.id === activeId} onClick={() => onChange(item.id)}>
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span
              className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                item.id === activeId ? "bg-ink-900 text-ice-200" : "bg-ice-100 text-ink-600"
              }`}
            >
              {item.count}
            </span>
          )}
        </Chip>
      ))}
    </div>
  );
}
