import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  variant?: "card" | "text" | "circle";
}

export function Skeleton({
  width,
  height,
  circle = false,
  variant,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const isCircle = circle || variant === "circle";
  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      className={`animate-pulse bg-ice-100 ${isCircle ? "rounded-full" : "rounded-ctl"} ${className}`}
      style={dynamicStyle}
      aria-hidden="true"
      {...props}
    />
  );
}
