---
name: Serene Editorial Travel
colors:
  surface: '#faf9fb'
  surface-dim: '#dbd9dc'
  surface-bright: '#faf9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f5'
  surface-container: '#efedf0'
  surface-container-high: '#e9e8ea'
  surface-container-highest: '#e3e2e4'
  on-surface: '#1b1c1e'
  on-surface-variant: '#424844'
  inverse-surface: '#2f3032'
  inverse-on-surface: '#f2f0f3'
  outline: '#727974'
  outline-variant: '#c2c8c2'
  surface-tint: '#4a6457'
  primary: '#183126'
  on-primary: '#ffffff'
  primary-container: '#2e473b'
  on-primary-container: '#99b5a5'
  inverse-primary: '#b1cdbd'
  secondary: '#5b5e66'
  on-secondary: '#ffffff'
  secondary-container: '#dddfe8'
  on-secondary-container: '#5f636a'
  tertiary: '#402424'
  on-tertiary: '#ffffff'
  tertiary-container: '#593939'
  on-tertiary-container: '#cfa3a3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce9d9'
  primary-fixed-dim: '#b1cdbd'
  on-primary-fixed: '#062016'
  on-primary-fixed-variant: '#334c40'
  secondary-fixed: '#e0e2eb'
  secondary-fixed-dim: '#c4c6cf'
  on-secondary-fixed: '#181c22'
  on-secondary-fixed-variant: '#43474e'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#e9bbbb'
  on-tertiary-fixed: '#2e1414'
  on-tertiary-fixed-variant: '#5f3e3e'
  background: '#faf9fb'
  on-background: '#1b1c1e'
  surface-variant: '#e3e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '400'
    lineHeight: 42px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an editorial, contemplative approach to personal travel discovery and documentation. Rooted in the quiet visual balance of print journals like *Kinfolk* and *Cereal*, alongside the precision and reduction of high-end consumer hardware interfaces, the UI steps back completely to let travel imagery, typography, and personal narratives take precedence.

The emotional signature is unhurried, grounded, and discerning. The interface avoids aggressive gamification, saturated visual badges, and clutter. It behaves as an understated digital archive: expansive whitespace, strict alignment grids, delicate hairline divisions, and subtle transitions create an atmosphere of stillness, clarity, and timeless elegance.

### Application Identity

- **Name:** TravelTrove
- **Version-one wordmark:** Restrained text wordmark using the approved interface
  typography and primary ink color; no separate symbol is required.
- **Usage:** Write the product name as `TravelTrove` with both internal capitals.
  Do not abbreviate it in navigation, metadata, authentication, or
  administration surfaces.
- **Scope:** A future custom symbol or expanded brand system may build on this
  wordmark without changing the version-one application name.

## Colors

The palette is anchored by architectural neutrals and warm, tactile off-whites
that mimic uncoated archival paper. The machine-readable tokens in the front
matter are canonical; the values below are their human-readable aliases.

- **Primary Canvas (`surface`, `#FAF9FB`)**: The core background layer. Soft,
  warm, and anti-glare, establishing an analog editorial feel.
- **Secondary Canvas & Well (`surface-container-low`, `#F5F3F5`)**: Used for
  subtle nesting, card backgrounds, grouped input trays, and table header rows.
- **Primary Ink (`on-surface`, `#1B1C1E`)**: Deep charcoal, avoiding harsh
  pitch-black while preserving strict legibility.
- **Secondary Ink (`on-surface-variant`, `#424844`)**: Muted charcoal-green for
  metadata, timestamps, location tags, subheaders, and secondary controls.
- **Supporting Outline (`outline`, `#727974`)**: Used for secondary control
  outlines and non-text boundaries where stronger separation is required.
- **Hairline Border (`outline-variant`, `#C2C8C2`)**: The canonical structural
  line for card perimeters, column dividers, and list separators. Subtle internal
  divisions may use `surface-container-highest` (`#E3E2E4`).
- **Deep Sage Accent (`primary-container`, `#2E473B`)**: A botanical eucalyptus
  green used with strict parsimony for active states and primary action anchors.
  Its darker interaction/state companion is `primary` (`#183126`).

## Typography

Typography prioritizes clarity, structural consistency, and generous line spacing.

- **Weight Discipline**: Limit typographic weight strictly to `400` (Regular), `500` (Medium), and `600` (Semi-Bold). Avoid heavy black weights (`700+`) to protect the airy, publication-like feel.
- **Letter Spacing**: Large display and headline sizes employ subtle negative tracking (`-0.01em` to `-0.03em`) to tighten optical rhythm. Micro labels (`label-md`, `label-sm`) use uppercase treatments with slight positive tracking (`+0.04em` to `+0.06em`) for elevated readability.
- **Editorial Proportions**: Long-form journal entries rely on `body-lg` set with an open `1.65` line-height ratio, constrained to a maximum reading width of 680 pixels.

## Layout & Spacing

The layout is built upon an intentional, asymmetric grid inspired by Swiss typography and contemporary visual catalogs.

- **Grid Structure**: A responsive 12-column grid on desktop (max width `1440px`), 8 columns on tablet, and 4 columns on mobile.
- **Whitespace Rhythm**: Whitespace serves as an active compositional tool rather than dead room. Sections are separated by generous vertical expanses (`space-xl` to twice `space-xl`) to establish cadence and pacing.
- **Reflow Rules**: On desktop and tablet, dual-column layouts feature contrasting column widths (e.g., 5-column journal narrative beside a 7-column staggered photo gallery). On mobile, multi-column layouts stack linearly, reducing margins to `1.25rem` while preserving 1:1 image ratios and breathing room.

### Version-One Web Viewport Policy

The version-one web application is designed for large tablets and computers with
a minimum supported viewport of `1024 CSS pixels` at default browser zoom. It does
not provide a phone-specific product layout; a native mobile application will be
designed separately. The mobile tokens above remain useful for constrained
browser-zoom and text-enlargement reflow, which is still required for
accessibility, but they do not imply supported phone-web screens.

## Elevation & Depth

Visual hierarchy is communicated via delicate surface shifts and hairline outlines rather than heavy drop shadows.

- **Low-Contrast Hairlines**: Surfaces sit flush or slightly stepped, separated
  by 1px `outline-variant` (`#C2C8C2`) boundaries or the subtler
  `surface-container-highest` (`#E3E2E4`) for internal divisions.
- **Surface Layering**: Secondary containers use `surface-container-low`
  (`#F5F3F5`) on the `surface` (`#FAF9FB`) canvas.
- **Ambient Diffusion**: Floating contextual elements (popovers, dropdown menus, lightweight modals) utilize a near-weightless shadow: `0 8px 30px -4px rgba(28, 29, 31, 0.05)`.
- **Glass & Backdrops**: Modals and sliding sheets utilize high-blur backdrops
  (`backdrop-blur-md` with `rgba(250, 249, 251, 0.75)`), preserving connection
  to underlying imagery while focusing attention.

## Shapes

The geometric signature uses refined, consistent curvatures that soften modern digital edges without feeling overly playful.

- **Base Radius (12px / `0.75rem`)**: The primary corner radius applied to cards, image frames, and input containers.
- **Compact Pills (9999px)**: Applied to interactive chips, filter tags, segment controls, and small primary buttons.
- **Sheet Corners (20px / `1.25rem`)**: Top edges of mobile slide-over sheets and floating modal enclosures use a subtle, larger continuous curve.

## Components

### Buttons
- **Primary Action**: Solid `primary-container` (`#2E473B`) background with
  `#FFFFFF` text, subtle pill shape (`rounded-full`), height `40px`, padding
  `0 20px`. Hover darkens toward `primary` (`#183126`) with no scale effect.
- **Secondary Action**: `surface` (`#FAF9FB`) background, 1px
  `outline-variant` (`#C2C8C2`) border, and `on-surface` (`#1B1C1E`) text. On
  hover, the background shifts to `surface-container-low` (`#F5F3F5`).
- **Ghost Action**: Transparent background with `on-surface-variant` (`#424844`)
  text, transitioning to `on-surface` (`#1B1C1E`) on hover.

### Cards & Discovery Tiles
- Constructed with `surface` (`#FAF9FB`) or `surface-container-low`
  (`#F5F3F5`) fill, bounded by a 1px `outline-variant` (`#C2C8C2`) border.
- Border radius strictly `rounded-xl` (12px).
- Card imagery uses clean `aspect-[4/3]` or `aspect-[16/10]` framing with `overflow-hidden`. Hover interactions feature an imperceptible image zoom (`scale-102`, transition duration `500ms ease-out`).

### Chips & Tags
- Used for destination tags, seasons, and mood labels.
- Compact height (`28px`), `rounded-full`, 1px `outline-variant` border, and
  `label-md` typography.
- Active state transitions background and border to `primary-container`
  (`#2E473B`) with white text.

### Input Fields & Controls
- **Inputs**: Minimal single-line and multiline fields set against `surface`,
  outlined with a 1px `outline-variant` border. Focus uses a clearly visible
  2px `primary` outline or equivalent inset treatment; avoid diffuse glow, but
  never remove the focus indicator.
- **Checkboxes & Radios**: Custom square (4px radius) and circle toggles with a
  1px outline. Checked state fills with `primary-container` and uses a white
  indicator.

### Modals & Sliding Side Sheets
- **Slide-out Sheet (Discovery Drawer / Place Details)**: Docked to the right edge
  on desktop, spanning `480px`. Use an `outline-variant` left border and a smooth
  cubic-bezier entrance (`transform 300ms ease-out`).
- **Modal Containers**: Centered with a maximum width of `640px`, floating with
  ambient shadow, wrapped in a 1px `outline-variant` border, and cushioned with
  `space-xl` interior padding.

### Lists & Timelines
- Clean vertical lists separated by 1px `surface-container-highest` dividers.
- Items feature left-aligned typographic details (`headline-sm` with stacked `body-sm` date and metadata) and generous vertical spacing (`padding: 16px 0`).
