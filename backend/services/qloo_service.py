import os
import logging
from functools import lru_cache
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

QLOO_BASE_URL = "https://hackathon.api.qloo.com"
QLOO_SEARCH_URL = f"{QLOO_BASE_URL}/search"
QLOO_INSIGHTS_URL = f"{QLOO_BASE_URL}/v2/insights"

TIMEOUT = (5, 25)

DEFAULT_RESULT_LIMIT = 50
MAX_RESULT_LIMIT = 50

# Prevent slow external image searches from delaying every result.
MAX_IMAGE_LOOKUPS_PER_REQUEST = 12

USER_AGENT = "VibeTrip/1.0 (travel recommendation application)"


# ============================================================
# QLOO CONFIGURATION AND AUTHENTICATION
# ============================================================

def is_qloo_configured() -> bool:
    """Return whether a Qloo API key is configured."""
    return bool(os.getenv("QLOO_API_KEY", "").strip())


def _get_headers() -> dict[str, str]:
    """Create authenticated Qloo request headers."""
    api_key = os.getenv("QLOO_API_KEY", "").strip()

    if not api_key:
        raise RuntimeError(
            "Qloo API key is not configured. "
            "Set QLOO_API_KEY in your environment."
        )

    return {
        "X-Api-Key": api_key,
        "Accept": "application/json",
    }


# ============================================================
# GENERAL HELPERS
# ============================================================

def _clean_text(value: Any) -> str:
    """Convert a value to a clean string."""
    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    return ""


def _to_float(value: Any) -> float | None:
    """Safely convert a value to a float."""
    if value is None or isinstance(value, bool):
        return None

    try:
        return float(value)
    except (TypeError, ValueError, OverflowError):
        return None


def _valid_coordinates(
    latitude: Any,
    longitude: Any,
) -> tuple[float | None, float | None]:
    """Validate latitude and longitude."""
    latitude = _to_float(latitude)
    longitude = _to_float(longitude)

    if latitude is None or longitude is None:
        return None, None

    if not (-90 <= latitude <= 90):
        return None, None

    if not (-180 <= longitude <= 180):
        return None, None

    return latitude, longitude


def _first_text(*values: Any) -> str:
    """Return the first non-empty string."""
    for value in values:
        text = _clean_text(value)

        if text:
            return text

    return ""


# ============================================================
# QLOO ENTITY SEARCH
# ============================================================

@lru_cache(maxsize=512)
def _search_entity(
    name: str,
    entity_type: str,
) -> str | None:
    """
    Resolve a movie or artist name to a Qloo entity ID.

    Cache successful lookups to avoid repeating the same
    external search for frequently used preferences.
    """
    name = _clean_text(name)
    entity_type = _clean_text(entity_type)

    if not name or not entity_type:
        return None

    try:
        response = requests.get(
            QLOO_SEARCH_URL,
            headers=_get_headers(),
            params={
                "query": name,
                "type": entity_type,
            },
            timeout=TIMEOUT,
        )

        response.raise_for_status()

        payload = response.json()

        if not isinstance(payload, dict):
            return None

        results = payload.get("results", [])

        if not isinstance(results, list) or not results:
            return None

        # Prefer an exact name match.
        for result in results:
            if not isinstance(result, dict):
                continue

            result_name = _clean_text(result.get("name"))

            if result_name.casefold() == name.casefold():
                return _clean_text(result.get("entity_id")) or None

        # Preserve the original fallback behavior.
        first_result = results[0]

        if isinstance(first_result, dict):
            return (
                _clean_text(first_result.get("entity_id"))
                or None
            )

        return None

    except (requests.RequestException, ValueError) as exc:
        logger.warning(
            "Qloo entity lookup failed for %r: %s",
            name,
            exc,
        )
        return None


# ============================================================
# COORDINATE EXTRACTION
# ============================================================

def _extract_coordinates(
    entity: dict,
    properties: dict,
) -> tuple[float | None, float | None]:
    """
    Extract coordinates from common Qloo response formats.

    GeoJSON coordinates use [longitude, latitude].
    """
    candidates = [
        properties.get("geocode"),
        properties.get("location"),
        entity.get("geocode"),
        entity.get("location"),
    ]

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue

        latitude = candidate.get(
            "latitude",
            candidate.get("lat"),
        )

        longitude = candidate.get(
            "longitude",
            candidate.get("lng", candidate.get("lon")),
        )

        if latitude is not None and longitude is not None:
            result = _valid_coordinates(latitude, longitude)

            if result[0] is not None:
                return result

        nested = candidate.get("coordinates")

        if isinstance(nested, dict):
            latitude = nested.get(
                "latitude",
                nested.get("lat"),
            )

            longitude = nested.get(
                "longitude",
                nested.get("lng", nested.get("lon")),
            )

            if latitude is not None and longitude is not None:
                result = _valid_coordinates(latitude, longitude)

                if result[0] is not None:
                    return result

        elif isinstance(nested, (list, tuple)) and len(nested) >= 2:
            # GeoJSON: [longitude, latitude]
            longitude, latitude = nested[0], nested[1]

            result = _valid_coordinates(latitude, longitude)

            if result[0] is not None:
                return result

    return None, None


# ============================================================
# IMAGE EXTRACTION AND ENRICHMENT
# ============================================================

def _extract_image_url(properties: dict) -> str | None:
    """Extract an image URL from Qloo properties."""
    # Some responses may expose an image directly.
    direct_image = properties.get("image")

    if isinstance(direct_image, str) and direct_image.strip():
        return direct_image.strip()

    if isinstance(direct_image, dict):
        direct_url = _clean_text(direct_image.get("url"))

        if direct_url:
            return direct_url

    images = properties.get("images") or []

    if isinstance(images, dict):
        images = [images]

    if not isinstance(images, list):
        return None

    for image in images:
        if not isinstance(image, dict):
            continue

        image_url = _clean_text(
            image.get("url")
            or image.get("image_url")
        )

        if image_url:
            return image_url

    return None


@lru_cache(maxsize=512)
def _get_place_image(
    place_name: str,
    city: str = "",
    country: str = "",
) -> str | None:
    """
    Find a place-specific Wikimedia Commons image.

    Cache successful and unsuccessful lookups so repeated
    requests do not repeatedly search Wikimedia.
    """
    place_name = _clean_text(place_name)
    city = _clean_text(city)
    country = _clean_text(country)

    if not place_name or place_name == "Unknown place":
        return None

    search_terms = " ".join(
        part
        for part in [place_name, city, country]
        if part
    )

    try:
        response = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f'intitle:"{search_terms}"',
                "gsrnamespace": 6,
                "gsrlimit": 5,
                "prop": "imageinfo",
                "iiprop": "url|mime",
                "iiurlwidth": 1000,
            },
            headers={
                "User-Agent": USER_AGENT,
            },
            timeout=(3, 7),
        )

        response.raise_for_status()

        payload = response.json()

        pages = (
            payload.get("query", {}).get("pages", {})
            if isinstance(payload, dict)
            else {}
        )

        if not isinstance(pages, dict):
            return None

        for page in pages.values():
            if not isinstance(page, dict):
                continue

            image_info = page.get("imageinfo", [])

            if not isinstance(image_info, list) or not image_info:
                continue

            info = image_info[0]

            if not isinstance(info, dict):
                continue

            mime_type = _clean_text(info.get("mime"))

            if not mime_type.startswith("image/"):
                continue

            image_url = _clean_text(
                info.get("thumburl")
                or info.get("url")
            )

            if image_url:
                return image_url

    except (requests.RequestException, ValueError) as exc:
        logger.debug(
            "Image lookup failed for %r: %s",
            place_name,
            exc,
        )

    return None


# ============================================================
# PLACE NORMALIZATION
# ============================================================

def _normalize_place(entity: dict) -> dict:
    """Convert a Qloo entity into VibeTrip's existing place format."""
    properties = entity.get("properties") or {}

    if not isinstance(properties, dict):
        properties = {}

    geocode = properties.get("geocode") or {}

    if not isinstance(geocode, dict):
        geocode = {}

    latitude, longitude = _extract_coordinates(
        entity,
        properties,
    )

    place_name = _first_text(
        entity.get("name"),
        properties.get("name"),
        "Unknown place",
    )

    place_city = _first_text(
        geocode.get("city"),
        geocode.get("name"),
        properties.get("locality"),
    )

    place_country = _first_text(
        geocode.get("country"),
        properties.get("country"),
    )

    image_url = _extract_image_url(properties)

    return {
        "name": place_name,
        "entity_id": entity.get("entity_id"),
        "type": _first_text(
            entity.get("subtype"),
            entity.get("type"),
            properties.get("type"),
        ),
        "address": _first_text(
            properties.get("address"),
            properties.get("formatted_address"),
        ) or None,
        "city": place_city,
        "country": place_country,
        "latitude": latitude,
        "longitude": longitude,
        "description": _first_text(
            properties.get("description"),
            properties.get("short_description"),
            properties.get("overall_description"),
        ) or None,
        "website": _first_text(
            properties.get("website"),
        ) or None,
        "image_url": image_url,
        "travel_category": "explore",
        "price_level": properties.get("price_level"),
        "price_range": properties.get("price_range"),
        "rating": (
            properties.get("business_rating")
            or properties.get("rating")
        ),
        "popularity": entity.get("popularity"),
    }


# ============================================================
# PLACE CLASSIFICATION
# ============================================================

def _classify_place(place: dict) -> str:
    """
    Classify a place conservatively.

    Prefer explicit place type and name. Use the description
    only when stronger signals are unavailable.
    """
    name = _clean_text(place.get("name")).casefold()
    place_type = _clean_text(place.get("type")).casefold()
    description = _clean_text(
        place.get("description")
    ).casefold()

    # Explicit type and name are stronger signals than descriptions.
    primary_text = f"{name} {place_type}"

    excluded_keywords = (
        # Personal services
        "hair salon",
        "hairdresser",
        "nail salon",
        "beauty salon",
        "barber shop",

        # Medical facilities
        "dentist",
        "clinic",
        "hospital",
        "medical center",
        "medical centre",
        "pharmacy",

        # Ordinary educational institutions
        "school",
        "college",
        "university",
        "kindergarten",
        "preschool",
        "primary school",
        "secondary school",
        "high school",
        "educational institution",
        "training center",
        "training centre",
        "tuition center",
        "tuition centre",

        # Ordinary commercial and residential locations
        "real estate office",
        "residential building",
        "apartment building",
        "office building",
    )

    if any(keyword in primary_text for keyword in excluded_keywords):
        return "exclude"

    hotel_keywords = (
        "hotel",
        "hostel",
        "resort",
        "guesthouse",
        "guest house",
    )

    if any(keyword in primary_text for keyword in hotel_keywords):
        return "exclude"

    food_keywords = (
        "restaurant",
        "cafe",
        "café",
        "coffee shop",
        "coffeehouse",
        "bakery",
        "bistro",
        "ramen",
        "sushi",
        "izakaya",
        "food court",
        "food hall",
        "grill",
    )

    if any(keyword in primary_text for keyword in food_keywords):
        return "food"

    attraction_keywords = (
        "museum",
        "gallery",
        "park",
        "temple",
        "shrine",
        "castle",
        "palace",
        "tower",
        "observatory",
        "landmark",
        "monument",
        "theatre",
        "theater",
        "opera",
        "aquarium",
        "zoo",
        "garden",
        "art center",
        "art centre",
        "historical site",
        "historic site",
        "attraction",
    )

    if any(keyword in primary_text for keyword in attraction_keywords):
        return "attraction"

    # Descriptions are only a fallback because they can mention
    # other places without defining the current place's category.
    if any(
        keyword in description
        for keyword in (
            "museum",
            "historical landmark",
            "historic monument",
            "art gallery",
            "botanical garden",
        )
    ):
        return "attraction"

    if any(
        keyword in description
        for keyword in (
            "restaurant",
            "café",
            "cafe",
            "coffee shop",
        )
    ):
        return "food"

    return "explore"


# ============================================================
# PLACE RANKING AND DIVERSITY
# ============================================================

def _rank_places(places: list[dict]) -> list[dict]:
    """
    Filter duplicates and balance categories while retaining
    Qloo's relative order within each category.

    The function does not claim to optimize a travel route.
    """
    categorized = {
        "attraction": [],
        "food": [],
        "explore": [],
    }

    seen_ids = set()
    seen_names_and_addresses = set()

    for place in places:
        if not isinstance(place, dict):
            continue

        name = _clean_text(place.get("name"))

        if not name or name == "Unknown place":
            continue

        entity_id = _clean_text(place.get("entity_id"))

        address = _clean_text(place.get("address")).casefold()
        city = _clean_text(place.get("city")).casefold()

        identity = (
            entity_id.casefold()
            if entity_id
            else None
        )

        if identity and identity in seen_ids:
            continue

        fallback_identity = (
            name.casefold(),
            address,
            city,
        )

        if fallback_identity in seen_names_and_addresses:
            continue

        if identity:
            seen_ids.add(identity)

        seen_names_and_addresses.add(fallback_identity)

        category = _classify_place(place)

        if category == "exclude":
            continue

        place["travel_category"] = category

        if (
            place.get("latitude") is None
            or place.get("longitude") is None
        ):
            # Preserve useful places without coordinates.
            # The itinerary layer can decide how to handle them.
            pass

        categorized[category].append(place)

    # Round-robin categories to avoid returning only attractions
    # when Qloo provides a mixture of relevant place types.
    #
    # Qloo's original ordering is preserved inside each category.
    ranked_places = []

    category_order = ["attraction", "food", "explore"]

    while any(categorized.values()):
        for category in category_order:
            if categorized[category]:
                ranked_places.append(
                    categorized[category].pop(0)
                )

    return ranked_places


# ============================================================
# QLOO PLACE RECOMMENDATIONS
# ============================================================

def _get_place_recommendations(
    entity_ids: list[str],
    destination: str = "",
    location_signal: str = "",
    limit: int = DEFAULT_RESULT_LIMIT,
) -> list[dict]:
    """Retrieve, normalize, rank, and enrich Qloo place results."""

    limit = max(
        1,
        min(int(limit), MAX_RESULT_LIMIT),
    )

    params = {
        "filter.type": "urn:entity:place",
        "take": limit,
        "feature.explainability": "true",
    }

    # Cultural personalization from resolved Qloo entities.
    valid_entity_ids = list(
        dict.fromkeys(
            _clean_text(entity_id)
            for entity_id in entity_ids
            if _clean_text(entity_id)
        )
    )

    if valid_entity_ids:
        params["signal.interests.entities"] = ",".join(
            valid_entity_ids
        )

    # Use the destination as the primary geographic signal.
    if location_signal and location_signal.strip():
        params["signal.location.query"] = location_signal.strip()

    # Restrict results to the destination boundary when provided.
    if destination and destination.strip():
        params["filter.location.query"] = destination.strip()
        params["filter.location.radius"] = 0

    response = requests.get(
        QLOO_INSIGHTS_URL,
        headers=_get_headers(),
        params=params,
        timeout=TIMEOUT,
    )

    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, dict):
        raise ValueError("Qloo returned an unexpected response format.")

    result_data = payload.get("results") or {}

    if not isinstance(result_data, dict):
        raise ValueError("Qloo returned an invalid results object.")

    entities = result_data.get("entities") or []

    if not isinstance(entities, list):
        raise ValueError("Qloo returned an invalid entities list.")

    recommendations = []

    for entity in entities:
        if not isinstance(entity, dict):
            continue

        try:
            place = _normalize_place(entity)
            recommendations.append(place)

        except (TypeError, ValueError, AttributeError) as exc:
            logger.debug(
                "Skipping malformed Qloo place: %s",
                exc,
            )

    logger.info(
        "Qloo returned %d usable place records.",
        len(recommendations),
    )

    ranked_places = _rank_places(recommendations)

    # Enrich only a limited number of missing images per request.
    # Cached lookups make subsequent requests cheaper.
    image_lookup_count = 0

    for place in ranked_places:
        if place.get("image_url"):
            continue

        if image_lookup_count >= MAX_IMAGE_LOOKUPS_PER_REQUEST:
            break

        place_name = _clean_text(place.get("name"))

        if not place_name or place_name == "Unknown place":
            continue

        image_lookup_count += 1

        place["image_url"] = _get_place_image(
            place_name,
            _clean_text(place.get("city")),
            _clean_text(place.get("country")),
        )

    places_with_coordinates = sum(
        1
        for place in ranked_places
        if place.get("latitude") is not None
        and place.get("longitude") is not None
    )

    logger.info(
        "Retained %d places after filtering and ranking; "
        "%d have coordinates; %d image lookups attempted.",
        len(ranked_places),
        places_with_coordinates,
        image_lookup_count,
    )

    return ranked_places


# ============================================================
# MAIN PUBLIC FUNCTION
# ============================================================

def get_cultural_recommendations(preferences: dict) -> dict:
    """
    Retrieve location-based or culturally informed recommendations.

    Existing return keys are preserved for frontend compatibility.
    """

    if not is_qloo_configured():
        raise RuntimeError("Qloo API key is not configured.")

    if not isinstance(preferences, dict):
        raise ValueError("Travel preferences must be an object.")

    favorite_movies = preferences.get("favorite_movies") or []
    favorite_artists = preferences.get("favorite_artists") or []

    if not isinstance(favorite_movies, list):
        favorite_movies = []

    if not isinstance(favorite_artists, list):
        favorite_artists = []

    movie_ids = []
    artist_ids = []

    # Resolve movies.
    for movie in favorite_movies:
        movie_name = _clean_text(movie)

        if not movie_name:
            continue

        entity_id = _search_entity(
            movie_name,
            "urn:entity:movie",
        )

        if entity_id:
            movie_ids.append(entity_id)

    # Resolve artists.
    for artist in favorite_artists:
        artist_name = _clean_text(artist)

        if not artist_name:
            continue

        entity_id = _search_entity(
            artist_name,
            "urn:entity:artist",
        )

        if entity_id:
            artist_ids.append(entity_id)

    entity_ids = list(
        dict.fromkeys(movie_ids + artist_ids)
    )

    destination = _clean_text(
        preferences.get("destination")
    )

    starting_location = _clean_text(
        preferences.get("starting_location")
    )

    # Prefer the destination for travel recommendations.
    location_signal = destination or starting_location

    if not location_signal:
        return {
            "source": "Qloo",
            "recommendation_mode": "location",
            "recommendations": [],
            "message": (
                "Enter a destination or starting location "
                "to discover places."
            ),
        }

    try:
        recommendations = _get_place_recommendations(
            entity_ids=entity_ids,
            destination=destination,
            location_signal=location_signal,
        )

    except requests.RequestException as exc:
        logger.exception("Qloo recommendation request failed.")

        raise RuntimeError(
            "Unable to retrieve recommendations from Qloo. "
            "Please try again shortly."
        ) from exc

    except ValueError as exc:
        logger.exception("Invalid Qloo response.")

        raise RuntimeError(
            "Qloo returned an unexpected response. "
            "Please try again."
        ) from exc

    if entity_ids:
        recommendation_mode = "cultural"

        if recommendations:
            message = (
                "Culturally informed recommendations retrieved "
                "from Qloo using your resolved favorite movies "
                "and artists."
            )
        else:
            message = (
                "Qloo returned no matching places for these "
                "preferences and destination. Try different "
                "preferences or another destination."
            )

    else:
        recommendation_mode = "location"

        if recommendations:
            message = (
                "Location-based places retrieved from Qloo. "
                "Add favorite movies or artists for cultural "
                "personalization."
            )
        else:
            message = (
                "Qloo returned no matching places for this "
                "location. Try another destination."
            )

    return {
        "source": "Qloo",
        "recommendation_mode": recommendation_mode,
        "recommendations": recommendations,
        "message": message,
    }