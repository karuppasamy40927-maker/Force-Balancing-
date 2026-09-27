# Vector Diagram Force & Component (H/V) Display Toggle

Enhance the `VectorDiagramSVG` component and vector controls with a versatile display mode setting (`'magnitude' | 'components' | 'both'`), rendering vector magnitudes, orthogonal horizontal and vertical (H/V) component values, and dashed projection decomposition lines.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your selections in Phase 1, the following product decisions are confirmed and incorporated into the design:
> - **Display Modes**: Three-way toggle supporting **Magnitude** ($F$), **H/V Components** ($H, V$), and **Both** ($F$ with $H, V$).
> - **Visual Representation**: Crisp numeric badges displaying the component values with lightweight dashed orthogonal projection lines (`strokeDasharray="3,3"`) linking vector start and end points to visually reveal decomposition triangles.
> - **Control Placement**: Dual-surface access—a segmented quick-toggle in the Force Vector Diagram header toolbar alongside simulation and zoom triggers, plus detailed toggle options in the enlarged modal settings panel.

- **Confirmed Decision 1**: Three-way mode toggle (`'magnitude' | 'components' | 'both'`) providing comprehensive vector analytics for rotating machinery balancing.
- **Confirmed Decision 2**: Balanced orthogonal projection geometry with color-coded H/V labels ($H$ horizontal in slate/blue, $V$ vertical in emerald/indigo or matching vector hue) so complex polygons remain legible during dynamic rotor spin.
- **Confirmed Decision 3**: Synchronized state across inline diagram preview, fullscreen enlarged modal, and print/PDF views.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the vector polygon and resultant vector visualization in rotating machinery balancing by letting engineers switch between scalar resultant force values (e.g. $F = 45.20\text{ kg}\cdot\text{mm}$) and orthogonal Cartesian component pairs ($H = 32.14, V = 31.72\text{ kg}\cdot\text{mm}$).
- **Target Audience / Persona**: Mechanical, vibration, and rotating equipment engineers verifying dynamic balance calculations against analytical balance sheets where horizontal and vertical sum balances ($\sum H = 0, \sum V = 0$) are inspected step by step.
- **Key Value**: Immediate physical insight into how each individual mass contributes to the horizontal and vertical unbalance couples without manually converting polar coordinates ($F, \theta$) to Cartesian coordinates.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Quick-Switching via Header Toolbar**:
   - In the "Force Vector Diagram" card header, the user sees a segmented toggle with 3 options: `|F|` (Magnitude), `H/V` (Components), and `All` (Both).
   - Clicking any option immediately recalculates label bounding boxes and renders projection lines smoothly without resetting ongoing rotor simulation animations.
2. **Interactive Inspection in Enlarged Modal**:
   - When clicking the **Maximize** button (`<Maximize2 />`), the enlarged modal presents both the high-resolution vector canvas and an expanded "Vector Display Mode" control group in the right sidebar.
   - Users can toggle component projection lines on/off independently and select component precision.
3. **Dynamic Rotor Simulation Compatibility**:
   - When the rotor spin simulation is active (`Play` button), rotated instantaneous components $H(\omega t) = F \cos(\theta + \phi(t))$ and $V(\omega t) = F \sin(\theta + \phi(t))$ update smoothly in real time.

### Visual Identity & Theme

- **Aesthetic Direction**: Clinical, high-precision laboratory engineering instrumentation conforming to the Science & Engineering design reference.
- **Color System & Projection Aesthetics**:
  - Horizontal components: Subtle slate-blue hairline guides (`#64748b` or `#3b82f6` with 60% opacity).
  - Vertical components: Subtle emerald or violet hairline guides matching the vector's primary identity.
  - Value Badges: Clean, high-contrast white rounded cards (`bg-white/95 border border-slate-200 shadow-xs`) with `font-mono tabular-nums` to eliminate layout jitter during rotation.
  - Resultant Vector: Distinctive crimson dashed resultant ($R$) with dual badge option displaying $R = \dots$ and $\Sigma H, \Sigma V$.
- **Interactive Segmented Control**:
  - Compact three-state segmented pill in card toolbar:
    `[ |F| Magnitude ] [ H/V Components ] [ Both ]`
  - Active button: `bg-white text-slate-900 shadow-xs border border-slate-200/80 font-medium`.
  - Inactive button: `text-slate-500 hover:text-slate-800 transition-colors`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Cartesian Decomposition (Projection Lines vs Pure Labels)**
  - *Chosen Approach*: Render subtle dashed orthogonal right-triangle legs connecting $(x_1, y_1)$ to $(x_2, y_1)$ (horizontal leg) and $(x_2, y_1)$ to $(x_2, y_2)$ (vertical leg) whenever `components` or `both` is selected.
  - *Why*: In a vector polygon, vectors are placed head-to-tail. Orthogonal projection lines make the geometric accumulation of $\sum H$ and $\sum V$ visually transparent.
  - *Alternatives Considered*: Floating text-only labels without geometry, which causes confusion when multiple vector steps cross near the origin.
- **Decision 2: State Synchronization**
  - *Chosen Approach*: Lift `vectorDisplayMode` state (`'magnitude' | 'components' | 'both'`) to `App.tsx` and pass as props to `VectorDiagramSVG`.
  - *Why*: Ensures seamless synchronization between the main dashboard card, the enlarged modal view, and print/export utilities.
- **Decision 3: Compact Label Clutter Prevention**
  - *Chosen Approach*: When in `'both'` mode, place the magnitude badge near the midpoint of the hypotenuse vector and place compact $(H, V)$ values in a secondary sub-badge or formatted single badge: `F: 45.2 (H: 32.1, V: 31.7)` to avoid SVG element overlaps.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   App.tsx                                   │
│  State:                                                                     │
│  - vectorDisplayMode: 'magnitude' | 'components' | 'both'                   │
│  - vecShowProjectionLines: boolean (default: true)                          │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐ │
│  │   Card Header Segmented Bar     │   │   Enlarged Modal Settings Panel  │ │
│  │   [|F| Mag] [H/V Comp] [Both]   │   │   Radio Group + Projection Line  │ │
│  └────────────────┬────────────────┘   └─────────────────┬────────────────┘ │
│                   │                                      │                  │
│                   ▼                                      ▼                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                            VectorDiagramSVG                            │ │
│  │  Props: steps, sumH, sumV, resultantForce, resultantAngleDeg,          │ │
│  │         vectorDisplayMode, showProjectionLines, isSimulating...        │ │
│  │                                                                        │ │
│  │  Calculations per Step:                                                │ │
│  │  - angleRad = ((absoluteAngle + rotationOffset) * PI) / 180            │ │
│  │  - h = force * cos(angleRad), v = force * sin(angleRad)                │ │
│  │  - Orthogonal corner: (cx + (p1.x + h)*scale, cy - p1.y*scale)         │ │
│  │                                                                        │ │
│  │  SVG Elements:                                                         │ │
│  │  1. Vector Arrow (hypotenuse)                                          │ │
│  │  2. Dashed H/V Projections (orthogonal legs)                           │ │
│  │  3. Formatted Badges (F, H/V, or composite) with tabular-nums         │ │
│  │  4. Resultant Vector & Net Equilibrium Indicators                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Props & State Specification

1. **`VectorDiagramSVG` Props Extension**:
   ```typescript
   export type VectorDisplayMode = 'magnitude' | 'components' | 'both';

   interface VectorDiagramSVGProps {
     steps: CalculationStep[];
     sumH: number;
     sumV: number;
     resultantForce: number;
     resultantAngleDeg: number;
     rotationOffset?: number;
     showAxes?: boolean;
     showForces?: boolean;
     showPolygon?: boolean;
     showResultant?: boolean;
     vectorDisplayMode?: VectorDisplayMode; // NEW: 'magnitude' | 'components' | 'both'
     showProjectionLines?: boolean;         // NEW: toggle orthogonal legs
     onVectorChange?: (index: number, force: number, angle: number) => void;
     isSimulating?: boolean;
     sensitivityPoints?: any[];
     showSensitivityAnalysis?: boolean;
   }
   ```

2. **Orthogonal Projection Math**:
   - For vector step $i$ starting at unscaled $(x_1, y_1)$ and ending at $(x_2, y_2)$ where $x_2 = x_1 + h_i$ and $y_2 = y_1 + v_i$:
     - Corner vertex in SVG space: $C = (\text{cx} + x_2 \cdot \text{scale}, \text{cy} - y_1 \cdot \text{scale})$.
     - Horizontal projection line: from $(x_1, y_1)$ to $C$.
     - Vertical projection line: from $C$ to $(x_2, y_2)$.
   - Badging:
     - `'magnitude'`: displays $F_i$.
     - `'components'`: displays $H: \pm h_i, V: \pm v_i$.
     - `'both'`: displays $F_i$ with secondary $H: \pm h_i, V: \pm v_i$ line.
   - Resultant Vector ($R$):
     - Displays $R$ magnitude, and when components or both are active, also displays $\Sigma H$ and $\Sigma V$.

3. **Interactive Controls**:
   - **Inline Card Header**: Integrated 3-way toggle button group styled with Tailwind segmented bar.
   - **Enlarged Preview Modal**: Added "Component Display Mode" section with radio buttons for Magnitude, H/V Components, and Both, plus a checkbox for "Show Orthogonal Projections".
