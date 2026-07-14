"use client";

import { useState } from "react";
import { Lightbulb, ExternalLink, ChevronDown } from "lucide-react";
import { TIDBITS, studyUrl } from "@/lib/education";

// The just-in-time education callout that sits under a setup control. Plain "why"
// up top, a real-study link for the curious, and an optional "go deeper" that names
// the effect. Indigo to match the app; quiet enough to ignore, there if wanted.
export default function WhyThisWorks({ topic }: { topic: keyof typeof TIDBITS }) {
  const [open, setOpen] = useState(false);
  const t = TIDBITS[topic];
  if (!t) return null;

  return (
    <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
      <div className="flex gap-2">
        <Lightbulb className="w-4 h-4 text-indigo-500 flex-none mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-semibold">Why this works: </span>
            {t.why}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <a
              href={studyUrl(t)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              The study <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
              aria-expanded={open}
            >
              Go deeper
              <ChevronDown
                className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {open && (
            <div className="mt-2 pt-2 border-t border-indigo-100">
              <p className="text-xs text-indigo-900/80 leading-relaxed">{t.deeper}</p>
              <p className="text-[11px] text-indigo-400 mt-2">
                {t.studyTitle} · {t.studyAuthors}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
