import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDeviceToken } from "@/lib/device-token";
import { KioskScan } from "./KioskScan";

// Public, login-free kiosk endpoint. Authorized solely by the device token in
// the URL — it can ONLY add punches / redeem rewards for one business, never
// reach the dashboard. Drop this URL into a Raspberry Pi in kiosk mode.
export const dynamic = "force-dynamic";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createAdminClient();
  const device = await resolveDeviceToken(db, token);

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🔌</div>
          <h1 className="text-white text-xl font-bold mb-2">Kiosk disconnected</h1>
          <p className="text-gray-400 text-sm">
            This scanner is no longer authorized. Ask the business owner to open
            their Punched dashboard and connect a new kiosk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <KioskScan
      deviceToken={token}
      businessName={device.businessName}
      label={device.label}
    />
  );
}
