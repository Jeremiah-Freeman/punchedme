"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPhone, timeAgo } from "@/lib/utils";
import { Search, Plus, Minus, Download } from "lucide-react";

interface CustomerRow {
  id: string;
  first_name: string;
  phone_number: string;
  created_at: string;
  program_id: string;
  current_punches: number;
  punches_required: number;
  lifetime_punches: number;
  rewards_earned: number;
  rewards_redeemed: number;
  last_visit: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers/list");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter(
    (c) =>
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search)
  );

  async function adjust(customerId: string, programId: string, delta: number) {
    setAdjusting(customerId);
    await fetch("/api/customers/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        programId,
        punchesDelta: delta,
        reason: "Manual adjustment from dashboard",
      }),
    });
    await fetchCustomers();
    setAdjusting(null);
  }

  async function exportCSV() {
    const rows = [
      ["Name", "Phone", "Current Punches", "Lifetime Punches", "Rewards Earned", "Rewards Redeemed", "Joined"],
      ...customers.map((c) => [
        c.first_name,
        c.phone_number,
        c.current_punches,
        c.lifetime_punches,
        c.rewards_earned,
        c.rewards_redeemed,
        new Date(c.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} total members</p>
        </div>
        <button
          onClick={exportCSV}
          className="shrink-0 flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 animate-pulse">
          Loading customers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-500">
          {search ? "No customers match your search." : "No customers yet. Share your join QR to get started!"}
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {filtered.map((c) => {
            const rewardReady = c.current_punches >= c.punches_required;
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-sm flex items-center justify-center font-semibold">
                      {c.first_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.first_name}</p>
                      <p className="text-xs text-gray-500 truncate">{formatPhone(c.phone_number)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-semibold text-sm ${rewardReady ? "text-green-600" : "text-gray-900"}`}>
                      {c.current_punches}/{c.punches_required}
                    </span>
                    {rewardReady && <span className="text-xs">🎉</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-400">
                    {c.last_visit ? `Last visit ${timeAgo(c.last_visit)}` : `Joined ${new Date(c.created_at).toLocaleDateString()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjust(c.id, c.program_id, -1)}
                      disabled={adjusting === c.id || c.current_punches === 0}
                      className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      aria-label="Remove punch"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => adjust(c.id, c.program_id, 1)}
                      disabled={adjusting === c.id}
                      className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      aria-label="Add punch"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Punches</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Lifetime</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Redeemed</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const rewardReady = c.current_punches >= c.punches_required;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold">
                          {c.first_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.first_name}</p>
                          {c.last_visit && (
                            <p className="text-xs text-gray-400">{timeAgo(c.last_visit)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatPhone(c.phone_number)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${rewardReady ? "text-green-600" : "text-gray-900"}`}>
                        {c.current_punches}/{c.punches_required}
                      </span>
                      {rewardReady && <span className="ml-1 text-xs">🎉</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{c.lifetime_punches}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{c.rewards_redeemed}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjust(c.id, c.program_id, -1)}
                          disabled={adjusting === c.id || c.current_punches === 0}
                          className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                          title="Remove punch"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => adjust(c.id, c.program_id, 1)}
                          disabled={adjusting === c.id}
                          className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                          title="Add punch"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
