# Brainrot Video Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a YouTube brainrot video iframe alongside the agent feed while TinyFish is actively searching.

**Architecture:** The `AgentFeedBar` component derives `isSearching` from the existing `isRunning` flag on the agent feed context. When searching starts, a random brainrot style is picked once and a YouTube search URL is constructed from the user's scopes. The bar splits into two halves — agent feed left, YouTube iframe right — and returns to full-width when searching stops.

**Tech Stack:** React (useState, useRef, useEffect), existing `AgentFeedContext`, Tailwind CSS, YouTube search embed (no API key)

---

## File Map

- **Modify:** `components/agent-feed/AgentFeedBar.tsx` — add split layout + brainrot iframe when `isRunning`
- **Modify:** `lib/context/agent-feed-context.tsx` — expose current scopes so `AgentFeedBar` can build the YouTube URL

---

### Task 1: Expose scopes in AgentFeedContext

The `AgentFeedBar` needs the user's selected scopes to build the YouTube search URL. The context needs to carry them.

**Files:**
- Modify: `lib/context/agent-feed-context.tsx`

- [ ] **Step 1: Read the current context file**

```bash
cat lib/context/agent-feed-context.tsx
```

- [ ] **Step 2: Add `scopes` to context state**

In `lib/context/agent-feed-context.tsx`, add `scopes: string[]` to the context value and a `setScopes` setter. Find the existing context type definition (the object shape passed to `createContext`) and add:

```ts
scopes: string[]
setScopes: (scopes: string[]) => void
```

Add the corresponding `useState<string[]>([])` inside the provider and expose both in the value object.

- [ ] **Step 3: Find where scopes are selected and call setScopes**

```bash
grep -r "scopes" app/ components/ lib/ --include="*.tsx" --include="*.ts" -l
```

Identify the component or hook where the user's selected scopes are finalized (likely `ScopeSelectionCard` or the `select-objective` API call site). Import `useAgentFeed` there and call `setScopes(selectedScopes)` when the search starts.

- [ ] **Step 4: Commit**

```bash
git add lib/context/agent-feed-context.tsx
git commit -m "feat: expose scopes in AgentFeedContext"
```

---

### Task 2: Add BrainrotPanel component

A focused component that renders the YouTube iframe given a URL.

**Files:**
- Create: `components/agent-feed/BrainrotPanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/agent-feed/BrainrotPanel.tsx
'use client'

interface BrainrotPanelProps {
  youtubeUrl: string
  style: string
}

export function BrainrotPanel({ youtubeUrl, style }: BrainrotPanelProps) {
  return (
    <div className="flex flex-col h-full border-l border-border">
      <div className="px-2 py-0.5 shrink-0 flex items-center gap-1">
        <span className="text-xs text-muted-foreground italic">
          studying hard... ({style})
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={youtubeUrl}
          title="brainrot"
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agent-feed/BrainrotPanel.tsx
git commit -m "feat: add BrainrotPanel iframe component"
```

---

### Task 3: Wire BrainrotPanel into AgentFeedBar

Split the bar into two halves when `isRunning`, show `BrainrotPanel` on the right.

**Files:**
- Modify: `components/agent-feed/AgentFeedBar.tsx`

- [ ] **Step 1: Add brainrot URL state and style ref**

At the top of `AgentFeedBar`, add:

```tsx
import { useState, useEffect, useRef } from 'react'
import { BrainrotPanel } from './BrainrotPanel'

const BRAINROT_STYLES = ['subway surfers', 'minecraft parkour', 'family guy']

function pickStyle(): string {
  return BRAINROT_STYLES[Math.floor(Math.random() * BRAINROT_STYLES.length)]
}

function buildYoutubeUrl(scopes: string[], style: string): string {
  const query = encodeURIComponent(`${style} ${scopes.join(' ')}`)
  return `https://www.youtube.com/results?search_query=${query}`
}
```

Inside the component, after destructuring from `useAgentFeed`, add:

```tsx
const { events, isCollapsed, isRunning, toggleCollapsed, clearEvents, scopes } = useAgentFeed()

const [brainrotUrl, setBrainrotUrl] = useState<string | null>(null)
const brainrotStyleRef = useRef<string>('')

useEffect(() => {
  if (isRunning && !brainrotUrl) {
    const style = pickStyle()
    brainrotStyleRef.current = style
    setBrainrotUrl(buildYoutubeUrl(scopes, style))
  }
  if (!isRunning) {
    setBrainrotUrl(null)
  }
}, [isRunning])
```

- [ ] **Step 2: Update the expanded content area to split layout**

Replace the existing `{!isCollapsed && (...)}` block's inner div with:

```tsx
{!isCollapsed && (
  <div className="flex flex-1 min-h-0 overflow-hidden">
    {/* Agent event list */}
    <div className={cn('overflow-y-auto px-2 pb-1', brainrotUrl ? 'w-1/2' : 'w-full')}>
      {events.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
          No agent activity yet
        </div>
      ) : (
        <div className="space-y-0.5">
          {events.map(event => (
            <AgentFeedItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>

    {/* Brainrot panel */}
    {brainrotUrl && (
      <div className="w-1/2">
        <BrainrotPanel youtubeUrl={brainrotUrl} style={brainrotStyleRef.current} />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

Start the dev server:
```bash
npm run dev
```

1. Log in, upload materials, select scopes, start a search
2. While `DISCOVERING` or `RETRIEVING` is active, the agent feed bar should split — left shows agent URLs, right shows a YouTube search results iframe for e.g. "subway surfers neural networks"
3. After pipeline completes, the iframe should disappear and the bar returns to full-width

- [ ] **Step 4: Commit**

```bash
git add components/agent-feed/AgentFeedBar.tsx
git commit -m "feat: split AgentFeedBar to show brainrot video while searching"
```
