"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" size="lg" onClick={() => window.print()}>
      <Printer className="h-5 w-5" /> Imprimer
    </Button>
  );
}
