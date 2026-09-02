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
    <section className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-card bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </section>
  );
}
