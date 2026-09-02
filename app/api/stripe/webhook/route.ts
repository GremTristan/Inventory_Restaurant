import { NextResponse } from "next/server";
import { handleWebhookEvent, stripe, stripeConfigured } from "@/lib/billing/stripe";

// Signature-verified: an unsigned or tampered body is rejected before any
// tenant state changes.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();
  try {
    const event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe webhook]", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
