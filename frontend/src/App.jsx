import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import RecommendationCard from "./components/RecommendationCard";
import TripMap from "./components/TripMap";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const STEPS = [
  { id: 1, key: "preferences", title: "Preferences" },
  { id: 2, key: "recommendations", title: "Select Places" },
  { id: 3, key: "itinerary", title: "Itinerary" },
  { id: 4, key: "budget", title: "Budget" },
];

const INITIAL_PREFERENCES = {
  starting_location: "",
  destination: "",
  favorite_movies: "",
  favorite_artists: "",
  favorite_cuisines: "",
  interests: [],
  budget: 100000,
  budget_currency: "INR",
  duration_days: 3,
  travel_style: [],
  additional_preferences: "",
};

const INTEREST_OPTIONS = [
  "Art", "Architecture", "History", "Nature", "Adventure",
  "Shopping", "Food", "Music", "Movies", "Photography",
  "Nightlife", "Local Culture",
];

const TRAVEL_STYLE_OPTIONS = [
  "Budget", "Luxury", "Adventure", "Relaxation",
  "Cultural", "Food-focused", "Solo Travel", "Family",
];

const CURRENCY_OPTIONS = [
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
  { code: "SGD", label: "SGD — Singapore Dollar", symbol: "S$" },
  { code: "MYR", label: "MYR — Malaysian Ringgit", symbol: "RM" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "AED " },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "C$" },
];

const BUDGET_CATEGORIES = [
  { id: "intercity", label: "Intercity transport", description: "Flights, trains, buses, and return travel" },
  { id: "accommodation", label: "Accommodation", description: "Hotels, hostels, or other stays" },
  { id: "food", label: "Food and drinks", description: "Meals, snacks, and beverages" },
  { id: "localTransport", label: "Local transport", description: "Metro, buses, taxis, and local travel" },
  { id: "attractions", label: "Attractions and activities", description: "Entry tickets, tours, and experiences" },
  { id: "shopping", label: "Shopping and miscellaneous", description: "Shopping, SIM cards, and other expenses" },
];

const DAILY_REFERENCE_COSTS = {
  INR: {
    budget: { accommodation: 1800, food: 900, localTransport: 500, attractions: 700, shopping: 400 },
    moderate: { accommodation: 4500, food: 1800, localTransport: 900, attractions: 1500, shopping: 800 },
    comfortable: { accommodation: 9000, food: 3500, localTransport: 2000, attractions: 3000, shopping: 1800 },
  },
  USD: {
    budget: { accommodation: 30, food: 18, localTransport: 8, attractions: 12, shopping: 8 },
    moderate: { accommodation: 80, food: 35, localTransport: 18, attractions: 30, shopping: 18 },
    comfortable: { accommodation: 180, food: 70, localTransport: 40, attractions: 60, shopping: 40 },
  },
  JPY: {
    budget: { accommodation: 3500, food: 2000, localTransport: 800, attractions: 1200, shopping: 1000 },
    moderate: { accommodation: 9000, food: 3500, localTransport: 1800, attractions: 3000, shopping: 2000 },
    comfortable: { accommodation: 22000, food: 7000, localTransport: 3500, attractions: 7000, shopping: 5000 },
  },
  SGD: {
    budget: { accommodation: 35, food: 18, localTransport: 8, attractions: 12, shopping: 8 },
    moderate: { accommodation: 100, food: 40, localTransport: 18, attractions: 35, shopping: 20 },
    comfortable: { accommodation: 250, food: 85, localTransport: 35, attractions: 80, shopping: 50 },
  },
  MYR: {
    budget: { accommodation: 60, food: 35, localTransport: 15, attractions: 25, shopping: 15 },
    moderate: { accommodation: 160, food: 75, localTransport: 35, attractions: 60, shopping: 35 },
    comfortable: { accommodation: 400, food: 150, localTransport: 70, attractions: 140, shopping: 80 },
  },
  AED: {
    budget: { accommodation: 100, food: 55, localTransport: 25, attractions: 40, shopping: 25 },
    moderate: { accommodation: 300, food: 120, localTransport: 55, attractions: 100, shopping: 60 },
    comfortable: { accommodation: 750, food: 250, localTransport: 120, attractions: 250, shopping: 150 },
  },
  EUR: {
    budget: { accommodation: 35, food: 22, localTransport: 10, attractions: 15, shopping: 10 },
    moderate: { accommodation: 100, food: 45, localTransport: 22, attractions: 40, shopping: 25 },
    comfortable: { accommodation: 250, food: 100, localTransport: 50, attractions: 100, shopping: 60 },
  },
  GBP: {
    budget: { accommodation: 30, food: 20, localTransport: 10, attractions: 15, shopping: 10 },
    moderate: { accommodation: 100, food: 45, localTransport: 25, attractions: 40, shopping: 25 },
    comfortable: { accommodation: 250, food: 100, localTransport: 55, attractions: 100, shopping: 60 },
  },
  AUD: {
    budget: { accommodation: 45, food: 25, localTransport: 12, attractions: 18, shopping: 12 },
    moderate: { accommodation: 130, food: 50, localTransport: 25, attractions: 45, shopping: 30 },
    comfortable: { accommodation: 300, food: 110, localTransport: 55, attractions: 110, shopping: 70 },
  },
  CAD: {
    budget: { accommodation: 40, food: 25, localTransport: 12, attractions: 18, shopping: 12 },
    moderate: { accommodation: 120, food: 50, localTransport: 25, attractions: 45, shopping: 30 },
    comfortable: { accommodation: 280, food: 110, localTransport: 55, attractions: 100, shopping: 70 },
  },
};

function getCurrencySymbol(currencyCode) {
  return CURRENCY_OPTIONS.find((c) => c.code === currencyCode)?.symbol || `${currencyCode} `;
}

function formatMoney(amount, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${symbol}0`;
  return `${symbol}${Math.round(value).toLocaleString("en-IN")}`;
}

function splitCommaSeparated(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoordinates(place) {
  const latitude = Number(
    place?.latitude ?? place?.lat ?? place?.coordinates?.latitude ?? place?.coordinates?.lat,
  );
  const longitude = Number(
    place?.longitude ?? place?.lon ?? place?.lng ?? place?.coordinates?.longitude ?? place?.coordinates?.lon ?? place?.coordinates?.lng,
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

function hasCoordinates(place) {
  return getCoordinates(place) !== null;
}

function orderByProximity(places) {
  const remaining = [...places];
  const ordered = [];
  const firstIndex = remaining.findIndex(hasCoordinates);

  if (firstIndex === -1) return remaining;

  let current = remaining.splice(firstIndex, 1)[0];
  ordered.push(current);

  while (remaining.length > 0) {
    const currentCoordinates = getCoordinates(current);
    if (!currentCoordinates) {
      ordered.push(...remaining);
      break;
    }

    let nearestIndex = -1;
    let nearestDistance = Infinity;

    remaining.forEach((place, index) => {
      const coordinates = getCoordinates(place);
      if (!coordinates) return;

      const distance = getDistanceKm(
        currentCoordinates.latitude,
        currentCoordinates.longitude,
        coordinates.latitude,
        coordinates.longitude,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex === -1) {
      ordered.push(...remaining);
      break;
    }

    current = remaining.splice(nearestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered;
}

function createGeographicItinerary(places, durationDays) {
  const orderedPlaces = orderByProximity(places);
  const days = Math.max(1, Number(durationDays) || 1);
  const itinerary = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    places: [],
  }));

  if (orderedPlaces.length === 0) return itinerary;

  const placesPerDay = Math.ceil(orderedPlaces.length / days);
  orderedPlaces.forEach((place, index) => {
    const dayIndex = Math.min(Math.floor(index / placesPerDay), days - 1);
    itinerary[dayIndex].places.push(place);
  });

  return itinerary;
}

function getPlaceId(place) {
  return (
    place?.entity_id ||
    place?.id ||
    place?.place_id ||
    `${place?.name || "place"}-${place?.latitude || ""}-${place?.longitude || ""}`
  );
}

function getDestinationTier(destination, travelStyle = []) {
  const text = `${destination || ""} ${(travelStyle || []).join(" ")}`.toLowerCase();
  if (/\bluxury\b|\bcomfortable\b/.test(text)) return "comfortable";
  if (/\bbudget\b|\bbackpack/.test(text)) return "budget";
  return "moderate";
}

function getDailyReferenceCosts(currency, tier) {
  const costs = DAILY_REFERENCE_COSTS[currency] || DAILY_REFERENCE_COSTS.INR;
  return costs[tier] || costs.moderate;
}

function createInitialBudget(preferences) {
  const currency = preferences.budget_currency || "INR";
  const tier = getDestinationTier(preferences.destination, preferences.travel_style);
  const dailyCosts = getDailyReferenceCosts(currency, tier);
  const duration = Math.max(1, Number(preferences.duration_days) || 1);

  return {
    intercity: "",
    accommodation: String(dailyCosts.accommodation * duration),
    food: String(dailyCosts.food * duration),
    localTransport: String(dailyCosts.localTransport * duration),
    attractions: String(dailyCosts.attractions * duration),
    shopping: String(dailyCosts.shopping * duration),
  };
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [itineraryGenerated, setItineraryGenerated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultMode, setResultMode] = useState("");

  const [budgetItems, setBudgetItems] = useState(() => createInitialBudget(INITIAL_PREFERENCES));
  const [emergencyPercent, setEmergencyPercent] = useState(10);
  const [prepaidExpenses, setPrepaidExpenses] = useState("");
  const [includeIntercityTransport, setIncludeIntercityTransport] = useState(true);

  const [destinationCurrency, setDestinationCurrency] = useState(null);
  const [currencyLookupStatus, setCurrencyLookupStatus] = useState("idle");
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  const [exchangeRateStatus, setExchangeRateStatus] = useState("idle");
  const [currencyConversionError, setCurrencyConversionError] = useState("");

  const [savedTrips, setSavedTrips] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vibetrip-saved-trips") || "[]");
    } catch {
      return [];
    }
  });

  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("vibetrip-saved-trips", JSON.stringify(savedTrips));
  }, [savedTrips]);

  const currency = preferences.budget_currency || "INR";

  useEffect(() => {
    const destination = preferences.destination.trim();
    if (destination.length < 2) {
      setDestinationCurrency(null);
      setCurrencyLookupStatus("idle");
      setExchangeRateInfo(null);
      setExchangeRateStatus("idle");
      setCurrencyConversionError("");
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setCurrencyLookupStatus("loading");
      setCurrencyConversionError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/currency/resolve?location=${encodeURIComponent(destination)}`,
          { signal: controller.signal },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not identify the destination currency.");
        }

        setDestinationCurrency(data);
        setCurrencyLookupStatus("success");
      } catch (err) {
        if (err.name === "AbortError") return;
        setDestinationCurrency(null);
        setCurrencyLookupStatus("error");
        setExchangeRateInfo(null);
        setCurrencyConversionError(err.message || "Destination currency lookup failed.");
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [preferences.destination]);

  useEffect(() => {
    if (!destinationCurrency?.currency_code) return undefined;

    const quoteCurrency = destinationCurrency.currency_code;
    const controller = new AbortController();

    async function loadExchangeRate() {
      setExchangeRateStatus("loading");
      setCurrencyConversionError("");

      try {
        const query = new URLSearchParams({ base: currency, quote: quoteCurrency });
        const response = await fetch(`${API_BASE_URL}/currency/rate?${query.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not retrieve the exchange rate.");
        }

        setExchangeRateInfo(data);
        setExchangeRateStatus("success");
      } catch (err) {
        if (err.name === "AbortError") return;
        setExchangeRateInfo(null);
        setExchangeRateStatus("error");
        setCurrencyConversionError(err.message || "Exchange-rate lookup failed.");
      }
    }

    loadExchangeRate();
    return () => controller.abort();
  }, [currency, destinationCurrency?.currency_code]);

  const budgetSummary = useMemo(() => {
    const totalBudget = Math.max(0, Number(preferences.budget) || 0);

    const costs = Object.fromEntries(
      BUDGET_CATEGORIES.map((category) => {
        const rawValue = budgetItems[category.id];
        return [
          category.id,
          rawValue === "" ? null : Math.max(0, Number(rawValue) || 0),
        ];
      }),
    );

    const missingIntercity = includeIntercityTransport && costs.intercity === null;
    const missingCategories = BUDGET_CATEGORIES.filter(
      (category) => costs[category.id] === null && category.id !== "intercity",
    ).map((category) => category.label);

    const baseCost = Object.values(costs).reduce((total, amount) => total + (amount ?? 0), 0);
    const emergencyReserve = Math.ceil((baseCost * emergencyPercent) / 100);
    const prepaid = Math.max(0, Number(prepaidExpenses) || 0);
    const estimatedTotal = baseCost + emergencyReserve;
    const complete = !missingIntercity && missingCategories.length === 0;
    const remainingBudget = totalBudget - estimatedTotal;

    let status = "incomplete";
    let statusLabel = "Complete your estimate";
    let statusMessage = "Enter your transport and expense estimates to check affordability.";

    if (complete && remainingBudget < 0) {
      status = "over";
      statusLabel = "Over budget";
      statusMessage = "Estimated expenses exceed your available budget.";
    } else if (complete && remainingBudget >= 0) {
      status = "within";
      statusLabel = "Within budget";
      statusMessage = "Your trip plan fits comfortably within your budget.";
    }

    return {
      totalBudget,
      costs,
      baseCost,
      emergencyReserve,
      estimatedTotal,
      remainingBudget,
      prepaid,
      complete,
      missingIntercity,
      missingCategories,
      status,
      statusLabel,
      statusMessage,
    };
  }, [preferences.budget, budgetItems, emergencyPercent, prepaidExpenses, includeIntercityTransport]);

  function updatePreference(name, value) {
    setPreferences((prev) => ({ ...prev, [name]: value }));
  }

  function toggleArrayPreference(name, value) {
    setPreferences((prev) => {
      const current = prev[name] || [];
      return {
        ...prev,
        [name]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  }

  function handleCurrencyChange(newCurrency) {
    const oldCurrency = preferences.budget_currency || "INR";
    const tier = getDestinationTier(preferences.destination, preferences.travel_style);
    const oldTier = (DAILY_REFERENCE_COSTS[oldCurrency] || DAILY_REFERENCE_COSTS.INR)[tier];
    const newTier = (DAILY_REFERENCE_COSTS[newCurrency] || DAILY_REFERENCE_COSTS.INR)[tier];
    const duration = Math.max(1, Number(preferences.duration_days) || 1);

    setPreferences((prev) => ({ ...prev, budget_currency: newCurrency }));

    setBudgetItems((prev) => {
      const converted = { ...prev };
      ["accommodation", "food", "localTransport", "attractions", "shopping"].forEach((key) => {
        const val = Number(prev[key]);
        if (prev[key] !== "" && Number.isFinite(val) && oldTier[key] > 0) {
          const ratio = newTier[key] / oldTier[key];
          converted[key] = String(Math.round(val * ratio));
        } else {
          converted[key] = String(newTier[key] * duration);
        }
      });
      return converted;
    });
  }

  function updateBudgetItem(category, value) {
    if (value !== "" && Number(value) < 0) return;
    setBudgetItems((prev) => ({ ...prev, [category]: value }));
  }

  function resetBudgetEstimate() {
    setBudgetItems(createInitialBudget(preferences));
    setEmergencyPercent(10);
    setPrepaidExpenses("");
    setIncludeIntercityTransport(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResultMessage("");
    setRecommendations([]);
    setSelectedRecommendations([]);
    setItinerary([]);
    setItineraryGenerated(false);
    setLoading(true);

    try {
      const payload = {
        ...preferences,
        favorite_movies: splitCommaSeparated(preferences.favorite_movies),
        favorite_artists: splitCommaSeparated(preferences.favorite_artists),
        favorite_cuisines: splitCommaSeparated(preferences.favorite_cuisines),
        budget: Number(preferences.budget),
        duration_days: Number(preferences.duration_days),
        budget_currency: preferences.budget_currency,
      };

      const response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || `Request failed (${response.status})`);
      }

      const results = data.recommendations || data.places || data.results || [];
      setRecommendations(results);
      setResultMode(data.mode || data.source || "location");

      if (results.length === 0) {
        setError("No places matched your criteria. Try adjusting your preferences.");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setCurrentStep(2);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to retrieve places.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRecommendation(place) {
    const targetId = getPlaceId(place);
    setSelectedRecommendations((prev) => {
      const exists = prev.some((item) => getPlaceId(item) === targetId);
      return exists ? prev.filter((item) => getPlaceId(item) !== targetId) : [...prev, place];
    });
    setItineraryGenerated(false);
  }

  function isRecommendationSelected(place) {
    return selectedRecommendations.some((item) => getPlaceId(item) === getPlaceId(place));
  }

  function handleConfirmPlaces() {
    if (selectedRecommendations.length === 0) {
      setError("Please select at least one place before proceeding.");
      return;
    }
    const newItinerary = createGeographicItinerary(selectedRecommendations, preferences.duration_days);
    setItinerary(newItinerary);
    setItineraryGenerated(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentStep(3);
  }

  function saveCurrentTrip() {
    if (!preferences.destination.trim()) {
      setError("Enter a destination before saving this trip.");
      return;
    }

    const trip = {
      id: `${Date.now()}`,
      destination: preferences.destination,
      starting_location: preferences.starting_location,
      duration_days: Number(preferences.duration_days),
      budget: Number(preferences.budget),
      budget_currency: currency,
      saved_at: new Date().toISOString(),
      places: selectedRecommendations,
      itinerary,
      budgetItems,
    };

    setSavedTrips((prev) => [trip, ...prev]);
    setError("");
    setResultMessage("Trip saved to your local storage!");
  }

  function loadTrip(trip) {
    setPreferences((prev) => ({
      ...prev,
      starting_location: trip.starting_location || "",
      destination: trip.destination || "",
      duration_days: trip.duration_days || 1,
      budget: trip.budget || 0,
      budget_currency: trip.budget_currency || "INR",
    }));
    setSelectedRecommendations(trip.places || []);
    setItinerary(trip.itinerary || []);
    setItineraryGenerated(Boolean(trip.itinerary?.length));
    if (trip.budgetItems) setBudgetItems(trip.budgetItems);
    setShowSavedModal(false);
    setCurrentStep(3);
  }

  function deleteSavedTrip(tripId) {
    setSavedTrips((prev) => prev.filter((trip) => trip.id !== tripId));
  }

  function getGoogleMapsLink(place) {
    const coordinates = getCoordinates(place);
    if (coordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
    }
    const query = encodeURIComponent(`${place.name || ""} ${place.address || ""} ${preferences.destination}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function openFullRoute() {
    const places = orderByProximity(selectedRecommendations);
    if (places.length === 0) {
      setError("Select places before generating a route.");
      return;
    }

    const waypoints = places
      .map((place) => {
        const coords = getCoordinates(place);
        return coords ? `${coords.latitude},${coords.longitude}` : place.name || "";
      })
      .filter(Boolean);

    const origin = encodeURIComponent(waypoints[0]);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1]);
    const waypointList = waypoints.slice(1, -1).map(encodeURIComponent).join("%7C");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypointList) url += `&waypoints=${waypointList}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="app-container">
      {/* Brand Header & Stepper */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">✈️</span>
          <div>
            <h1>VibeTrip</h1>
            <p>Don't just travel. Travel your vibe.</p>
          </div>
        </div>

        <div className="step-indicator">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`step-item ${currentStep === step.id ? "active" : ""} ${currentStep > step.id ? "completed" : ""}`}
            >
              <div className="step-circle">{currentStep > step.id ? "✓" : step.id}</div>
              <span className="step-label">{step.title}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowSavedModal(true)}
          style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
        >
          Saved Trips ({savedTrips.length})
        </button>
      </header>

      {/* Global Alerts */}
      {(error || resultMessage) && (
        <div className={error ? "alert alert-error" : "alert alert-success"} role="status">
          <span>{error || resultMessage}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setResultMessage("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ================= STEP 1: PREFERENCES ================= */}
      {currentStep === 1 && (
        <section className="panel step-panel">
          <div className="section-heading">
            <span className="eyebrow">STEP 1 OF 4</span>
            <h2>Tell Us About Your Journey</h2>
            <p>Set your destination, budget, and cultural tastes.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field">
                <span>Starting location *</span>
                <input
                  type="text"
                  value={preferences.starting_location}
                  onChange={(e) => updatePreference("starting_location", e.target.value)}
                  placeholder="e.g. Chennai, India"
                  required
                  minLength={2}
                />
              </label>

              <label className="form-field">
                <span>Destination *</span>
                <input
                  type="text"
                  value={preferences.destination}
                  onChange={(e) => updatePreference("destination", e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  required
                />
              </label>

              <label className="form-field">
                <span>Total trip budget *</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={preferences.budget}
                  onChange={(e) => updatePreference("budget", e.target.value)}
                  required
                />
              </label>

              <label className="form-field">
                <span>Budget currency *</span>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Duration (days) *</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={preferences.duration_days}
                  onChange={(e) => updatePreference("duration_days", e.target.value)}
                  required
                />
              </label>
            </div>

            {/* Currency Auto-Conversion Card */}
            <div className="currency-conversion-card" role="status">
              <h3>💱 Destination Currency Conversion</h3>
              {currencyLookupStatus === "idle" && (
                <p>Enter a destination to detect local currency and live estimation.</p>
              )}
              {currencyLookupStatus === "loading" && (
                <p>Detecting destination currency…</p>
              )}
              {currencyLookupStatus === "success" && destinationCurrency && (
                <>
                  <p>
                    Destination: <strong>{destinationCurrency.country}</strong> · Local Currency:{" "}
                    <strong>{destinationCurrency.currency_code} ({destinationCurrency.currency_symbol})</strong>
                  </p>
                  {exchangeRateStatus === "success" && exchangeRateInfo && (
                    <p style={{ fontSize: "1.08rem", marginTop: "4px" }}>
                      <strong>{formatMoney(preferences.budget || 0, currency)}</strong> ≈{" "}
                      <strong>
                        {formatMoney((Number(preferences.budget) || 0) * exchangeRateInfo.rate, destinationCurrency.currency_code)}
                      </strong>
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="form-section">
              <h3>🎬 Favorite Movies</h3>
              <label className="form-field">
                <input
                  type="text"
                  value={preferences.favorite_movies}
                  onChange={(e) => updatePreference("favorite_movies", e.target.value)}
                  placeholder="e.g. Your Name, Spirited Away, Amélie"
                />
              </label>
            </div>

            <div className="form-section">
              <h3>🎵 Favorite Artists & Musicians</h3>
              <label className="form-field">
                <input
                  type="text"
                  value={preferences.favorite_artists}
                  onChange={(e) => updatePreference("favorite_artists", e.target.value)}
                  placeholder="e.g. Taylor Swift, A. R. Rahman, Daft Punk"
                />
              </label>
            </div>

            <div className="form-section">
              <h3>🍜 Favorite Cuisines</h3>
              <label className="form-field">
                <input
                  type="text"
                  value={preferences.favorite_cuisines}
                  onChange={(e) => updatePreference("favorite_cuisines", e.target.value)}
                  placeholder="e.g. Japanese, Italian, South Indian"
                />
              </label>
            </div>

            <div className="form-section">
              <h3>✨ What interests you?</h3>
              <div className="choice-grid">
                {INTEREST_OPTIONS.map((option) => (
                  <label key={option} className="choice-chip">
                    <input
                      type="checkbox"
                      checked={preferences.interests.includes(option)}
                      onChange={() => toggleArrayPreference("interests", option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>🧭 Travel Style</h3>
              <div className="choice-grid">
                {TRAVEL_STYLE_OPTIONS.map((option) => (
                  <label key={option} className="choice-chip">
                    <input
                      type="checkbox"
                      checked={preferences.travel_style.includes(option)}
                      onChange={() => toggleArrayPreference("travel_style", option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label className="form-field">
                <span>Additional Preferences</span>
                <textarea
                  value={preferences.additional_preferences}
                  onChange={(e) => updatePreference("additional_preferences", e.target.value)}
                  placeholder="e.g. Prefer quiet spots, local hidden gems, walkable routes."
                  rows={3}
                  maxLength={1000}
                />
              </label>
            </div>

            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Finding recommendations..." : "Find My Vibe Spots →"}
            </button>
          </form>
        </section>
      )}

      {/* ================= STEP 2: RECOMMENDATIONS ================= */}
      {currentStep === 2 && (
        <section className="panel step-panel">
          <div className="section-heading">
            <span className="eyebrow">STEP 2 OF 4</span>
            <h2>Select Places for Your Trip</h2>
            <p>Pick the recommendations that suit your itinerary ({selectedRecommendations.length} selected).</p>
          </div>

          {resultMode && <p className="result-source">Engine source: {resultMode}</p>}

          <div className="recommendations-grid">
            {recommendations.map((place) => {
              const placeId = getPlaceId(place);
              const selected = isRecommendationSelected(place);

              return (
                <div key={placeId} className={`recommendation-wrapper ${selected ? "selected" : ""}`}>
                  <RecommendationCard
                    place={place}
                    isSelected={selected}
                    onSelect={() => toggleRecommendation(place)}
                  />
                </div>
              );
            })}
          </div>

          <div className="step-navigation-bar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setCurrentStep(1);
              }}
            >
              ← Back to Preferences
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleConfirmPlaces}
              disabled={selectedRecommendations.length === 0}
            >
              Build Itinerary ({selectedRecommendations.length} Selected) →
            </button>
          </div>
        </section>
      )}

      {/* ================= STEP 3: ITINERARY PLANNER ================= */}
      {currentStep === 3 && (
        <section className="panel step-panel">
          <div className="section-heading">
            <span className="eyebrow">STEP 3 OF 4</span>
            <h2>Geographic Itinerary & Route</h2>
            <p>Places are grouped by proximity to minimise travel fatigue across your {preferences.duration_days} days.</p>
          </div>

          <div className="trip-actions">
            <button type="button" className="secondary-button" onClick={openFullRoute}>
              Open Full Route in Google Maps ↗
            </button>
          </div>

          <div className="trip-map-container">
            <TripMap places={selectedRecommendations} recommendations={selectedRecommendations} />
          </div>

          <div className="itinerary-days">
            {itinerary.map((day) => (
              <article className="itinerary-day" key={day.day}>
                <div className="itinerary-day-heading">
                  <span>DAY {day.day}</span>
                  <h4>{day.places.length} {day.places.length === 1 ? "place" : "places"}</h4>
                </div>
                {day.places.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No places assigned. Consider adding more spots.
                  </p>
                ) : (
                  <ol className="itinerary-place-list">
                    {day.places.map((place) => (
                      <li key={getPlaceId(place)}>
                        <div>
                          <strong>{place.name}</strong>
                          <p>{place.address || place.city || "Explore location"}</p>
                        </div>
                        <a href={getGoogleMapsLink(place)} target="_blank" rel="noreferrer">
                          Directions ↗
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>

          <div className="step-navigation-bar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setCurrentStep(2);
              }}
            >
              ← Edit Selected Places
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setCurrentStep(4);
              }}
            >
              Configure Budget Planner →
            </button>
          </div>
        </section>
      )}

      {/* ================= STEP 4: BUDGET PLANNER ================= */}
      {currentStep === 4 && (
        <section className="panel step-panel">
          <div className="section-heading">
            <span className="eyebrow">STEP 4 OF 4</span>
            <h2>Trip Budget Breakdown 💰</h2>
            <p>Review and balance your estimates with your overall financial target.</p>
          </div>

          <div className="budget-overview">
            <article className="budget-stat">
              <span>Total Available Budget</span>
              <strong>{formatMoney(budgetSummary.totalBudget, currency)}</strong>
            </article>
            <article className="budget-stat">
              <span>Estimated Cost</span>
              <strong>{formatMoney(budgetSummary.baseCost, currency)}</strong>
            </article>
            <article className="budget-stat">
              <span>Emergency Reserve ({emergencyPercent}%)</span>
              <strong>{formatMoney(budgetSummary.emergencyReserve, currency)}</strong>
            </article>
          </div>

          <div className={`budget-status budget-status-${budgetSummary.status}`}>
            <strong>{budgetSummary.statusLabel}</strong>
            <p>{budgetSummary.statusMessage}</p>
            {budgetSummary.complete && (
              <p style={{ marginTop: "0.5rem" }}>
                {budgetSummary.remainingBudget < 0 ? (
                  <>Shortfall: <strong>{formatMoney(Math.abs(budgetSummary.remainingBudget), currency)}</strong></>
                ) : (
                  <>Surplus remaining: <strong>{formatMoney(budgetSummary.remainingBudget, currency)}</strong></>
                )}
              </p>
            )}
          </div>

          <div className="budget-editor">
            <div className="budget-editor-heading">
              <h3>Expense Breakdown</h3>
              <button type="button" className="secondary-button" onClick={resetBudgetEstimate}>
                Reset to Standards
              </button>
            </div>

            <div className="budget-category-list">
              {BUDGET_CATEGORIES.map((category) => {
                const isIntercity = category.id === "intercity";
                return (
                  <article className="budget-category" key={category.id}>
                    <div className="budget-category-description">
                      <h4>{category.label}</h4>
                      <p>{category.description}</p>
                      {isIntercity && (
                        <label className="checkbox-inline" style={{ marginTop: "0.4rem", display: "inline-flex", gap: "0.4rem" }}>
                          <input
                            type="checkbox"
                            checked={includeIntercityTransport}
                            onChange={(e) => {
                              setIncludeIntercityTransport(e.target.checked);
                              if (e.target.checked) updateBudgetItem("intercity", "");
                            }}
                          />
                          <span style={{ fontSize: "0.8rem" }}>Include intercity transport</span>
                        </label>
                      )}
                    </div>

                    <label className="budget-input-label">
                      <span>{currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={budgetItems[category.id]}
                        onChange={(e) => updateBudgetItem(category.id, e.target.value)}
                        placeholder="0"
                        disabled={isIntercity && !includeIntercityTransport}
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="budget-control">
              <label htmlFor="emergency-percent">
                Emergency Contingency Reserve: {emergencyPercent}%
              </label>
              <input
                id="emergency-percent"
                type="range"
                min="0"
                max="30"
                step="5"
                value={emergencyPercent}
                onChange={(e) => setEmergencyPercent(Number(e.target.value))}
              />
            </div>

            <div className="budget-total-card">
              <div>
                <span>Estimated Total (Expenses + Reserve)</span>
                <strong>{formatMoney(budgetSummary.estimatedTotal, currency)}</strong>
              </div>
              <div>
                <span>Remaining Net Budget</span>
                <strong>{formatMoney(budgetSummary.remainingBudget, currency)}</strong>
              </div>
            </div>
          </div>

          <div className="step-navigation-bar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setCurrentStep(3);
              }}
            >
              ← Back to Itinerary
            </button>
            <button type="button" className="primary-button" onClick={saveCurrentTrip}>
              Save Trip Plan 💾
            </button>
          </div>
        </section>
      )}

      {/* Saved Trips Drawer / Modal */}
      {showSavedModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 100,
          padding: "1rem"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Saved Trips</h3>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {savedTrips.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No saved trips found.</p>
            ) : (
              savedTrips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    padding: "0.85rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px" }}>{trip.destination}</h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {trip.duration_days} days · {trip.places?.length || 0} spots
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => loadTrip(trip)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      onClick={() => deleteSavedTrip(trip.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-brand">
          <span>✈️</span>
          <strong>VibeTrip</strong>
        </div>
        <p>Discover your culture. Explore your world. Travel your vibe.</p>
      </footer>
    </main>
  );
}