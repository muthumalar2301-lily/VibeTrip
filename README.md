# 🌍 VibeTrip — Your Interests. Real Places.

**VibeTrip** is a culturally personalized travel-planning web application that connects users' cultural interests with real-world place discovery using Qloo's cultural intelligence API.

Instead of relying only on popular tourist attractions, VibeTrip helps users explore places based on their preferences and plan their trips in one place.

🔗 **Live Demo:** [VibeTrip](https://vibe-trip-six.vercel.app/)

## ✨ Features

* 🎭 **Cultural Personalization:** Enter preferences such as favorite movies, artists, cuisines, and interests.
* 📍 **Place Recommendations:** Discover places based on your destination and preferences using the Qloo API.
* 🗺️ **Itinerary Planning:** Organize recommended places into a travel itinerary.
* 💰 **Budget Planner:** Plan your travel expenses.
* 💱 **Currency Converter:** Convert currencies to support travel budgeting.

## 🛠️ Tech Stack

| Technology   | Purpose                                         |
| ------------ | ----------------------------------------------- |
| React + Vite | Frontend                                        |
| Python       | Backend programming language                    |
| FastAPI      | Backend API framework                           |
| Qloo API     | Cultural intelligence and place recommendations |
| Vercel       | Frontend hosting                                |
| Render       | Backend hosting                                 |

## 🏗️ Architecture

1. Users enter their travel details and cultural preferences through the frontend.
2. The frontend sends the request to the FastAPI backend.
3. The backend communicates with the Qloo API to retrieve place recommendations.
4. The application presents the results and supports travel-planning features.

## 🚀 Live Application

Try VibeTrip here:

**[VibeTrip](https://vibe-trip-six.vercel.app/)**

## 💻 Run Locally

### Prerequisites

* Python
* Node.js and npm
* A Qloo API key

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd VibeTrip
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Set up the backend

Open a terminal in the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend directory and configure the Qloo API key using the environment variable name expected by the application.

Start the backend using the entry point and command configured in your project.

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the backend API URL using the environment variable expected by the frontend.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite.

## 🔐 Environment Variables

Configure API keys and service URLs through environment variables.

**Never commit API keys, credentials, or private `.env` files to GitHub.**

Use a `.env.example` file to document the required variable names without including secret values.

## 📄 License

See the [LICENSE](LICENSE) file for the project's license.

---

Built as a Qloo-powered travel discovery and planning project.
