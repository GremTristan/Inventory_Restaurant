import "server-only";

import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/session";

// Uniform JSON error handling for the tablet APIs. Business errors carry a
// French message the screens can show as-is; unauthorized → 403.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Erreur inattendue";
    console.error("[api]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Requête invalide");
  }
}
