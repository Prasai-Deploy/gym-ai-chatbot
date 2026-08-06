# 🎨 STRIVA v4 Design System Architecture

Welcome to the **STRIVA v4 Design System Foundation**. This package provides a unified, WCAG AA accessible, high-performance UI architecture for all frontend applications.

---

## 📁 Directory Architecture

```
src/design-system/
├── colors.ts            # Palette tokens (Primary, AI, Status & Neutral dark/light scales)
├── typography.ts        # Typography scale (Display XL -> Caption)
├── spacing.ts           # 8-point grid scale tokens (4px -> 96px)
├── radius.ts            # Border radius tokens (sm -> full)
├── shadows.ts           # Box shadow & brand glow tokens
├── animations.ts       # Framer motion transition variants & physics
├── icons.ts             # Icon catalog mappings (lucide-react)
├── breakpoints.ts       # Media query responsive breakpoints
├── tokens.ts            # Central aggregation & `cn()` utility class composer
├── ThemeProvider.tsx    # Theme context & provider (Dark, Light, System)
├── index.ts             # Barrel export for all components and tokens
└── components/          # 31 Reusable UI Components
```

---

## 🎯 Design Tokens & Specs

### 1. 8-Point Grid Spacing System
All margins, paddings, and layout gaps adhere strictly to an 8-point grid:
- `1` = `4px` (Quarter step)
- `2` = `8px` (Base step)
- `3` = `12px`
- `4` = `16px`
- `6` = `24px`
- `8` = `32px`
- `10` = `40px`
- `12` = `48px`
- `16` = `64px`
- `24` = `96px`

### 2. Color Palette
- **Primary Brand Accent**: `#F97316` (STRIVA Hyper-Orange)
- **AI Coach Accent**: `#6366F1` (Arcee Trinity Indigo)
- **Success**: `#10B981` (Emerald)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#EF4444` (Red)
- **Neutrals**: High-contrast Slate dark scale (`#090B10`, `#131722`, `#1A2030`) and light scale (`#F8FAFC`, `#FFFFFF`, `#F1F5F9`).

---

## 🧩 Component Library (31 Components)

### 🔘 Buttons & Inputs
- **`Button`**: Supports `primary`, `secondary`, `ghost`, `outline`, `danger`, `success`, `premium`, `disabled`, and `loading` states.
- **`IconButton`**: Accessible square/circle button with tooltips/aria-labels.
- **`Input`**: Text input with label, error, helper text, start/end icons.
- **`Textarea`**: Multi-line auto-resizing text field.
- **`Select`**: Custom styled native dropdown select.
- **`Switch`**: Smooth toggle switch with Framer Motion physics.
- **`Checkbox`**: Accessible custom checkbox.
- **`Radio`**: Radio group with option descriptions.
- **`SearchBar`**: Interactive search field with debounce & shortcut hint (`Ctrl + K`).

### 🃏 Cards & Containers
- **`Card`**: Variants: `default`, `glass`, `premium`, `workout`, `nutrition`, `coach`, `analytics`, `gym`.
- **`GlassCard`**: Frosted glass container with customizable brand glow (`orange`, `indigo`, `emerald`).
- **`StatCard`**: Key performance indicator display with trend metrics.
- **`MetricCard`**: Progress bar metric box for macros and workout goals.
- **`SectionHeader`**: Standardized section title, subtitle, badge, and action button alignment.

### 🎭 Overlays & Feedback
- **`Modal`**: Dialog overlay with backdrop blur, escape key listener, and body scroll lock.
- **`Drawer`**: Side sliding overlay panel.
- **`BottomSheet`**: Mobile-optimized bottom sliding panel with pull indicator.
- **`Toast`**: Global toast notification system (`ToastProvider` + `useToast()`).
- **`Alert`**: Inline notification banner with dismissette.
- **`Tooltip`**: Hover/focus popup positioned relative to trigger.
- **`Dropdown`**: Interactive floating menu.

### 📊 Data Visualization & Indicators
- **`Badge`**: Status badge (`primary`, `ai`, `success`, `warning`, `danger`, `neutral`, `outline`).
- **`Chip`**: Interactive removable tag.
- **`Avatar`**: User & AI bot avatar with status indicator and initials fallback.
- **`Progress`**: Linear progress bar.
- **`ProgressRing`**: Circular SVG progress gauge.
- **`LoadingSkeleton`**: Animated shimmer loader (`text`, `circular`, `rectangular`, `card`).
- **`EmptyState`**: Standardized empty state view with illustration and CTA.

### 🧭 Navigation & Layout
- **`Tabs`**: Tab strip with animated sliding background indicator.
- **`Accordion`**: Expandable accordion panels.
- **`NavigationItem`**: Active sidebar / navigation bar menu item.

---

## ♿ Accessibility Compliance
- **WCAG AA Contrast**: Text and icons maintain contrast ratios >= 4.5:1 on neutral backgrounds.
- **Keyboard Navigation**: Interactive elements support standard `Tab`, `Space`, `Enter`, and `Escape` keys.
- **Focus Rings**: Standardized `focus-visible:ring-2 focus-visible:ring-orange-500` on all focusable targets.
- **ARIA Semantics**: Standardized `role`, `aria-expanded`, `aria-checked`, `aria-label`, `aria-modal`, and `aria-hidden` attributes.
