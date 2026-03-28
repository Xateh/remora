# Brainrot Video Panel — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Summary

While TinyFish agents are actively searching (pipeline status `DISCOVERING` or `RETRIEVING`), show a YouTube brainrot video alongside the existing agent feed. The video is sourced via an iframe embed of a YouTube search page — no API key required. The brainrot style (subway surfers, minecraft parkour, family guy) is randomly selected once per search session.

---

## Layout Change

The `AgentFeedBar` splits into two halves when `isSearching` is true:

- **Left half (50%):** existing agent URL feed — unchanged
- **Right half (50%):** YouTube iframe embed

When idle (before search or after completion), the bar returns to full-width with no video.

---

## YouTube URL Construction

Triggered client-side when `isSearching` flips to `true`:

1. Take the user's selected scopes (e.g. `["Neural Networks", "Backpropagation"]`)
2. Join scopes into a single string: `"neural networks backpropagation"`
3. Randomly pick a brainrot style from: `["subway surfers", "minecraft parkour", "family guy"]`
4. Construct search URL: `https://www.youtube.com/results?search_query=subway+surfers+neural+networks+backpropagation`
5. Embed in an `<iframe>` with:
   - `sandbox="allow-scripts allow-same-origin allow-presentation"`
   - `allow="autoplay"`
   - `title="brainrot"`

Style is picked once per search (randomized fresh on each new search, not on each re-render).

---

## State Trigger

`AgentFeedBar` already receives pipeline status. Changes:

- Derive `isSearching = status === "DISCOVERING" || status === "RETRIEVING"`
- When `isSearching` becomes `true`: pick style, build URL, render split layout + iframe
- When `isSearching` becomes `false`: hide iframe, restore full-width feed
- The random style and constructed URL are stored in a `useRef` (or `useState` initialized once when `isSearching` first goes true) to prevent re-randomization on re-renders

---

## Component Changes

**`components/agent-feed/AgentFeedBar.tsx`** — primary change:
- Add `isSearching` derived from props/context
- Add `brainrotUrl` state (set once when search starts, cleared when done)
- Conditionally render two-column layout vs. full-width layout
- New inline `BrainrotPanel` sub-component (can live in same file or split out):
  - Renders the iframe
  - Shows a small label (e.g. "studying hard..." with the style name)

No new API routes. No backend changes. No env vars required.

---

## Error Handling

- If YouTube blocks the iframe (X-Frame-Options), the iframe shows a blank panel — acceptable, no error state needed
- No retry logic — this is an enhancement, not a critical feature

---

## Out of Scope

- Autoplay of a specific video (requires YouTube Data API)
- User style preference persistence
- Volume/mute controls
