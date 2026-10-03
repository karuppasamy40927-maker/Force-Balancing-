# BarChart Sorting Controls for Unbalance Force Contributions

Add a clickable cycle toggle button in the **Unbalance Force Contributions** BarChart header, allowing users to dynamically sort chart bars by Mass ID (natural order), Magnitude Descending (highest unbalance first), or Magnitude Ascending (lowest unbalance first).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive interview:
> - **Control Style**: Clickable cycle icon button with tooltip indicator and clear mode label.
> - **Default Sort Order**: Mass ID natural order (Mass 1, 2, 3...) when the application loads.
> - **Cycle Sequence**: `Mass ID (Natural)` → `Magnitude Descending (High → Low)` → `Magnitude Ascending (Low → High)` → `Mass ID (Natural)`.

---

## 1. Overview & Core Concept

- **What It Does**: Adds an intuitive header control to the unbalance force contributions bar chart that re-orders the bars dynamically without altering the underlying mass input table or vector calculations.
- **Target Audience & Persona**: Mechanical, vibration, and rotating machinery engineers analyzing rotors with numerous balancing planes who need to rapidly identify dominant unbalance culprits or inspect contributions systematically.
- **Key Value**: Drastically improves readability and diagnosis speed for rotors with high mass counts by spotlighting the largest force vectors in descending rank or maintaining physical order by Mass ID.

---

## 2. User Experience & Visual Design

- **Placement**: Located in the top-right action tray of the **Unbalance Force Contributions** card header, cleanly grouped alongside the existing mass unit indicator (`Unit: kg·m`) and locked focus badge.
- **Visual Styling & States**:
  - Compact, accessible action button (`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all`).
  - Active visual feedback with domain-aligned styling:
    - **ID Natural Mode**: Clean neutral border (`border-slate-200 text-slate-700 bg-white hover:bg-slate-50`) with an `ArrowUpDown` icon and text label `Sort: ID`.
    - **Magnitude Descending Mode**: Active blue highlight (`border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100/70`) with an `ArrowDownWideNarrow` (or `ArrowDown`) icon and text label `Sort: Mag ↓`.
    - **Magnitude Ascending Mode**: Active blue highlight (`border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100/70`) with an `ArrowUpNarrowWide` (or `ArrowUp`) icon and text label `Sort: Mag ↑`.
  - Accessible tooltip and `aria-label` describing the active mode and next state on click.
- **Animation & Transitions**:
  - Leverages the existing Recharts smooth enter/update animation duration (`600ms ease-out`) so bars smoothly reposition and animate when the sort mode changes.
  - Retains all existing bar hover, click-to-lock, and vector diagram cross-highlighting states regardless of active sort order.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cycle Button vs. Full Dropdown / Segmented Bar**
  - *Chosen Approach*: Single cycle button with icon and compact state label (`Sort: ID`, `Sort: Mag ↓`, `Sort: Mag ↑`).
  - *Why*: Conserves horizontal header space on tablets and smaller laptop screens while providing immediate single-click toggling without popup dropdown menus.
  - *Alternatives Considered*: Multi-button segmented pill was considered, but would introduce visual clutter next to locked mass badges and unit indicators.
- **Decision 2: Separation of Display Sorting from Calculation Engine**
  - *Chosen Approach*: Purely sort the mapped chart dataset in a memoized selector (`chartData`), leaving `masses`, `calculations.steps`, and `VectorDiagramSVG` untouched in their physical order.
  - *Why*: Prevents side effects on vector polygon chaining, angular coordinates, or engineering calculations while giving full flexibility to the bar visualization.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                      State Store                             │
│  masses (State)  ──>  calculations.steps (useMemo)           │
│  barChartSort: 'id' | 'desc' | 'asc' (useState, default 'id') │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Chart Data Selector                       │
│  sortedChartData = useMemo(() => {                           │
│    Sort by ID, rawForce DESC, or rawForce ASC                │
│  }, [calculations.steps, barChartSort])                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                BarChart Header & Component                   │
│  - Cycle Button: onClick => cycleSortMode()                  │
│  - Recharts <BarChart data={sortedChartData}>                │
│  - <Bar isAnimationActive={true} animationDuration={600}>    │
│  - <Cell onClick, onMouseEnter, active focus & lock>         │
└──────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **State Definition in `AppContent`**:
   - `const [barChartSort, setBarChartSort] = useState<'id' | 'desc' | 'asc'>('id');`
2. **Cycle Handler**:
   - `handleCycleChartSort`: cycles `'id'` → `'desc'` → `'asc'` → `'id'`.
3. **Data Memoization**:
   - Map `calculations.steps` into chart items with `id`, `name`, `force`, `formattedForce`, and `rawForce`.
   - Sort data based on `barChartSort`:
     - `'id'`: sorted by `step.id` ascending (original order).
     - `'desc'`: sorted by `step.force` descending.
     - `'asc'`: sorted by `step.force` ascending.
4. **Header Integration**:
   - Mount cycle button in the chart header flex container before the unit badge.
   - Include tooltip: `"Sort: [Mode] (Click to switch to [Next Mode])"`.
