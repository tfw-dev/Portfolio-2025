// app/components/Workouts.jsx (Server Component)
export const dynamic = "force-dynamic"; // or keep fetch({ cache: "no-store" })

/**
 * Decode a Google/Strava encoded polyline into [lat, lng] pairs.
 * Strava uses 1e5 precision.
 */
function decodePolylineString(encodedPolyline, precision = 1e5) {
  let currentIndex = 0;
  let latitudeTotal = 0;
  let longitudeTotal = 0;
  const coordinates = [];

  while (currentIndex < encodedPolyline.length) {
    // --- latitude delta ---
    let resultValue = 0;
    let bitShift = 0;
    let fiveBitChunk;

    do {
      fiveBitChunk = encodedPolyline.charCodeAt(currentIndex++) - 63;
      resultValue |= (fiveBitChunk & 0x1f) << bitShift;
      bitShift += 5;
    } while (fiveBitChunk >= 0x20);

    const latitudeDelta = (resultValue & 1) ? ~(resultValue >> 1) : (resultValue >> 1);
    latitudeTotal += latitudeDelta;

    // --- longitude delta ---
    resultValue = 0;
    bitShift = 0;

    do {
      fiveBitChunk = encodedPolyline.charCodeAt(currentIndex++) - 63;
      resultValue |= (fiveBitChunk & 0x1f) << bitShift;
      bitShift += 5;
    } while (fiveBitChunk >= 0x20);

    const longitudeDelta = (resultValue & 1) ? ~(resultValue >> 1) : (resultValue >> 1);
    longitudeTotal += longitudeDelta;

    coordinates.push([latitudeTotal / precision, longitudeTotal / precision]);
  }

  return coordinates;
}

/**
 * Fit lat/lng coordinates into an SVG viewBox and return a points string.
 * This is a sparkline-style preview, not a real map projection.
 */
function toSvgPolylinePoints(latLngPairs, svgWidth = 360, svgHeight = 140, padding = 6) {
  if (!latLngPairs?.length) {
    return { svgWidth, svgHeight, polylinePoints: "" };
  }

  const latitudes = latLngPairs.map(([latitude]) => latitude);
  const longitudes = latLngPairs.map(([, longitude]) => longitude);

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeRange = Math.max(maxLatitude - minLatitude, 1e-6);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 1e-6);

  const scaleX = (svgWidth - padding * 2) / longitudeRange;
  const scaleY = (svgHeight - padding * 2) / latitudeRange;

  const polylinePoints = latLngPairs
    .map(([latitude, longitude]) => {
      const x = padding + (longitude - minLongitude) * scaleX;
      // SVG Y grows downward; latitude grows upward → invert Y
      const y = svgHeight - (padding + (latitude - minLatitude) * scaleY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return { svgWidth, svgHeight, polylinePoints };
}

export default async function Workouts() {
  const response = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=5",
    {
      headers: { Authorization: `Bearer ${process.env.STRAVA_ACCESS_TOKEN}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return <p> Error fetching Strava data: {response.status} </p>;
  }

  const activities = await response.json();

  return (
    <div className="space-y-6 flex">
      {activities.filter(activity => activity.type == "Run").map((activity) => {
        const encodedPolyline = activity?.map?.summary_polyline || "";
        const coordinates = encodedPolyline
          ? decodePolylineString(encodedPolyline)
          : null;

        const svgData = coordinates
          ? toSvgPolylinePoints(coordinates, 360, 140)
          : null;

        return (
          <div key={activity.id} className="border rounded-lg p-4">
            <div className="text-sm opacity-70">{activity.type}</div>
            <div className="text-lg font-medium">{activity.name}</div>
            <div className="text-sm">
              Elevation gain: {Math.round(activity.total_elevation_gain)} m
            </div>

            {svgData?.polylinePoints ? (
              <svg
                viewBox={`0 0 ${svgData.svgWidth} ${svgData.svgHeight}`}
                width={svgData.svgWidth}
                height={svgData.svgHeight}
                aria-label="Route preview"
                className="mt-3"
              >
                <polyline
                  points={svgData.polylinePoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div className="text-xs opacity-60 mt-2">No route preview</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
