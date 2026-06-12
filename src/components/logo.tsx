import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  showTagline?: boolean;
  theme?: "light" | "dark" | "auto";
}

const sizeConfig = {
  sm: { img: 82 },
  md: { img: 112 },
  lg: { img: 154 },
};

export function Logo({ className, size = "md", href, showTagline, theme = "auto" }: LogoProps) {
  const { img } = sizeConfig[size];

  const crewColorClass = 
    theme === "light" 
      ? "text-slate-800" 
      : theme === "dark" 
        ? "text-white" 
        : "text-slate-800 dark:text-white";

  const crewColorStyle = 
    theme === "light" 
      ? { color: "#1e293b" } 
      : theme === "dark" 
        ? { color: "#ffffff" } 
        : { color: "var(--text-main)" };

  const taglineClass = 
    theme === "light"
      ? "text-slate-400 border-slate-200"
      : theme === "dark"
        ? "text-white/30 border-white/10"
        : "text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/10";

  const taglineStyle = 
    theme === "light"
      ? { color: "#94a3b8", borderColor: "#e2e8f0" }
      : theme === "dark"
        ? { color: "rgba(255, 255, 255, 0.3)", borderColor: "rgba(255, 255, 255, 0.1)" }
        : { color: "var(--text-muted)", borderColor: "var(--border)" };

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span 
        className="font-bold"
        style={{ fontSize: size === 'sm' ? '1.1rem' : size === 'md' ? '1.35rem' : '1.75rem', letterSpacing: '-0.5px' }}
      >
        <span style={{ color: 'var(--brand-teal, #0D9488)' }}>Elasti</span>
        <span className={crewColorClass} style={crewColorStyle}>Crew</span>
      </span>
      {showTagline && (
        <span className={cn("text-xs border-l pl-2.5 ml-1", taglineClass)} style={taglineStyle}>
          Interview Platform
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

/** Compact inline icon-only brand mark for tight spaces */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Video camera icon */}
        <path
          d="M1 4.5C1 3.67 1.67 3 2.5 3H9.5C10.33 3 11 3.67 11 4.5V11.5C11 12.33 10.33 13 9.5 13H2.5C1.67 13 1 12.33 1 11.5V4.5Z"
          fill="white"
          fillOpacity="0.9"
        />
        <path
          d="M11 6.2L14.5 4.5V11.5L11 9.8V6.2Z"
          fill="white"
          fillOpacity="0.7"
        />
      </svg>
    </div>
  );
}
