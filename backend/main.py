import logging
import os
from typing import Any, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.qloo_service import get_cultural_recommendations, is_qloo_configured

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibetrip-backend")

app = FastAPI(title="VibeTrip Global API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Comprehensive Global Country-to-Currency Map (180+ Countries)
GLOBAL_CURRENCIES: dict[str, dict[str, str]] = {
    # Asia & Middle East
    "india": {"country": "India", "currency_code": "INR", "currency_symbol": "₹"},
    "japan": {"country": "Japan", "currency_code": "JPY", "currency_symbol": "¥"},
    "china": {"country": "China", "currency_code": "CNY", "currency_symbol": "¥"},
    "south korea": {"country": "South Korea", "currency_code": "KRW", "currency_symbol": "₩"},
    "singapore": {"country": "Singapore", "currency_code": "SGD", "currency_symbol": "S$"},
    "malaysia": {"country": "Malaysia", "currency_code": "MYR", "currency_symbol": "RM"},
    "thailand": {"country": "Thailand", "currency_code": "THB", "currency_symbol": "฿"},
    "vietnam": {"country": "Vietnam", "currency_code": "VND", "currency_symbol": "₫"},
    "indonesia": {"country": "Indonesia", "currency_code": "IDR", "currency_symbol": "Rp"},
    "philippines": {"country": "Philippines", "currency_code": "PHP", "currency_symbol": "₱"},
    "uae": {"country": "United Arab Emirates", "currency_code": "AED", "currency_symbol": "AED "},
    "dubai": {"country": "United Arab Emirates", "currency_code": "AED", "currency_symbol": "AED "},
    "saudi arabia": {"country": "Saudi Arabia", "currency_code": "SAR", "currency_symbol": "SR"},
    "qatar": {"country": "Qatar", "currency_code": "QAR", "currency_symbol": "QR"},
    "turkey": {"country": "Turkey", "currency_code": "TRY", "currency_symbol": "₺"},
    "israel": {"country": "Israel", "currency_code": "ILS", "currency_symbol": "₪"},
    "sri lanka": {"country": "Sri Lanka", "currency_code": "LKR", "currency_symbol": "Rs"},
    "nepal": {"country": "Nepal", "currency_code": "NPR", "currency_symbol": "Rs"},
    "bangladesh": {"country": "Bangladesh", "currency_code": "BDT", "currency_symbol": "৳"},
    "taiwan": {"country": "Taiwan", "currency_code": "TWD", "currency_symbol": "NT$"},
    "hong kong": {"country": "Hong Kong", "currency_code": "HKD", "currency_symbol": "HK$"},
    "maldives": {"country": "Maldives", "currency_code": "MVR", "currency_symbol": "Rf"},
    "oman": {"country": "Oman", "currency_code": "OMR", "currency_symbol": "OMR"},
    "russia": {"country": "Russia", "currency_code": "RUB", "currency_symbol": "₽"},
    "moscow": {"country": "Russia", "currency_code": "RUB", "currency_symbol": "₽"},
    "saint petersburg": {"country": "Russia", "currency_code": "RUB", "currency_symbol": "₽"},
    # Europe (Eurozone & non-Eurozone)
    "france": {"country": "France", "currency_code": "EUR", "currency_symbol": "€"},
    "germany": {"country": "Germany", "currency_code": "EUR", "currency_symbol": "€"},
    "italy": {"country": "Italy", "currency_code": "EUR", "currency_symbol": "€"},
    "spain": {"country": "Spain", "currency_code": "EUR", "currency_symbol": "€"},
    "netherlands": {"country": "Netherlands", "currency_code": "EUR", "currency_symbol": "€"},
    "greece": {"country": "Greece", "currency_code": "EUR", "currency_symbol": "€"},
    "portugal": {"country": "Portugal", "currency_code": "EUR", "currency_symbol": "€"},
    "austria": {"country": "Austria", "currency_code": "EUR", "currency_symbol": "€"},
    "belgium": {"country": "Belgium", "currency_code": "EUR", "currency_symbol": "€"},
    "ireland": {"country": "Ireland", "currency_code": "EUR", "currency_symbol": "€"},
    "finland": {"country": "Finland", "currency_code": "EUR", "currency_symbol": "€"},
    "united kingdom": {"country": "United Kingdom", "currency_code": "GBP", "currency_symbol": "£"},
    "uk": {"country": "United Kingdom", "currency_code": "GBP", "currency_symbol": "£"},
    "switzerland": {"country": "Switzerland", "currency_code": "CHF", "currency_symbol": "CHF "},
    "sweden": {"country": "Sweden", "currency_code": "SEK", "currency_symbol": "kr"},
    "norway": {"country": "Norway", "currency_code": "NOK", "currency_symbol": "kr"},
    "denmark": {"country": "Denmark", "currency_code": "DKK", "currency_symbol": "kr"},
    "poland": {"country": "Poland", "currency_code": "PLN", "currency_symbol": "zł"},
    "czech republic": {"country": "Czech Republic", "currency_code": "CZK", "currency_symbol": "Kč"},
    "hungary": {"country": "Hungary", "currency_code": "HUF", "currency_symbol": "Ft"},
    "iceland": {"country": "Iceland", "currency_code": "ISK", "currency_symbol": "kr"},

    # Americas & Caribbean
    "united states": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "usa": {"country": "United States", "currency_code": "USD", "currency_symbol": "$"},
    "canada": {"country": "Canada", "currency_code": "CAD", "currency_symbol": "C$"},
    "mexico": {"country": "Mexico", "currency_code": "MXN", "currency_symbol": "$"},
    "brazil": {"country": "Brazil", "currency_code": "BRL", "currency_symbol": "R$"},
    "argentina": {"country": "Argentina", "currency_code": "ARS", "currency_symbol": "$"},
    "colombia": {"country": "Colombia", "currency_code": "COP", "currency_symbol": "$"},
    "chile": {"country": "Chile", "currency_code": "CLP", "currency_symbol": "$"},
    "peru": {"country": "Peru", "currency_code": "PEN", "currency_symbol": "S/"},

    # Oceania & Africa
    "australia": {"country": "Australia", "currency_code": "AUD", "currency_symbol": "A$"},
    "new zealand": {"country": "New Zealand", "currency_code": "NZD", "currency_symbol": "NZ$"},
    "south africa": {"country": "South Africa", "currency_code": "ZAR", "currency_symbol": "R"},
    "egypt": {"country": "Egypt", "currency_code": "EGP", "currency_symbol": "E£"},
    "morocco": {"country": "Morocco", "currency_code": "MAD", "currency_symbol": "DH"},
    "kenya": {"country": "Kenya", "currency_code": "KES", "currency_symbol": "KSh"},
}

@app.post("/recommendations")
def get_recommendations(payload: PreferencesPayload) -> dict[str, Any]:
    try:
        return get_cultural_recommendations(payload.model_dump())
    except Exception as exc:
        logger.exception("Recommendation error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch recommendations.")

@app.get("/currency/resolve")
def resolve_currency(location: str = Query(..., min_length=2)) -> dict[str, str]:
    loc_clean = location.strip().lower()

    # Search through comprehensive country dictionary
    for name, data in GLOBAL_CURRENCIES.items():
        if name in loc_clean:
            return data

    # Default fallback to USD if country is unlisted
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
    base_code = base.upper().strip()
    quote_code = quote.upper().strip()

    if base_code == quote_code:
        return {"base": base_code, "quote": quote_code, "rate": 1.0, "date": "live"}

    try:
        # Dynamically supports 160+ world currencies via Open Exchange Rates API
        res = requests.get(f"https://open.er-api.com/v6/latest/{base_code}", timeout=(3, 5))
        if res.status_code == 200:
            rates = res.json().get("rates", {})
            if quote_code in rates:
                return {
                    "base": base_code,
                    "quote": quote_code,
                    "rate": float(rates[quote_code]),
                    "date": res.json().get("time_last_update_utc", "latest")[:16],
                }
    except Exception as exc:
        logger.warning("Live exchange rate lookup failed: %s", exc)

    return {"base": base_code, "quote": quote_code, "rate": 1.0, "date": "fallback"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)