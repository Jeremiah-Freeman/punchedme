/**
 * Google Wallet loyalty card generation.
 *
 * Uses Google Wallet API to create/update loyalty objects.
 * Returns a "Save to Google Wallet" URL containing a signed JWT.
 *
 * Required env vars:
 *   GOOGLE_WALLET_ISSUER_ID
 *   GOOGLE_WALLET_CLASS_ID   (defaults to {issuerId}.punchless_loyalty)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_KEY  (base64-encoded service account key JSON)
 *
 * Docs: https://developers.google.com/wallet/retail/loyalty-cards
 */

import { createSign } from "crypto";

interface GoogleWalletOptions {
  token: string;
  walletSerial: string;
  customerName: string;
  businessName: string;
  brandColor: string;
  logoUrl?: string | null;
  currentPunches: number;
  punchesRequired: number;
  rewardName: string;
  appUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  /** All store locations — overrides latitude/longitude when provided */
  locations?: { latitude: number; longitude: number }[];
}

export async function generateGoogleWalletUrl(opts: GoogleWalletOptions): Promise<string> {
  const {
    token,
    walletSerial,
    customerName,
    businessName,
    brandColor,
    logoUrl,
    currentPunches,
    punchesRequired,
    rewardName,
    appUrl,
    latitude,
    longitude,
    locations,
  } = opts;

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = process.env.GOOGLE_WALLET_CLASS_ID ?? `${issuerId}.punchless_loyalty`;
  const objectId = `${issuerId}.${walletSerial}`;

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const serviceAccountKeyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const serviceAccountKey = JSON.parse(
    Buffer.from(serviceAccountKeyB64, "base64").toString("utf8")
  );

  const punchesLeft = punchesRequired - currentPunches;
  const rewardReady = currentPunches >= punchesRequired;

  const notifBody = rewardReady
    ? `🎉 You've earned: ${rewardName}! Show this at checkout.`
    : punchesLeft === 1
    ? `One more visit and you earn: ${rewardName}!`
    : `${punchesLeft} more visits to earn: ${rewardName}`;

  const loyaltyObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: token,
    accountName: customerName,
    loyaltyPoints: {
      balance: {
        int: currentPunches,
      },
      label: "Punches",
    },
    secondaryLoyaltyPoints: {
      balance: {
        string: rewardReady ? "🎉 REWARD READY" : `${currentPunches} / ${punchesRequired}`,
      },
      label: "Progress",
    },
    barcode: {
      type: "QR_CODE",
      value: token,
      alternateText: customerName,
    },
    textModulesData: [
      {
        header: rewardReady ? "🎉 Reward Earned!" : "Your Reward",
        body: rewardReady ? `${rewardName} — Show at checkout!` : rewardName,
        id: "reward",
      },
      {
        header: "Status",
        body: notifBody,
        id: "status",
      },
      {
        header: "Business",
        body: businessName,
        id: "business",
      },
    ],
    infoModuleData: {
      showLastUpdateTime: true,
    },
    ...(logoUrl
      ? {
          logo: {
            sourceUri: { uri: logoUrl },
            contentDescription: {
              defaultValue: { language: "en-US", value: businessName },
            },
          },
          heroImage: {
            sourceUri: { uri: logoUrl },
            contentDescription: {
              defaultValue: { language: "en-US", value: `${businessName} loyalty card` },
            },
          },
        }
      : {}),
  };

  // Add store locations for Google Wallet location-based notifications
  const allCoords =
    locations && locations.length > 0
      ? locations
      : latitude != null && longitude != null
      ? [{ latitude, longitude }]
      : [];
  if (allCoords.length > 0) {
    loyaltyObject.locations = allCoords.slice(0, 10).map((c) => ({
      kind: "walletobjets#latLongPoint",
      latitude: c.latitude,
      longitude: c.longitude,
    }));
  }

  // Build JWT payload
  const payload = {
    iss: serviceAccountEmail,
    aud: "google",
    origins: [appUrl],
    typ: "savetowallet",
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const header = { alg: "RS256", typ: "JWT" };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer
    .sign({ key: serviceAccountKey.private_key, format: "pem" })
    .toString("base64url");

  const jwt = `${signingInput}.${signature}`;

  return `https://pay.google.com/gp/v/save/${jwt}`;
}
