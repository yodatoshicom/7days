# weekDash

A free, minimal weekly planner that runs entirely in your browser. No account, no install, no backend — open the URL and start using it.

**Live app:** [weekdash.com](https://weekdash.com) · [yodatoshii.github.io/7days](https://yodatoshii.github.io/7days/)

---

## What it does

weekDash shows your current week as a clean calendar dock, today highlighted. Navigate forward or back by week. A year progress bar shows how far through the year you are, with months and seasons marked.

Weather is fetched automatically from [Open-Meteo](https://open-meteo.com/) (free, no API key) based on your IP location. You can override the city manually in settings. Temperatures toggle between Celsius and Fahrenheit.

Double-click anywhere on the page to create a sticky note. Drag it, resize it, pick a color, edit inline. Drop an image from your desktop and it becomes a pinned image note. Everything saves to `localStorage` — nothing leaves your browser.

A sun/moon arc overlays the sky background showing the current position of the sun or moon relative to the day's arc.

---

## Features

- Weekly calendar with today highlighted and forward/back week navigation
- 7-day weather forecast with conditions, temperature, and wind
- Automatic city detection via IP (ipapi.co → ipwho.is fallback), manual override
- Celsius / Fahrenheit toggle
- Sticky notes — double-click to create, drag to move, resize, color picker
- Image notes — drag any image from your desktop onto the page
- Year progress bar with month labels and season markers
- Sun and moon arc with night sky and stars
- Themes and font picker
- Multi-language: English, Spanish, Portuguese
- All data in `localStorage` — no server, no account, no tracking

---

## Stack

- Single `index.html` — no framework, no build step, no dependencies
- Vanilla JS + CSS only
- Weather: [Open-Meteo API](https://open-meteo.com/) (free, no key)
- Location: ipapi.co with ipwho.is fallback
- Analytics: Umami (self-hosted, privacy-friendly)

---

## Run locally

```
git clone https://github.com/yodatoshii/7days.git
open index.html
```

No build step. No `npm install`. Just open the file.

---

## localStorage keys

| Key | Contents |
|---|---|
| `aura_notes_v3` | Notes array |
| `aura_location_cache` | City, lat, lon, method, timestamp |
| `aura_weather_cache` | Weather data + timestamp |
| `aura_temp_unit` | `'C'` or `'F'` |
| `aura_lang` | `'en'`, `'es'`, or `'pt'` |
| `aura_bg` | Theme/background selection |
| `aura_note_font` | Font selection |
| `aura_note_size` | Font size |

---

## License

MIT
