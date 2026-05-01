# Design System

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| cream | #F5F1E8 | Page background |
| cream-deep | #ECE5D4 | Hover/pressed backgrounds |
| paper | #FBF8F0 | Card backgrounds |
| surface | #FFFFFF | Elevated cards |
| ink | #1A1714 | Primary text |
| ink-muted | #6E665B | Secondary text |
| ink-faint | #A89F90 | Tertiary text, placeholders |
| line | #E2DAC6 | Borders |
| line-soft | #EDE6D2 | Subtle dividers |
| accent | #B8331E | Primary CTA, links |
| accent-deep | #8E2614 | Hover state |
| accent-soft | #D2543E | Light accent |
| gold | #D4972A | Secondary accent, badges |
| green | #4A6D3D | Success states |
| night | #1A1714 | Dark cards |
| night-soft | #2A241A | Dark card hover |

## Typography
- **Outfit** — Primary sans-serif. Semibold (600) for headlines, regular (400) for body.
- **Instrument Serif** — Italic only, accent words only (e.g., "Now what?").
- **JetBrains Mono** — Labels, metadata, code snippets.

## Spacing & Layout
- Tailwind defaults. Generous section padding (py-24 to py-32).
- Max content width: max-w-7xl (1280px).
- Big rounded corners: rounded-3xl signature.
- Subtle shadows, no heavy borders.

## Animations
| Name | Spec |
|------|------|
| fadeUp | 28px translateY → 0, 0.9s cubic-bezier(0.22,1,0.36,1) |
| fadeIn | opacity 0→1, 0.6s ease-out |
| drift | 12px translateY oscillation, 6s infinite |
| pulseDot | opacity 1→0.3, 2s infinite |
| scoreCount | scale 0.85→1, 0.6s |
| ringDraw | SVG dasharray draw, 1.5s |
| toastIn | 20px translateY + fade, 0.4s |
| typingDot | -6px bounce, 1.4s infinite |
| CountUp | 0 → target on scroll, 2s ease-out |
