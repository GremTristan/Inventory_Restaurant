import type { PendingReminder } from "@/lib/sales-store";
import type { SiteId } from "@/types";
import { markReminderCompleteAction } from "@/lib/reminder-actions";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

const REMINDER_TEXT: Record<PendingReminder["kind"], string> = {
  "daily-sales": "Vous devez saisir les chiffres de la caisse du jour.",
  "monthly-inventory": "Vous devez faire l'inventaire du mois.",
};

export function RemindersBanner({
  siteId,
  pending,
}: {
  siteId: SiteId;
  pending: PendingReminder[];
}) {
  if (pending.length === 0) return null;

  return (
    <div className="mb-6">
      <Section title="Notifications" description="Tâches en attente pour cet établissement.">
        <ul className="flex flex-col gap-2">
          {pending.map((reminder) => (
            <li
              key={reminder.kind}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted px-4 py-2.5"
            >
              <span className="text-sm text-foreground">{REMINDER_TEXT[reminder.kind]}</span>
              <form action={markReminderCompleteAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="kind" value={reminder.kind} />
                <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                  Marquer comme fait
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
