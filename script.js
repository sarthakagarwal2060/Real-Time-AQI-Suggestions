async function getAQI() {
  const city = document.getElementById("city").value;
  if (!city) {
    document.getElementById("aqiResult").textContent =
      "Please enter a city name";
    return;
  }

  const apiKey = "6711aaf52e4ce128c2719018e75e9062"; 
  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.length) {
      document.getElementById("aqiResult").textContent =
        "Invalid city name or no data available";
      return;
    }

    const { lat, lon } = geoData[0];

    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const aqiResponse = await fetch(aqiUrl);
    const aqiData = await aqiResponse.json();

    if (aqiData.list && aqiData.list.length > 0) {
      const pm25 = aqiData.list[0].components.pm2_5;
      displayAQI(pm25);
    } else {
      document.getElementById("aqiResult").textContent =
        "No AQI data available";
    }
  } catch (error) {
    document.getElementById("aqiResult").textContent = "Error fetching data";
    console.error("Error fetching AQI data:", error);
  }
}

function displayAQI(pm25) {
  const resultDiv = document.getElementById("aqiResult");
  const aqi = calculateAQI(pm25);

  resultDiv.textContent = `AQI: ${aqi}`;
  resultDiv.className = "aqi-display";

  let category = "";
  if (aqi <= 50) {
    resultDiv.classList.add("good");
    category = "Good";
  } else if (aqi <= 100) {
    resultDiv.classList.add("moderate");
    category = "Moderate";
  } else if (aqi <= 150) {
    resultDiv.classList.add("unhealthy");
    resultDiv.style.backgroundColor = "orange"; 
    category = "Unhealthy for Sensitive Groups";
  } else if (aqi <= 200) {
    resultDiv.classList.add("unhealthy");
    resultDiv.style.backgroundColor = "red";
    category = "Unhealthy";
  } else if (aqi <= 300) {
    resultDiv.classList.add("unhealthy");
    resultDiv.style.backgroundColor = "purple";
    category = "Very Unhealthy";
  } else {
    resultDiv.classList.add("unhealthy");
    resultDiv.style.backgroundColor = "maroon";
    category = "Hazardous";
  }

  resultDiv.textContent += ` (${category})`;

  fetchGeminiSuggestions(aqi, category);
}

function calculateAQI(pm25) {
  const breakpoints = [
    { low: 0.0, high: 12.0, aqiLow: 0, aqiHigh: 50 },
    { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
    { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
    { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
    { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
    { low: 250.5, high: 500.4, aqiLow: 301, aqiHigh: 500 },
  ];

  for (const range of breakpoints) {
    if (pm25 >= range.low && pm25 <= range.high) {
      return Math.round(
        ((range.aqiHigh - range.aqiLow) / (range.high - range.low)) *
          (pm25 - range.low) +
          range.aqiLow
      );
    }
  }
  return 500;
}

async function fetchGeminiSuggestions(aqi, category) {
  const apiKey = "AIzaSyCdtI4hTEC7C99ZnURMNAibJbHhRl_pu9A"; 
  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

  const prompt = `The air quality index (AQI) is ${aqi}, categorized as ${category}. Provide health measures, precautions, and recommendations for people in bullet points with each section clearly labeled.`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", data);

    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0
    ) {
      const suggestionText = data.candidates[0].content.parts[0].text;
      const suggestions = suggestionText.split("\n");

      const suggestionList = document.getElementById("suggestionList");
      suggestionList.innerHTML = "";

      suggestions.forEach((suggestion) => {
        if (suggestion.trim()) {
          const li = document.createElement("li");
          if (
            suggestion.toLowerCase().includes("health measures") ||
            suggestion.toLowerCase().includes("precautions") ||
            suggestion.toLowerCase().includes("recommendations")
          ) {
            li.classList.add("highlight");
          }
          li.textContent = suggestion;
          li.style.opacity = "0";
          suggestionList.appendChild(li);
          setTimeout(() => (li.style.opacity = "1"), 100);
        }
      });
    } else {
      document.getElementById("suggestionList").innerHTML =
        "<li style='color: red; font-weight: bold;'>No suggestions returned from Gemini API.</li>";
    }
  } catch (error) {
    console.error("Error fetching Gemini suggestions:", error);
    document.getElementById(
      "suggestionList"
    ).innerHTML = `<li style='color: red; font-weight: bold;'><strong>Error fetching suggestions:</strong> ${error.message}</li>`;
  }
}
