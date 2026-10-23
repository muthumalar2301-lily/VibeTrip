import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("QLOO_API_KEY")

if not API_KEY:
    print("ERROR: QLOO_API_KEY was not found in .env")
    raise SystemExit(1)

BASE_URL = "https://hackathon.api.qloo.com"

HEADERS = {
    "X-Api-Key": API_KEY.strip(),
    "Accept": "application/json",
}


def test_qloo_search():
    """Search Qloo for a movie entity."""
    url = f"{BASE_URL}/search"

    params = {
        "query": "Interstellar",
        "type": "urn:entity:movie",
    }

    response = requests.get(
        url,
        headers=HEADERS,
        params=params,
        timeout=30,
    )

    print("SEARCH STATUS:", response.status_code)

    if not response.ok:
        print(response.text[:3000])
        return None

    data = response.json()
    print("\nSearch response:")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:4000])

    # Find an entity ID in the returned results.
    results = data.get("results", [])

    if results and isinstance(results[0], dict):
        entity_id = results[0].get("entity_id") or results[0].get("id")

        if entity_id:
            return entity_id

    print("\nCould not find an entity ID in the search response.")
    print("We need to inspect the response structure before continuing.")
    return None


def test_qloo_insights(entity_id):
    """Request recommendations using a resolved movie entity."""
    url = f"{BASE_URL}/v2/insights"

    params = {
        "filter.type": "urn:entity:place",
        "signal.interests.entities": entity_id,
        "take": 5,
    }

    response = requests.get(
        url,
        headers=HEADERS,
        params=params,
        timeout=30,
    )

    print("\nINSIGHTS STATUS:", response.status_code)

    if response.ok:
        print("\nSUCCESS! Qloo returned insights.")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False)[:6000])
    else:
        print("\nInsights error:")
        print(response.text[:3000])


if __name__ == "__main__":
    movie_id = test_qloo_search()

    if movie_id:
        test_qloo_insights(movie_id)