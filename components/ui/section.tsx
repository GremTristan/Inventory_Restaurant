export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </section>
  );
}
