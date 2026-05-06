type TagVariant = "neutral" | "solid" | "edu" | "youth" | "parent" | "bot" | "danger";

export function Tag({
  children, variant = "neutral", dot = false, live = false, style,
}: {
  children: React.ReactNode;
  variant?: TagVariant;
  dot?: boolean;
  live?: boolean;
  style?: React.CSSProperties;
}) {
  const className = `tag${variant !== "neutral" ? ` ${variant}` : ""}${dot ? " dot" : ""}${live ? " live dot" : ""}`;
  return <span className={className} style={style}>{children}</span>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span className="eyebrow" style={style}>{children}</span>;
}

export function SoftBlob({
  color, size = 200, top, left, right, bottom, opacity = 0.35,
}: {
  color: string;
  size?: number;
  top?: number; left?: number; right?: number; bottom?: number;
  opacity?: number;
}) {
  return (
    <div className="softblob" style={{
      width: size, height: size, background: color, opacity,
      top, left, right, bottom,
    }} />
  );
}
