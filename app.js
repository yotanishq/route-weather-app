
    const API_KEY = "493f3f75549e1f608aed06f9891e00d5";

    /* ---------------- WEATHER ---------------- */
    async function getWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

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

    /* ---------------- MAIN ---------------- */
    async function checkRoute() {
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
        const start = await getWeather(startCity);
        const end = await getWeather(endCity);

        const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);
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
        document.getElementById("result").innerText = "❌ Error: " + err.message;
    }
    finally {
        button.disabled = false;
        loadingText.style.display = "none";
    }
    }