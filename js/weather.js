/* ============================================================
   Weather & Location Module
   Requires global: lang (from main script)
============================================================ */

let currentLat = null;
let currentLon = null;
let weatherLoaded = false;
let weatherData = [];

/* ---- ERROR TOOLTIP HELPER ---- */
function appendCityError(msg) {
    const display = document.getElementById('city-display');
    const existing = display.title || '';
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${msg}`;
    display.title = existing ? existing + '\n' + entry : entry;
}

/* ---- LOCATION CACHE ---- */
const LOC_CACHE_KEY = 'aura_location_cache';
const LOC_CACHE_MAX_AGE = 60 * 60 * 1000;  // 1 hour — skip all APIs if fresh
const LOC_COOLDOWN = 60 * 1000;             // 1 min — minimum between requests

function getLocationCache() {
    try { return JSON.parse(localStorage.getItem(LOC_CACHE_KEY)); } catch { return null; }
}

function saveLocationCache(city, lat, lon, method) {
    localStorage.setItem(LOC_CACHE_KEY, JSON.stringify({
        city, lat, lon, method, ts: Date.now()
    }));
}

function restoreFromCache(cache) {
    const display = document.getElementById('city-display');
    currentLat = cache.lat;
    currentLon = cache.lon;
    display.textContent = cache.city;
    display.title = `${cache.city} (cached ${cache.method})\nLat: ${cache.lat.toFixed(4)}, Lon: ${cache.lon.toFixed(4)}`;
    fetchWeather(cache.lat, cache.lon);
}

/* ---- LOCATION DETECTION ---- */

async function startLocationProcess(forceRefresh = false) {
    const display = document.getElementById('city-display');
    const cache = getLocationCache();

    // Use cache if fresh enough and not forcing
    if (!forceRefresh && cache && (Date.now() - cache.ts < LOC_CACHE_MAX_AGE)) {
        appendCityError(`Using cached location (${Math.round((Date.now() - cache.ts) / 60000)}m old)`);
        restoreFromCache(cache);
        return;
    }

    // Enforce cooldown even on force refresh
    if (cache && (Date.now() - cache.ts < LOC_COOLDOWN)) {
        const wait = Math.ceil((LOC_COOLDOWN - (Date.now() - cache.ts)) / 1000);
        appendCityError(`Cooldown: wait ${wait}s before next request`);
        display.textContent = cache.city;
        display.title = `${cache.city} (cooldown — retry in ${wait}s)`;
        restoreFromCache(cache);
        return;
    }

    // Go straight to IP-based location — no browser geolocation prompt
    display.textContent = 'Locating...';
    fetchIPLocation();
}

async function searchCity(query) {
    const display = document.getElementById('city-display');
    display.textContent = 'Searching...';
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'AuraWeatherApp/1.0' } }
        );
        const results = await response.json();
        if (results.length > 0) {
            const { lat, lon, display_name } = results[0];
            currentLat = parseFloat(lat);
            currentLon = parseFloat(lon);
            const city = display_name.split(',')[0].trim();
            display.textContent = city;
            appendCityError(`Manual search OK: ${city} (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`);
            saveLocationCache(city, currentLat, currentLon, 'manual');
            fetchWeather(currentLat, currentLon, true);
        } else {
            display.textContent = 'Not found';
            appendCityError(`Search: no results for "${query}"`);
            setTimeout(() => {
                const cache = getLocationCache();
                if (cache) display.textContent = cache.city;
            }, 2000);
        }
    } catch (err) {
        display.textContent = 'Search failed';
        appendCityError(`Search error: ${err.message}`);
    }
}

async function fetchIPLocation() {
    const display = document.getElementById('city-display');
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error(`ipapi.co HTTP ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(`ipapi.co: ${data.reason || data.message || 'unknown error'}`);
        if (data.city && data.latitude && data.longitude) {
            currentLat = parseFloat(data.latitude);
            currentLon = parseFloat(data.longitude);
            display.textContent = `${data.city} (IP)`;
            appendCityError(`ipapi.co OK: ${data.city} (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`);
            saveLocationCache(data.city, currentLat, currentLon, 'ipapi.co');
            fetchWeather(currentLat, currentLon);
        } else {
            appendCityError('ipapi.co: missing city/coords in response');
            fetchIPLocationFallback();
        }
    } catch (err) {
        display.textContent = 'Retrying...';
        const isNetworkFail = err.message === 'Load failed' || err.message === 'Failed to fetch';
        appendCityError(`ipapi.co failed: ${err.message}${isNetworkFail ? ' (likely rate-limited or CORS blocked)' : ''}`);
        fetchIPLocationFallback();
    }
}

async function fetchIPLocationFallback() {
    const display = document.getElementById('city-display');
    try {
        // ip-api.com free tier is HTTP only — blocked on HTTPS pages (mixed content)
        // Use their HTTPS endpoint with fields param instead
        const response = await fetch('https://ipwho.is/');
        if (!response.ok) throw new Error(`ipwho.is HTTP ${response.status}`);
        const data = await response.json();
        if (data.success !== false && data.city && data.latitude && data.longitude) {
            currentLat = parseFloat(data.latitude);
            currentLon = parseFloat(data.longitude);
            display.textContent = `${data.city} (IP)`;
            appendCityError(`ipwho.is OK: ${data.city} (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`);
            saveLocationCache(data.city, currentLat, currentLon, 'ipwho.is');
            fetchWeather(currentLat, currentLon);
        } else {
            display.textContent = 'Location Unknown';
            appendCityError(`ipwho.is: ${data.message || 'no city/coords in response'}`);
            showWeatherError();
        }
    } catch (err) {
        display.textContent = 'Location Failed';
        const isNetworkFail = err.message === 'Load failed' || err.message === 'Failed to fetch';
        appendCityError(`ipwho.is failed: ${err.message}${isNetworkFail ? ' (network/CORS blocked)' : ''}`);
        showWeatherError();
    }
}

async function reverseGeocode(lat, lon, methodLabel = "GPS") {
    const display = document.getElementById('city-display');
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'User-Agent': 'AuraWeatherApp/1.0' } }
        );
        const data = await response.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "Location";
        display.textContent = city;
        appendCityError(`Geocode OK: ${city} (${methodLabel}, ${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        saveLocationCache(city, lat, lon, methodLabel);
    } catch (err) {
        display.textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        appendCityError(`Geocode failed: ${err.message}`);
    }
}

/* ---- WEATHER — Open-Meteo API with caching ---- */

async function fetchWeather(lat, lon, forceRefresh = false) {
    const cached = localStorage.getItem('aura_weather_cache');
    if (!forceRefresh && cached) {
        try {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < 30 * 60 * 1000) {
                renderWeather(data);
                weatherLoaded = true;
                return;
            }
            renderWeather(data);
        } catch(e) {}
    }
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
        const response = await fetch(url);
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Weather API ${response.status}${body ? ': ' + body.slice(0, 100) : ''}`);
        }
        const data = await response.json();
        if (data.daily && data.daily.time) {
            renderWeather(data.daily);
            weatherLoaded = true;
            localStorage.setItem('aura_weather_cache', JSON.stringify({ data: data.daily, ts: Date.now() }));
        } else {
            appendCityError('Weather: no daily data in response');
            showWeatherError();
        }
    } catch (e) {
        console.warn('Weather fetch error:', e.message);
        appendCityError(`Weather: ${e.message}`);
        if (!weatherLoaded) {
            showWeatherError();
        }
    }
}

function showWeatherError() {
    const weatherRow = document.getElementById('weather');
    weatherRow.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const wItem = document.createElement('div');
        wItem.className = 'weather-day';
        if (i === 0) wItem.classList.add('highlight-light');
        wItem.innerHTML = `<span class="weather-icon" style="opacity:0.3;">✕</span><span class="weather-temp" style="opacity:0.3;">--</span>`;
        weatherRow.appendChild(wItem);
    }
}

function renderWeather(daily) {
    const weatherRow = document.getElementById('weather');
    weatherRow.innerHTML = '';
    weatherData = daily.time.map((day, i) => ({
        temp: Math.round(daily.temperature_2m_max[i]),
        code: daily.weathercode[i],
        date: new Date(day)
    }));
    daily.time.forEach((day, i) => {
        const temp = Math.round(daily.temperature_2m_max[i]);
        const icon = mapWmoToEmoji(daily.weathercode[i]);
        const wItem = document.createElement('div');
        wItem.className = 'weather-day';
        wItem.dataset.index = i;
        if (i === 0) wItem.classList.add('highlight-light');
        wItem.innerHTML = `<span class="weather-icon">${icon}</span><span class="weather-temp">${temp}°</span>`;
        wItem.addEventListener('mouseenter', () => showWeatherTooltip(i));
        wItem.addEventListener('mouseleave', hideWeatherTooltip);
        weatherRow.appendChild(wItem);
    });
}

function mapWmoToEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '🌤️';
    if (code <= 48) return '☁️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    return '⛈️';
}

function getWeatherDescription(code, dayIndex) {
    const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
    const dayName = weatherData[dayIndex]?.date.toLocaleDateString(locale, { weekday: 'long' });
    const conditions = {
        en: { sunny: 'sunny', partlyCloudy: 'partly cloudy', cloudy: 'cloudy', rainy: 'rainy', snowy: 'snowy', stormy: 'stormy' },
        es: { sunny: 'soleado', partlyCloudy: 'parcialmente nublado', cloudy: 'nublado', rainy: 'lluvioso', snowy: 'nevando', stormy: 'tormentoso' },
        pt: { sunny: 'ensolarado', partlyCloudy: 'parcialmente nublado', cloudy: 'nublado', rainy: 'chuvoso', snowy: 'nevando', stormy: 'tempestuoso' },
    };
    const c = conditions[lang];
    let condition = code === 0 ? c.sunny : code <= 3 ? c.partlyCloudy : code <= 48 ? c.cloudy : code <= 67 ? c.rainy : code <= 77 ? c.snowy : code <= 82 ? c.rainy : code <= 86 ? c.snowy : c.stormy;
    if (dayIndex === 0) {
        return lang === 'en' ? `it's ${condition} today!` : lang === 'es' ? `¡hoy está ${condition}!` : `hoje está ${condition}!`;
    } else if (dayIndex === 1) {
        return lang === 'en' ? `${condition} tomorrow` : lang === 'es' ? `${condition} mañana` : `${condition} amanhã`;
    } else {
        return lang === 'en' ? `${condition} on ${dayName}` : lang === 'es' ? `${condition} el ${dayName}` : `${condition} na ${dayName}`;
    }
}

function showWeatherTooltip(index) {
    if (!weatherData[index]) return;
    const tooltip = document.getElementById('weather-tooltip');
    tooltip.textContent = getWeatherDescription(weatherData[index].code, index);
    tooltip.classList.add('show');
    const greetingSub = document.getElementById('greeting-sub');
    if (greetingSub) greetingSub.classList.add('hidden');
}

function hideWeatherTooltip() {
    document.getElementById('weather-tooltip').classList.remove('show');
    const greetingSub = document.getElementById('greeting-sub');
    if (greetingSub) greetingSub.classList.remove('hidden');
}

function initWeatherPlaceholder() {
    const weather = document.getElementById('weather');
    weather.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const wItem = document.createElement('div');
        wItem.className = 'weather-day';
        if (i === 0) wItem.classList.add('highlight-light');
        wItem.innerHTML = `<span class="weather-icon">--</span><span class="weather-temp">--</span>`;
        weather.appendChild(wItem);
    }
}
