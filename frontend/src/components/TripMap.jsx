import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./TripMap.css";

// Fix Leaflet's default marker icons in Vite.
const defaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function isValidCoordinate(value) {
  return value !== null && value !== undefined && value !== "";
}

function hasValidCoordinates(place) {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  return (
    isValidCoordinate(place.latitude) &&
    isValidCoordinate(place.longitude) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function MapUpdater({ places }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) {
      return;
    }

    if (places.length === 1) {
      const place = places[0];

      map.setView(
        [Number(place.latitude), Number(place.longitude)],
        14
      );

      return;
    }

    const bounds = L.latLngBounds(
      places.map((place) => [
        Number(place.latitude),
        Number(place.longitude),
      ])
    );

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [places, map]);

  return null;
}

export default function TripMap({
  places = [],
  title = "Explore Your Trip",
}) {
  const validPlaces = places.filter(hasValidCoordinates);

  const initialPosition =
    validPlaces.length > 0
      ? [
          Number(validPlaces[0].latitude),
          Number(validPlaces[0].longitude),
        ]
      : [20, 0];

  return (
    <section className="trip-map-section">
      <div className="trip-map-heading">
        <div>
          <h2>{title}</h2>
          <p>
            Explore your destinations and see where your selected places
            are located.
          </p>
        </div>

        <span className="trip-map-count">
          📍 {validPlaces.length} mapped{" "}
          {validPlaces.length === 1 ? "place" : "places"}
        </span>
      </div>

      {validPlaces.length === 0 ? (
        <div className="trip-map-empty">
          <span>🗺️</span>
          <h3>Your map is waiting!</h3>
          <p>
            Generate recommendations or select places with valid coordinates
            to see them on the map.
          </p>
        </div>
      ) : (
        <div className="trip-map-container">
          <MapContainer
            center={initialPosition}
            zoom={5}
            scrollWheelZoom
            className="trip-map"
          >
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater places={validPlaces} />

            {validPlaces.map((place, index) => (
              <Marker
                key={place.id ?? place.entity_id ?? `${place.title}-${index}`}
                position={[
                  Number(place.latitude),
                  Number(place.longitude),
                ]}
              >
                <Popup>
                  <div className="trip-map-popup">
                    <strong>{place.title ?? place.name}</strong>

                    {(place.category || place.travel_category) && (
                      <p>{place.category ?? place.travel_category}</p>
                    )}

                    {(place.address || place.location) && (
                      <p>{place.address ?? place.location}</p>
                    )}

                    {place.description && <p>{place.description}</p>}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${Number(place.latitude)},${Number(place.longitude)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </section>
  );
}
