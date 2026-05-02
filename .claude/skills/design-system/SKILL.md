---
name: adtestlab-design-system
description: The AdTestLab design system — colors, typography, spacing, theming (dark-first with toggle), and component recipes. Use this skill whenever writing or styling any UI in the project, choosing colors, picking spacing values, building components, or when the user mentions design, theme, colors, dark mode, fonts, spacing, or "make it look better". Read this BEFORE writing any className, CSS, or component styling.
---

# AdTestLab Design System

## Core Rules (non-negotiable)

1. Never use raw color values in components (no bg-zinc-900, no #1c1917, no text-white). Always use semantic tokens (bg-bg, text-text, bg-primary).
2. Never use spacing outside the allowed scale: {0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24}. Forbidden: anything else.
3. Never use font sizes outside the typography scale. Use predefined classes (.text-display, .text-heading, .text-subheading, .text-body, .text-caption, .text-mono).
4. Always design for both themes simultaneously. If you'd write `dark:bg-zinc-800`, you're wrong — our tokens handle theming.
5. Defaults are dark. Light mode is the toggle, not the default.

## Color tokens

### Backgrounds (warm neutrals)
| Token | Dark | Light |
|---|---|---|
| bg | rgb(28,25,23) | rgb(250,248,245) |
| surface | rgb(38,34,32) | rgb(245,241,236) |
| elevated | rgb(48,43,41) | rgb(255,253,250) |

### Text
| Token | Dark | Light |
|---|---|---|
| text | rgb(250,248,245) | rgb(28,25,23) |
| text-muted | rgb(168,162,158) | rgb(82,78,74) |
| text-subtle | rgb(120,113,108) | rgb(120,113,108) |
| text-inverse | rgb(28,25,23) | rgb(250,248,245) |

### Borders
| Token | Dark | Light |
|---|---|---|
| border | rgb(60,55,52) | rgb(220,215,210) |
| border-subtle | rgb(48,43,41) | rgb(232,228,222) |
| border-strong | rgb(120,113,108) | rgb(82,78,74) |

### Brand (amber)
| Token | Dark | Light |
|---|---|---|
| primary | rgb(245,158,11) | rgb(217,119,6) |
| primary-hover | rgb(252,175,35) | rgb(180,83,9) |
| primary-foreground | rgb(28,25,23) | rgb(255,251,235) |

Use primary sparingly — one per view max.

### Status colors (success / warning / danger / info)
Each gets -bg, -text, -border variants.
- success: rgb(34,197,94) base — for CONTINUE, healthy metrics, profit
- warning: rgb(234,179,8) base — for FIX_* verdicts, near-target metrics
- danger: rgb(239,68,68) base — for KILL, errors, losses
- info: rgb(59,130,246) base — for NEED_MORE_DATA

## Spacing — strict 4-based scale

ALLOWED: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
FORBIDDEN: 7, 9, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, anything else

Common patterns:
- Inline gap (icon + text): gap-2 (8px)
- Form field vertical spacing: space-y-4 (16px)
- Card padding: p-6 (24px)
- Section vertical spacing: space-y-8 (32px)
- Page padding: px-6 py-8

Never use arbitrary values like p-[18px] or gap-[15px].

## Typography — 6 semantic classes

| Class | Size | Weight | Use |
|---|---|---|---|
| .text-display | 32px | 600 | Hero numbers (big CPA, big metrics) |
| .text-heading | 20px | 600 | Page/section titles |
| .text-subheading | 16px | 500 | Card headers, group labels |
| .text-body | 14px | 400 | Default reading text |
| .text-caption | 12px | 400 | Helper text, labels |
| .text-mono | 13px | 400 | Numbers in tables (uses font-mono + tabular-nums) |

Numbers in tables MUST use .text-mono. Tabular alignment is non-negotiable.

Never use 700+ weight — too heavy for warm palette.
Never use ad-hoc text-sm font-medium combinations — use the semantic class.

## Border radius

Limited set:
- rounded-sm (4px) — inputs, small badges
- rounded-md (8px) — buttons, compact cards
- rounded-lg (12px) — cards, panels (default)
- rounded-full — pills, avatars

Never rounded-xl, rounded-2xl, rounded-3xl.

## Component recipes

### Button (overridden in components/ui/button.tsx)
- default: bg-primary text-primary-foreground hover:bg-primary-hover
- secondary: bg-surface border border-border text-text hover:bg-elevated
- outline: border border-border bg-transparent text-text hover:bg-surface
- ghost: bg-transparent text-text-muted hover:bg-surface hover:text-text
- destructive: bg-danger-bg text-danger-text border border-danger-border

### Card
```
<div className="bg-surface border border-border rounded-lg p-6">
  <h3 className="text-subheading text-text mb-4">Title</h3>
  <p className="text-body text-text-muted">Body</p>
</div>
```

### Metric card
```
<div className="bg-surface border border-border rounded-lg p-6">
  <p className="text-caption text-text-muted mb-2">Total spend</p>
  <p className="text-display text-text font-mono tabular-nums">$1,234.56</p>
</div>
```

### Form input
```
<Input className="bg-surface border-border focus:border-primary text-text placeholder:text-text-subtle rounded-sm" />
```

## Verdict color mapping (single source of truth)

In lib/utils/verdict-colors.ts:
```ts
export const verdictColor: Record<VerdictType, 'success' | 'warning' | 'danger' | 'info'> = {
  CONTINUE: 'success',
  FIX_CREATIVE: 'warning',
  FIX_LP: 'warning',
  FIX_OFFER: 'warning',
  CHECKOUT_ISSUE: 'warning',
  KILL: 'danger',
  NEED_MORE_DATA: 'info',
};

export const verdictLabel: Record<VerdictType, string> = {
  CONTINUE: 'Continue',
  KILL: 'Kill this test',
  FIX_CREATIVE: 'Fix creative',
  FIX_LP: 'Fix landing page',
  FIX_OFFER: 'Fix offer',
  CHECKOUT_ISSUE: 'Checkout issue',
  NEED_MORE_DATA: 'Need more data',
};
```

## Threshold coloring helpers

In lib/utils/threshold-color.ts:
```ts
export function cpaColor(cpa: number, target: number): 'success' | 'warning' | 'danger' {
  if (cpa <= target) return 'success';
  if (cpa <= target * 1.5) return 'warning';
  return 'danger';
}

export function roasColor(roas: number): 'success' | 'warning' | 'danger' {
  if (roas >= 2) return 'success';
  if (roas >= 1) return 'warning';
  return 'danger';
}

export function profitColor(profit: number): 'success' | 'danger' {
  return profit >= 0 ? 'success' : 'danger';
}
```

## Theme implementation

- CSS custom properties on :root with .dark and .light classes on <html>
- Default is dark (set explicitly, do NOT honor prefers-color-scheme)
- Theme stored in localStorage as 'theme' key
- No-flash script inlined in <head> runs before paint

## What NOT to do

- bg-zinc-900, text-white, hex codes in components — use tokens
- p-7, mt-13, gap-9 — not in spacing scale
- text-[15px], font-bold — use semantic classes
- rounded-2xl — too rounded
- dark:bg-* modifiers — tokens handle theming
- Multiple primary buttons per screen — primary is for the most important action only
- Forgetting tabular-nums on numbers in tables
