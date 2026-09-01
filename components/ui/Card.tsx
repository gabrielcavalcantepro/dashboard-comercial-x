import clsx from "clsx";

type Variant = "default" | "raised" | "outline" | "flat";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "bg-[var(--color-surface)] border border-[var(--color-border)]",
  raised:
    "bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-[0_30px_60px_-32px_rgba(0,0,0,0.7)]",
  outline: "bg-transparent border border-[var(--color-border-strong)]",
  flat: "bg-[var(--color-surface-sunken)] border border-transparent",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={clsx("rounded-[var(--radius-lg)]", variants[variant], className)}
      {...props}
    />
  );
}
