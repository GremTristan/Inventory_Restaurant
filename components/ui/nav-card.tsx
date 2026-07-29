import Link from "next/link";
import { cn } from "@/lib/utils";

type State = "neutral" | "highlighted" | "muted";

const STATE_CLASSES: Record<State, string> = {
  neutral: "border-border bg-card hover:border-accent hover:bg-muted/50",
  highlighted: "border-accent bg-accent/5 hover:bg-accent/10",
  muted: "border-border bg-card opacity-60 hover:opacity-100",
};

const ARROW_CLASSES: Record<State, string> = {
  neutral: "text-accent",
  highlighted: "text-accent",
  muted: "text-muted-foreground",
};

export function NavCard({
  href,
  title,
  description,
  state = "neutral",
}: {
  href: string;
  title: string;
  description: string;
  state?: State;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors",
        STATE_CLASSES[state]
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <span className={cn("transition-transform group-hover:translate-x-0.5", ARROW_CLASSES[state])}>→</span>
    </Link>
  );
}
