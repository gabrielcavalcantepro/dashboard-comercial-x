interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-baseline gap-2.5">
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-accent)]" />
        <h2 className="text-[19px] font-semibold text-[var(--color-text)]">{title}</h2>
        {description && (
          <span className="text-[13px] text-[var(--color-text-faint)]">{description}</span>
        )}
      </div>
      {action}
    </div>
  );
}
