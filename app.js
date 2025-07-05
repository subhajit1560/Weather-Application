class WeatherApp {
    constructor() {
        this.apiKey = '9505fd1df737e20152fbd78cdb289b6a';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather?units=metric&appid=' + this.apiKey;
        this.geocodeUrl = 'https://api.openweathermap.org/geo/1.0/direct?limit=5&appid=' + this.apiKey;
        this.oneCallUrl = 'https://api.openweathermap.org/data/2.5/onecall?units=metric&appid=' + this.apiKey;
        this.aqiUrl = 'https://api.openweathermap.org/data/2.5/air_pollution?appid=' + this.apiKey;
        this.selectors();
        this.addEventListeners();
        this.initApp();
    }

    selectors() {
        this.form = document.getElementById('weather-form');
        this.input = document.getElementById('name');
        this.suggestions = document.getElementById('suggestions');
        this.currentLocationBtn = document.getElementById('current-location');
        this.main = document.querySelector('main');
        this.cityName = document.getElementById('city-name');
        this.countryFlag = document.getElementById('country-flag');
        this.weatherIcon = document.getElementById('weather-icon');
        this.temp = document.getElementById('temp');
        this.feelsLike = document.getElementById('feels-like');
        this.description = document.getElementById('description');
        this.clouds = document.getElementById('clouds');
        this.humidity = document.getElementById('humidity');
        this.pressure = document.getElementById('pressure');
        this.wind = document.getElementById('wind');
        this.visibility = document.getElementById('visibility');
        this.uv = document.getElementById('uv');
        this.uvGauge = document.getElementById('uv-gauge');
        this.aqi = document.getElementById('aqi');
        this.aqiGauge = document.getElementById('aqi-gauge');
        this.lastUpdated = document.getElementById('last-updated');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('error-message');
        this.body = document.body;
        this.forecast3day = document.getElementById('forecast-3day');
        this.forecastHourly = document.getElementById('forecast-hourly');
    }

    addEventListeners() {
        this.form.addEventListener('submit', e => {
            e.preventDefault();
            if (this.input.value.trim() !== '') {
                this.getWeatherByCity(this.input.value.trim());
                this.hideSuggestions();
            }
        });
        this.currentLocationBtn.addEventListener('click', () => {
            this.getWeatherByLocation();
            this.hideSuggestions();
        });
        this.input.addEventListener('input', e => {
            const val = e.target.value.trim();
            if (val.length > 1) {
                this.fetchSuggestions(val);
            } else {
                this.hideSuggestions();
            }
        });
        this.suggestions.addEventListener('mousedown', e => {
            if (e.target.tagName === 'LI') {
                this.input.value = e.target.textContent;
                this.getWeatherByCity(this.input.value.trim());
                this.hideSuggestions();
            }
        });
        document.addEventListener('click', e => {
            if (!this.form.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async fetchSuggestions(query) {
        try {
            const res = await fetch(`${this.geocodeUrl}&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                this.showSuggestions(data);
            } else {
                this.hideSuggestions();
            }
        } catch {
            this.hideSuggestions();
        }
    }

    showSuggestions(data) {
        this.suggestions.innerHTML = data.map(loc =>
            `<li role="option">${loc.name}${loc.state ? ', ' + loc.state : ''}, ${loc.country}</li>`
        ).join('');
        this.suggestions.classList.remove('hidden');
    }
    hideSuggestions() {
        this.suggestions.classList.add('hidden');
        this.suggestions.innerHTML = '';
    }

    async getWeatherByCity(city) {
        this.showLoading();
        this.clearError();
        try {
            // Get coordinates first
            const geoRes = await fetch(`${this.geocodeUrl}&q=${encodeURIComponent(city)}`);
            const geoData = await geoRes.json();
            if (!geoData[0]) throw new Error('City not found.');
            const { lat, lon, name, country } = geoData[0];
            // Get current weather
            const res = await fetch(`${this.baseUrl}&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data.cod === 200) {
                await this.updateWeatherUI(data, lat, lon, name, country);
            } else {
                this.showError(data.message || 'City not found.');
            }
        } catch (err) {
            this.showError(err.message || 'Network error. Please try again.');
        }
        this.input.value = '';
        this.hideLoading();
    }

    async getWeatherByLocation() {
        this.showLoading();
        this.clearError();
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            this.hideLoading();
            return;
        }
        navigator.geolocation.getCurrentPosition(async pos => {
            const { latitude, longitude } = pos.coords;
            try {
                // Get city name from reverse geocoding
                const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${this.apiKey}`);
                const geoData = await geoRes.json();
                const name = geoData[0]?.name || 'Current Location';
                const country = geoData[0]?.country || '';
                // Get current weather
                const res = await fetch(`${this.baseUrl}&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                if (data.cod === 200) {
                    await this.updateWeatherUI(data, latitude, longitude, name, country);
                } else {
                    this.showError(data.message || 'Location not found.');
                }
            } catch (err) {
                this.showError('Network error. Please try again.');
            }
            this.hideLoading();
        }, err => {
            this.showError('Unable to retrieve your location.');
            this.hideLoading();
        });
    }

    async updateWeatherUI(data, lat, lon, cityName, country) {
        // City and country
        this.cityName.textContent = cityName || data.name;
        this.countryFlag.src = `https://flagsapi.com/${country || data.sys.country}/shiny/32.png`;
        this.countryFlag.alt = country || data.sys.country;
        // Weather icon and theme
        this.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        this.weatherIcon.alt = data.weather[0].description;
        this.setThemeByIcon(data.weather[0].icon);
        // Temperature
        this.temp.textContent = Math.round(data.main.temp);
        this.feelsLike.textContent = `Feels like ${Math.round(data.main.feels_like)}°`;
        // Description
        this.description.textContent = data.weather[0].description;
        // Weather details
        this.clouds.textContent = data.clouds.all;
        this.humidity.textContent = data.main.humidity;
        this.pressure.textContent = data.main.pressure;
        this.wind.textContent = data.wind.speed;
        this.visibility.textContent = (data.visibility / 1000).toFixed(1);
        // UV index and AQI (separate API calls)
        await Promise.all([
            this.updateUVIndex(lat, lon),
            this.updateAQI(lat, lon)
        ]);
        // Forecasts
        await this.updateForecasts(lat, lon);
        // Last updated
        this.lastUpdated.textContent = 'Last updated: ' + this.formatTime(new Date());
        // Animate result section
        this.animateResult();
    }

    async updateUVIndex(lat, lon) {
        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/uvi?appid=${this.apiKey}&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data.value !== undefined) {
                this.uv.textContent = data.value;
                this.uv.parentElement.setAttribute('title', this.uvRiskLevel(data.value));
                this.renderUVGauge(data.value);
            } else {
                this.uv.textContent = '--';
                this.uv.parentElement.removeAttribute('title');
                this.uvGauge.innerHTML = '';
            }
        } catch {
            this.uv.textContent = '--';
            this.uv.parentElement.removeAttribute('title');
            this.uvGauge.innerHTML = '';
        }
    }
    renderUVGauge(value) {
        let percent = Math.min(value / 11, 1) * 100;
        let level = 'gauge-uv-low';
        if (value < 3) level = 'gauge-uv-low';
        else if (value < 6) level = 'gauge-uv-moderate';
        else if (value < 8) level = 'gauge-uv-high';
        else if (value < 11) level = 'gauge-uv-veryhigh';
        else level = 'gauge-uv-extreme';
        this.uvGauge.innerHTML = `<div class="gauge-bar ${level}" style="width:${percent}%;"></div>`;
    }

    async updateAQI(lat, lon) {
        try {
            const res = await fetch(`${this.aqiUrl}&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data.list && data.list[0]) {
                const aqiVal = data.list[0].main.aqi;
                this.aqi.textContent = this.aqiText(aqiVal);
                this.renderAQIGauge(aqiVal);
            } else {
                this.aqi.textContent = '--';
                this.aqiGauge.innerHTML = '';
            }
        } catch {
            this.aqi.textContent = '--';
            this.aqiGauge.innerHTML = '';
        }
    }
    aqiText(val) {
        switch(val) {
            case 1: return 'Good';
            case 2: return 'Fair';
            case 3: return 'Moderate';
            case 4: return 'Poor';
            case 5: return 'Very Poor';
            default: return '--';
        }
    }
    renderAQIGauge(val) {
        let percent = (val / 5) * 100;
        let level = 'gauge-aqi-good';
        if (val === 1) level = 'gauge-aqi-good';
        else if (val === 2) level = 'gauge-aqi-moderate';
        else if (val === 3) level = 'gauge-aqi-unhealthy';
        else if (val === 4) level = 'gauge-aqi-veryunhealthy';
        else if (val === 5) level = 'gauge-aqi-hazardous';
        this.aqiGauge.innerHTML = `<div class="gauge-bar ${level}" style="width:${percent}%;"></div>`;
    }

    async updateForecasts(lat, lon) {
        try {
            const res = await fetch(`${this.oneCallUrl}&lat=${lat}&lon=${lon}&exclude=minutely,alerts`);
            const data = await res.json();
            // 3-day forecast
            this.render3DayForecast(data.daily);
            // Hourly forecast (next 12 hours)
            this.renderHourlyForecast(data.hourly);
        } catch {
            this.forecast3day.innerHTML = '<div class="forecast-card">No forecast data</div>';
            this.forecastHourly.innerHTML = '<div class="hourly-card">No data</div>';
        }
    }
    render3DayForecast(daily) {
        if (!daily || daily.length < 3) {
            this.forecast3day.innerHTML = '<div class="forecast-card">No forecast data</div>';
            return;
        }
        this.forecast3day.innerHTML = daily.slice(1, 4).map(day => {
            const date = new Date(day.dt * 1000);
            return `<div class="forecast-card">
                <div class="forecast-date">${date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}">
                <div class="forecast-temp">${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</div>
                <div class="forecast-desc">${day.weather[0].description}</div>
            </div>`;
        }).join('');
    }
    renderHourlyForecast(hourly) {
        if (!hourly || hourly.length < 1) {
            this.forecastHourly.innerHTML = '<div class="hourly-card">No data</div>';
            return;
        }
        this.forecastHourly.innerHTML = hourly.slice(1, 13).map(hour => {
            const date = new Date(hour.dt * 1000);
            return `<div class="hourly-card">
                <div class="hour">${date.getHours()}:00</div>
                <img class="hourly-icon" src="https://openweathermap.org/img/wn/${hour.weather[0].icon}.png" alt="${hour.weather[0].description}">
                <div class="hourly-temp">${Math.round(hour.temp)}°</div>
            </div>`;
        }).join('');
    }

    uvRiskLevel(value) {
        if (value < 3) return 'Low';
        if (value < 6) return 'Moderate';
        if (value < 8) return 'High';
        if (value < 11) return 'Very High';
        return 'Extreme';
    }

    setThemeByIcon(icon) {
        if (icon.endsWith('n')) {
            this.body.classList.add('night');
        } else {
            this.body.classList.remove('night');
        }
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }
    hideLoading() {
        this.loading.classList.add('hidden');
    }
    showError(msg) {
        this.errorMessage.textContent = msg;
        this.errorMessage.classList.add('visible');
        this.main.classList.add('error');
        setTimeout(() => {
            this.main.classList.remove('error');
        }, 800);
    }
    clearError() {
        this.errorMessage.textContent = '';
        this.errorMessage.classList.remove('visible');
    }
    animateResult() {
        const result = document.querySelector('.result');
        result.style.animation = 'slideIn 0.7s cubic-bezier(.68,-0.55,.27,1.55)';
        setTimeout(() => {
            result.style.animation = '';
        }, 700);
    }
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    initApp() {
        this.getWeatherByCity('London');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});