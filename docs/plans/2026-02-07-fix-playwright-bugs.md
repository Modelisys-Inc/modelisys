# Fix All Playwright-Discovered Bugs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all remaining bugs found during comprehensive Playwright testing: 17 Math.random() hydration mismatches, 1 React hooks order violation, and 1 missing favicon.

**Architecture:** Create a shared `seededRandom` utility, then apply it across all components that use `Math.random()` in render paths. Fix a hooks ordering bug in the EBITDA page. Add favicon metadata to the root layout.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui

---

### Task 1: Create shared `seededRandom` utility

**Files:**
- Create: `frontend/lib/seeded-random.ts`

**Step 1: Create the utility**

```typescript
/**
 * Deterministic pseudo-random number generator.
 * Use instead of Math.random() in render-time code to prevent
 * Next.js server/client hydration mismatches.
 */
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}
```

**Step 2: Refactor 3 seasonality files to use shared utility**

In each of these files, remove the local `seededRandom` definition and add `import { seededRandom } from "@/lib/seeded-random"`:

- `frontend/components/seasonality-summary.tsx` - remove lines 113-116 (local seededRandom)
- `frontend/components/seasonality-detail.tsx` - remove lines 119-122 (local seededRandom)
- `frontend/components/seasonality-chart.tsx` - remove lines 138-141 (local seededRandom)

**Step 3: Verify** - Navigate to `/analysis/seasonality`, confirm zero console errors.

---

### Task 2: Fix hydration in capex-detail, working-capital-detail, income-statement-detail (10 instances)

These files use identical `generateTrend` patterns with `Array.from({ length: N }, (_, i) => ...)`.

**Files:**
- Modify: `frontend/components/capex-detail.tsx` - 4 instances (lines 185, 221, 257, 293)
- Modify: `frontend/components/working-capital-detail.tsx` - 4 instances (lines 157, 192, 227, 262)
- Modify: `frontend/components/income-statement-detail.tsx` - 2 simple instances (lines 766, 830)

**Step 1: In each file, add import after existing imports:**

```typescript
import { seededRandom } from "@/lib/seeded-random"
```

**Step 2: Replace `Math.random()` with `seededRandom(base + i)` in each generateTrend**

The pattern is always the same — replace:
```
(0.95 + Math.random() * 0.1)   →   (0.95 + seededRandom(base + i) * 0.1)
(0.97 + Math.random() * 0.06)  →   (0.97 + seededRandom(base + i) * 0.06)
```

DO NOT touch event handler instances (lines 547, 607 in income-statement-detail.tsx).

**Step 3: Verify** - Navigate to `/analysis/capex`, `/analysis/working-capital`, `/financial-statements/income-statement`. Zero hydration warnings.

---

### Task 3: Fix hydration in complex generateTrend components (7 instances)

**Files:**
- Modify: `frontend/components/income-statement-detail.tsx` - 4 more instances (lines 1057, 1061, 1065, 1074)
- Modify: `frontend/components/capex-forecast-detail.tsx` - 1 instance (line 396)
- Modify: `frontend/components/fdr-forecast-detail.tsx` - 1 instance (line 432)

**Step 1: Add import to capex-forecast-detail.tsx and fdr-forecast-detail.tsx:**

```typescript
import { seededRandom } from "@/lib/seeded-random"
```

(income-statement-detail.tsx already has import from Task 2)

**Step 2: Replace Math.random() in each file:**

For `income-statement-detail.tsx` lines 1057, 1061, 1065 (inside `if` branches using `yearIndex`):
```
(0.95 + Math.random() * 0.1)  →  (0.95 + seededRandom(base + yearIndex) * 0.1)
```

For `income-statement-detail.tsx` line 1074 (else branch, past years):
```
(0.95 + Math.random() * 0.1)  →  (0.95 + seededRandom(base + i) * 0.1)
```

For `capex-forecast-detail.tsx` line 396 and `fdr-forecast-detail.tsx` line 432:
```
(0.95 + Math.random() * 0.1)  →  (0.95 + seededRandom(base + i) * 0.1)
```

DO NOT touch event handler instances (lines 294 in capex-forecast-detail, 321 in fdr-forecast-detail).

**Step 3: Verify** - Navigate to projections/pro-forma years view. Zero hydration warnings.

---

### Task 4: Fix RotatingText hydration + EBITDA hook order violation

**Files:**
- Modify: `frontend/components/RotatingText.tsx` - line 103
- Modify: `frontend/app/evaluation/ebitda-multiple/page.tsx` - move line 636 to line 42

**Step 1: Fix RotatingText.tsx**

Add import:
```typescript
import { seededRandom } from "@/lib/seeded-random"
```

Line 103 — replace:
```typescript
const randomIndex = Math.floor(Math.random() * total)
```
with:
```typescript
const randomIndex = Math.floor(seededRandom(index) * total)
```

**Step 2: Fix EBITDA hook order**

Move `const pathname = usePathname()` from line 636 to line 42 (after `useCompanies()`):

```typescript
export default function EBITDAMultiplePage() {
  const { companies } = useCompanies()
  const pathname = usePathname()  // MOVED from line 636
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(false)
```

Delete the original `const pathname = usePathname()` on line 636.

**Step 3: Verify** - Navigate to `/evaluation/ebitda-multiple`, accept disclaimer, confirm no hook order error in console.

---

### Task 5: Add favicon

**Files:**
- Modify: `frontend/app/layout.tsx` - add icons to metadata

**Step 1: Add icons field to metadata (line 9-13):**

```typescript
export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Dashboard comptable",
  generator: "v0.app",
  icons: {
    icon: "/images/modelisys-icon-white.svg",
  },
}
```

**Step 2: Verify** - Load any page, confirm no 404 on favicon in network tab.

---

## Summary

| Task | Files Modified | Instances Fixed |
|------|---------------|----------------|
| 1 | 1 new + 3 refactored | Shared utility |
| 2 | 3 modified | 10 hydration fixes |
| 3 | 3 modified | 7 hydration fixes |
| 4 | 2 modified | 1 hydration + 1 hook order |
| 5 | 1 modified | 1 favicon |
| **Total** | **1 new, 12 modified** | **17 hydration + 1 hook + 1 favicon** |
