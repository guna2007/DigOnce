import { Fragment, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { ProjectSummary } from "../../shared/contracts";

interface WorksMapProps {
  projects: ProjectSummary[];
  onSelectProject(id: string): void;
}

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export function WorksMap({ projects, onSelectProject }: WorksMapProps) {
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const segments = projects.flatMap((project) => project.segments.map((segment) => ({ project, segment })));
  const center = segments[0]?.segment.center ?? { lat: 12.97665, lng: 77.59715 };

  return (
    <section className="map-card" aria-labelledby="map-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">STREET VIEW</p>
          <h2 id="map-heading">Works nearby</h2>
        </div>
        <span className="map-caption">Illustrative locations</span>
      </div>
      {tilesUnavailable && (
        <p className="inline-notice" role="status">
          Map tiles are unavailable right now. The works list and project details are still available.
        </p>
      )}
      <div className="map-frame" aria-label="Map of listed public works">
        <MapContainer center={[center.lat, center.lng]} zoom={15} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            url={tileUrl}
            eventHandlers={{ tileerror: () => setTilesUnavailable(true), tileload: () => setTilesUnavailable(false) }}
          />
          {segments.map(({ project, segment }) => {
            const positions = segment.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
            return (
              <Fragment key={`${project.id}-${segment.id}`}>
                <Polyline positions={positions} pathOptions={{ color: project.status === "active" ? "#b44b35" : "#176b55", weight: 7, opacity: 0.85 }} />
                <CircleMarker
                  center={[segment.center.lat, segment.center.lng]}
                  radius={9}
                  pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#176b55", fillOpacity: 1 }}
                  eventHandlers={{ click: () => onSelectProject(project.id) }}
                >
                  <Tooltip>{project.title} · {segment.roadName}</Tooltip>
                </CircleMarker>
              </Fragment>
            );
          })}
        </MapContainer>
      </div>
      <p className="map-attribution-note">Map locations come from illustrative demo records and may be approximate.</p>
    </section>
  );
}
