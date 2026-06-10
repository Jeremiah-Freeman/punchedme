"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

type BusinessLocation = {
  id: string;
  label: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/business/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.locations ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showForm) addressRef.current?.focus();
  }, [showForm]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setSaving(true);
    setError("");
    setWarning("");
    try {
      const res = await fetch("/api/business/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that location.");
        return;
      }
      setLocations((prev) => [...prev, data.location]);
      if (!data.geocoded) {
        setWarning(
          "Saved, but we couldn't pin that address on the map. Wallet notifications and GPS check-in won't work for it — try editing it to a fuller address (street, city, country)."
        );
      }
      setAddress("");
      setLabel("");
      setShowForm(false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/locations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your store addresses. Apple &amp; Google Wallet use these to notify
          customers near any of your stores, and check-ins are verified against
          the closest one.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading locations…
        </div>
      ) : (
        <>
          {/* Stored addresses */}
          <div className="space-y-3">
            {locations.length === 0 && (
              <div className="border border-dashed rounded-xl p-8 text-center text-gray-400 text-sm">
                No locations yet. Add your first store below.
              </div>
            )}
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="bg-white border rounded-xl p-4 flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {loc.label && (
                    <p className="text-sm font-semibold text-gray-900">
                      {loc.label}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 break-words">
                    {loc.address}
                  </p>
                  {loc.latitude == null && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Not pinned on map —
                      wallet notifications &amp; GPS check won&apos;t apply here
                    </p>
                  )}
                </div>
                {locations.length > 1 && (
                  <button
                    onClick={() => removeLocation(loc.id)}
                    disabled={deletingId === loc.id}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    title="Remove location"
                  >
                    {deletingId === loc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Centered + button */}
          {!showForm && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-colors"
                title="Add another location"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <form
              onSubmit={addLocation}
              className="mt-6 bg-white border rounded-xl p-5 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store address
                </label>
                <AddressAutocomplete
                  inputRef={addressRef as React.RefObject<HTMLInputElement>}
                  value={address}
                  onChange={setAddress}
                  placeholder="456 King St, Sydney NSW 2000, Australia"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Include city and country for international stores.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Sydney store"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Adding…" : "Add location"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="px-4 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {warning && (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {warning}
            </p>
          )}
        </>
      )}
    </div>
  );
}
