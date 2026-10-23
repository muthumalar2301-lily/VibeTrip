from pydantic import BaseModel, Field
from typing import List


class TravelPreferences(BaseModel):
    starting_location: str = Field(
        ...,
        min_length=2,
        description="The city or location where the trip begins"
    )

    destination: str = Field(
        default="",
        description="Preferred destination, if the traveler has one"
    )

    favorite_movies: List[str] = Field(
        default_factory=list,
        description="Favorite movies"
    )

    favorite_artists: List[str] = Field(
        default_factory=list,
        description="Favorite music artists"
    )

    favorite_cuisines: List[str] = Field(
        default_factory=list,
        description="Favorite cuisines"
    )

    interests: List[str] = Field(
        default_factory=list,
        description="Interests such as art, music, fashion, and architecture"
    )

    budget: float = Field(
        ...,
        gt=0,
        description="Total trip budget in the traveler's local currency"
    )
    budget_currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
        description="ISO 4217 currency code selected for the trip budget"
    )

    duration_days: int = Field(
        ...,
        ge=1,
        le=30,
        description="Trip duration in days"
    )

    travel_style: List[str] = Field(
        default_factory=list,
        description="Travel styles such as adventure, relaxation, and culture"
    )

    additional_preferences: str = Field(
        default="",
        max_length=1000,
        description="Additional preferences in natural language"
    )