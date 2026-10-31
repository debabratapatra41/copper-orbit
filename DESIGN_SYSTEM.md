# Copper Orbit design system · v0.1

Provisional enterprise foundation for theme review. Open `index.html` through a static server. No framework or build dependency is required. These are reusable CSS primitives and native HTML examples, not a production application or framework component package.

## Foundations

Base component styles live in `styles.css`; the approved reference direction and semantic color overrides live in `reference-theme.css`. Dark-mode overrides use `[data-theme=dark]`. Never use status colors for unrelated decoration.

The current visual direction uses warm white and pale gray surfaces, near-black text, quiet gray secondary text, fine neutral borders, and signal orange (`#F36C2D`) as the sole brand accent. The orange should identify active navigation, primary actions, focus, and small emphasis moments rather than fill large decorative areas.

Use Inter when available, followed by the native system sans stack. Body: 14/21 px at regular weight; interface labels: 13 px at medium weight; metadata: 10–12/18 px; section headings: 23 px at semibold; page headings: responsive 34–48 px at semibold. Headings use tight tracking; body and labels remain compact and calm. Keep dense metadata secondary, never hide essential instructions there.

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Buttons and badges use pill geometry; cards use 14 px corners; dialogs use 12 px. Prefer borders and restrained shadows. Regular buttons are 42 px high, compact buttons are 34 px, and touch-oriented controls reach 44 px on narrow screens. Layout: 242 px navigation, bounded content width, two-column component cards collapsing below 800 px.

Use icons from [Lucide](https://lucide.dev). Match the icon to the action or concept, keep the default 2 px stroke, and use 15–16 px icons in controls. Do not add an icon when the text already explains the action; for example, “Save changes” remains text-only. Decorative icons are hidden from assistive technology; the adjacent text supplies the accessible name. Status must retain text and cannot rely on an icon alone. If Lucide has no suitable icon, ask the user before introducing another source or a custom icon. The local `lucide-icons.js` renderer contains only the icons used by this dependency-free catalogue.

## Components and rules

| Family | Included | Usage |
| --- | --- | --- |
| Actions | Pill-shaped primary, secondary, contrast, destructive, disabled, and loading buttons in regular and compact sizes | One primary action per task. Use explicit verb labels. Contrast is a strong alternative, not a second primary. Confirm irreversible decisions. |
| Navigation | Horizontal product header, responsive menu, section links, tabs, density selector | Keep the brand left, primary links centered, and actions right. Collapse links into a working menu at narrower widths. Tabs support arrows, Home and End. |
| Forms | Text, email, select, checkbox, switch, read-only, disabled, error | Always provide labels. Connect help and errors through aria-describedby. Use native validation in the demo; production should validate on the server too. |
| Data | Searchable table, avatar, status badge, result count | Use semantic column headers. Keep status text alongside color. Horizontally scroll tables on small screens. |
| Feedback | Alert, toast, progress, skeleton, empty state | Use persistent inline errors for required corrections; temporary polite announcements for confirmations. |
| Overlays | Native dialog, destructive confirmation, disclosure | Dialogs contain one decision and support Escape and focus containment. Default focus to cancellation for destructive actions. |

## Accessibility and content

Target WCAG 2.2 AA. Check final theme colors for 4.5:1 text contrast and 3:1 large text / required control contrast. Keep keyboard focus visible. Respect reduced motion. Use real buttons and form controls; never encode meaning only in color. Use sentence case and specific messages describing how to recover. Do not make essential information available only on hover.

Review keyboard navigation, dark mode, 320 px and wide layouts, zoom to 200%, and screen-reader announcements before release. This preview is not an accessibility certification.

## Scope and next decisions

All people and actions are demonstrations; there is no persistence or backend. Decide brand color, typography, radius, density, and preferred mode after review. Product-specific flows, date picker, combobox, pagination, file upload, and framework integration should follow actual requirements. Avoid presenting unimplemented components as finished.
