"use client";

import { useState, useEffect } from "react";

export function useWeather(city = "Seattle") {
  const [weather, setWeather] = useState({
    temp: null,
    icon: "☼",
    description: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);

        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await response.json();

        setWeather({
          temp: data.temp,
          icon: data.icon,
          description: data.description,
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
  }, [city]);

  return weather;
}
