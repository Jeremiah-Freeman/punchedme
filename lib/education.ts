// Owner education — the "why this works" tidbits shown next to each setup control.
//
// Just-in-time, never a lecture: the ONE principle behind a decision, in plain shop
// words, at the moment the owner makes it. A "the study →" link for the curious, and
// an optional "go deeper" that's allowed to name the effect. Respects the vocabulary
// rule: plain by default; the psychology jargon only appears if they choose to expand.
//
// Study links go through a Google Scholar search of the paper (title + authors) rather
// than a hardcoded DOI, so a link can never rot and always lands on the real work.

export interface Tidbit {
  // Short plain-language payoff, owner voice, no jargon.
  why: string;
  // The real paper, named so the curious can verify it.
  studyTitle: string;
  studyAuthors: string;
  // The deeper explanation — allowed to name the effect and the evidence.
  deeper: string;
}

export function studyUrl(t: Tidbit): string {
  const q = encodeURIComponent(`${t.studyTitle} ${t.studyAuthors}`);
  return `https://scholar.google.com/scholar?q=${q}`;
}

export const TIDBITS: Record<string, Tidbit> = {
  headStart: {
    why: "A card that starts a little filled gets finished almost twice as often as one that starts empty. People finish a trip they feel already on.",
    studyTitle: "The Endowed Progress Effect",
    studyAuthors: "Nunes & Dreze, 2006",
    deeper:
      "In the classic car-wash study, a loyalty card needing 8 stamps from zero was completed by 19% of customers. An identical card needing 10 — but handed over with 2 already stamped — was completed by 34%, and those customers came back faster. Same real effort, nearly double the finishers. Starting people a few punches in isn't a giveaway; it's the single most reliable way to get them back.",
  },
  rewardMenu: {
    why: "When people can see the next reward getting closer, they come back faster the nearer they get — a goal in reach beats a freebie in the abstract.",
    studyTitle: "The Goal-Gradient Hypothesis Resurrected",
    studyAuthors: "Kivetz, Urminsky & Zheng, 2006",
    deeper:
      "Cafe cardholders bought coffee more and more frequently the closer they got to their free one — the same reason you walk faster the last block home. A small menu of rewards (a little treat close, the big one further out) keeps a visible finish line in front of people at every balance, so there's always a next thing pulling them in.",
  },
  luckyPunch: {
    why: "An unexpected little gift makes people feel good about you far past what it costs. A surprise beats a routine — and it only ever gives.",
    studyTitle: "Reciprocation and compliance — the effects of a favor",
    studyAuthors: "Regan, 1971",
    deeper:
      "A small, unearned gift reliably makes people want to give back — in the classic study a single favor beat even how much people liked the giver. A surprise double punch lands the same way: it costs you a little, but it buys real goodwill because it's a gift, not a deal. The rule we hold: it can only ever give extra, never take anything away.",
  },
};
