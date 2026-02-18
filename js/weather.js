/* ============================================================
   Weather & Location Module
   Requires global: lang (from main script)
============================================================ */

let currentLat = null;
let currentLon = null;
let weatherLoaded = false;
let weatherData = [];

/* ---- LOCATION DETECTION ---- */

async function startLocationProcess() {
    const display = document.getElementById('city-display');
    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        currentLat = latitude;
                        currentLon = longitude;
                        reverseGeocode(latitude, longitude, "GPS Precision");
                        fetchWeather(latitude, longitude);
                    } catch (err) {
                        display.textContent = 'Location Error';
                        fetchIPLocation();
                    }
                },
                () => { fetchIPLocation(); },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
            );
        } else {
            fetchIPLocation();
        }
    } catch (err) {
        display.textContent = 'Location Error';
        fetchIPLocation();
    }
}

async function fetchIPLocation() {
    const display = document.getElementById('city-display');
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.city && data.latitude && data.longitude) {
            currentLat = data.latitude;
            currentLon = data.longitude;
            display.textContent = `${data.city} (IP)`;
            display.title = `${data.city} - IP-Based\nLat: ${currentLat.toFixed(4)}, Lon: ${currentLon.toFixed(4)}`;
            fetchWeather(data.latitude, data.longitude);
        } else {
            fetchIPLocationFallback();
        }
    } catch (err) {
        fetchIPLocationFallback();
    }
}

async function fetchIPLocationFallback() {
    const display = document.getElementById('city-display');
    try {
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        if (data.status === 'success') {
            currentLat = data.lat;
            currentLon = data.lon;
            display.textContent = `${data.city} (IP)`;
            display.title = `${data.city} - IP-Based\nLat: ${currentLat.toFixed(4)}, Lon: ${currentLon.toFixed(4)}`;
            fetchWeather(data.lat, data.lon);
        } else {
            display.textContent = "Location Unknown";
            showWeatherError();
        }
    } catch (err) {
        display.textContent = "Location Unknown";
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
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || "Location";
        display.textContent = city;
        display.title = `${city} - ${methodLabel}\nLat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
    } catch (err) {
        display.textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
}

/* ---- WEATHER — Open-Meteo API with caching ---- */

async function fetchWeather(lat, lon) {
    const cached = localStorage.getItem('aura_weather_cache');
    if (cached) {
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
        const data = await response.json();
        if (data.daily) {
            renderWeather(data.daily);
            weatherLoaded = true;
            localStorage.setItem('aura_weather_cache', JSON.stringify({ data: data.daily, ts: Date.now() }));
        } else {
            showWeatherError();
        }
    } catch (e) {
        if (!weatherLoaded) showWeatherError();
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
