# Vayu · Product direction

Vayu is the first product application built from the Copper Orbit design system. This file records the product-specific scope separately from the shared design-system rules in `PROJECT_THINKING.md` and `DESIGN_SYSTEM.md`.

## Confirmed scope

- Product name: Vayu.
- Use the supplied Vayu wing mark, recolored to the Copper Orbit signal orange (`#F36C2D`).
- Main navigation: Incidents, Management, Configurations.
- Management is the selected primary area.
- Management submenu: Fleet Details & Map, Geofence Unification, Action Centre.
- Current focus: Fleet Details & Map. The other Management areas remain visible as future destinations.

## Current Fleet Details & Map foundation

- Fleet summary: total fleet, moving, idle, and needs-attention counts.
- Vehicle list with search, status filters, selected state, driver, speed, and freshness.
- Real OpenStreetMap operational map rendered through React Leaflet with selectable vehicle markers, status legend, geofence, and zoom controls.
- Vehicle details are shown on marker hover instead of occupying permanent page space.
- Management submenu stays available while the pointer moves from the primary item into the submenu; keyboard focus is supported as well.
- Layout responds by stacking fleet and map panels at narrower widths.

## Current interaction and density decisions

- The app is a Vite React project using `react`, `react-leaflet`, `leaflet`, and `lucide-react`.
- The page header is intentionally compact and the KPI cards were removed. Fleet totals live in a single inline summary bar.
- Fleet and map panels use a tight 8 px gap and minimal internal padding so operators can see more vehicles and map area at once.
- Vehicle detail cards are transient map tooltips on hover; the list still supports selection for orientation and status context.

## Provisional assumptions

- All vehicle names, drivers, counts, locations, metrics, and map geometry are sample data for interface design.
- Bengaluru is used as the provisional operating region because no production geography was specified.
- Vehicle power source varies, so the selected-vehicle panel labels the metric “Battery / fuel” until the real fleet model is known.
- Incidents, Geofence Unification, Action Centre, Configurations, onboarding, export, notifications, and user-profile actions are currently interface placeholders.

## Next information needed

- Real vehicle and telemetry data model.
- Geographic scope and mapping provider.
- Roles and permissions.
- Fleet hierarchy: organization, hub, group, vehicle, driver.
- Required actions from the fleet detail view.
- Severity and status definitions.
