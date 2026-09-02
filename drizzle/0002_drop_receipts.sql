-- The AI avatar / ticket OCR pipeline was removed; drop its leftover table.
DROP TABLE IF EXISTS "receipts";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."image_media_type";
