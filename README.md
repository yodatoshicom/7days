# weekDash

A minimal weekly dashboard that lives in your browser. See your week at a glance, check the weather, and keep sticky notes — no accounts, no sync, no frameworks.

## What it does

- **Weekly calendar** — current week with today highlighted, navigate forward/back
- **7-day weather** — forecast with icons and hover descriptions, powered by Open-Meteo (free, no API key)
- **Auto location** — detects your city via IP, or set it manually in settings
- **Sticky notes** — double-click anywhere to create a note, drag to move, click to edit, color-code them
- **Image notes** — drag any image from your desktop onto the page to pin it as a note
- **Themes** — light, dark, and a few color accents
- **Font picker** — Inter, Lora, Caveat, DM Mono, JetBrains Mono
- **Multi-language** — click the greeting to switch between English, Portuguese, and Spanish

Everything is saved to localStorage — no server, no backend.

## Run

Just open `index.html` in a browser. No install, no build step.

## Structure

```
index.html      Everything — HTML, CSS, and app logic
js/weather.js   Weather fetching, location detection, and rendering
favicon.png     Site icon
```

## License

MIT
