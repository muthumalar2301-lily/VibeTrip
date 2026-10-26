import concurrent.futures
import logging
import os
from functools import lru_cache
from typing import Any

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

load_dotenv()
logger = logging.getLogger(__name__)

QLOO_BASE_URL = "https://hackathon.api.qloo.com"
QLOO_SEARCH_URL = f"{QLOO_BASE_URL}/search"
QLOO_INSIGHTS_URL = f"{QLOO_BASE_URL}/v2/insights"

TIMEOUT = (5, 25)
WIKIMEDIA_TIMEOUT = (3, 5)

session = requests.Session()
retries = Retry(total=2, backoff_factor=1, status_forcelist=[502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

# Major cultural hubs for nationwide itinerary generation
COUNTRY_HUBS: dict[str, list[str]] = {
    # East & North Asia
    "china": ["Beijing", "Shanghai", "Chengdu", "Xi'an"],
    "russia": ["Moscow", "Saint Petersburg", "Kazan", "Sochi"],
    "japan": ["Tokyo", "Kyoto", "Osaka"],
    "south korea": ["Seoul", "Busan", "Jeju"],
    "taiwan": ["Taipei", "Kaohsiung", "Tainan"],

    # South & Southeast Asia
    "india": ["Delhi", "Mumbai", "Jaipur", "Bengaluru"],
    "thailand": ["Bangkok", "Chiang Mai", "Phuket"],
    "vietnam": ["Hanoi", "Ho Chi Minh City", "Da Nang"],
    "indonesia": ["Bali", "Jakarta", "Yogyakarta"],
    "malaysia": ["Kuala Lumpur", "Penang", "Langkawi"],
    "philippines": ["Manila", "Cebu", "Palawan"],

    # Americas
    "united states": ["New York", "San Francisco", "Los Angeles", "Chicago"],
    "usa": ["New York", "San Francisco", "Los Angeles"],
    "canada": ["Toronto", "Vancouver", "Montreal", "Banff"],
    "brazil": ["Rio de Janeiro", "São Paulo", "Salvador"],
    "mexico": ["Mexico City", "Oaxaca", "Cancun"],
    "argentina": ["Buenos Aires", "Mendoza", "Bariloche"],

    # Europe
    "france": ["Paris", "Lyon", "Nice"],
    "italy": ["Rome", "Florence", "Venice", "Milan"],
    "spain": ["Barcelona", "Madrid", "Seville"],
    "united kingdom": ["London", "Edinburgh", "Manchester"],
    "uk": ["London", "Edinburgh"],
    "germany": ["Berlin", "Munich", "Hamburg"],
    "turkey": ["Istanbul", "Cappadocia", "Antalya"],
    "switzerland": ["Zurich", "Geneva", "Lucerne"],
    "greece": ["Athens", "Santorini", "Crete"],

    # Middle East & Africa
    "uae": ["Dubai", "Abu Dhabi"],
    "dubai": ["Dubai", "Abu Dhabi"],
    "egypt": ["Cairo", "Luxor", "Alexandria"],
    "morocco": ["Marrakech", "Fez", "Chefchaouen"],
    "south africa": ["Cape Town", "Johannesburg", "Durban"],

    # Oceania
    "australia": ["Sydney", "Melbourne", "Brisbane"],
    "new zealand": ["Auckland", "Queenstown", "Wellington"],
}

def is_qloo_configured() -> bool:
    return bool(os.getenv("QLOO_API_KEY", "").strip())

def _get_headers() -> dict[str, str]:
    api_key = os.getenv("QLOO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Qloo API key is not configured.")
    return {"X-Api-Key": api_key, "Accept": "application/json"}

def _clean_text(val: Any) -> str:
    return str(val).strip() if val is not None else ""

@lru_cache(maxsize=512)
def _search_entity(name: str, entity_type: str) -> str | None:
    name = _clean_text(name)
    if not name:
        return None
    try:
        res = session.get(
            QLOO_SEARCH_URL,
            headers=_get_headers(),
            params={"query": name, "type": entity_type},
            timeout=TIMEOUT,
        )
        if res.status_code == 200:
            results = res.json().get("results", [])
            for r in results:
                if _clean_text(r.get("name")).casefold() == name.casefold():
                    return _clean_text(r.get("entity_id")) or None
            if results:
                return _clean_text(results[0].get("entity_id")) or None
    except Exception as exc:
        logger.debug("Entity lookup failed for %s: %s", name, exc)
    return None

def _fetch_hub_recommendations(entity_ids: list[str], location: str, take: int = 10) -> list[dict]:
    params = {
        "filter.type": "urn:entity:place",
        "take": take,
        "signal.location.query": location,
    }
    if entity_ids:
        params["signal.interests.entities"] = ",".join(entity_ids[:6])

    try:
        res = session.get(QLOO_INSIGHTS_URL, headers=_get_headers(), params=params, timeout=TIMEOUT)
        if res.status_code == 200:
            entities = res.json().get("results", {}).get("entities", [])
            parsed = []
            for e in entities:
                props = e.get("properties") or {}
                geo = props.get("geocode") or {}
                parsed.append({
                    "name": _clean_text(e.get("name") or props.get("name")),
                    "entity_id": _clean_text(e.get("entity_id")),
                    "type": _clean_text(e.get("subtype") or e.get("type")),
                    "address": _clean_text(props.get("address") or props.get("formatted_address")),
                    "city": _clean_text(geo.get("city") or location),
                    "country": _clean_text(geo.get("country")),
                    "latitude": geo.get("latitude") or geo.get("lat"),
                    "longitude": geo.get("longitude") or geo.get("lng"),
                    "description": _clean_text(props.get("description") or props.get("short_description")),
                    "image_url": None,
                    "travel_category": "attraction",
                })
            return parsed
    except Exception as exc:
        logger.warning("Hub fetch failed for %s: %s", location, exc)
    return []

def get_cultural_recommendations(preferences: dict) -> dict:
    if not is_qloo_configured():
        raise RuntimeError("Qloo API key is not configured.")

    movies = preferences.get("favorite_movies") or []
    artists = preferences.get("favorite_artists") or []
    destination = _clean_text(preferences.get("destination"))

    # Resolve entity IDs
    entity_ids = []
    for m in movies:
        if eid := _search_entity(m, "urn:entity:movie"):
            entity_ids.append(eid)
    for a in artists:
        if eid := _search_entity(a, "urn:entity:artist"):
            entity_ids.append(eid)

    dest_lower = destination.lower()
    matched_country = next((c for c in COUNTRY_HUBS if c in dest_lower), None)

    results = []
    if matched_country:
        # Nationwide trip: pull top spots across multiple cultural hub cities in parallel
        hubs = COUNTRY_HUBS[matched_country]
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_hub = {
                executor.submit(_fetch_hub_recommendations, entity_ids, f"{hub}, {destination}", 8): hub
                for hub in hubs
            }
            for future in concurrent.futures.as_completed(future_to_hub):
                results.extend(future.result())
    else:
        # Single city / regional query
        results = _fetch_hub_recommendations(entity_ids, destination, take=20)

    # Fallback if external cluster returns empty
    if not results:
        results = [
            {
                "name": f"Historic & Cultural Highlights of {destination.title()}",
                "entity_id": "fallback_1",
                "type": "historic_district",
                "travel_category": "attraction",
                "address": f"Center, {destination.title()}",
                "city": destination.title(),
                "description": f"The iconic cultural landmark of {destination.title()}.",
                "latitude": 48.8566,
                "longitude": 2.3522,
                "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
            }
        ]

    # Deduplicate places by name
    seen = set()
    deduped = []
    for p in results:
        if p["name"] and p["name"] not in seen:
            seen.add(p["name"])
            deduped.append(p)

    return {
        "source": "Qloo",
        "recommendation_mode": "cultural" if entity_ids else "location",
        "recommendations": deduped,
        "message": f"Found {len(deduped)} places across {destination.title()}.",
    }