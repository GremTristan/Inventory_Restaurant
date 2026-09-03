"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChefHat, Delete, HandPlatter } from "lucide-react";
import { loginWithPinAction, type FormState } from "@/lib/auth/actions";
import { ROLE_LABELS, type User } from "@/types";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 4;

// Two taps to work: tap your name, type 4 digits. Submits itself on the
// 4th digit — no "Valider" button to hunt for.
export function PinLogin({ staff }: { staff: User[] }) {
  const [selected, setSelected] = useState<User | null>(staff.length === 1 ? staff[0] : null);
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginWithPinAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pin.length === PIN_LENGTH && selected && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [pin, selected, pending]);

  // A wrong PIN clears the pad so the next attempt starts clean.
  const [handledState, setHandledState] = useState<FormState>(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.error) setPin("");
  }

  if (staff.length === 0) {
    return (
      <p className="rounded-lg bg-muted p-6 text-center text-base text-muted-foreground">
        Aucun membre de l’équipe n’est encore enregistré pour cet établissement. La direction peut en ajouter depuis
        « Équipe ».
      </p>
    );
  }

  if (!selected) {
    return (
      <div>
        <p className="mb-5 text-center text-[20px] font-bold tracking-tight text-foreground">Qui êtes-vous ?</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {staff.map((member) => {
            const Icon = member.role === "cook" ? ChefHat : HandPlatter;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelected(member)}
                className="flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-lg border border-border bg-card p-5 text-center transition-transform active:scale-[0.97] hover:bg-muted/60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">{member.name}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <form ref={formRef} action={formAction} className="mx-auto w-full max-w-xs">
      <input type="hidden" name="userId" value={selected.id} />
      <input type="hidden" name="pin" value={pin} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-foreground">{selected.name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[selected.role]}</p>
        </div>
        {staff.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setPin("");
            }}
            className="min-h-11 rounded-md px-4 text-sm font-medium text-accent hover:bg-accent/10"
          >
            Changer
          </button>
        )}
      </div>

      <div className="mb-5 flex justify-center gap-4" aria-label="Code saisi">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-4 rounded-full border-2 border-accent transition-colors",
              i < pin.length ? "bg-accent" : "bg-transparent",
              state.error && "border-destructive"
            )}
          />
        ))}
      </div>

      <p className="mb-3 min-h-6 text-center text-sm font-medium text-destructive" role="alert">
        {state.error ?? (pending ? "Vérification…" : "")}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {keys.map((key, index) => {
          if (key === "") return <span key={index} />;
          const isDelete = key === "⌫";
          return (
            <button
              key={index}
              type="button"
              disabled={pending}
              aria-label={isDelete ? "Effacer" : key}
              onClick={() => {
                if (isDelete) setPin((p) => p.slice(0, -1));
                else if (pin.length < PIN_LENGTH) setPin((p) => p + key);
              }}
              className={cn(
                "flex h-16 items-center justify-center rounded-lg text-2xl font-semibold transition-transform active:scale-95 select-none touch-manipulation",
                isDelete ? "text-muted-foreground hover:bg-muted" : "bg-card text-foreground shadow-sm hover:bg-muted/60"
              )}
            >
              {isDelete ? <Delete className="h-6 w-6" /> : key}
            </button>
          );
        })}
      </div>
    </form>
  );
}
