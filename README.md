# Aura

A spatial planner dashboard with glassmorphic design. Built as a single-page app — no frameworks, no build step.

## Features

- **Mesh gradient background** — blurred color spheres rendered in an isolated iframe
- **Live weather** — 7-day forecast via Open-Meteo API with 30-min caching
- **Location detection** — GPS first, IP fallback (ipapi.co + ip-api.com), reverse geocoding via OpenStreetMap
- **Weekly dock** — current week calendar with active day highlight
- **Sticky notes** — double-click to create, drag to move, double-click to edit, Enter to save, Esc to cancel
- **Multi-language** — click the greeting to cycle between English, Portuguese, and Spanish

## Run

Open `index.html` in a browser. No server required.

## Structure

```
index.html       Main app (HTML + CSS + core JS)
js/weather.js    Weather & location module
```

## License

MIT
