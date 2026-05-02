# AdTestLab Skills

A set of 6 skill files that give Claude Code consistent guardrails when building AdTestLab. Each skill targets a specific concern.

## Skills Overview

| Skill | Triggers when... |
|---|---|
| **adtestlab-architecture** | Starting any task, creating new files, deciding where code belongs |
| **adtestlab-code-quality** | Writing or reviewing any code (KISS/DRY/SOLID + JSX-as-UI rule) |
| **adtestlab-react-components** | Creating .tsx files, forms, hooks, tables, charts |
| **adtestlab-firebase-patterns** | Working with Auth, Firestore, security rules |
| **adtestlab-verdict-engine** | Working in lib/verdict-engine/, the brain of the product |
| **adtestlab-claude-api** | Working in app/api/diagnose/, lib/claude/, prompt design |
| **adtestlab-testing** | Writing tests with vitest |

## How They Work Together

```
adtestlab-architecture        ← read FIRST, always
        ↓
adtestlab-code-quality        ← read for any code you write
        ↓
   one or more of:
   ├── adtestlab-react-components   (UI work)
   ├── adtestlab-firebase-patterns  (data layer)
   ├── adtestlab-verdict-engine     (rule engine)
   └── adtestlab-claude-api         (AI layer)
        ↓
adtestlab-testing             ← when writing tests
```

## Installation in Claude Code

Place the entire `adtestlab-skills/` folder in your project root, or in `~/.claude/skills/` for global access.

Recommended location for this project:
```
your-adtestlab-repo/
├── .claude/
│   └── skills/
│       ├── architecture/
│       ├── code-quality/
│       ├── react-components/
│       ├── firebase-patterns/
│       ├── verdict-engine/
│       ├── claude-api/
│       └── testing/
├── app/
├── components/
└── ...
```

Claude Code will automatically discover skills in `.claude/skills/` and load them when their descriptions match your prompts.

## Recommended Workflow

When you start a new task in Claude Code:

1. **State the task clearly** — e.g., "Add the create-product form"
2. **Claude Code will load relevant skills automatically** based on descriptions
3. **If it doesn't load a skill you'd expect**, prompt: "Read the adtestlab-architecture skill first"
4. **Trust but verify** — when Claude proposes code, sanity-check against the rules in the skills

## Customization

These skills encode opinions. Some you'll keep, some you'll outgrow.

**Likely to change:**
- Threshold defaults in the verdict engine (you'll tune these from real data)
- The 5/day rate limit on diagnoses (raise or lower based on usage and cost)
- The component composition examples (your style preferences may differ)

**Should NOT change:**
- The "JSX is UI only" rule — keep this rigid
- The data model conventions (date as document ID, no stored computed fields)
- The verdict engine purity rule
- The "no API key on client" rule

## When to Update a Skill

Update a skill when you find yourself fighting it. If you keep wanting to put logic in a `.tsx` file, either:
- The skill is right and you should refactor → keep the skill
- The skill is too rigid for a new pattern you've discovered → update the skill with the new pattern documented

Don't silently break the rules. The point is consistency.

## What's NOT Covered (Yet)

These would be added in later phases:

- Deployment & CI/CD patterns
- Performance optimization
- Analytics / observability
- Paywall / Stripe integration
- CSV import patterns
- Meta/Shopify API integration
- Multi-user / teams
- Mobile app patterns

Don't write skills for things you haven't built. Premature skills become outdated noise.

## Quick Reference

When stuck, ask yourself:
- **"Where does this code go?"** → architecture skill
- **"How should I structure this?"** → code-quality skill
- **"How do I write this component?"** → react-components skill
- **"How do I read/write data?"** → firebase-patterns skill
- **"How do I add a verdict rule?"** → verdict-engine skill
- **"How do I call Claude?"** → claude-api skill
- **"What should I test?"** → testing skill

If multiple skills apply, read all of them. They're short and they don't overlap.
