# 🎨 STRIVA v4 Premium Futuristic Visual System

Welcome to the **STRIVA v4 Visual Identity and Design System Foundation** (Sprint 5B.1). This package provides a unified, minimal, intelligent, futuristic, cinematic, and WCAG AA accessible UI architecture.

---

## 🌌 Core Visual Principles

### 1. Dark-First Foundation Hierarchy
- **`Void` (`#050608`)**: Deepest background canvas / absolute baseline.
- **`Base` (`#090B10`)**: Default application canvas.
- **`Surface` (`#11141D`)**: Standard card and panel surface.
- **`Elevated` (`#181C28`)**: Elevated panels, sheets, modals, and dropdowns.
- **`Focus` (`#1F2433`)**: Active, focused, or selected interactive states.

### 2. Precise Color Accents
- **STRIVA Hyper Orange (`#F97316`)**: Primary CTAs, active states, important progress indicators, and focus states.
- **Trinity AI Indigo (`#6366F1`)**: AI coaching, intelligence prompts, and reasoning telemetry.
- **Status & Telemetry**:
  - **Emerald (`#10B981`)**: Success, recovery, positive trends.
  - **Amber (`#F59E0B`)**: Warning, attention required.
  - **Red (`#EF4444`)**: Destructive actions, errors, churn alerts.
  - **Cyan (`#06B6D4`)**: Live telemetry, technical instrumentation.

### 3. Restrained Surfaces & Subtle Borders
- Minimalist surface hierarchy (`surface.void`, `surface.base`, `surface.panel`, `surface.elevated`, `surface.focus`).
- Very subtle borders (`rgba(255, 255, 255, 0.07)` to `0.12`).
- Restrained ambient glows (`glow.primary`, `glow.ai`, `glow.success`, `glow.warning`) appearing only on active/focused elements.

### 4. Typography Hierarchy
- **Large Display Typography (`Outfit`)**: High-impact metrics (Health score, readiness, business health, revenue, total volume).
- **Small Uppercase Technical Labels (`Inter`)**: `READINESS`, `RECOVERY`, `MRR`, `ACTIVE MEMBERS`, `AI STATUS` with generous letter spacing (`0.12em` – `0.16em`).

### 5. Unified Motion System (Framer Motion)
Fast, precise, cinematic, and subtle interactions:
- `pageEnter`, `fadeUp`, `fadeIn`, `scaleIn`, `slideIn`, `hover`, `press`, `modal`, `drawer`, `notification`, `dataUpdate`.

---

## 📁 Visual System Architecture

```
src/design-system/
├── visual/                  # Visual foundation (Sprint 5B.1)
│   ├── colors.ts            # Dark-first hierarchy & accent tokens
│   ├── surfaces.ts          # Void, base, panel, elevated, focus surface tokens
│   ├── effects.ts           # Subtle borders, restrained glows, atmospheric shadows
│   ├── motion.ts            # Framer motion variants (pageEnter, modal, drawer, etc.)
│   ├── typography.ts        # Display metric & uppercase technical label tokens
│   └── index.ts             # Barrel export
├── colors.ts                # Backward-compatible color tokens
├── typography.ts            # Backward-compatible typography scale
├── spacing.ts               # 8-point grid scale tokens (4px -> 96px)
├── radius.ts                # Border radius tokens
├── shadows.ts               # Shadows & glow tokens
├── animations.ts           # Unified animation presets
├── icons.ts                 # Lucide icon catalog
├── breakpoints.ts           # Responsive breakpoints
├── tokens.ts                # Central aggregation & `cn()` utility
├── ThemeProvider.tsx        # Dark / Light / System theme context
├── index.ts                 # Design system barrel export
└── components/              # Standardized UI Components
```

---

## 🧩 Standardized Component Suite

| Component | Visual Standard |
|---|---|
| **`Button`** | Primary (`#F97316`), Secondary (`#181C28`), Ghost, Outline, Danger, Success, Premium, Loading states. |
| **`Card`** | Base panel `#11141D`, subtle border `rgba(255, 255, 255, 0.07)`, smooth micro-hover. |
| **`GlassCard`** | Subtle backdrop blur with restrained orange, indigo, or emerald ambient glow presets. |
| **`StatCard`** | Uppercase technical label, large display metric, trend indicator. |
| **`MetricCard`** | Progress gauge, uppercase tracking label, tabular percentage figures. |
| **`Badge`** | Status tags with subtle 10% opacity tints and matching border accents. |
| **`Input`** | High-contrast `#11141D` background with subtle focus border. |
| **`Modal`** | Backdrop blur over `#050608`, spring scale animation, escape key listener. |
| **`Drawer`** | Slide-in drawer with `#11141D` elevated surface and subtle border. |
| **`Tabs`** | Pill and underline variants with layout-animated spring pill indicator. |
| **`Progress`** | Subtle track surface, rounded indicators, smooth width interpolation. |
| **`ProgressRing`** | SVG circular gauge with display typography and uppercase label. |
| **`NavigationItem`** | Active indicator bar with spring layout motion and subtle accent tint. |
| **`Toast`** | Floating notifications with `#11141D` backdrop blur surface and spring entry. |
| **`Tooltip`** | Micro-popup with `#181C28` elevated surface and instant fade. |

---

## ♿ Accessibility Compliance
- **WCAG AA Contrast**: Contrast ratios >= 4.5:1 on neutral dark backgrounds and light mode counterparts.
- **Focus Rings**: High-visibility `focus-visible:ring-2 focus-visible:ring-orange-500` on all focusable targets.
- **Keyboard Navigation**: Standard Tab, Space, Enter, and Escape key navigation across all interactive overlays.
- **ARIA Semantics**: Complete ARIA attributes across dialogs, modals, tabs, progress bars, and alerts.
