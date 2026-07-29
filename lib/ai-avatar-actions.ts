"use server";

import { requireSiteAccess } from "@/lib/session";
import { getAllInventoryItems, getSuppliers, getVisibleInventoryBySiteForRole } from "@/lib/inventory-store";
import { getDailySalesBySite, getMenuItems, todayPeriod } from "@/lib/sales-store";
import { getAllUsers } from "@/lib/user-store";
import { computeInsights } from "@/lib/ai-insights";
import { saveReceipt, getReceiptsBySiteForUser, getAllReceipts } from "@/lib/ai-avatar-store";
import { callOllama, type OllamaMessage } from "@/lib/ollama-client";
import { sites, getSiteById } from "@/data/sites";
import type { AvatarChatMessage, Role, SiteId } from "@/types";

export interface AvatarChatResult {
  available: boolean;
  reply?: string;
  error?: string;
}

// The widget compresses photos client-side before upload (see
// components/avatar-widget.tsx), so in normal use a submitted file is
// already well under 1MB. This ceiling is a generous fallback for the rare
// case that compression fails and the original file is sent as-is — kept
// comfortably under next.config.ts's serverActions.bodySizeLimit (50mb): if
// this check passed but the request still exceeded that config ceiling,
// Next would reject it before this action ever runs, and the user would see
// Next's raw error page instead of the friendly message below.
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

type ReceiptImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const ACCEPTED_MEDIA_TYPES = new Set<string>(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Single entry point for one avatar chat turn: text, optionally with one
// photo of a till receipt. Called directly from the floating widget's
// <form action={...}> via a client-side wrapper closure that binds `history`
// (conversation state lives client-side — see components/avatar-widget.tsx).
//
// Unlike recordDailySalesAction, this never writes to DailySalesEntry — the
// avatar only comments/advises on a receipt photo, it never fills the daily
// sales form. Unlike generateNarrativeAction, this is NOT director-only:
// requireSiteAccess(siteId) with no role allowlist lets director, manager,
// and waiter all through, each getting a different context slice below.
export async function sendAvatarMessageAction(
  history: AvatarChatMessage[],
  formData: FormData
): Promise<AvatarChatResult> {
  const siteIdRaw = formData.get("siteId");
  if (typeof siteIdRaw !== "string" || !getSiteById(siteIdRaw)) {
    return { available: true, error: "Site invalide." };
  }
  const siteId = siteIdRaw as SiteId;
  const user = await requireSiteAccess(siteId);

  const text = String(formData.get("message") ?? "").trim();
  const file = formData.get("image");
  const hasImage = file instanceof File && file.size > 0;

  if (!text && !hasImage) {
    return { available: true, error: "Écrivez un message ou joignez une photo." };
  }

  let imageBuffer: Buffer | null = null;
  let imageMediaType: ReceiptImageMediaType | null = null;

  if (hasImage) {
    const imageFile = file as File;
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { available: true, error: "Photo trop volumineuse (max 40 Mo). Réessayez avec une photo plus légère." };
    }
    if (!ACCEPTED_MEDIA_TYPES.has(imageFile.type)) {
      return { available: true, error: "Format de photo non supporté (JPEG, PNG, WebP ou GIF uniquement)." };
    }
    imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    imageMediaType = imageFile.type as ReceiptImageMediaType;
  }

  const contextText = buildContextForUser(user.role, siteId, user.id);
  const systemPrompt =
    "Tu es l'assistant IA d'un groupe de crêperies. Réponds en français, de façon concise et " +
    "professionnelle. Si une photo de ticket de caisse est jointe, analyse-la (montant, anomalies " +
    "visibles, cohérence avec les ventes déclarées) et commente/conseille — ne remplis jamais de " +
    "formulaire à sa place, contente-toi de commenter et conseiller.\n\n" +
    contextText;

  const userContent = text || "Voici une photo du ticket de caisse du jour.";

  // A separate `system` message combined with an image on the user message
  // reproducibly stalls gemma4:31b-cloud for several minutes (confirmed via
  // direct API testing) — when a photo is attached, fold the system prompt
  // into the same user message instead of sending it as its own role. Pure
  // text turns (no photo) are unaffected and keep the system-message
  // structure, which also preserves normal multi-turn history handling.
  const messages: OllamaMessage[] = imageBuffer
    ? [
        ...history.map((m) => ({ role: m.role, content: m.text })),
        {
          role: "user",
          content: `${systemPrompt}\n\n${userContent}`,
          images: [imageBuffer.toString("base64")],
        },
      ]
    : [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: userContent },
      ];

  const result = await callOllama(messages);
  if (!result.available) {
    return { available: false };
  }
  if (result.error) {
    return { available: true, error: result.error };
  }

  if (imageBuffer && imageMediaType && result.reply) {
    saveReceipt({
      siteId,
      submittedByUserId: user.id,
      imageBuffer,
      imageMediaType,
      aiSummary: result.reply,
    });
  }

  return { available: true, reply: result.reply };
}

// --- Context assembly: full dump per turn, today-scoped, no tool-use ---

function buildContextForUser(role: Role, siteId: SiteId, userId: string): string {
  const site = getSiteById(siteId);
  const today = todayPeriod();

  if (role === "director") {
    const inventory = getAllInventoryItems();
    const suppliers = getSuppliers();
    const employees = getAllUsers().filter((u) => u.role !== "director");
    const allDailySales = sites.flatMap((s) => getDailySalesBySite(s.id));
    const insights = computeInsights({ inventory, suppliers, allDailySales, employees, sites });
    const todaysReceipts = getAllReceipts().filter((r) => r.submittedAt.slice(0, 10) === today);

    const insightsText =
      insights.map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`).join("\n") ||
      "Aucune alerte particulière.";
    const receiptsText =
      todaysReceipts.length > 0
        ? todaysReceipts
            .map((r) => `- Ticket du site ${r.siteId} (${r.submittedAt}): ${r.aiSummary}`)
            .join("\n")
        : "Aucun ticket photographié aujourd'hui.";

    return (
      `Rôle: directeur (accès groupe entier).\n\n` +
      `Observations du groupe:\n${insightsText}\n\n` +
      `Tickets photographiés aujourd'hui (tous sites):\n${receiptsText}`
    );
  }

  // Manager/waiter: scoped exactly like their existing UI permissions — no
  // unitPrice/supplier data ever, only role-visibility-filtered inventory,
  // only today's own-site sales, only this user's own submitted receipts.
  // NEVER call getAllInventoryItems/getInventoryBySite (unfiltered) in this
  // branch — that would leak purchase-price/supplier data into a
  // waiter/manager's LLM context, which the app never exposes to those
  // roles anywhere else in the UI.
  const inventory = getVisibleInventoryBySiteForRole(siteId, role);
  const todaysSales = getDailySalesBySite(siteId).find((e) => e.date === today);
  const menu = getMenuItems(siteId);
  const myReceipts = getReceiptsBySiteForUser(siteId, userId).filter(
    (r) => r.submittedAt.slice(0, 10) === today
  );

  const inventoryText =
    inventory.length > 0
      ? inventory.map((i) => `- ${i.name}: ${i.quantity} ${i.unit}`).join("\n")
      : "Aucun article visible.";
  const salesText = todaysSales
    ? `CA net: ${todaysSales.netRevenue} CHF, dont CB: ${todaysSales.cardRevenue} CHF.`
    : "Ventes du jour pas encore saisies.";
  const receiptsText =
    myReceipts.length > 0
      ? myReceipts.map((r) => `- Ticket (${r.submittedAt}): ${r.aiSummary}`).join("\n")
      : "Aucun ticket envoyé aujourd'hui par vous.";

  return (
    `Rôle: ${role === "manager" ? "chef crêpier" : "serveur"}, établissement: ${site?.name ?? siteId}.\n\n` +
    `Inventaire visible (jamais de prix d'achat ni fournisseur):\n${inventoryText}\n\n` +
    `Ventes du jour: ${salesText}\n\n` +
    `Vos tickets photographiés aujourd'hui:\n${receiptsText}\n\n` +
    `Produits au menu: ${menu.map((m) => m.name).join(", ") || "aucun"}.`
  );
}
