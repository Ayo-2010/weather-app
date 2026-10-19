const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const STORE_KEY = 'skycast.lastCity';

const CODES = {
  0: ['Clear sky', '☀️', ['#3b82f6', '#7c5bd8']],
  1: ['Mainly clear', '🌤️', ['#3b82f6', '#6d7cd8']],
  2: ['Partly cloudy', '⛅', ['#4a7bd8', '#6a5acd']],
  3: ['Overcast', '☁️', ['#5b6b8c', '#3f4a63']],
  45: ['Foggy', '🌫️', ['#6b7280', '#4b5563']],
  48: ['Rime fog', '🌫️', ['#6b7280', '#4b5563']],
  51: ['Light drizzle', '🌦️', ['#5470a8', '#3f4a7a']],
  53: ['Drizzle', '🌦️', ['#4d689c', '#3a4570']],
  55: ['Heavy drizzle', '🌧️', ['#405a8c', '#2f3860']],
  61: ['Light rain', '🌧️', ['#3f5a8c', '#2c3862']],
  63: ['Rain', '🌧️', ['#37517f', '#262f55']],
  65: ['Heavy rain', '⛈️', ['#2c4069', '#1d2440']],
  71: ['Light snow', '🌨️', ['#8fa4c9', '#6b7ea3']],
  73: ['Snow', '❄️', ['#94a9cf', '#7084a8']],
  75: ['Heavy snow', '❄️', ['#9db2d8', '#7689ad']],
  80: ['Rain showers', '🌦️', ['#456494', '#30406b']],
  81: ['Rain showers', '🌧️', ['#3c5a8c', '#2a3860']],
  82: ['Violent showers', '⛈️', ['#2f4570', '#1e2745']],
  95: ['Thunderstorm', '⛈️', ['#2b3a63', '#1a2138']],
  96: ['Thunderstorm', '⛈️', ['#28375f', '#171d33']],
  99: ['Severe storm', '⛈️', ['#242f54', '#141930']],
};

const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const quickChips = document.getElementById('quickChips');
const statusEl = document.getElementById('status');
const currentEl = document.getElementById('current');
const cityName = document.getElementById('cityName');
const localTime = document.getElementById('localTime');
const tempEl = document.getElementById('temp');
const conditionEl = document.getElementById('condition');
const weatherIcon = document.getElementById('weatherIcon');
const feelsEl = document.getElementById('feels');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const highlowEl = document.getElementById('highlow');
const forecastRow = document.getElementById('forecastRow');
const loader = document.getElementById('loader');
const scene = document.getElementById('scene');

let unit = 'c';
let data = null;

function codeInfo(code) {
  return CODES[code] || ['Unknown', '🌡️', ['#4a7bd8', '#7c5bd8']];
}

function toDisplay(celsius) {
  return unit === 'c' ? celsius : celsius * 9 / 5 + 32;
}

function formatTemp(celsius, decimals) {
  const value = toDisplay(celsius);
  return decimals ? value.toFixed(1) : Math.round(value);
}

function setScene(colors) {
  scene.style.background = `linear-gradient(160deg, ${colors[0]}, ${colors[1]} 60%, #23203f)`;
}

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.className = 'status' + (isError ? ' error' : '');
  statusEl.hidden = false;
  currentEl.hidden = true;
}

function render() {
  if (!data) return;

  const [description, icon] = codeInfo(data.current.weather_code);

  cityName.textContent = `${data.name}, ${data.country}`;
  localTime.textContent = new Date(data.current.time).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
  tempEl.textContent = `${formatTemp(data.current.temperature_2m, true)}°`;
  conditionEl.textContent = description;
  weatherIcon.textContent = icon;
  feelsEl.textContent = `Feels like ${formatTemp(data.current.apparent_temperature, true)}°`;
  humidityEl.textContent = data.current.relative_humidity_2m + '%';
  windEl.textContent = `${Math.round(data.current.wind_speed_10m)} km/h`;
  highlowEl.textContent = `${formatTemp(data.daily.temperature_2m_max[0])}° / ${formatTemp(data.daily.temperature_2m_min[0])}°`;

  forecastRow.innerHTML = '';
  data.daily.time.forEach((iso, i) => {
    const [desc, ic] = codeInfo(data.daily.weather_code[i]);
    const day = document.createElement('div');
    day.className = 'day';
    day.title = desc;
    day.innerHTML = `
      <div class="day-name">${i === 0 ? 'Today' : new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })}</div>
      <div class="day-icon">${ic}</div>
      <div class="day-temp">${formatTemp(data.daily.temperature_2m_max[i])}° <small>${formatTemp(data.daily.temperature_2m_min[i])}°</small></div>`;
    forecastRow.appendChild(day);
  });

  statusEl.hidden = true;
  currentEl.hidden = false;
}

async function loadCity(city) {
  loader.hidden = false;

  try {
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geo = await geoRes.json();

    if (!geo.results || geo.results.length === 0) {
      loader.hidden = true;
      showStatus(`No results for "${city}". Try another city.`, true);
      return;
    }

    const place = geo.results[0];

    const forecastRes = await fetch(
      `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=7'
    );
    const forecast = await forecastRes.json();

    data = {
      name: place.name,
      country: place.country_code || place.country,
      current: forecast.current,
      daily: forecast.daily,
    };

    setScene(codeInfo(data.current.weather_code)[2]);
    localStorage.setItem(STORE_KEY, place.name);
    loader.hidden = true;
    render();
  } catch (err) {
    loader.hidden = true;
    showStatus('Could not reach the weather service. Check your connection and try again.', true);
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) loadCity(city);
});

quickChips.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  cityInput.value = btn.dataset.city;
  loadCity(btn.dataset.city);
});

document.addEventListener('click', (e) => {
  const unitBtn = e.target.closest('.unit');
  if (!unitBtn) return;
  unit = unitBtn.dataset.unit;
  document.querySelectorAll('.unit').forEach((u) => u.classList.toggle('is-active', u === unitBtn));
  if (data) render();
});

const lastCity = localStorage.getItem(STORE_KEY);
if (lastCity) {
  cityInput.value = lastCity;
  loadCity(lastCity);
} else {
  loadCity('London');
}
