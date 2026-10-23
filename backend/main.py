from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import date
import re
import os
from models.preferences import TravelPreferences
from services.qloo_service import (
    get_cultural_recommendations,
)

COUNTRY_CURRENCIES = {
    "IN": {"country": "India", "code": "INR", "name": "Indian rupee", "symbol": "₹"},
    "JP": {"country": "Japan", "code": "JPY", "name": "Japanese yen", "symbol": "¥"},
    "US": {"country": "United States", "code": "USD", "name": "United States dollar", "symbol": "$"},
    "GB": {"country": "United Kingdom", "code": "GBP", "name": "British pound", "symbol": "£"},
    "SG": {"country": "Singapore", "code": "SGD", "name": "Singapore dollar", "symbol": "$"},
    "MY": {"country": "Malaysia", "code": "MYR", "name": "Malaysian ringgit", "symbol": "RM"},
    "AE": {"country": "United Arab Emirates", "code": "AED", "name": "UAE dirham", "symbol": "د.إ"},
    "TH": {"country": "Thailand", "code": "THB", "name": "Thai baht", "symbol": "฿"},
    "KR": {"country": "South Korea", "code": "KRW", "name": "South Korean won", "symbol": "₩"},
    "AU": {"country": "Australia", "code": "AUD", "name": "Australian dollar", "symbol": "$"},
    "CA": {"country": "Canada", "code": "CAD", "name": "Canadian dollar", "symbol": "$"},
    "FR": {"country": "France", "code": "EUR", "name": "Euro", "symbol": "€"},
    "DE": {"country": "Germany", "code": "EUR", "name": "Euro", "symbol": "€"},
    "IT": {"country": "Italy", "code": "EUR", "name": "Euro", "symbol": "€"},
    "ES": {"country": "Spain", "code": "EUR", "name": "Euro", "symbol": "€"},
    "PT": {"country": "Portugal", "code": "EUR", "name": "Euro", "symbol": "€"},
    "NL": {"country": "Netherlands", "code": "EUR", "name": "Euro", "symbol": "€"},
    "CH": {"country": "Switzerland", "code": "CHF", "name": "Swiss franc", "symbol": "CHF"},
    "ID": {"country": "Indonesia", "code": "IDR", "name": "Indonesian rupiah", "symbol": "Rp"},
    "VN": {"country": "Vietnam", "code": "VND", "name": "Vietnamese dong", "symbol": "₫"},
    "LK": {"country": "Sri Lanka", "code": "LKR", "name": "Sri Lankan rupee", "symbol": "Rs"},
    "NP": {"country": "Nepal", "code": "NPR", "name": "Nepalese rupee", "symbol": "रु"},
    "BD": {"country": "Bangladesh", "code": "BDT", "name": "Bangladeshi taka", "symbol": "৳"},
    "CN": {"country": "China", "code": "CNY", "name": "Chinese yuan", "symbol": "¥"},
    "TR": {"country": "Türkiye", "code": "TRY", "name": "Turkish lira", "symbol": "₺"},
}

app = FastAPI(
    title="VibeTrip API",
    description="An AI-powered travel planner using cultural intelligence.",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
origin.strip()
for origin in os.getenv(
"FRONTEND_URLS",
"http://localhost:5173"
).split(",")
if origin.strip()
]

app.add_middleware(
CORSMiddleware,
allow_origins=ALLOWED_ORIGINS,
allow_credentials=True,
allow_methods=[""],
allow_headers=[""],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to VibeTrip!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "VibeTrip",
    }


@app.post("/preferences")
def create_preferences(preferences: TravelPreferences):
    return {
        "message": "Travel preferences received successfully!",
        "preferences": preferences.model_dump(),
    }


@app.post("/recommendations")
def create_recommendations(preferences: TravelPreferences):
    """
    Generate cultural place recommendations using Qloo.
    """
    try:
        result = get_cultural_recommendations(
            preferences.model_dump()
        )

        return {
            "message": result["message"],
            "source": result["source"],
            "preferences": preferences.model_dump(),
            "recommendations": result["recommendations"],
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve recommendations from Qloo. "
                "Please try again later."
            ),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

@app.get("/currency/resolve")
def resolve_currency(location: str):
    """Identify a location's country and resolve its currency."""

    location = location.strip()

    if len(location) < 2:
        raise HTTPException(status_code=422, detail="Enter a valid location.")

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": location,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": 1,
            },
            headers={"User-Agent": "VibeTrip/1.0 travel-planning-app"},
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()

    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail="Location lookup is temporarily unavailable.",
        ) from error

    if not results:
        raise HTTPException(
            status_code=404,
            detail="Location not found. Include the country name and try again.",
        )

    address = results[0].get("address", {})
    country_code = address.get("country_code", "").upper()
    country_name = address.get("country", "")

    currency = COUNTRY_CURRENCIES.get(country_code)

    if not currency:
        raise HTTPException(
            status_code=404,
            detail=f"Currency mapping is not available for {country_name or country_code}. Please select your currency manually.",
        )

    return {
        "location": location,
        "country": country_name or currency["country"],
        "country_code": country_code,
        "currency_code": currency["code"],
        "currency_name": currency["name"],
        "currency_symbol": currency["symbol"],
    }



@app.get("/currency/rate")
def get_currency_rate(base: str, quote: str):
    """
    Return the latest available reference exchange rate.
    Example: /currency/rate?base=INR&quote=JPY
    """
    base = base.strip().upper()
    quote = quote.strip().upper()

    if not re.fullmatch(r"[A-Z]{3}", base):
        raise HTTPException(
            status_code=422,
            detail="Base currency must be a three-letter currency code."
        )

    if not re.fullmatch(r"[A-Z]{3}", quote):
        raise HTTPException(
            status_code=422,
            detail="Target currency must be a three-letter currency code."
        )

    if base == quote:
        return {
            "base": base,
            "quote": quote,
            "rate": 1.0,
            "date": date.today().isoformat(),
            "same_currency": True,
        }

    try:
        response = requests.get(
            f"https://api.frankfurter.dev/v2/rate/{base}/{quote}",
            timeout=8,
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=422,
                detail=f"No reference exchange rate is available for {base} to {quote}."
            )

        response.raise_for_status()
        data = response.json()

    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail="Exchange rates are temporarily unavailable."
        ) from error

    return {
        "base": data["base"],
        "quote": data["quote"],
        "rate": data["rate"],
        "date": data["date"],
        "same_currency": False,
    }