"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import type { ActionState } from "@/lib/direction-actions";

type VoidAction = (formData: FormData) => Promise<void>;
type StateAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// A form that saves as soon as a field changes (no "Enregistrer" button
// to find) and confirms with a toast. Text inputs save on blur/Enter.
export function AutoSaveForm({
  action,
  message = "Enregistré",
  className,
  children,
}: {
  action: VoidAction;
  message?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  const submit = (formData: FormData) => {
    start(async () => {
      try {
        await action(formData);
        toast("success", message);
      } catch (error) {
        toast("error", error instanceof Error ? error.message : "Échec de l’enregistrement");
      }
    });
  };

  return (
    <form
      ref={ref}
      action={submit}
      className={className}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox")) {
          ref.current?.requestSubmit();
        }
      }}
      onBlur={(event) => {
        const target = event.target as EventTarget;
        if (target instanceof HTMLInputElement && target.type !== "checkbox" && target.defaultValue !== target.value) {
          target.defaultValue = target.value;
          ref.current?.requestSubmit();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          event.target.blur();
        }
      }}
    >
      {children}
    </form>
  );
}

// One-tap action button (toggle availability, activate…) with toast.
export function ActionButton({
  action,
  fields,
  message,
  children,
  ...props
}: ButtonProps & { action: VoidAction; fields: Record<string, string>; message?: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      type="button"
      disabled={pending || props.disabled}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          try {
            await action(fd);
            if (message) toast("success", message);
          } catch (error) {
            toast("error", error instanceof Error ? error.message : "Action impossible");
          }
        })
      }
    >
      {children}
    </Button>
  );
}

// Destructive action: two taps, then runs.
export function DeleteButton({
  action,
  fields,
  message = "Supprimé",
  children,
  confirmLabel,
  ...props
}: ButtonProps & { action: VoidAction; fields: Record<string, string>; message?: string; confirmLabel?: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <ConfirmButton
      {...props}
      confirmLabel={confirmLabel}
      disabled={pending || props.disabled}
      onConfirm={() =>
        start(async () => {
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          try {
            await action(fd);
            toast("success", message);
          } catch (error) {
            toast("error", error instanceof Error ? error.message : "Suppression impossible");
          }
        })
      }
    >
      {children}
    </ConfirmButton>
  );
}

// Creation forms: validation errors inline, success as toast + reset.
export function CreateForm({
  action,
  className,
  children,
  submitLabel,
  resetOnSuccess = true,
}: {
  action: StateAction;
  className?: string;
  children: React.ReactNode;
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const lastMessage = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.ok && state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast("success", state.message);
      if (resetOnSuccess) ref.current?.reset();
    }
  }, [state, toast, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-control bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "…" : submitLabel}
      </Button>
    </form>
  );
}
