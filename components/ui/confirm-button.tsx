"use client";

import { useEffect, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

// Two taps on the same button instead of a modal: the first tap arms it
// ("Confirmer ?"), the second submits. Arms back off after 4 s. Reserved for
// irreversible actions (delete, close the till).
export function ConfirmButton({
  children,
  confirmLabel = "Confirmer ?",
  onConfirm,
  ...props
}: ButtonProps & { confirmLabel?: string; onConfirm?: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button
        {...props}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          setArmed(true);
        }}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button {...props} type={onConfirm ? "button" : "submit"} variant="destructive" onClick={onConfirm}>
      {confirmLabel}
    </Button>
  );
}
