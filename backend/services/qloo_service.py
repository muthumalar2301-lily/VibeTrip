import concurrent.futures
import logging
import os
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

TIMEOUT = (5, 20)
WIKIMEDIA_TIMEOUT = (3, 5)

DEFAULT_RESULT_LIMIT = 50
MAX_RESULT_LIMIT = 50
MAX_IMAGE_LOOKUPS_PER_REQUEST = 8

USER_AGENT = "VibeTrip/1.0 (travel recommendation application)"

session = requests.Session()


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
            "Qloo API key is not configured. Set QLOO_API_KEY in your environment."
        )
    return {
        "X-Api-Key": api_key,
        "Accept": "application/json",
    }


# ============================================================
# GENERAL HELPERS
# ============================================================

def _clean_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    return "" if value is None else str(value).strip()


def _to_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError, OverflowError):
        return None


def _valid_coordinates(latitude: Any, longitude: Any) -> tuple[float | None, float | None]:
    lat = _to_float(latitude)
    lon = _to_float(longitude)
    if lat is None or lon is None:
        return None, None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None, None
    return lat, lon


def _first_text(*values: Any) -> str:
    for value in values:
        text = _clean_text(value)
        if text:
            return text
    return ""


# ============================================================
# QLOO ENTITY SEARCH
# ============================================================

@lru_cache(maxsize=512)
def _search_entity(name: str, entity_type: str) -> str | None:
    """Resolve a movie or artist name to a Qloo entity ID."""
    name = _clean_text(name)
    entity_type = _clean_text(entity_type)
    if not name or not entity_type:
        return None

    try:
        response = session.get(
            QLOO_SEARCH_URL,
            headers=_get_headers(),
            params={"query": name, "type": entity_type},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()

        if not isinstance(payload, dict):
            return None

        results = payload.get("results", [])
        if not isinstance(results, list) or not results:
            return None

        target_fold = name.casefold()
        for result in results:
            if isinstance(result, dict):
                res_name = _clean_text(result.get("name"))
                if res_name.casefold() == target_fold:
                    return _clean_text(result.get("entity_id")) or None

        first = results[0]
        if isinstance(first, dict):
            return _clean_text(first.get("entity_id")) or None

        return None
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Qloo entity lookup failed for %r: %s", name, exc)
        return None


# ============================================================
# COORDINATE EXTRACTION
# ============================================================

def _extract_coordinates(entity: dict, properties: dict) -> tuple[float | None, float | None]:
    candidates = [
        properties.get("geocode"),
        properties.get("location"),
        entity.get("geocode"),
        entity.get("location"),
    ]

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue

        lat = candidate.get("latitude", candidate.get("lat"))
        lon = candidate.get("longitude", candidate.get("lng", candidate.get("lon")))
        res_lat, res_lon = _valid_coordinates(lat, lon)
        if res_lat is not None:
            return res_lat, res_lon

        nested = candidate.get("coordinates")
        if isinstance(nested, dict):
            n_lat = nested.get("latitude", nested.get("lat"))
            n_lon = nested.get("longitude", nested.get("lng", nested.get("lon")))
            res_lat, res_lon = _valid_coordinates(n_lat, n_lon)
            if res_lat is not None:
                return res_lat, res_lon
        elif isinstance(nested, (list, tuple)) and len(nested) >= 2:
            res_lat, res_lon = _valid_coordinates(nested[1], nested[0])
            if res_lat is not None:
                return res_lat, res_lon

    return None, None


# ============================================================
# IMAGE EXTRACTION AND ENRICHMENT
# ============================================================

def _extract_image_url(properties: dict) -> str | None:
    direct = properties.get("image")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()
    if isinstance(direct, dict):
        url = _clean_text(direct.get("url"))
        if url:
            return url

    images = properties.get("images") or []
    if isinstance(images, dict):
        images = [images]
    if isinstance(images, list):
        for img in images:
            if isinstance(img, dict):
                url = _clean_text(img.get("url") or img.get("image_url"))
                if url:
                    return url
    return None


@lru_cache(maxsize=512)
def _get_place_image(place_name: str, city: str = "", country: str = "") -> str | None:
    place_name = _clean_text(place_name)
    city = _clean_text(city)
    country = _clean_text(country)

    if not place_name or place_name == "Unknown place":
        return None

    search_terms = " ".join(p for p in [place_name, city, country] if p)
    try:
        response = session.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f'intitle:"{search_terms}"',
                "gsrnamespace": 6,
                "gsrlimit": 3,
                "prop": "imageinfo",
                "iiprop": "url|mime",
                "iiurlwidth": 800,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=WIKIMEDIA_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        pages = payload.get("query", {}).get("pages", {}) if isinstance(payload, dict) else {}

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
            if not _clean_text(info.get("mime")).startswith("image/"):
                continue

            img_url = _clean_text(info.get("thumburl") or info.get("url"))
            if img_url:
                return img_url
    except (requests.RequestException, ValueError) as exc:
        logger.debug("Image lookup failed for %r: %s", place_name, exc)

    return None


# ============================================================
# PLACE NORMALIZATION & CLASSIFICATION
# ============================================================

def _normalize_place(entity: dict) -> dict:
    properties = entity.get("properties") if isinstance(entity.get("properties"), dict) else {}
    geocode = properties.get("geocode") if isinstance(properties.get("geocode"), dict) else {}
    latitude, longitude = _extract_coordinates(entity, properties)

    return {
        "name": _first_text(entity.get("name"), properties.get("name"), "Unknown place"),
        "entity_id": entity.get("entity_id"),
        "type": _first_text(entity.get("subtype"), entity.get("type"), properties.get("type")),
        "address": _first_text(properties.get("address"), properties.get("formatted_address")) or None,
        "city": _first_text(geocode.get("city"), geocode.get("name"), properties.get("locality")),
        "country": _first_text(geocode.get("country"), properties.get("country")),
        "latitude": latitude,
        "longitude": longitude,
        "description": _first_text(
            properties.get("description"),
            properties.get("short_description"),
            properties.get("overall_description"),
        ) or None,
        "website": _first_text(properties.get("website")) or None,
        "image_url": _extract_image_url(properties),
        "travel_category": "explore",
        "price_level": properties.get("price_level"),
        "price_range": properties.get("price_range"),
        "rating": properties.get("business_rating") or properties.get("rating"),
        "popularity": entity.get("popularity"),
    }


def _classify_place(place: dict) -> str:
    name = _clean_text(place.get("name")).casefold()
    place_type = _clean_text(place.get("type")).casefold()
    description = _clean_text(place.get("description")).casefold()
    primary_text = f"{name} {place_type}"

    excluded_keywords = (
        "hair salon", "hairdresser", "nail salon", "beauty salon", "barber shop",
        "dentist", "clinic", "hospital", "medical center", "pharmacy",
        "school", "college", "university", "kindergarten", "preschool",
        "tuition center", "real estate", "residential building", "apartment",
    )
    if any(k in primary_text for k in excluded_keywords):
        return "exclude"

    if any(k in primary_text for k in ("hotel", "hostel", "resort", "guesthouse")):
        return "exclude"

    food_keywords = (
        "restaurant", "cafe", "café", "coffee shop", "bakery",
        "bistro", "ramen", "sushi", "izakaya", "grill",
    )
    if any(k in primary_text for k in food_keywords):
        return "food"

    attraction_keywords = (
        "museum", "gallery", "park", "temple", "shrine", "castle",
        "palace", "tower", "observatory", "landmark", "monument",
        "theatre", "theater", "opera", "aquarium", "zoo", "garden",
    )
    if any(k in primary_text for k in attraction_keywords):
        return "attraction"

    if any(k in description for k in ("museum", "landmark", "gallery", "garden")):
        return "attraction"
    if any(k in description for k in ("restaurant", "café", "cafe", "coffee")):
        return "food"

    return "explore"


# ============================================================
# PLACE RANKING AND DIVERSITY
# ============================================================

def _rank_places(places: list[dict]) -> list[dict]:
    categorized = {"attraction": [], "food": [], "explore": []}
    seen_ids = set()
    seen_fingerprints = set()

    for place in places:
        if not isinstance(place, dict):
            continue

        name = _clean_text(place.get("name"))
        if not name or name == "Unknown place":
            continue

        entity_id = _clean_text(place.get("entity_id")).casefold()
        fingerprint = (
            name.casefold(),
            _clean_text(place.get("address")).casefold(),
            _clean_text(place.get("city")).casefold(),
        )

        if entity_id and entity_id in seen_ids:
            continue
        if fingerprint in seen_fingerprints:
            continue

        if entity_id:
            seen_ids.add(entity_id)
        seen_fingerprints.add(fingerprint)

        category = _classify_place(place)
        if category == "exclude":
            continue

        place["travel_category"] = category
        categorized[category].append(place)

    ranked_places = []
    category_order = ["attraction", "food", "explore"]

    while any(categorized.values()):
        for cat in category_order:
            if categorized[cat]:
                ranked_places.append(categorized[cat].pop(0))

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
    limit = max(1, min(int(limit), MAX_RESULT_LIMIT))

    params = {
        "filter.type": "urn:entity:place",
        "take": limit,
        "feature.explainability": "true",
    }

    valid_entity_ids = list(dict.fromkeys(_clean_text(eid) for eid in entity_ids if _clean_text(eid)))
    if valid_entity_ids:
        params["signal.interests.entities"] = ",".join(valid_entity_ids)

    if destination and destination.strip():
        params["filter.location.query"] = destination.strip()
    elif location_signal and location_signal.strip():
        params["signal.location.query"] = location_signal.strip()

    try:
        response = session.get(
            QLOO_INSIGHTS_URL,
            headers=_get_headers(),
            params=params,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        logger.error("Qloo insights request failed: %s", exc)
        raise

    if not isinstance(payload, dict):
        raise ValueError("Qloo returned an unexpected response format.")

    entities = payload.get("results", {}).get("entities", [])
    if not isinstance(entities, list):
        raise ValueError("Qloo returned an invalid entities list.")

    recommendations = []
    for entity in entities:
        if isinstance(entity, dict):
            try:
                recommendations.append(_normalize_place(entity))
            except (TypeError, ValueError, AttributeError) as exc:
                logger.debug("Skipping malformed Qloo place: %s", exc)

    ranked_places = _rank_places(recommendations)

    # Parallelize image lookups via thread pool
    missing_images = [
        p for p in ranked_places
        if not p.get("image_url") and p.get("name") and p.get("name") != "Unknown place"
    ][:MAX_IMAGE_LOOKUPS_PER_REQUEST]

    if missing_images:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_to_place = {
                executor.submit(
                    _get_place_image,
                    p["name"],
                    p.get("city") or "",
                    p.get("country") or "",
                ): p
                for p in missing_images
            }
            for future in concurrent.futures.as_completed(future_to_place):
                place_ref = future_to_place[future]
                try:
                    place_ref["image_url"] = future.result()
                except Exception as exc:
                    logger.debug("Threaded image lookup error: %s", exc)

    return ranked_places


# ============================================================
# MAIN PUBLIC FUNCTION
# ============================================================

def get_cultural_recommendations(preferences: dict) -> dict:
    if not is_qloo_configured():
        raise RuntimeError("Qloo API key is not configured.")

    if not isinstance(preferences, dict):
        raise ValueError("Travel preferences must be an object.")

    favorite_movies = preferences.get("favorite_movies") or []
    favorite_artists = preferences.get("favorite_artists") or []

    movie_ids = [
        eid for m in (favorite_movies if isinstance(favorite_movies, list) else [])
        if (clean_m := _clean_text(m)) and (eid := _search_entity(clean_m, "urn:entity:movie"))
    ]
    artist_ids = [
        eid for a in (favorite_artists if isinstance(favorite_artists, list) else [])
        if (clean_a := _clean_text(a)) and (eid := _search_entity(clean_a, "urn:entity:artist"))
    ]

    entity_ids = list(dict.fromkeys(movie_ids + artist_ids))
    destination = _clean_text(preferences.get("destination"))
    starting_location = _clean_text(preferences.get("starting_location"))
    location_signal = destination or starting_location

    if not location_signal:
        return {
            "source": "Qloo",
            "recommendation_mode": "location",
            "recommendations": [],
            "message": "Enter a destination or starting location to discover places.",
        }

    try:
        recommendations = _get_place_recommendations(
            entity_ids=entity_ids,
            destination=destination,
            location_signal=location_signal,
        )
    except requests.RequestException as exc:
        logger.exception("Qloo recommendation request failed.")
        raise RuntimeError("Unable to retrieve recommendations from Qloo. Please try again shortly.") from exc
    except ValueError as exc:
        logger.exception("Invalid Qloo response.")
        raise RuntimeError("Qloo returned an unexpected response. Please try again.") from exc

    recommendation_mode = "cultural" if entity_ids else "location"

    if recommendations:
        message = (
            "Culturally informed recommendations retrieved from Qloo."
            if entity_ids else
            "Location-based places retrieved from Qloo. Add favorite movies or artists for cultural personalization."
        )
    else:
        message = (
            "Qloo returned no matching places for these preferences and destination."
            if entity_ids else
            "Qloo returned no matching places for this location. Try another destination."
        )

    return {
        "source": "Qloo",
        "recommendation_mode": recommendation_mode,
        "recommendations": recommendations,
        "message": message,
    }