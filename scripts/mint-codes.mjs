#!/usr/bin/env node
// Mint a batch of unclaimed sticker/stand codes for a print run.
// Each code is "dumb" — it points at /c/<code> and stays unclaimed until a
// business claims it (owner scans/activates it, or you assign it with
// assign-code.mjs). Codes never have to match each other; they only map to a
// business. Run before a sticker print run, or to top up the pool.
//
// Usage:
//   node --env-file=.env.local scripts/mint-codes.mjs [count]
//   (or: set -a; . ./.env.local; set +a; node scripts/mint-codes.mjs 50)
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const count = parseInt(process.argv[2] ?? "50", 10);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!Number.isInteger(count) || count < 1 || count > 1000) {
  console.error("count must be an integer 1–1000");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// 6-char uppercase hex — same shape as the original SQL seed.
const gen = () => crypto.randomBytes(5).toString("hex").slice(0, 6).toUpperCase();

const minted = [];
let attempts = 0;
while (minted.length < count && attempts < count * 6) {
  attempts++;
  const code = gen();
  const { error } = await db.from("sticker_codes").insert({ code });
  if (!error) minted.push(code);
  // a duplicate primary key just means "try another code" — ignore and retry.
}

console.log(`Minted ${minted.length} unclaimed codes:\n`);
for (const c of minted) console.log(c);
if (minted.length < count) {
  console.error(`\n(only minted ${minted.length}/${count} — hit too many collisions)`);
  process.exit(1);
}
