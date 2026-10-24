import { useEffect, useState } from "react";
import "./RecommendationCard.css";

function RecommendationCard({
  id,
  title,
  name,
  category,
  travel_category,
  location,
  city,
  description,
  matchReason,
  image_url,
  image,
  website,
  address,
  country,
  latitude,
  longitude,
  selected = false,
  isSelected,
  onSelect,
  recommendation,
  place,
}) {
  const item = recommendation || place || {};

  const actualName = name || title || item.name || "Recommended Place";

  const actualImage =
    image_url ||
    image ||
    item.image_url ||
    item.image ||
    item.properties?.image_url ||
    item.properties?.image?.url ||
    "";

  const actualCategory =
    category ||
    travel_category ||
    item.travel_category ||
    item.category ||
    "Destination";

  const actualLocation =
    location ||
    [city || item.city, country || item.country].filter(Boolean).join(", ") ||
    item.location ||
    "";

  const actualAddress = address || item.address || "";

  const actualDescription =
    description ||
    item.description ||
    "Explore this place as part of your personalized travel experience.";

  const actualWebsite = website || item.website || "";

  const actualLatitude = latitude ?? item.latitude;
  const actualLongitude = longitude ?? item.longitude;

  const selectedState = isSelected ?? selected;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [actualImage]);

  const hasCoordinates =
    actualLatitude !== null &&
    actualLatitude !== undefined &&
    actualLongitude !== null &&
    actualLongitude !== undefined;

  const mapQuery = hasCoordinates
    ? `${actualLatitude},${actualLongitude}`
    : actualAddress || `${actualName} ${actualLocation}`.trim();

  // Full item reference guaranteed for App.jsx's toggleRecommendation
  const itemToPass = recommendation || place || {
    id,
    name: actualName,
    image_url: actualImage,
    travel_category: actualCategory,
    city: city || item.city,
    country: country || item.country,
    address: actualAddress,
    description: actualDescription,
    latitude: actualLatitude,
    longitude: actualLongitude,
  };

  return (
    <article className={`recommendation-card ${selectedState ? "recommendation-card-selected" : ""}`}>
      <div className="recommendation-image-container">
        {actualImage && !imageFailed ? (
          <img
            key={actualImage}
            className="recommendation-image"
            src={actualImage}
            alt={actualName}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="recommendation-image-placeholder">
            <span>✈️</span>
            <p>{actualName}</p>
          </div>
        )}

        <span className="recommendation-category">{actualCategory}</span>

        {selectedState && (
          <span className="recommendation-selected-badge">✓ Added</span>
        )}
      </div>

      <div className="recommendation-card-content">
        <div className="recommendation-card-heading">
          <h3>{actualName}</h3>
        </div>

        {actualLocation && (
          <p className="recommendation-location">📍 {actualLocation}</p>
        )}

        {actualAddress && actualAddress !== actualLocation && (
          <p className="recommendation-address">{actualAddress}</p>
        )}

        <p className="recommendation-description">{actualDescription}</p>

        {matchReason && (
          <div className="recommendation-match">
            <span>✨</span>
            <p>{matchReason}</p>
          </div>
        )}

        <div className="recommendation-card-actions">
          <a
            className="recommendation-map-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Map ↗
          </a>

          {actualWebsite && (
            <a
              className="recommendation-website-link"
              href={actualWebsite}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website ↗
            </a>
          )}
        </div>

        <button
          type="button"
          className={`recommendation-select-button ${selectedState ? "is-selected" : ""}`}
          onClick={() => onSelect && onSelect(itemToPass)}
        >
          {selectedState ? "✓ Added to My Trip" : "+ Add to My Trip"}
        </button>
      </div>
    </article>
  );
}

export default RecommendationCard;