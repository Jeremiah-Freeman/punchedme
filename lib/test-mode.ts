// Sandbox / test mode.
//
// Active ONLY when TEST_MODE=1 (server) or NEXT_PUBLIC_TEST_MODE=1 (client) is set
// in the environment. Those are set exclusively on the staging deployment, never on
// production — so every gate keyed off TEST_MODE is a hard no-op in prod and the
// customer experience there is byte-for-byte unchanged.
//
// What it unlocks on staging so a human can loop the flows fast:
//  • check-in skips the cooldown, geofence, and overnight-hours blocks
//  • customer signup always creates a FRESH customer (phone reuse allowed) and
//    skips the rate limit + plan-cap so you can run onboarding over and over
//  • a /api/test/reset endpoint to wipe a shop's test customers between runs
//  • a visible 🧪 badge + "start over" controls on the join page
//
// NEXT_PUBLIC_TEST_MODE must be the NEXT_PUBLIC_ one for the client bundle to see it;
// the server also honours a plain TEST_MODE. Checking both here means one import works
// on both sides (the var the current context can't see is simply undefined).
export const TEST_MODE =
  process.env.TEST_MODE === "1" || process.env.NEXT_PUBLIC_TEST_MODE === "1";
