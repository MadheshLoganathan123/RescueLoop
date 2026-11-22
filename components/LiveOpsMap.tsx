'use client';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CHENNAI_CENTER, MAP_NODE_COLORS, MapNode, plottableNodes } from '../lib/mapNodes';

export default function LiveOpsMap({ nodes }: { nodes: MapNode[] }) {
  const points = plottableNodes(nodes);
  const center: [number, number] = points.length
    ? [Number(points[0].lat), Number(points[0].lng)]
    : CHENNAI_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[Number(point.lat), Number(point.lng)]}
          radius={point.type === 'volunteer' ? 9 : 7}
          pathOptions={{
            color: MAP_NODE_COLORS[point.type] || '#e2e8f0',
            fillColor: MAP_NODE_COLORS[point.type] || '#e2e8f0',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{point.name}</strong>
            <br />
            {point.status || point.type}
            {point.metric ? ` · ${point.metric}` : ''}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
