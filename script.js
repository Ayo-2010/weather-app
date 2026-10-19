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
const locationSelect = document.getElementById('locationSelect');
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

  cityName.textContent = data.country ? `${data.name}, ${data.country}` : data.name;
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

const POPULAR = ['London', 'New York City', 'Tokyo', 'Sydney', 'Cairo'];

function makeOption(location) {
  const option = document.createElement('option');
  option.value = `${location.lat},${location.lon}`;
  option.textContent = location.name;
  option.dataset.name = location.name;
  option.dataset.country = location.country || '';
  return option;
}

function buildPicker() {
  const groups = new Map();
  const label = document.getElementById('pickerLabel');

  label.textContent = `Browse ${LOCATIONS.length.toLocaleString()} cities`;

  LOCATIONS.forEach((location) => {
    const country = location.country || 'Other';
    if (!groups.has(country)) groups.set(country, []);
    groups.get(country).push(location);
  });

  const popular = document.createElement('optgroup');
  popular.label = 'Popular';

  POPULAR.forEach((name) => {
    const location = LOCATIONS.find((item) => item.name === name);
    if (!location) return;
    popular.appendChild(makeOption(location));

    const list = groups.get(location.country || 'Other');
    if (list) {
      const index = list.indexOf(location);
      if (index > -1) list.splice(index, 1);
    }
  });

  locationSelect.appendChild(popular);

  [...groups.keys()].sort((a, b) => a.localeCompare(b)).forEach((country) => {
    const list = groups.get(country);
    if (!list || list.length === 0) return;

    const group = document.createElement('optgroup');
    group.label = country;
    list.forEach((location) => group.appendChild(makeOption(location)));
    locationSelect.appendChild(group);
  });
}

function selectLocation(name, country) {
  const match =
    LOCATIONS.find((item) => item.name === name && item.country === country) ||
    LOCATIONS.find((item) => item.name === name);

  locationSelect.value = match ? `${match.lat},${match.lon}` : '';
}

async function loadPlace(place) {
  loader.hidden = false;

  try {
    const forecastRes = await fetch(
      `${FORECAST_URL}?latitude=${place.lat}&longitude=${place.lon}` +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=7'
    );
    const forecast = await forecastRes.json();

    data = {
      name: place.name,
      country: place.country || '',
      current: forecast.current,
      daily: forecast.daily,
    };

    setScene(codeInfo(data.current.weather_code)[2]);
    localStorage.setItem(STORE_KEY, JSON.stringify({
      name: data.name,
      country: data.country,
      lat: place.lat,
      lon: place.lon,
    }));
    loader.hidden = true;
    render();
  } catch (err) {
    loader.hidden = true;
    showStatus('Could not reach the weather service. Check your connection and try again.', true);
  }
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
    cityInput.value = place.name;
    selectLocation(place.name, place.country);

    await loadPlace({
      name: place.name,
      country: place.country,
      lat: place.latitude,
      lon: place.longitude,
    });
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

locationSelect.addEventListener('change', () => {
  const option = locationSelect.selectedOptions[0];
  if (!option || !option.value) return;

  const [lat, lon] = option.value.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  const place = { name: option.dataset.name, country: option.dataset.country, lat, lon };
  cityInput.value = place.name;
  loadPlace(place);
});

document.addEventListener('click', (e) => {
  const unitBtn = e.target.closest('.unit');
  if (!unitBtn) return;
  unit = unitBtn.dataset.unit;
  document.querySelectorAll('.unit').forEach((u) => u.classList.toggle('is-active', u === unitBtn));
  if (data) render();
});

function restoreLocation() {
  const stored = localStorage.getItem(STORE_KEY);
  let saved = null;

  if (stored) {
    try {
      saved = stored.startsWith('{') ? JSON.parse(stored) : { name: stored };
    } catch (err) {
      saved = { name: stored };
    }
  }

  if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) {
    const match = LOCATIONS.find((item) => item.lat === saved.lat && item.lon === saved.lon);
    const place = match || saved;
    if (match) {
      locationSelect.value = `${match.lat},${match.lon}`;
      cityInput.value = match.name;
    }
    loadPlace(place);
    return;
  }

  if (saved && saved.name) {
    cityInput.value = saved.name;
    loadCity(saved.name);
    return;
  }

  const fallback = LOCATIONS.find((item) => item.name === 'London') || LOCATIONS[0];
  locationSelect.value = `${fallback.lat},${fallback.lon}`;
  cityInput.value = fallback.name;
  loadPlace(fallback);
}

buildPicker();
restoreLocation();
