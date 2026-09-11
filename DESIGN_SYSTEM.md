# Easy Flow design system

This is a source-grounded reference for the existing Home Dashboard, Data Table, and Traffic Light Controls pages. Use it to keep future UI work visually compatible with the current system.

## Product character

Easy Flow is an operational traffic-monitoring interface. It prioritizes dense live information, maps, charts, status, and configuration over decorative presentation. The visual language is quiet and utilitarian: a pale-blue workspace behind white data surfaces, compact text, restrained borders, and soft elevation.

## Foundations

### Technology and styling

- React with Tailwind CSS v4 for most layout, sizing, responsive rules, and one-off styling.
- Small component CSS files support reusable details and browser-specific styling.
- Roboto is the global body typeface.
- The app background is `#D8E2ED`.

### Color roles

| Role | Current value or treatment | Use |
| --- | --- | --- |
| Workspace background | `#D8E2ED` | Page canvas behind panels |
| Surface | `#FFFFFF` | Cards, controls, tables, map containers, sidebar |
| Primary text | black, `black/60`, or `#363636` | Headings, numeric values, labels |
| Secondary text | `#4D4D4D`, `#363636` at reduced opacity | Supporting labels and road names |
| Rules | `#D3D3D3`, `#D9D9D9`, or `black/10` | Dividers and table/list structure |
| Blue context layer | `#0000FF` / `bg-blue-700/10` | Subtle chart/summary grouping; never a dominant fill |
| Status | red, orange, green, and component-provided state colors | Traffic lights, conditions, violation severity |
| Chart accents | `#7e77d6` and orange | Density and forecast series |

Do not introduce gradients, large saturated background fields, or decorative colors unless the feature is itself a status signal.

### Typography

- Use Roboto, normal sentence case, and left-aligned labels by default.
- Page headings use medium or bold weight at `1.25rem` to `1.7rem`; dashboard/configuration headings often use reduced black opacity.
- Standard labels are compact: typically `0.6rem`–`0.8rem`; cards use `0.875rem`–`1.2rem` titles.
- KPI values are larger (`1.25rem`–`3rem`) and use medium weight.
- Road names use muted `#4D4D4D` at `0.7rem`.
- Table/chart headers are visually quieter than their values: reduced opacity, medium weight, and thin rules.

### Elevation, borders, and shape

- The standard elevated surface uses `box-shadow: 0 1px 4px 1px rgba(0,0,0,0.25)`.
- White surfaces frequently have no visible border; use a `#D9D9D9` / `black/10` divider when structure is needed.
- Shape is restrained. Many dashboard panels are square; summary containers may use `rounded`; controls and filters use `rounded-[15px]`; numeric inputs use `5px` radius.
- Keep shadows and corners consistent with nearby surfaces instead of inventing a new card treatment.

### Icons and interaction states

- Navigation uses simple 24×24 SVG line icons at `size-8 md:size-9`, black/current-color, with `1.5` stroke width.
- Sidebar icons use only strokes and no fills or decorative color, except the literal traffic-signal icon which communicates light state.
- Hover feedback is subtle: `hover:bg-black/10`, `hover:bg-black/20`, or a light gray surface (`rgb(230,230,230)`).
- Configuration navigation buttons use `rounded-[15px]` with a gray hover surface (`rgb(201,200,200)`).

## Shared layout rules

### Application navigation

The `SideBar` is shared across these pages.

- Desktop (`md` and above): a narrow vertical white rail, `3vw` wide with `min-w-12`, approximately `97.5vh` tall; items stack from the top with a generous `gap-6`.
- Mobile: a fixed white bottom bar, `h-16`, full width, high z-index, horizontal distribution, and `gap-4`.
- Page content must reserve bottom space on mobile (`pb-20`) so the fixed navigation does not cover content.

### Breakpoints and scrolling

- The primary responsive pivot is `md`: desktop changes from stacked content to side-by-side columns and changes the sidebar from bottom bar to rail.
- `sm` increases padding and allows controls to share a row.
- `lg` enables denser dashboard/table split layouts and fixed viewport-height regions.
- On small screens, stack sections, allow content to take natural height, and give data regions `min-h-*` values.
- Preserve `overflow-y-auto` for long records/configuration forms and `overflow-x-auto` for wide tables.

### Reusable surface patterns

| Pattern | Construction |
| --- | --- |
| Dashboard panel | White background, standard shadow, minimal or no radius, data dense |
| Grouped analytics area | Low-opacity blue background with standard shadow, padded white cards inside |
| Filter control | White, standard shadow, `rounded-[15px]`, compact `px-4 py-2` padding |
| Dropdown | Absolute white overlay with standard shadow; rows use `.videoStreamButton` vertical padding and a black translucent hover |
| List row | Top/bottom gray rules, `1vh` vertical padding, hover to light gray |
| Numeric input | `#f7f8fa` fill, `#d5d9df` border, 4rem width, centered text, no spinner |

## Page compositions

### Home Dashboard (`/`)

The dashboard is an at-a-glance monitoring workspace. Its desktop shell is a three-part horizontal layout:

```text
┌──────┬──────────────────────┬──────────────────────────────────────────────┐
│ Nav  │ Violation monitoring │ Map with approach cards and video controls   │
│ rail │ (18vw)               ├───────────────┬───────────────┬──────────────┤
│      │                      │ Violation     │ Live chart +  │ Average      │
│      │                      │ detail        │ counters      │ summary      │
└──────┴──────────────────────┴───────────────┴───────────────┴──────────────┘
```

- The root uses a near-viewport-height flex shell with a small outer margin.
- The violation monitor is a white, scrollable left column on desktop and a capped-height panel when stacked on mobile.
- The map is the visual anchor: white background, large flexible desktop region, at least `min-h-80` on smaller screens, with approach cards and a video overlay layered above it.
- The lower region becomes a three-column desktop row at `lg`: violation detail, traffic chart/counters, and average summary. Before `lg`, it stacks with the chart before the summary and detail.
- Live information is compact: borders divide list rows; cards and charts use standard shadows; empty states are simple centered text.

### Data Table Page (`/data_table_page`)

The data page is a monthly analytics workspace with filtering at the top and comparison below.

```text
┌──────┬──────────────────────────────────────────────────────┐
│ Nav  │ Approach monthly summary              [Approach][Month]│
│ rail ├──────────────┬──────────────┬──────────────────────────┤
│      │ Total count  │ Avg. flow    │ Avg. density             │
│      ├─────────────────────────────┼──────────────────────────┤
│      │ Daily table                 │ Weekly summary chart     │
└──────┴─────────────────────────────┴──────────────────────────┘
```

- Content uses responsive horizontal padding (`px-3`, `sm:px-6`, `lg:px-10`) and scrolls independently.
- The title fills a row on narrow screens; approach and month controls sit beside it on wider screens.
- The three KPI cards stack on mobile and form an equal three-column grid at `md`; their shared blue-tinted parent establishes them as one comparison set.
- The lower daily-table/chart region stacks until `lg`, then becomes two columns. The data table is intentionally hidden below `sm` due to its minimum width.
- Summary cards compare current values with the previous month. Use status color and directional iconography only to express the comparison state.

### Traffic Light Controls (`/traffic_light_controls_page`)

The configuration page is an editing workspace built around one elevated configuration container.

```text
┌──────┬──────────────────────────────────────────────────────┐
│ Nav  │ Traffic Controls Configuration       [Save config]    │
│ rail ├───────────────┬───────────────────────────────────────┤
│      │ Signal timers │ Selected section title                │
│      │ Flow thresholds│ Repeated road labels + numeric values│
│      │ Density thresh.│ in vertically scrollable groups       │
└──────┴───────────────┴───────────────────────────────────────┘
```

- The configuration view is a `popUpRoot`/`popUpContainerTLC` surface: approximately `96vw` on mobile and `75vw` at `md`, with a maximum near viewport height.
- Header actions stack on mobile and align title/action horizontally from `sm` upward.
- The inner white editor is `92vw` on mobile and `60vw` desktop, with a shadow and a vertical tab rail at `md`. On mobile the tabs become a horizontally scrollable top row.
- The active editor has a muted large section title separated by a thin rule and a scrollable form body.
- Forms are organized by traffic state or threshold type. Each group repeats the four road labels beside centered 4rem numeric inputs, separated by generous vertical gaps.
- “Save Configuration” is a white elevated action with a restrained blue-tinted hover; preserve this low-emphasis control styling.

## Rules for future changes

1. Start from a white elevated surface on the pale-blue canvas; use a low-opacity blue wrapper only to group related analytics.
2. Keep monitoring screens data-first: charts, map, status, and controls should take priority over decorative headers or illustration.
3. Match the existing responsive behavior: stack first, then introduce columns at `md` or `lg`; do not rely on a dense desktop-only layout.
4. Reuse the standard shadow, muted dividers, compact typography, and existing border radii before adding new visual tokens.
5. Use color semantically for traffic condition, violations, or chart series. Keep general navigation and configuration UI monochrome.
6. Make long data and form sections scrollable within their surface rather than expanding beyond the viewport.
7. When adding a new page, include the shared sidebar and mobile bottom-padding unless the page is deliberately standalone.

## Source files reviewed

- `client/src/pages/mainDashboard.jsx`
- `client/src/pages/dataTablePage.jsx`
- `client/src/pages/trafficControls.jsx`
- `client/src/components/sideBar.jsx`
- Dashboard, table, chart, map, video, summary, violation, and traffic-control components used by those pages
- `client/src/index.css`
- `client/src/styles/mainDashboard.css`
- `client/src/styles/trafficLightControls.css`
- `client/src/styles/videoStream.css`
- `client/src/styles/violationMonitoring.css`
