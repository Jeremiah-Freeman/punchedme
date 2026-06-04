"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

/**
 * Free address autocomplete via Photon (OpenStreetMap).
 * No API key required. Debounced, keyboard-friendly.
 */

type Suggestion = {
  label: string;
};

function formatFeature(f: {
  properties: Record<string, string | undefined>;
}): string {
  const p = f.properties;
  const parts: string[] = [];
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  if (p.name && p.name !== street) parts.push(p.name);
  if (street) parts.push(street);
  if (p.city) parts.push(p.city);
  if (p.state) parts.push(p.state);
  if (p.postcode) parts.push(p.postcode);
  if (p.country) parts.push(p.country);
  return parts.join(", ");
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "123 Main St, Austin TX 78701",
  inputRef,
  className = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelected = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`
        );
        if (!res.ok) return;
        const data = await res.json();
        const seen = new Set<string>();
        const items: Suggestion[] = [];
        for (const f of data.features ?? []) {
          const label = formatFeature(f);
          if (label && !seen.has(label)) {
            seen.add(label);
            items.push({ label });
          }
        }
        setSuggestions(items);
        setOpen(items.length > 0);
        setHighlight(-1);
      } catch {
        // network hiccup — silently skip suggestions
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(label: string) {
    justSelected.current = true;
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            select(suggestions[highlight].label);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                select(s.label);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-start gap-2 ${
                i === highlight ? "bg-indigo-50" : "bg-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-700">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
