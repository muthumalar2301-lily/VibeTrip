import logging
import os
from typing import Any, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import Qloo recommendation module
# Ensure qloo_service.py (or your recommendations file) is in the same directory
from services.qloo_service import get_cultural_recommendations, is_qloo_configured

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibetrip-backend")

app = FastAPI(
    title="VibeTrip API",
    description="Backend service powering personalized travel recommendations and currency conversions.",
    version="1.0.0",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "*",  # Adjust to specific domains in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DATA SCHEMAS
# ============================================================

class PreferencesPayload(BaseModel):
    starting_location: str = Field(..., min_length=2)
    destination: str = Field(..., min_length=2)
    favorite_movies: list[str] = Field(default_factory=list)
    favorite_artists: list[str] = Field(default_factory=list)
    favorite_cuisines: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    budget: float = Field(default=100000.0, ge=1)
    budget_currency: str = Field(default="INR")
    duration_days: int = Field(default=3, ge=1, le=30)
    travel_style: list[str] = Field(default_factory=list)
    additional_preferences: Optional[str] = None


# ============================================================
# COUNTRY & CURRENCY RESOLVER DICTIONARY
# ============================================================

LOCATION_TO_CURRENCY: dict[str, dict[str, str]] = {
    # Asia
    "india": {"country": "India", "currency_code": "INR", "currency_symbol": "₹"},
    "japan": {"country": "Japan", "currency_code": "JPY", "currency_symbol": "¥"},
    "tokyo": {"country": "Japan", "currency_code": "JPY", "currency_symbol": "¥"},
    "kyoto": {"country": "Japan", "currency_code": "JPY", "currency_symbol": "¥"},
    "osaka": {"country": "Japan", "currency_code": "JPY", "currency_symbol": "¥"},
    "singapore": {"country": "Singapore", "currency_code": "SGD", "currency_symbol": "S$"},
    "malaysia": {"country": "Malaysia", "currency_code": "MYR", "currency_symbol": "RM"},
    "kuala lumpur": {"country": "Malaysia", "currency_code": "MYR", "currency_symbol": "RM"},
    "thailand": {"country": "Thailand", "currency_code": "THB", "currency_symbol": "฿"},
    "bangkok": {"country": "Thailand", "currency_code": "THB", "currency_symbol": "฿"},
    "uae": {"country": "United Arab Emirates", "currency_code": "AED", "currency_symbol": "AED "},
    "dubai": {"country": "United Arab Emirates", "currency_code": "AED", "currency_symbol": "AED "},
    "south korea": {"country": "South Korea", "currency_code": "KRW", "currency_symbol": "₩"},
    "seoul": {"country": "South Korea", "currency_code": "KRW", "currency_symbol": "₩"},
    "indonesia": {"country": "Indonesia", "currency_code": "IDR", "currency_symbol": "Rp"},
    "bali": {"country": "Indonesia", "currency_code": "IDR", "currency_symbol": "Rp"},
    "vietnam": {"country": "Vietnam", "currency_code": "VND", "currency_symbol": "₫"},
    "sri lanka": {"country": "Sri Lanka", "currency_code": "LKR", "currency_symbol": "Rs"},

    # Europe
    "france": {"country": "France", "currency_code": "EUR", "currency_symbol": "€"},
    "paris": {"country": "France", "currency_code": "EUR", "currency_symbol": "€"},
    "germany": {"country": "Germany", "currency_code": "EUR", "currency_symbol": "€"},
    "berlin": {"country": "Germany", "currency_code": "EUR", "currency_symbol": "€"},
    "italy": {"country": "Italy", "currency_code": "EUR", "currency_symbol": "€"},
    "rome": {"country": "Italy", "currency_code": "EUR", "currency_symbol": "€"},
    "spain": {"country": "Spain", "currency_code": "EUR", "currency_symbol": "€"},
    "barcelona": {"country": "Spain", "currency_code": "EUR", "currency_symbol": "€"},
    "uk": {"country": "United Kingdom", "currency_code": "GBP", "currency_symbol": "£"},
    "united kingdom": {"country": "United Kingdom", "currency_code": "GBP", "currency_symbol": "£"},
    "london": {"country": "United Kingdom", "currency_code": "GBP", "currency_symbol": "£"},
    "switzerland": {"country": "Switzerland", "currency_code": "CHF", "currency_symbol": "CHF "},

    # Americas & Oceania
    "usa": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "united states": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "new york": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "california": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "canada": {"country": "Canada", "currency_code": "CAD", "currency_symbol": "C$"},
    "australia": {"country": "Australia", "currency_code": "AUD", "currency_symbol": "A$"},
    "sydney": {"country": "Australia", "currency_code": "AUD", "currency_symbol": "A$"},
}

# Offline fallback matrix relative to 1 USD
BASE_RATES_TO_USD: dict[str, float] = {
    "USD": 1.0,
    "INR": 86.5,
    "JPY": 152.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "SGD": 1.34,
    "MYR": 4.45,
    "AED": 3.67,
    "AUD": 1.54,
    "CAD": 1.40,
    "THB": 34.2,
    "KRW": 1390.0,
}


# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "qloo_configured": is_qloo_configured(),
    }


@app.post("/recommendations")
def get_recommendations(payload: PreferencesPayload) -> dict[str, Any]:
    """Retrieve cultural and location recommendations via Qloo."""
    try:
        preferences_dict = payload.model_dump()
        result = get_cultural_recommendations(preferences_dict)
        return result
    except RuntimeError as exc:
        logger.error("Recommendation runtime error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during recommendation generation: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate recommendations. Please try again.",
        )


@app.get("/currency/resolve")
def resolve_currency(location: str = Query(..., min_length=2)) -> dict[str, str]:
    """Resolve a destination city or country name into its ISO currency code."""
    query = location.strip().lower()

    # Exact or substring lookup
    for key, data in LOCATION_TO_CURRENCY.items():
        if key in query:
            return data

    # Default fallback if unknown destination
    return {
        "country": location.strip().title(),
        "currency_code": "USD",
        "currency_symbol": "$",
    }


@app.get("/currency/rate")
def get_exchange_rate(
    base: str = Query(..., min_length=3, max_length=3),
    quote: str = Query(..., min_length=3, max_length=3),
) -> dict[str, Any]:
    """Retrieve live or cached exchange rates between base and quote currencies."""
    base_code = base.upper().strip()
    quote_code = quote.upper().strip()

    if base_code == quote_code:
        return {
            "base": base_code,
            "quote": quote_code,
            "rate": 1.0,
            "date": "live",
        }

    # Attempt live rate lookup from open public endpoint
    try:
        url = f"https://open.er-api.com/v6/latest/{base_code}"
        res = requests.get(url, timeout=(3, 5))
        if res.status_code == 200:
            data = res.json()
            rates = data.get("rates", {})
            if quote_code in rates:
                return {
                    "base": base_code,
                    "quote": quote_code,
                    "rate": float(rates[quote_code]),
                    "date": data.get("time_last_update_utc", "recently")[:16],
                }
    except Exception as exc:
        logger.warning("External exchange rate lookup failed (%s); using fallback matrix.", exc)

    # Fallback to local reference matrix
    if base_code in BASE_RATES_TO_USD and quote_code in BASE_RATES_TO_USD:
        usd_to_base = BASE_RATES_TO_USD[base_code]
        usd_to_quote = BASE_RATES_TO_USD[quote_code]
        cross_rate = usd_to_quote / usd_to_base

        return {
            "base": base_code,
            "quote": quote_code,
            "rate": round(cross_rate, 4),
            "date": "reference estimate",
        }

    raise HTTPException(
        status_code=400,
        detail=f"Unable to convert from {base_code} to {quote_code}.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)