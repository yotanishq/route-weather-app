    const map = L.map('map').setView([22.9734, 78.6569], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let currentRoute = null;
    let startMarker = null;
    let endMarker = null;

    let selectedStartCity = null;
    let selectedEndCity = null;

    const API_KEY = "493f3f75549e1f608aed06f9891e00d5";

    /* ---------------- WEATHER ---------------- */
    async function getWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === "404") {
    throw new Error(`City "${city}" not found`);
    }

    if (!response.ok) {
        throw new Error("City not found: " + city);
    }

    return {
        temp: data.main.temp,
        desc: data.weather[0].description,
        lat: data.coord.lat,
        lon: data.coord.lon
    };
    }

    async function getWeatherByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Weather lookup failed");
    }

    return {
        temp: data.main.temp,
        desc: data.weather[0].description,
        lat: data.coord.lat,
        lon: data.coord.lon
    };
    }



    /* ---------------- DISTANCE ---------------- */
    function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
     /* ---------------- DRAW ROUTE ---------------- */
    function drawRoute(start, end) {

    if (currentRoute) {
        map.removeLayer(currentRoute);
    }

    if (startMarker) {
        map.removeLayer(startMarker);
    }

    if (endMarker) {
        map.removeLayer(endMarker);
    }

    startMarker = L.marker([start.lat, start.lon])
        .addTo(map)
        .bindPopup("Start");

    endMarker = L.marker([end.lat, end.lon])
        .addTo(map)
        .bindPopup("Destination");

    currentRoute = L.polyline(
        [
        [start.lat, start.lon],
        [end.lat, end.lon]
        ],
        {
        color: '#8f3cff',
        weight: 5
        }
    ).addTo(map);

    map.fitBounds(currentRoute.getBounds(), {
        padding: [50, 50]
    });
    }

    /* ---------------- TRANSPORT RULES ---------------- */
    const transportRules = {
    plane: {
        advice(desc, d) {
            const weather = desc.toLowerCase();

            if (d < 300) {
            return "❌ Not practical: Distance too short for air travel";
            }

            if (d > 8000) {
            return "⚠️ Very long international flight (" + d.toFixed(1) + " km)";
            }

            if (
            weather.includes("thunderstorm") ||
            weather.includes("heavy rain") ||
            weather.includes("snow")
            ) {
            return "⚠️ Flight feasible, but delays likely due to weather";
            }

            if (weather.includes("fog") || weather.includes("mist")) {
            return "⚠️ Possible delays due to low visibility";
            }

            return "✅ Air travel looks suitable";
        }
    },

    two_wheeler: {
        maxOk: 200,
        caution: 5000,
        advice(desc, d) {
        if (d > this.caution) return `❌ Not recommended: Too far for two-wheeler (${d.toFixed(1)} km)`;
        if (desc.includes("heavy rain") || desc.includes("thunderstorm"))
            return "❌ Not recommended: Heavy rain";
        if (desc.includes("rain") || desc.includes("fog") || desc.includes("mist"))
            return "⚠️ Caution: Reduced visibility";
        if (d > this.maxOk) return "⚠️ Caution: Long distance";
        return "✅ Two-wheeler travel looks okay";
        }
    },

    car: {
        maxOk: 1000,
        caution: 1500,
        advice(desc, d) {
        if (d > 2000) return `❌ Not recommended: Extremely long drive (${d.toFixed(1)} km)`;
        if (desc.includes("heavy rain") || desc.includes("thunderstorm"))
            return "⚠️ Caution: Bad weather may affect driving";
        if (d > this.caution) return "⚠️ Caution: Long drive";
        return "✅ Car travel looks okay";
        }
    },

    train: {
        advice(desc, d) {
        if (d < 50) return "❌ Not practical for train";
        if (d > 2000) return "⚠️ Very long train journey";
        if (desc.includes("fog") || desc.includes("rain"))
            return "⚠️ Delays possible due to weather";
        return "✅ Train travel looks suitable";
        }
    }
    };
    async function fetchCitySuggestions(query) {
    if (query.length < 2) return [];

    const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=10&appid=${API_KEY}`
    );
    return await res.json();
    }

    handleInput("start", "startSuggestions", city => {
    selectedStartCity = city;
    });

    handleInput("end", "endSuggestions", city => {
    selectedEndCity = city;
    });



    /* ---------------- MAIN ---------------- */
    async function checkRoute() {

    if (!selectedStartCity || !selectedEndCity) {
    document.getElementById("result").innerHTML = `
        <p class="error">
        ❌ Please select cities from the suggestions list.
        </p>
    `;
    return;
    }

    const button = document.getElementById("checkBtn");
    const loadingText = document.getElementById("loading");
    const errorBox = document.getElementById("formError");
    errorBox.style.display = "none";
    errorBox.innerText = "";

    button.disabled = true;
    loadingText.style.display = "block";

    const startCity = document.getElementById("start").value;
    const endCity = document.getElementById("end").value;
    const transport = document.getElementById("transport").value;


    if (!startCity || !endCity) {
    errorBox.innerText = "Please enter both start and end locations.";
    errorBox.style.display = "block";
    button.disabled = false;
    loadingText.style.display = "none";
    return;
    }

    if (startCity.toLowerCase() === endCity.toLowerCase()) {
    errorBox.innerText = "Start and end locations cannot be the same.";
    errorBox.style.display = "block";
    button.disabled = false;
    loadingText.style.display = "none";
    return;
    }


    try {
        if (!selectedStartCity || !selectedEndCity) {
        errorBox.innerText = "Please select cities from the suggestions list.";
        errorBox.style.display = "block";
        button.disabled = false;
        loadingText.style.display = "none";
        return;
        }

        const start = await getWeatherByCoords(
        selectedStartCity.lat,
        selectedStartCity.lon
        );

        const end = await getWeatherByCoords(
        selectedEndCity.lat,
        selectedEndCity.lon
        );

        const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);

        drawRoute(start, end);
        
        const advice =
        transportRules[transport].advice(start.desc, distance);

    document.getElementById("result").innerHTML = `
    <div class="result-section">
        <h3>Start Location</h3>
        <p><strong>${startCity}</strong></p>
        <p>🌡 ${start.temp}°C</p>
        <p>🌥 ${start.desc}</p>
    </div>

    <div class="result-section">
        <h3>Distance</h3>
        <p>${distance.toFixed(1)} km (approx)</p>
        <p class="note">Actual road distance may be longer</p>
    </div>

    <div class="result-section">
        <h3>Travel Assessment</h3>
        <p><strong>${transport.replace("_", " ").toUpperCase()}</strong></p>
        <p>${advice}</p>
    </div>

    <div class="result-section">
        <h3>End Location</h3>
        <p><strong>${endCity}</strong></p>
        <p>🌡 ${end.temp}°C</p>
        <p>🌥 ${end.desc}</p>
    </div>
    `;


    } catch (err) {
       document.getElementById("result").innerHTML = `
        <div class="result-section">
            <h3>Something went wrong</h3>
            <p>${err.message}</p>
        </div>
        `;

    }
    finally {
        button.disabled = false;
        loadingText.style.display = "none";
    }
    }
    async function handleInput(inputId, suggestionId, setter) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestionId);

    input.addEventListener("input", async () => {
        setter(null);
        const query = input.value.trim();
        box.innerHTML = "";

        if (query.length < 2) return;

        const results = await fetchCitySuggestions(query);

        const seen = new Set();

        results
        .filter(city => city.country === "IN")
        .forEach(city => {
            const key = `${city.name}-${city.country}`;
            if (seen.has(key)) return;
            seen.add(key);

            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.innerText = `${city.name}, ${city.country}`;

            div.onclick = () => {
            input.value = city.name;
            setter(city);
            box.innerHTML = "";
            };

            box.appendChild(div);
        });


    });
    }
