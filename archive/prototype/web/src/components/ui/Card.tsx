import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "default" | "lg";
  as?: React.ElementType;
}

export function Card({
  children,
  padding = "default",
  as: Component = "div",
  className = "",
  ...props
}: CardProps) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-3 sm:p-4",
    default: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <Component
      className={`bg-white border border-ice-300 rounded-card ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
