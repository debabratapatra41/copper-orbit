# Copper Orbit · Project Thinking

This is the durable project memory for Copper Orbit. Update it whenever the product direction, design preferences, constraints, or decisions change. It should explain not only what was chosen, but why.

## How to use this file

- Treat **Confirmed direction** as the current source of truth.
- Keep **Working assumptions** provisional until the user confirms or rejects them.
- Record meaningful decisions in **Decision history** with their reasoning.
- Preserve superseded decisions in the history rather than silently deleting them.
- Do not record credentials, private personal data, or transient implementation details.
- Before substantial design or product work, review this file and `DESIGN_SYSTEM.md`.

## Confirmed direction

### Product and workflow

- Copper Orbit is being developed as a B2B enterprise product.
- Development work should use the local `v1` branch rather than `main`.
- Establish the design system before building product screens.
- The first design-system version should expose the available components, elements, interaction patterns, and rules in a browsable format.
- Theme decisions are intentionally iterative. The user wants to see the component foundation first, then explain the desired theme and refine it before proceeding with the wider product.
- Product and design work should preserve the user's thinking as it evolves so later decisions reflect the same intent.
- Interface icons should come from Lucide. If a needed icon is not available there, ask the user to provide it before using another source or creating a substitute.
- Buttons should use a pill shape with filled, outlined, and high-contrast variants in regular and compact sizes. Use the established Copper Orbit orange, warm neutrals, and near-black rather than a reference image's neon color.
- Badges should share the pill geometry, while cards use a softer 14 px radius and restrained shadows.
- The main product navigation should be a horizontal white header: brand left, section links centered, and high-priority actions plus a menu on the right. At smaller widths, section links collapse into the menu.
- Do not add redundant icons to text buttons. A clear label such as “Save changes” should remain text-only so the pill stays balanced and calm.
- Vayu is the first product built with this system. Its primary navigation is Incidents, Management, and Configurations; Management is selected and exposes Fleet Details & Map, Geofence Unification, and Action Centre.
- The current Vayu work focuses on Fleet Details & Map. Preserve the other Management destinations as visible future areas without inventing their workflows yet.

### Collaboration style

- Make design choices visible and reviewable rather than hiding them inside implementation.
- Record the reasoning behind decisions, especially when the choice affects later screens or components.
- Clearly distinguish user-confirmed preferences from provisional proposals.
- Build in stages: foundation, review, theme finalization, then product expansion.

## Working assumptions

These are current proposals, not settled requirements.

- The selected visual direction uses warm white and soft gray surfaces, near-black text, muted gray secondary labels, a restrained bright orange accent, compact enterprise layouts, and light/dark modes.
- The system should favor clarity, information density, accessibility, and predictable interaction patterns.
- Theme tokens should make brand color, typography, radius, spacing, and density easy to revise after review.
- The component catalogue currently uses framework-free HTML, CSS, and JavaScript so the foundation can be reviewed before the application stack is selected.

## Questions to resolve

- What business problem does Copper Orbit solve, and who are its primary users?
- What emotional qualities should the brand convey: precise, premium, technical, warm, bold, understated, or something else?
- Which products, brands, or interfaces feel close to the desired direction? What specifically works about them?
- Should the final product optimize for comfortable spacing or high information density?
- What should the primary brand color, typography style, corner treatment, and default color mode be?
- Which product screens and workflows should be designed first after the theme is approved?
- What application framework and component architecture should the production design system target?

## Decision history

### 2026-10-31 · Work from `v1`

The local `v1` branch is the working branch for this project. The workspace checkout was populated from the existing local repository at `/Users/dbiosloki/Documents/Pro/Github/copper-orbit`.

### 2026-10-31 · Design system before product screens

The user chose to establish a B2B enterprise design foundation first. This allows the component vocabulary and rules to be evaluated before a visual theme is finalized or product screens lock in those choices.

### 2026-10-31 · Provisional foundation created

The first reviewable catalogue includes semantic color tokens, typography and spacing guidance, buttons, navigation, form controls, data tables, status badges, progress and loading states, empty states, alerts, toasts, dialogs, responsive behavior, keyboard interactions, and accessibility guidance.

The first copper-accented theme was a proposal for review and has since been superseded by the orange-and-warm-neutral reference direction below.

### 2026-10-31 · Maintain a thinking log

The user requested that their thinking be saved throughout the project. Future meaningful preferences, corrections, decisions, and rationale should be added here during the work rather than reconstructed later from chat history.

### 2026-10-31 · Use Lucide icons

The user selected Lucide as the product icon source. Existing improvised Unicode symbols were replaced with local Lucide SVGs. Status dots remain semantic indicators. When Lucide does not contain a suitable icon, pause and ask the user to provide one.

### 2026-10-31 · Color and typography reference selected

The user provided a B2B SaaS interface reference for color and typography. The active direction is warm white content surfaces, soft gray application chrome, fine neutral borders, near-black primary text, muted gray secondary labels, and a focused bright orange accent. Typography should feel compact, modern, calm, and direct, using Inter when available with the native system sans stack as fallback.

The accent is used sparingly for active states, primary actions, focus, and small visual signals. It should not dominate large surfaces. This direction supersedes the initial muted-copper proposal.

### 2026-10-31 · Pill-shaped component language

The user provided a reference for buttons, badges, and cards. Copper Orbit adopts its rounded component language while retaining the project's orange-and-neutral color system. Buttons use pill geometry with primary orange, outlined neutral, near-black contrast, destructive, disabled, and loading variants. Regular and compact sizes are required. Badges use matching pill geometry, while cards use 14 px corners and restrained shadows.

### 2026-10-31 · Horizontal main navigation

The user selected a horizontal product-navigation reference. The main shell uses the Copper Orbit mark and name on the left, visible section links in the center, and a high-contrast review action, theme control, and menu on the right. At narrower widths, the section links collapse into an accessible menu. Active sections use a small orange indicator rather than a filled navigation pill.

The user also rejected the primary “Save changes” button with its trailing save icon. Text buttons should not include a redundant icon when the label already communicates the action. Removing the icon improves centering, spacing, and visual calm.

### 2026-10-31 · Vayu product foundation

The user named the product Vayu and supplied its wing logo. The mark is recolored to the design system's signal orange and paired with a live-text Vayu wordmark for the application header.

Vayu's primary navigation contains Incidents, Management, and Configurations. Management is selected and reveals Fleet Details & Map, Geofence Unification, and Action Centre on hover or focus. The first implemented product surface is Fleet Details & Map; other areas remain placeholders until the user supplies their requirements.

### 2026-10-31 · Enterprise density feedback

User thinking:
The interface should save space and prioritize useful functionality. The Fleet Details & Map header should be smaller, the KPI cards are unnecessary, the fleet/map gap and padding should be minimized, and vehicle details should appear only when hovering a vehicle on the map.

Decision:
Vayu uses a compact page heading, an inline fleet summary bar, tight two-panel spacing, and transient hover details on map markers. The map is a real OpenStreetMap surface in a React implementation.

Reasoning and implications:
Operational users need simultaneous access to the vehicle list and geographic context. Permanent summary cards and a fixed selected-vehicle panel consume vertical space and compete with the primary task, so they are replaced by lightweight inline metrics and contextual hover content.

Status:
Confirmed

## Notes template

### 2026-10-31 · Drivers and inactive vehicles

The user wants a sample population of 1,000 drivers for the fleet. Vehicles that are not active should show the last driver rather than imply a driver is currently assigned. In the prototype, idle vehicles use the “Last driven by” label.

### 2026-10-31 · Vehicle list alternatives

The user requested five standalone visual iterations of the vehicle list to compare polished treatments before selecting a direction. Keep the compact operational hierarchy, existing status colors, and orange selection while exploring alternatives.

The user selected option 03, “Soft cards”: each vehicle gets a subtly bordered rounded card, with a light orange selected state.

### 2026-10-31 · Global fleet clustering

The fleet prototype should show 3,000 vehicles across the world, initially at world zoom, grouped into clusters that expand as users zoom in. Fleet locations and telemetry remain illustrative sample data.

### 2026-10-31 · Map-first layout reference

The user selected a reference with an edge-to-edge map and compact, information-rich vehicle list. Apply that layout using Vayu's colors, typography and components, while retaining the existing top navigation and hover-only map vehicle details.

### 2026-10-31 · Fleet workspace polish

The user invited independent UI refinement while retaining the established enterprise density. The workspace now emphasizes readable vehicle identifiers and status, a compact inline summary, clear map controls, and restrained borders and orange selection. The list and real map remain the primary working surfaces; details remain contextual on marker hover.

Use this structure when adding a new entry:

```text
### YYYY-MM-DD · Decision or insight

User thinking:
What the user expressed, preserving the intent in concise language.

Decision:
What is now confirmed, if anything.

Reasoning and implications:
Why it matters and what future design or implementation should follow from it.

Status:
Confirmed / Provisional / Revisit
```
