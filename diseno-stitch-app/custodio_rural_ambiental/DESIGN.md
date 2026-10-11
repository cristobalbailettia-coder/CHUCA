---
name: Custodio Rural & Ambiental
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#414845'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#717975'
  outline-variant: '#c1c8c3'
  surface-tint: '#3f6658'
  primary: '#002218'
  on-primary: '#ffffff'
  primary-container: '#0f382c'
  on-primary-container: '#79a292'
  inverse-primary: '#a6d0be'
  secondary: '#006d30'
  on-secondary: '#ffffff'
  secondary-container: '#92f5a4'
  on-secondary-container: '#007233'
  tertiary: '#301600'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2700'
  on-tertiary-container: '#e48015'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecda'
  primary-fixed-dim: '#a6d0be'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#274e41'
  secondary-fixed: '#95f8a7'
  secondary-fixed-dim: '#79db8d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  body-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-action:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.01em
  label-status:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system is constructed specifically for community wardens, park rangers, and local environmental volunteers aged 40 to 70 operating in rugged outdoor conditions. Visual ergonomics prioritize rapid comprehension, zero ambiguity, and high legibility under harsh direct sunlight, moving vehicles, and adverse weather.

The aesthetic fuses **Tactile Utility** with **High-Contrast Modernism**. It deliberately avoids fragile minimalist tropes, tiny controls, and low-contrast decorative graphics. Interface elements carry physical weight: thick bounding strokes, high-contrast surface containment, oversized touch footprints, and unequivocal state indicators. The visual tone conveys institutional reliability, environmental guardianship, calm authority, and rapid emergency intervention.

## Colors

The palette is engineered to surpass WCAG AAA standards for critical legibility under varying field illuminations:

- **Primary (`#0F382C` - Deep Petrol Green)**: The anchor of authority and environmental governance. Used for top app bars, primary active states, structural headers, and focal containers. Provides high optical contrast against light backgrounds.
- **Secondary (`#15803D` - Foliage Green)**: Operational feedback, active track logs, verified patrol routes, and positive state confirmations.
- **Tertiary / Warning (`#D97706` - Amber Signal)**: Environmental hazards, pending sync tasks, minor alerts, and offline mode notices. Delivers instant visibility without triggering panic.
- **Critical Emergency (`#DC2626` - SOS Crimson)**: Strictly reserved for immediate danger, distress pings, panic dispatches, and life-safety alerts. Must never be reused for routine errors or destructive table actions.
- **Neutrals & Surfaces**: Backgrounds rely on `#F8FAF8` (warm anti-glare canvas) paired with `#FFFFFF` for elevated actionable cards, bordered with `#E2E8F0` and `#0F382C` to eliminate glare washout. Primary text is anchored at `#111827` to ensure razor-sharp clarity for mature eyes.

## Typography

Typography choices accommodate presbyopia and outdoor glanceability. **Plus Jakarta Sans** provides wide apertures, tall x-heights, distinct letterforms (e.g., distinguishing 'I', 'l', and '1'), and robust stroke weights that do not break down in bright ambient light.

- **Floor Rule**: No typography may be rendered below `16px`. Captions and auxiliary notes default to `16px` with medium (`500`) weight.
- **Action Texts**: Core buttons utilize `22px` bold (`700`) typography to ensure immediate legibility while wearing gloves or holding devices at arm's length.
- **Numbers & Coordinates**: GPS coordinates, timestamps, and alert distances must use tabular numbers (`font-variant-numeric: tabular-nums`) with bold styling.

## Layout & Spacing

Layouts adhere to an aggressive **Single-Column Mobile First** discipline. In rugged field environments, complex multi-column layouts create cognitive overload and trigger mis-taps.

- **Touch Bounds**: Every interactable area must maintain a minimum bounding box of `60px` in height and width. Adjacent tap targets must feature at least `12px` of clear buffer spacing to prevent erroneous activations.
- **Thumb Zone Anchoring**: Primary actions (e.g., "Report Incident", "SOS", "Log Track") must reside within the bottom 40% of the viewport.
- **Safe Margins**: Outer screen gutters are locked at `20px` (`1.25rem`) to prevent screen-edge distortion on ruggedized phone cases with thick protective bezels.

## Elevation & Depth

This system avoids subtle, low-contrast diffuse shadows that vanish in daylight. Visual hierarchy is achieved via **High-Contrast Structural Outlines** and **Tactile Tonal Planes**:

- **Ground Level (`0dp`)**: Base canvas in anti-glare warm off-white (`#F8FAF8`).
- **Surface Level (`1dp`)**: Elevated cards and modules in solid white (`#FFFFFF`) framed by a persistent `2px` border in `#CBD5E1`.
- **Active / Focused (`2dp`)**: Raised panels carry a `3px` border in `#0F382C` paired with an offset tactile shadow: `0px 4px 0px 0px rgba(15, 56, 44, 0.25)`.
- **Modal / Alert Sheet (`3dp`)**: Overlays sit above an 80% opacity dark veil (`rgba(17, 24, 39, 0.8)`) with a clean `4px` top border in the respective semantic color (Emergency `#DC2626` or Warning `#D97706`).

## Shapes

The shape system employs rounded corners (`12px` to `16px`) providing soft, approachable, yet structured interfaces. Pill shapes (`9999px`) are reserved exclusively for contextual status chips and floating emergency triggers to distinguish them from actionable form controls and structural task cards.

Field inputs, cards, and primary buttons use consistent `12px` border-radii (`roundedness: 2`), ensuring clear visual boundaries without wasting touch surface area.

## Components

### Buttons
- **Touch Targets**: Minimum height of `60px`; standard primary height `64px`.
- **Primary Action**: Solid `#0F382C` fill, `#FFFFFF` text (`22px` Bold), `12px` rounded edges, and centered high-visibility `28px` icon. Active state depresses visually via a `2px` downward translation.
- **SOS / Emergency Action**: Fixed-position or prominent full-width bar in `#DC2626`, white text, with an obligatory `3px` border in `#991B1B`. Features an optional "Hold for 3 Seconds" circular progress fill to eliminate accidental triggers while permitting swift activation.

### Chips & Status Badges
- **Display**: Minimum height `44px`, horizontal padding `16px`, pill-shaped (`9999px`).
- **Contrast**: Never rely solely on color. Every chip pairs a high-contrast icon with explicit text in uppercase `label-status` (e.g., green checkmark with "SINCRONIZADO", amber alert with "MODO OFFLINE").

### Lists & Activity Logs
- **Rows**: Minimum height `76px` with distinct divider lines (`2px solid #E2E8F0`).
- **Structure**: High-contrast icon (`32px`) pinned to the left, primary headline (`20px` Bold), and auxiliary metadata (`16px` Regular) directly underneath. Tap targets include chevron indicators measuring at least `28px`.

### Checkboxes & Radio Buttons
- **Dimensions**: Control boxes/radios are oversized at `32px × 32px` with a `3px` border.
- **Hit Area**: The entire card or row acts as the tap surface (`min-height: 64px`), accompanied by haptic feedback and instant state color change (`#0F382C` border and light tint fill).

### Input Fields & Selectors
- **Structure**: Boxed styling with a persistent `2px` border (`#64748B`), expanding to `3px` solid `#0F382C` upon focus. Minimum field height `64px`.
- **Labels**: Persistent labels above the field in `18px` Bold (`#111827`). No floating or placeholder-only labels. Placeholder text uses minimum `18px` in `#64748B`.

### Cards & Field Reports
- **Container**: Solid `#FFFFFF` background, `2px` stroke in `#CBD5E1`, and internal padding of `20px`.
- **Emergency / Incident Card**: Left-side accent bar of `8px` thickness using semantic colors (`#DC2626` for severe infraction, `#D97706` for hazard alert).

### Offline & GPS Connectivity Banner
- **Persistence**: Fixed bar at screen top or just below the header.
- **Styling**: `48px` height, `#D97706` background with black text and clear satellite / cloud status icons, ensuring wardens instantly identify data caching status.