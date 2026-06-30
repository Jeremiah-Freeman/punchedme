#!/usr/bin/env node
// Assign a physical code (a sticker, or a wood stand you assembled at home) to a
// business by slug. Use this for the "stand fulfillment" flow: a stand arrives
// blank, you scan/read its code, run this to bind it to e.g. ABC Automotive,
// then ship it. Because customers belong to the BUSINESS (not the code), every
// existing member instantly works with the new code — nothing to migrate.
//
// Upserts, so a brand-new stand code that was never pre-minted still works.
//
// Usage:
//   node --env-file=.env.local scripts/assign-code.mjs <CODE> <business-slug>
import { createClient } from "@supabase/supabase-js";

const rawCode = process.argv[2];
const slug = process.argv[3];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!rawCode || !slug) {
  console.error("Usage: assign-code.mjs <CODE> <business-slug>");
  process.exit(1);
}

const code = rawCode.trim().toUpperCase();
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: biz, error: bizErr } = await db
  .from("businesses")
  .select("id, name")
  .eq("slug", slug)
  .single();

if (bizErr || !biz) {
  console.error(`No business found with slug "${slug}".`);
  process.exit(1);
}

// Guard against silently stealing a code already bound to a DIFFERENT business.
const { data: existing } = await db
  .from("sticker_codes")
  .select("business_id")
  .eq("code", code)
  .maybeSingle();

if (existing?.business_id && existing.business_id !== biz.id) {
  console.error(`Code ${code} is already assigned to another business. Aborting.`);
  process.exit(1);
}

const { error } = await db
  .from("sticker_codes")
  .upsert(
    { code, business_id: biz.id, claimed_at: new Date().toISOString() },
    { onConflict: "code" }
  );

if (error) {
  console.error("Assign failed:", error.message);
  process.exit(1);
}

console.log(`✓ Assigned ${code} → ${biz.name} (${slug})`);
console.log(`  Customers scan: /c/${code}  →  /b/${slug}/join`);
