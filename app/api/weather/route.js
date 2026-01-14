import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Seattle';

  // Server-side only - not exposed to client
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { temp: 79, icon: "☼", description: "sunny" },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }

    const data = await response.json();

    // Map OpenWeatherMap icon codes to simple emoji
    const iconMap = {
      "01d": "☀️", "01n": "🌙", "02d": "⛅", "02n": "☁️",
      "03d": "☁️", "03n": "☁️", "04d": "☁️", "04n": "☁️",
      "09d": "🌧️", "09n": "🌧️", "10d": "🌦️", "10n": "🌧️",
      "11d": "⛈️", "11n": "⛈️", "13d": "❄️", "13n": "❄️",
      "50d": "🌫️", "50n": "🌫️",
    };

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      icon: iconMap[data.weather[0].icon] || "☼",
      description: data.weather[0].description,
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { temp: 79, icon: "☼", description: "sunny" },
      { status: 200 }
    );
  }
}
