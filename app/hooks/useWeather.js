"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to fetch weather data for a given city
 * @param {string} city - City name (e.g., "Seattle")
 * @param {string} apiKey - OpenWeatherMap API key
 * @returns {object} { temp, icon, loading, error }
 */
export function useWeather(city = "Seattle", apiKey = null) {
  const [weather, setWeather] = useState({
    temp: null,
    icon: "☼",
    description: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    // If no API key provided, use fallback static data
    if (!apiKey) {
      setWeather({
        temp: 79,
        icon: "☼",
        description: "sunny",
        loading: false,
        error: null,
      });
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await response.json();

        // Map OpenWeatherMap icon codes to simple emoji
        const iconMap = {
          "01d": "☀️", // clear sky day
          "01n": "🌙", // clear sky night
          "02d": "⛅", // few clouds day
          "02n": "☁️", // few clouds night
          "03d": "☁️", // scattered clouds
          "03n": "☁️",
          "04d": "☁️", // broken clouds
          "04n": "☁️",
          "09d": "🌧️", // shower rain
          "09n": "🌧️",
          "10d": "🌦️", // rain day
          "10n": "🌧️", // rain night
          "11d": "⛈️", // thunderstorm
          "11n": "⛈️",
          "13d": "❄️", // snow
          "13n": "❄️",
          "50d": "🌫️", // mist
          "50n": "🌫️",
        };

        setWeather({
          temp: Math.round(data.main.temp),
          icon: iconMap[data.weather[0].icon] || "☼",
          description: data.weather[0].description,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Weather fetch error:", err);
        setWeather({
          temp: 79,
          icon: "☼",
          description: "sunny",
          loading: false,
          error: err.message,
        });
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [city, apiKey]);

  return weather;
}
