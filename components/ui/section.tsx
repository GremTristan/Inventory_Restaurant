// Health apps use a plain text heading above a card group, never a
// bordered card-with-a-colored-header-strip — the old bordered bg-muted
// header band was the most "admin panel" element in the primitive layer.
// Props are unchanged so every call site keeps working with zero edits.
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
    <section>
      <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 rounded-card bg-card p-4 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)] sm:p-6">
        {children}
      </div>
    </section>
  );
}
