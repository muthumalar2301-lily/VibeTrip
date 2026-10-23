import { useEffect, useMemo, useState } from "react";
import "./App.css";
import RecommendationCard from "./components/RecommendationCard";
import TripMap from "./components/TripMap";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const initialPreferences = {
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
  "Art",
  "Architecture",
  "History",
  "Nature",
  "Adventure",
  "Shopping",
  "Food",
  "Music",
  "Movies",
  "Photography",
  "Nightlife",
  "Local Culture",
];

const TRAVEL_STYLE_OPTIONS = [
  "Budget",
  "Luxury",
  "Adventure",
  "Relaxation",
  "Cultural",
  "Food-focused",
  "Solo Travel",
  "Family",
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
  {
    id: "intercity",
    label: "Intercity transport",
    description: "Flights, trains, buses, and return travel",
  },
  {
    id: "accommodation",
    label: "Accommodation",
    description: "Hotels, hostels, or other stays",
  },
  {
    id: "food",
    label: "Food and drinks",
    description: "Meals, snacks, and beverages",
  },
  {
    id: "localTransport",
    label: "Local transport",
    description: "Metro, buses, taxis, and local travel",
  },
  {
    id: "attractions",
    label: "Attractions and activities",
    description: "Entry tickets, tours, and experiences",
  },
  {
    id: "shopping",
    label: "Shopping and miscellaneous",
    description: "Shopping, SIM cards, and other expenses",
  },
];

const DAILY_REFERENCE_COSTS = {
  // Illustrative planning assumptions, not live prices.
  // All amounts are expressed in the user's selected budget currency.
  INR: {
    budget: {
      accommodation: 1800,
      food: 900,
      localTransport: 500,
      attractions: 700,
      shopping: 400,
    },
    moderate: {
      accommodation: 4500,
      food: 1800,
      localTransport: 900,
      attractions: 1500,
      shopping: 800,
    },
    comfortable: {
      accommodation: 9000,
      food: 3500,
      localTransport: 2000,
      attractions: 3000,
      shopping: 1800,
    },
  },
  USD: {
    budget: {
      accommodation: 30,
      food: 18,
      localTransport: 8,
      attractions: 12,
      shopping: 8,
    },
    moderate: {
      accommodation: 80,
      food: 35,
      localTransport: 18,
      attractions: 30,
      shopping: 18,
    },
    comfortable: {
      accommodation: 180,
      food: 70,
      localTransport: 40,
      attractions: 60,
      shopping: 40,
    },
  },
  JPY: {
    budget: {
      accommodation: 3500,
      food: 2000,
      localTransport: 800,
      attractions: 1200,
      shopping: 1000,
    },
    moderate: {
      accommodation: 9000,
      food: 3500,
      localTransport: 1800,
      attractions: 3000,
      shopping: 2000,
    },
    comfortable: {
      accommodation: 22000,
      food: 7000,
      localTransport: 3500,
      attractions: 7000,
      shopping: 5000,
    },
  },
  SGD: {
    budget: {
      accommodation: 35,
      food: 18,
      localTransport: 8,
      attractions: 12,
      shopping: 8,
    },
    moderate: {
      accommodation: 100,
      food: 40,
      localTransport: 18,
      attractions: 35,
      shopping: 20,
    },
    comfortable: {
      accommodation: 250,
      food: 85,
      localTransport: 35,
      attractions: 80,
      shopping: 50,
    },
  },
  MYR: {
    budget: {
      accommodation: 60,
      food: 35,
      localTransport: 15,
      attractions: 25,
      shopping: 15,
    },
    moderate: {
      accommodation: 160,
      food: 75,
      localTransport: 35,
      attractions: 60,
      shopping: 35,
    },
    comfortable: {
      accommodation: 400,
      food: 150,
      localTransport: 70,
      attractions: 140,
      shopping: 80,
    },
  },
  AED: {
    budget: {
      accommodation: 100,
      food: 55,
      localTransport: 25,
      attractions: 40,
      shopping: 25,
    },
    moderate: {
      accommodation: 300,
      food: 120,
      localTransport: 55,
      attractions: 100,
      shopping: 60,
    },
    comfortable: {
      accommodation: 750,
      food: 250,
      localTransport: 120,
      attractions: 250,
      shopping: 150,
    },
  },
  EUR: {
    budget: {
      accommodation: 35,
      food: 22,
      localTransport: 10,
      attractions: 15,
      shopping: 10,
    },
    moderate: {
      accommodation: 100,
      food: 45,
      localTransport: 22,
      attractions: 40,
      shopping: 25,
    },
    comfortable: {
      accommodation: 250,
      food: 100,
      localTransport: 50,
      attractions: 100,
      shopping: 60,
    },
  },
  GBP: {
    budget: {
      accommodation: 30,
      food: 20,
      localTransport: 10,
      attractions: 15,
      shopping: 10,
    },
    moderate: {
      accommodation: 100,
      food: 45,
      localTransport: 25,
      attractions: 40,
      shopping: 25,
    },
    comfortable: {
      accommodation: 250,
      food: 100,
      localTransport: 55,
      attractions: 100,
      shopping: 60,
    },
  },
  AUD: {
    budget: {
      accommodation: 45,
      food: 25,
      localTransport: 12,
      attractions: 18,
      shopping: 12,
    },
    moderate: {
      accommodation: 130,
      food: 50,
      localTransport: 25,
      attractions: 45,
      shopping: 30,
    },
    comfortable: {
      accommodation: 300,
      food: 110,
      localTransport: 55,
      attractions: 110,
      shopping: 70,
    },
  },
  CAD: {
    budget: {
      accommodation: 40,
      food: 25,
      localTransport: 12,
      attractions: 18,
      shopping: 12,
    },
    moderate: {
      accommodation: 120,
      food: 50,
      localTransport: 25,
      attractions: 45,
      shopping: 30,
    },
    comfortable: {
      accommodation: 280,
      food: 110,
      localTransport: 55,
      attractions: 100,
      shopping: 70,
    },
  },
};

function getCurrencySymbol(currencyCode) {
  return (
    CURRENCY_OPTIONS.find((currency) => currency.code === currencyCode)
      ?.symbol || `${currencyCode} `
  );
}

function formatMoney(amount, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${symbol}0`;
  }

  return `${symbol}${Math.round(value).toLocaleString("en-IN")}`;
}

function splitCommaSeparated(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoordinates(place) {
  const latitude = Number(
    place?.latitude ??
      place?.lat ??
      place?.coordinates?.latitude ??
      place?.coordinates?.lat,
  );

  const longitude = Number(
    place?.longitude ??
      place?.lon ??
      place?.lng ??
      place?.coordinates?.longitude ??
      place?.coordinates?.lon ??
      place?.coordinates?.lng,
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

  if (firstIndex === -1) {
    return remaining;
  }

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

      if (!coordinates) {
        return;
      }

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

  if (orderedPlaces.length === 0) {
    return itinerary;
  }

  // Places are kept in geographic proximity order and distributed
  // sequentially. This is a practical approximation, not route optimization.
  const placesPerDay = Math.ceil(orderedPlaces.length / days);

  orderedPlaces.forEach((place, index) => {
    const dayIndex = Math.min(
      Math.floor(index / placesPerDay),
      days - 1,
    );

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

function isInternationalRoute(origin, destination) {
  if (!origin.trim() || !destination.trim()) {
    return false;
  }

  const knownCountries = [
    "india",
    "japan",
    "singapore",
    "malaysia",
    "thailand",
    "united states",
    "usa",
    "uk",
    "united kingdom",
    "uae",
    "dubai",
    "france",
    "germany",
    "italy",
    "spain",
    "australia",
    "canada",
    "indonesia",
    "vietnam",
    "south korea",
    "china",
    "nepal",
    "sri lanka",
  ];

  const originLower = origin.toLowerCase();
  const destinationLower = destination.toLowerCase();

  const originCountry = knownCountries.find((country) =>
    originLower.includes(country),
  );

  const destinationCountry = knownCountries.find((country) =>
    destinationLower.includes(country),
  );

  if (originCountry && destinationCountry) {
    return originCountry !== destinationCountry;
  }

  // If the locations don't clearly identify countries, don't pretend
  // the route classification is certain.
  return null;
}

function getDestinationTier(destination, travelStyle) {
  const text = `${destination} ${travelStyle.join(" ")}`.toLowerCase();

  if (
    /\bluxury\b|\bcomfortable\b/.test(text)
  ) {
    return "comfortable";
  }

  if (/\bbudget\b|\bbackpack/.test(text)) {
    return "budget";
  }

  return "moderate";
}

function getDailyReferenceCosts(currency, tier) {
  const costs =
    DAILY_REFERENCE_COSTS[currency] || DAILY_REFERENCE_COSTS.INR;

  return costs[tier] || costs.moderate;
}

function createInitialBudget(preferences) {
  const currency = preferences.budget_currency || "INR";
  const tier = getDestinationTier(
    preferences.destination,
    preferences.travel_style || [],
  );

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

function App() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [itineraryGenerated, setItineraryGenerated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultMode, setResultMode] = useState("");
  const [activeTab, setActiveTab] = useState("discover");

  const [budgetItems, setBudgetItems] = useState(() =>
    createInitialBudget(initialPreferences),
  );
  const [emergencyPercent, setEmergencyPercent] = useState(10);
  const [prepaidExpenses, setPrepaidExpenses] = useState(0);
  const [includeIntercityTransport, setIncludeIntercityTransport] =
    useState(true);

  const [savedTrips, setSavedTrips] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vibetrip-saved-trips") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("vibetrip-saved-trips", JSON.stringify(savedTrips));
  }, [savedTrips]);

  const currency = preferences.budget_currency || "INR";

  const internationalRoute = useMemo(
    () =>
      isInternationalRoute(
        preferences.starting_location,
        preferences.destination,
      ),
    [preferences.starting_location, preferences.destination],
  );

  const destinationTier = getDestinationTier(
    preferences.destination,
    preferences.travel_style,
  );

  const dailyReferenceCosts = getDailyReferenceCosts(
    currency,
    destinationTier,
  );

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

    const missingIntercity =
      includeIntercityTransport &&
      costs.intercity === null;

    const missingCategories = BUDGET_CATEGORIES.filter(
      (category) =>
        costs[category.id] === null &&
        category.id !== "intercity",
    ).map((category) => category.label);

    const baseCost = Object.values(costs).reduce(
      (total, amount) => total + (amount ?? 0),
      0,
    );

    const emergencyReserve = Math.ceil(
      (baseCost * emergencyPercent) / 100,
    );

    const prepaid = Math.max(0, Number(prepaidExpenses) || 0);

    const estimatedTotal = baseCost + emergencyReserve;

    // The budget is incomplete until all categories have values and,
    // when enabled, intercity transport has an explicit estimate.
    const complete =
      !missingIntercity && missingCategories.length === 0;

    const remainingBudget = totalBudget - estimatedTotal;

    let status = "incomplete";
    let statusLabel = "Complete your estimate";
    let statusMessage =
      "Enter your transport and expense estimates before deciding whether this trip fits your budget.";

    if (complete && remainingBudget < 0) {
      status = "over";
      statusLabel = "Over budget";
      statusMessage =
        "Your estimated expenses exceed your available budget. Reduce expenses or increase your budget.";
    } else if (complete && remainingBudget >= 0) {
      status = "within";
      statusLabel = "Within budget";
      statusMessage =
        "Your entered estimates fit your budget. Confirm actual prices before booking.";
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
  }, [
    preferences.budget,
    budgetItems,
    emergencyPercent,
    prepaidExpenses,
    includeIntercityTransport,
  ]);

  function updatePreference(name, value) {
    setPreferences((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toggleArrayPreference(name, value) {
    setPreferences((previous) => {
      const current = previous[name] || [];

      return {
        ...previous,
        [name]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  }

  function updateBudgetItem(category, value) {
    if (value !== "" && Number(value) < 0) {
      return;
    }

    setBudgetItems((previous) => ({
      ...previous,
      [category]: value,
    }));
  }

  function resetBudgetEstimate() {
    setBudgetItems(createInitialBudget(preferences));
    setEmergencyPercent(10);
    setPrepaidExpenses(0);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Request failed with status ${response.status}`,
        );
      }

      const results =
        data.recommendations ||
        data.places ||
        data.results ||
        [];

      setRecommendations(results);

      setResultMode(data.mode || data.source || "location");

      setResultMessage(
        data.message ||
          `Found ${results.length} places for your trip.`,
      );

      if (results.length === 0) {
        setResultMessage(
          data.message ||
            "No places were returned. Try a different destination or preferences.",
        );
      }

      setActiveTab("discover");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not retrieve recommendations. Check that the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleRecommendation(place) {
    const placeId = getPlaceId(place);

    setSelectedRecommendations((previous) => {
      const alreadySelected = previous.some(
        (item) => getPlaceId(item) === placeId,
      );

      if (alreadySelected) {
        return previous.filter((item) => getPlaceId(item) !== placeId);
      }

      return [...previous, place];
    });

    setItineraryGenerated(false);
  }

  function isRecommendationSelected(place) {
    return selectedRecommendations.some(
      (item) => getPlaceId(item) === getPlaceId(place),
    );
  }

  function generateItinerary() {
    if (selectedRecommendations.length === 0) {
      setError("Select at least one place before generating your itinerary.");
      return;
    }

    const newItinerary = createGeographicItinerary(
      selectedRecommendations,
      preferences.duration_days,
    );

    setItinerary(newItinerary);
    setItineraryGenerated(true);
    setError("");
    setActiveTab("trip");

    setTimeout(() => {
      document.getElementById("itinerary-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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

    setSavedTrips((previous) => [trip, ...previous]);
    setError("");
    setResultMessage("Your trip has been saved in this browser.");
  }

  function deleteSavedTrip(tripId) {
    setSavedTrips((previous) =>
      previous.filter((trip) => trip.id !== tripId),
    );
  }

  function getGoogleMapsLink(place) {
    const coordinates = getCoordinates(place);

    if (coordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
    }

    const query = encodeURIComponent(
      `${place.name || ""} ${place.address || ""} ${preferences.destination}`,
    );

    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function openFullRoute() {
    const places = orderByProximity(selectedRecommendations);

    if (places.length === 0) {
      setError("Add places to My Trip first.");
      return;
    }

    const waypoints = places
      .map((place) => {
        const coordinates = getCoordinates(place);

        if (coordinates) {
          return `${coordinates.latitude},${coordinates.longitude}`;
        }

        return place.name || "";
      })
      .filter(Boolean);

    const destination = encodeURIComponent(waypoints[waypoints.length - 1]);

    const origin = encodeURIComponent(waypoints[0]);

    const waypointList = waypoints
      .slice(1, -1)
      .map(encodeURIComponent)
      .join("%7C");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

    if (waypointList) {
      url += `&waypoints=${waypointList}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const tripDuration = Math.max(
    1,
    Number(preferences.duration_days) || 1,
  );

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            ✈️
          </span>

          <div>
            <h1>VibeTrip</h1>
            <p>Don't just travel. Travel your vibe.</p>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activeTab === "discover" ? "active" : ""}
            onClick={() => setActiveTab("discover")}
          >
            Discover
          </button>

          <button
            type="button"
            className={activeTab === "trip" ? "active" : ""}
            onClick={() => setActiveTab("trip")}
          >
            My Trip ({selectedRecommendations.length})
          </button>

          <button
            type="button"
            className={activeTab === "budget" ? "active" : ""}
            onClick={() => setActiveTab("budget")}
          >
            Budget Planner
          </button>

          <button
            type="button"
            className={activeTab === "saved" ? "active" : ""}
            onClick={() => setActiveTab("saved")}
          >
            Saved Trips
          </button>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow">YOUR CULTURE. YOUR JOURNEY.</span>

          <h2>Discover places that match your vibe.</h2>

          <p>
            Build a personalized journey around your interests, cultural
            preferences, nearby places, and budget.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setActiveTab("discover");
              document.getElementById("trip-preferences")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Plan my trip →
          </button>
        </div>
      </section>

      {(error || resultMessage) && (
        <div
          className={error ? "alert alert-error" : "alert alert-success"}
          role="status"
        >
          <span>{error || resultMessage}</span>

          <button
            type="button"
            onClick={() => {
              setError("");
              setResultMessage("");
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === "discover" && (
        <>
          <section className="panel preferences-panel" id="trip-preferences">
            <div className="section-heading">
              <span className="eyebrow">STEP 01</span>
              <h2>Tell us about your journey</h2>
              <p>
                Share your destination and cultural preferences to discover
                relevant places.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Starting location *</span>

                  <input
                    type="text"
                    value={preferences.starting_location}
                    onChange={(event) =>
                      updatePreference(
                        "starting_location",
                        event.target.value,
                      )
                    }
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
                    onChange={(event) =>
                      updatePreference("destination", event.target.value)
                    }
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
                    onChange={(event) =>
                      updatePreference("budget", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Budget currency *</span>

                  <select
                    value={currency}
                    onChange={(event) => {
                      const newCurrency = event.target.value;

                      setPreferences((previous) => ({
                        ...previous,
                        budget_currency: newCurrency,
                      }));

                      setBudgetItems((previous) => {
                        const oldCosts =
                          DAILY_REFERENCE_COSTS[currency] ||
                          DAILY_REFERENCE_COSTS.INR;

                        const newCosts =
                          DAILY_REFERENCE_COSTS[newCurrency] ||
                          DAILY_REFERENCE_COSTS.INR;

                        const tier = getDestinationTier(
                          preferences.destination,
                          preferences.travel_style,
                        );

                        const oldTier = oldCosts[tier];
                        const newTier = newCosts[tier];

                        const duration = Math.max(
                          1,
                          Number(preferences.duration_days) || 1,
                        );

                        const converted = { ...previous };

                        [
                          "accommodation",
                          "food",
                          "localTransport",
                          "attractions",
                          "shopping",
                        ].forEach((key) => {
                          const currentValue = Number(previous[key]);

                          if (
                            previous[key] !== "" &&
                            Number.isFinite(currentValue) &&
                            oldTier[key] > 0
                          ) {
                            const ratio = newTier[key] / oldTier[key];

                            converted[key] = String(
                              Math.round(currentValue * ratio),
                            );
                          } else {
                            converted[key] = String(
                              newTier[key] * duration,
                            );
                          }
                        });

                        // Never automatically convert the transport estimate.
                        // It must be checked for the actual route.
                        return converted;
                      });
                    }}
                  >
                    {CURRENCY_OPTIONS.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <small>
                    Changing this selector changes the displayed denomination
                    and planning assumptions. It does not perform a live
                    exchange-rate conversion of your budget.
                  </small>
                </label>

                <label className="form-field">
                  <span>Duration (days) *</span>

                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={preferences.duration_days}
                    onChange={(event) => {
                      updatePreference(
                        "duration_days",
                        event.target.value,
                      );
                    }}
                    required
                  />
                </label>
              </div>

              <div className="form-section">
                <h3>🎬 Favorite movies</h3>

                <label className="form-field">
                  <span>Movies separated by commas</span>

                  <input
                    type="text"
                    value={preferences.favorite_movies}
                    onChange={(event) =>
                      updatePreference(
                        "favorite_movies",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Your Name, Spirited Away"
                  />
                </label>
              </div>

              <div className="form-section">
                <h3>🎵 Favorite artists</h3>

                <label className="form-field">
                  <span>Artists separated by commas</span>

                  <input
                    type="text"
                    value={preferences.favorite_artists}
                    onChange={(event) =>
                      updatePreference(
                        "favorite_artists",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Taylor Swift, A. R. Rahman"
                  />
                </label>
              </div>

              <div className="form-section">
                <h3>🍜 Favorite cuisines</h3>

                <label className="form-field">
                  <span>Cuisines separated by commas</span>

                  <input
                    type="text"
                    value={preferences.favorite_cuisines}
                    onChange={(event) =>
                      updatePreference(
                        "favorite_cuisines",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Japanese, Korean, Italian"
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
                        onChange={() =>
                          toggleArrayPreference("interests", option)
                        }
                      />

                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>🧭 Your travel style</h3>

                <div className="choice-grid">
                  {TRAVEL_STYLE_OPTIONS.map((option) => (
                    <label key={option} className="choice-chip">
                      <input
                        type="checkbox"
                        checked={preferences.travel_style.includes(option)}
                        onChange={() =>
                          toggleArrayPreference("travel_style", option)
                        }
                      />

                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-field">
                  <span>Anything else we should know?</span>

                  <textarea
                    value={preferences.additional_preferences}
                    onChange={(event) =>
                      updatePreference(
                        "additional_preferences",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. I prefer quiet places, local experiences, and public transport."
                    rows={3}
                    maxLength={1000}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="primary-button full-width"
                disabled={loading}
              >
                {loading
                  ? "Finding your places..."
                  : "Discover my vibe ✨"}
              </button>
            </form>
          </section>

          <section className="panel recommendations-section">
            <div className="section-heading">
              <span className="eyebrow">STEP 02</span>
              <h2>Your recommendations</h2>
              <p>
                Explore places, choose your favorites, and build your own trip.
              </p>
            </div>

            {resultMode && (
              <p className="result-source">
                Recommendation source: {resultMode}
              </p>
            )}

            {loading && (
              <div className="empty-state">
                <div className="loading-spinner" />
                <h3>Finding places for your vibe...</h3>
                <p>We're retrieving recommendations for your destination.</p>
              </div>
            )}

            {!loading && recommendations.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">🌍</span>
                <h3>Your next adventure starts here</h3>
                <p>
                  Enter your trip details above to discover personalized
                  recommendations.
                </p>
              </div>
            )}

            {recommendations.length > 0 && (
              <>
                <div className="recommendations-toolbar">
                  <p>
                    <strong>{recommendations.length}</strong> places found
                  </p>

                  <p>
                    <strong>{selectedRecommendations.length}</strong> selected
                  </p>
                </div>

                <div className="recommendations-grid">

                  {recommendations.map((place, index) => {
                    const placeId = getPlaceId(place);
                    const selected = isRecommendationSelected(place);

                    return (
                      <div
                        className={`recommendation-wrapper ${
                          selected ? "selected" : ""
                        }`}
                        key={`${placeId}-${index}`}
                      >
                        <RecommendationCard
                          recommendation={place}
                          place={place}
                          isSelected={selected}
                          selected={selected}
                          onSelect={() => toggleRecommendation(place)}
                        />
                      </div>
                    );
                  })}
                  </div>

                  <div className="recommendations-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={generateItinerary}
                      disabled={selectedRecommendations.length === 0}
                    >
                      Generate geographic itinerary →
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setActiveTab("budget")}
                    >
                      Plan my budget
                    </button>
                  </div>
                  </>
                  )}

                            </section>
                          </>
                        )}

      {activeTab === "trip" && (
        <section className="panel trip-section">
          <div className="section-heading">
            <span className="eyebrow">YOUR JOURNEY</span>
            <h2>My Trip</h2>
            <p>
              Review your selected places and organize your journey.
            </p>
          </div>

          {selectedRecommendations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🧳</span>
              <h3>Your trip is waiting to be built</h3>
              <p>
                Visit Discover and add places to your trip.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveTab("discover")}
              >
                Discover places
              </button>
            </div>
          ) : (
            <>
              <div className="trip-summary-grid">
                <div className="summary-card">
                  <span>Selected places</span>
                  <strong>{selectedRecommendations.length}</strong>
                </div>

                <div className="summary-card">
                  <span>Trip duration</span>
                  <strong>
                    {tripDuration} {tripDuration === 1 ? "day" : "days"}
                  </strong>
                </div>

                <div className="summary-card">
                  <span>Total budget</span>
                  <strong>
                    {formatMoney(preferences.budget, currency)}
                  </strong>
                </div>
              </div>

              <div className="trip-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={generateItinerary}
                >
                  {itineraryGenerated
                    ? "Regenerate itinerary"
                    : "Generate itinerary"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={openFullRoute}
                >
                  Open route in Google Maps ↗
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={saveCurrentTrip}
                >
                  Save trip
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveTab("budget")}
                >
                  Budget planner
                </button>
              </div>

              <h3 className="subsection-title">Your selected places</h3>

              <div className="selected-places-list">
                {selectedRecommendations.map((place, index) => (
                  <article
                    key={getPlaceId(place)}
                    className="selected-place-item"
                  >
                    <div>
                      <span className="place-number">{index + 1}</span>

                      <div className="selected-place-details">
                        <h4>{place.name || "Unnamed place"}</h4>

                        <p>
                          {place.address ||
                            place.city ||
                            place.description ||
                            "Location details unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="selected-place-actions">
                      <a
                        href={getGoogleMapsLink(place)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Map ↗
                      </a>

                      <button
                        type="button"
                        onClick={() => toggleRecommendation(place)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <h3 className="subsection-title">Trip map</h3>

              <div className="trip-map-container">
                <TripMap
                  places={selectedRecommendations}
                  recommendations={selectedRecommendations}
                />
              </div>

              <div id="itinerary-section">
                <div className="section-heading">
                  <span className="eyebrow">YOUR DAILY PLAN</span>
                  <h3>Geographic itinerary</h3>

                  <p>
                    Places are ordered by proximity when coordinates are
                    available. This is a proximity-based draft, not a
                    road-network or public-transit optimized route.
                  </p>
                </div>

                {!itineraryGenerated && (
                  <div className="empty-state compact">
                    <p>
                      Generate an itinerary to distribute your selected places
                      across your trip days.
                    </p>
                  </div>
                )}

                {itineraryGenerated && (
                  <div className="itinerary-days">
                    {itinerary.map((day) => (
                      <article className="itinerary-day" key={day.day}>
                        <div className="itinerary-day-heading">
                          <span>DAY {day.day}</span>
                          <h4>
                            {day.places.length}{" "}
                            {day.places.length === 1 ? "place" : "places"}
                          </h4>
                        </div>

                        {day.places.length === 0 ? (
                          <p>
                            No places assigned. Add more places or shorten
                            the trip duration.
                          </p>
                        ) : (
                          <ol className="itinerary-place-list">
                            {day.places.map((place) => (
                              <li key={getPlaceId(place)}>
                                <div>
                                  <strong>
                                    {place.name || "Unnamed place"}
                                  </strong>

                                  <p>
                                    {place.address ||
                                      place.city ||
                                      place.description ||
                                      "Explore this location"}
                                  </p>
                                </div>

                                <a
                                  href={getGoogleMapsLink(place)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Navigate ↗
                                </a>
                              </li>
                            ))}
                          </ol>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === "budget" && (
        <section className="panel budget-section">
          <div className="section-heading">
            <span className="eyebrow">SMART TRAVEL PLANNING</span>
            <h2>Budget Planner 💰</h2>

            <p>
              Estimate the full cost of your trip before deciding whether
              you can afford it.
            </p>
          </div>

          <div className="budget-route-card">
            <div>
              <span>FROM</span>
              <strong>
                {preferences.starting_location || "Starting location not set"}
              </strong>
            </div>

            <span className="route-arrow">→</span>

            <div>
              <span>TO</span>
              <strong>
                {preferences.destination || "Destination not set"}
              </strong>
            </div>
          </div>

          <div className="budget-notice">
            <strong>Important: planning estimates, not live prices</strong>

            <p>
              Daily expenses below are illustrative reference assumptions.
              They are not live hotel, restaurant, ticket, or flight prices.
              Enter real quotes before relying on the result.
            </p>
          </div>

          {internationalRoute === true && (
            <div className="budget-warning">
              <strong>🌏 International trip detected</strong>

              <p>
                International flights can be a major expense. The planner
                will not assume flights are free: enter a round-trip estimate
                in the intercity transport field below.
              </p>
            </div>
          )}

          {internationalRoute === null &&
            preferences.starting_location &&
            preferences.destination && (
              <div className="budget-warning">
                <strong>Check your route</strong>

                <p>
                  We couldn't confidently identify the countries from the
                  location names. Confirm whether this is an international
                  trip and enter your expected transport costs.
                </p>
              </div>
            )}

          <div className="budget-overview">
            <article className="budget-stat">
              <span>Total available budget</span>

              <strong>
                {formatMoney(budgetSummary.totalBudget, currency)}
              </strong>
            </article>

            <article className="budget-stat">
              <span>Estimated expenses</span>

              <strong>
                {formatMoney(budgetSummary.baseCost, currency)}
              </strong>
            </article>

            <article className="budget-stat">
              <span>Emergency reserve</span>

              <strong>
                {formatMoney(budgetSummary.emergencyReserve, currency)}
              </strong>
            </article>
          </div>

          <div
            className={`budget-status budget-status-${budgetSummary.status}`}
          >
            <strong>{budgetSummary.statusLabel}</strong>
            <p>{budgetSummary.statusMessage}</p>

            {!budgetSummary.complete && (
              <ul>
                {budgetSummary.missingIntercity && (
                  <li>
                    Enter your intercity transport estimate. Use zero only if
                    you've confirmed that no additional intercity transport
                    cost applies.
                  </li>
                )}

                {budgetSummary.missingCategories.map((category) => (
                  <li key={category}>
                    Enter an estimate for {category.toLowerCase()}.
                  </li>
                ))}
              </ul>
            )}

            {budgetSummary.complete && budgetSummary.remainingBudget < 0 && (
              <p>
                You need approximately{" "}
                <strong>
                  {formatMoney(
                    Math.abs(budgetSummary.remainingBudget),
                    currency,
                  )}
                </strong>{" "}
                more to cover these estimates and your emergency reserve.
              </p>
            )}

            {budgetSummary.complete && budgetSummary.remainingBudget >= 0 && (
              <p>
                Estimated remaining budget:{" "}
                <strong>
                  {formatMoney(budgetSummary.remainingBudget, currency)}
                </strong>
              </p>
            )}
          </div>

          <div className="budget-editor">
            <div className="budget-editor-heading">
              <div>
                <h3>Expense breakdown</h3>
                <p>
                  Enter your own quotes or adjust the reference estimates.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={resetBudgetEstimate}
              >
                Reset estimates
              </button>
            </div>

            <div className="budget-category-list">
              {BUDGET_CATEGORIES.map((category) => {
                const isIntercity = category.id === "intercity";

                return (
                  <article
                    className="budget-category"
                    key={category.id}
                  >
                    <div className="budget-category-description">
                      <h4>{category.label}</h4>
                      <p>{category.description}</p>

                      {isIntercity && (
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={includeIntercityTransport}
                            onChange={(event) => {
                              setIncludeIntercityTransport(
                                event.target.checked,
                              );

                              if (event.target.checked) {
                                updateBudgetItem("intercity", "");
                              }
                            }}
                          />

                          <span>Include intercity transport in this budget</span>
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
                        onChange={(event) =>
                          updateBudgetItem(
                            category.id,
                            event.target.value,
                          )
                        }
                        placeholder={
                          isIntercity
                            ? "Enter transport estimate"
                            : "Enter estimated cost"
                        }
                        disabled={
                          isIntercity && !includeIntercityTransport
                        }
                        required={
                          !isIntercity || includeIntercityTransport
                        }
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="budget-control">
              <label htmlFor="emergency-percent">
                Emergency reserve: {emergencyPercent}%
              </label>

              <input
                id="emergency-percent"
                type="range"
                min="0"
                max="30"
                step="5"
                value={emergencyPercent}
                onChange={(event) =>
                  setEmergencyPercent(Number(event.target.value))
                }
              />

              <p>
                Reserve:{" "}
                <strong>
                  {formatMoney(budgetSummary.emergencyReserve, currency)}
                </strong>
              </p>
            </div>

            <div className="budget-control">
              <label htmlFor="prepaid-expenses">
                Already-paid expenses ({currency})
              </label>

              <input
                id="prepaid-expenses"
                type="number"
                min="0"
                step="any"
                value={prepaidExpenses}
                onChange={(event) =>
                  setPrepaidExpenses(event.target.value)
                }
              />

              <p>
                Record prepaid expenses here so you can track them separately.
                They remain included in the total trip cost if they are also
                included in the expense categories above.
              </p>
            </div>

            <div className="budget-total-card">
              <div>
                <span>Estimated trip cost, including reserve</span>

                <strong>
                  {formatMoney(budgetSummary.estimatedTotal, currency)}
                </strong>
              </div>

              <div>
                <span>Budget remaining</span>

                <strong>
                  {formatMoney(
                    budgetSummary.remainingBudget,
                    currency,
                  )}
                </strong>
              </div>
            </div>

            <p className="budget-disclaimer">
              These calculations use the currency selected in the form.
              They do not fetch live exchange rates, airfare quotes, hotel
              prices, or attraction prices. Check actual prices for your
              dates, route, accommodation, and travel style before booking.
            </p>
          </div>
        </section>
      )}

      {activeTab === "saved" && (
        <section className="panel saved-trips-section">
          <div className="section-heading">
            <span className="eyebrow">YOUR TRAVEL COLLECTION</span>
            <h2>Saved Trips</h2>

            <p>
              Trips saved in this browser will remain available on this
              device unless browser storage is cleared.
            </p>
          </div>

          {savedTrips.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📔</span>
              <h3>No saved trips yet</h3>
              <p>
                Build a trip and select Save trip to keep it here.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveTab("discover")}
              >
                Plan a trip
              </button>
            </div>
          ) : (
            <div className="saved-trips-grid">
              {savedTrips.map((trip) => (
                <article className="saved-trip-card" key={trip.id}>
                  <span className="eyebrow">SAVED ADVENTURE</span>

                  <h3>{trip.destination}</h3>

                  <p>
                    {trip.starting_location || "Starting location not set"}
                  </p>

                  <div className="saved-trip-details">
                    <span>
                      🗓️ {trip.duration_days}{" "}
                      {trip.duration_days === 1 ? "day" : "days"}
                    </span>

                    <span>
                      📍 {trip.places?.length || 0} places
                    </span>

                    <span>
                      💰{" "}
                      {formatMoney(
                        trip.budget,
                        trip.budget_currency || "INR",
                      )}
                    </span>
                  </div>

                  <div className="saved-trip-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setPreferences((previous) => ({
                          ...previous,
                          starting_location: trip.starting_location || "",
                          destination: trip.destination || "",
                          duration_days: trip.duration_days || 1,
                          budget: trip.budget || 0,
                          budget_currency: trip.budget_currency || "INR",
                        }));

                        setSelectedRecommendations(trip.places || []);
                        setItinerary(trip.itinerary || []);
                        setItineraryGenerated(
                          Boolean(trip.itinerary?.length),
                        );

                        if (trip.budgetItems) {
                          setBudgetItems(trip.budgetItems);
                        }

                        setActiveTab("trip");
                      }}
                    >
                      Open trip
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => deleteSavedTrip(trip.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="app-footer">
        <div className="footer-brand">
          <span>✈️</span>
          <strong>VibeTrip</strong>
        </div>

        <p>
          Discover your culture. Explore your world. Travel your vibe.
        </p>

        <small>
          Cultural recommendations powered by Qloo. Budget figures are
          planning estimates, not live travel prices.
        </small>
      </footer>
    </main>
  );
}

export default App;