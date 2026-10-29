import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';

// Zooms the map so both points (and the route) are visible.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

// Real map tiles from OpenStreetMap. If we have a real road route we draw it;
// otherwise a dashed straight line shows it's only an estimate.
export default function RouteMap({ origin, destination, geometry }) {
  const a = [origin.lat, origin.lon];
  const b = [destination.lat, destination.lon];
  // useMemo keeps the same array between re-renders, so the map doesn't
  // re-zoom every time something else on the page changes.
  const line = useMemo(
    () => (geometry?.length ? geometry : [[origin.lat, origin.lon], [destination.lat, destination.lon]]),
    [geometry, origin.lat, origin.lon, destination.lat, destination.lon]
  );

  return (
    <div className="map-wrap">
      <MapContainer center={a} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={line} pathOptions={{ color: '#16a34a', weight: 4, dashArray: geometry ? null : '8 8' }} />
        <CircleMarker center={a} radius={8} pathOptions={{ color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }}>
          <Tooltip>{origin.name}</Tooltip>
        </CircleMarker>
        <CircleMarker center={b} radius={8} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}>
          <Tooltip>{destination.name}</Tooltip>
        </CircleMarker>
        <FitBounds points={line} />
      </MapContainer>
    </div>
  );
}
