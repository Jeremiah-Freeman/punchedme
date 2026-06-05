/**
 * Apple Wallet (.pkpass) pass generation.
 *
 * A .pkpass is a ZIP file containing:
 *   pass.json       — the pass definition
 *   manifest.json   — SHA1 hashes of every file in the package
 *   signature       — PKCS#7 detached signature of manifest.json
 *   icon.png        — 29x29 icon
 *   icon@2x.png     — 58x58 icon
 *   logo.png        — logo image
 *
 * Required env vars:
 *   APPLE_TEAM_ID
 *   APPLE_PASS_TYPE_ID       (e.g., pass.com.yourcompany.punchless)
 *   APPLE_PASS_CERTIFICATE   (base64-encoded .p12 certificate)
 *   APPLE_PASS_CERTIFICATE_PASSWORD
 *   APPLE_WWDR_CERTIFICATE   (base64-encoded Apple WWDR intermediate cert PEM)
 */

import { createHash } from "crypto";
import { randomBytes } from "crypto";

interface ApplePassOptions {
  token: string;
  serialNumber: string;
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

export async function generateApplePass(opts: ApplePassOptions): Promise<Buffer> {
  const {
    token,
    serialNumber,
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

  const passJson = buildPassJson({
    token,
    serialNumber,
    customerName,
    businessName,
    brandColor,
    currentPunches,
    punchesRequired,
    rewardName,
    appUrl,
    latitude,
    longitude,
    locations,
  });

  const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2));

  // 1x1 transparent PNG — fallback when no business logo is set
  const placeholderBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // Fetch business logo if available; fall back to placeholder
  let logoBuffer = placeholderBuffer;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        logoBuffer = Buffer.from(arrayBuffer);
      }
    } catch {
      // Non-fatal — keep placeholder
    }
  }

  const files: Record<string, Buffer> = {
    "pass.json": passJsonBuffer,
    "icon.png": logoBuffer,
    "icon@2x.png": logoBuffer,
    "logo.png": logoBuffer,
  };

  // Build manifest
  const manifest: Record<string, string> = {};
  for (const [name, buf] of Object.entries(files)) {
    manifest[name] = createHash("sha1").update(buf).digest("hex");
  }
  const manifestBuffer = Buffer.from(JSON.stringify(manifest));

  // Sign the manifest
  const signatureBuffer = await signManifest(manifestBuffer);

  // Build ZIP
  const archiver = await import("archiver");
  const { Readable, Writable } = await import("stream");

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writableStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    writableStream.on("finish", () => resolve(Buffer.concat(chunks)));
    writableStream.on("error", reject);

    const archive = archiver.default("zip", { store: true });
    archive.on("error", reject);
    archive.pipe(writableStream);

    for (const [name, buf] of Object.entries(files)) {
      archive.append(buf, { name });
    }
    archive.append(manifestBuffer, { name: "manifest.json" });
    archive.append(signatureBuffer, { name: "signature" });

    archive.finalize();
  });
}

function buildPassJson(opts: ApplePassOptions) {
  const {
    token,
    serialNumber,
    customerName,
    businessName,
    brandColor,
    currentPunches,
    punchesRequired,
    rewardName,
    appUrl,
    latitude,
    longitude,
    locations,
  } = opts;

  const teamId = process.env.APPLE_TEAM_ID!;
  const passTypeId = process.env.APPLE_PASS_TYPE_ID!;
  const authToken = randomBytes(20).toString("hex");

  const punchesLeft = punchesRequired - currentPunches;
  const rewardReady = currentPunches >= punchesRequired;

  // Lock screen notification message — shown when customer arrives at the store
  const relevantText = rewardReady
    ? `🎉 You've earned: ${rewardName}! Show this at checkout.`
    : punchesLeft === 1
    ? `One more visit and you earn: ${rewardName}!`
    : `${punchesLeft} more visits to earn: ${rewardName}`;

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber,
    teamIdentifier: teamId,
    organizationName: businessName,
    description: `${businessName} Loyalty Card`,
    logoText: businessName,
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: hexToRgb(brandColor),
    labelColor: "rgb(200, 200, 200)",

    webServiceURL: `${appUrl}/api/wallet/apple/update`,
    authenticationToken: authToken,

    // Lock screen notification when near the store
    relevantText,

    barcodes: [
      {
        message: token,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: `${customerName}'s card`,
      },
    ],

    storeCard: {
      // Top-right corner counter, like "PROGRESS 9" on big-brand passes
      headerFields: [
        {
          key: "progress",
          label: "PUNCHES",
          value: rewardReady ? "🎉" : `${currentPunches} / ${punchesRequired}`,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      primaryFields: [
        {
          key: "reward",
          label: "REWARD",
          value: rewardReady ? `🎉 ${rewardName} — ready!` : rewardName,
          textAlignment: "PKTextAlignmentLeft",
        },
      ],
      secondaryFields: [
        {
          key: "name",
          label: "Member",
          value: customerName,
        },
        {
          key: "status",
          label: "Status",
          value: rewardReady
            ? "Show at checkout!"
            : punchesLeft === 1
            ? "⚡ Almost there!"
            : `${punchesLeft} more to go`,
        },
      ],
      auxiliaryFields: [
        {
          key: "business",
          label: "Business",
          value: businessName,
        },
      ],
      backFields: [
        {
          key: "reward",
          label: "Your Reward",
          value: rewardName,
        },
        {
          key: "terms",
          label: "How It Works",
          value: `Earn 1 punch per visit. Redeem after ${punchesRequired} visits. Punches roll over after redemption.`,
        },
        {
          key: "support",
          label: "Pass Info",
          value: `${appUrl}/pass/${token}`,
        },
      ],
    },
  };

  // Add store locations for lock screen notifications near ANY store.
  // Apple allows max 10 locations per pass.
  const allCoords =
    locations && locations.length > 0
      ? locations
      : latitude != null && longitude != null
      ? [{ latitude, longitude }]
      : [];
  if (allCoords.length > 0) {
    pass.locations = allCoords.slice(0, 10).map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
      relevantText,
    }));
    pass.maxDistance = 500; // Show notification within 500 meters
  }

  return pass;
}

async function signManifest(manifestBuffer: Buffer): Promise<Buffer> {
  const forge = await import("node-forge");

  const certB64 = process.env.APPLE_PASS_CERTIFICATE!;
  const certPassword = process.env.APPLE_PASS_CERTIFICATE_PASSWORD ?? "";
  const wwdrB64 = process.env.APPLE_WWDR_CERTIFICATE!;

  const certDer = Buffer.from(certB64, "base64");
  const p12Asn1 = forge.default.asn1.fromDer(certDer.toString("binary"));
  const p12 = forge.default.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);

  const bags = p12.getBags({ bagType: forge.default.pki.oids.certBag });
  const certBag = bags[forge.default.pki.oids.certBag]?.[0];
  const cert = certBag?.cert;

  const keyBags = p12.getBags({ bagType: forge.default.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.default.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const privateKey = keyBag?.key;

  if (!cert || !privateKey) {
    throw new Error("Could not extract certificate or private key from .p12");
  }

  // Parse WWDR certificate
  const wwdrPem = Buffer.from(wwdrB64, "base64").toString("utf8");
  const wwdrCert = forge.default.pki.certificateFromPem(wwdrPem);

  const p7 = forge.default.pkcs7.createSignedData();
  p7.content = forge.default.util.createBuffer(manifestBuffer.toString("binary"));
  p7.addCertificate(cert);
  p7.addCertificate(wwdrCert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.default.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.default.pki.oids.contentType, value: forge.default.pki.oids.data },
      { type: forge.default.pki.oids.messageDigest },
      { type: forge.default.pki.oids.signingTime, value: new Date().toISOString() },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.default.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary");
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "rgb(99, 102, 241)";
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}
