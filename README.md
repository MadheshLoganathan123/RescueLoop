# RescueLoop Frontend

A responsive Next.js + TypeScript recreation of the RescueLoop food-rescue coordination UI based on the supplied reference PDF.

## Included

- RescueLoop sign-in landing screen
- Donor workspace: overview, create donation, donation details, history
- NGO workspace: overview, incoming offers, offer review, requirements & capacity
- Volunteer workspace: overview and task details
- Operations console: overview, mission control and mission details
- Reusable navigation, cards, stats, badges, tables, forms, timelines and responsive layouts
- Demo workspace switcher in the bottom bar to move between roles
- Mock data and front-end-only interactions; no backend is connected

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production check:

```bash
npm run build
npm start
```

## Notes

The project uses the Next.js App Router, React, TypeScript and lucide-react. The reference screens use a compact dashboard visual language with a green food-rescue palette, light borders, dense tables, and responsive two-column layouts. Google Fonts are loaded from the stylesheet for the DM Sans typeface; if offline, the system fallback is used.
