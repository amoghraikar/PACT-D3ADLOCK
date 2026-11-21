import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * PACT Logo Component (U1 Brand)
 * Built from pact-logo-lockup.png
 * Placed on ice-200 surfaces where it sits seamlessly.
 * Minimum width 96px, preserves aspect ratio.
 */
export function Logo({ href = "/", className = "", size = "md" }: LogoProps) {
  const heightMap = {
    sm: 32, // 64px width
    md: 40, // 80px width
    lg: 56, // 112px width
  };

  const height = heightMap[size];
  const width = Math.round(height * 2.0); // 607x304 aspect ratio is ~2:1

  const content = (
    <div className={`inline-flex items-center select-none ${className}`}>
      <Image
        src="/brand/pact-logo-lockup.png"
        alt="PACT"
        width={width}
        height={height}
        priority
        className="object-contain h-auto"
        style={{ width: `${Math.max(96, width)}px`, height: "auto" }}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block focus-ring rounded-ctl">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * PACT Mark alone (the P glyph)
 * For app icons, favicons, or compact headers
 */
export function Mark({ className = "", size = 32 }: { className?: string; size?: number }) {
  const width = Math.round(size * (217 / 304));
  return (
    <Image
      src="/brand/pact-mark.png"
      alt="PACT"
      width={width}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: `${width}px`, height: `${size}px` }}
    />
  );
}
