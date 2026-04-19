# Real Estate Growth Prediction System

A full-stack predictive geospatial dashboard that identifies high-growth real estate investment zones using property price trends, infrastructure indicators, demand signals, connectivity, and rental yield.

## Features

- Interactive Leaflet map with color-coded growth markers
- Weighted Growth Velocity Score calculator
- Manual area input form with all required investment fields
- CSV and JSON dataset upload support
- Search, filter, and ranking table
- Growth score, price growth, and factor balance charts
- JSON and CSV export
- API-backed persistence with local JSON fallback
- Optional MongoDB Atlas support through environment variables

## Scoring Logic

- Price Growth Percentage = ((Current Price - Previous Price) / Previous Price) x 100
- Price Growth Score = clamp(Price Growth Percentage x 4, 0, 100)
- Rental Yield Score = clamp(Rental Yield x 20, 0, 100)
- Growth Velocity Score =
  (Price Growth Score x 0.30) +
  (Infrastructure Score x 0.25) +
  (Demand Score x 0.20) +
  (Connectivity Score x 0.15) +
  (Rental Yield Score x 0.10)

## Classification

- 80 to 100: High Growth Zone
- 60 to 79.99: Emerging Zone
- 40 to 59.99: Moderate Zone
- Below 40: Low Priority Zone

## Data Fields

- areaName
- city
- latitude
- longitude
- currentPrice
- previousPrice
- infrastructureScore
- demandScore
- connectivityScore
- rentalYield
- listingDensity
- upcomingProject

## Local Development

1. Install dependencies with `npm install`.
2. Start the app with `npm start`.
3. Open `http://localhost:3000`.

The API exposes `GET /api/health` and `GET /api/areas`.

## Optional MongoDB Deployment

Set these variables on Render if you want Atlas-backed persistence:

- `PORT=3000`
- `MONGODB_URI=your_mongodb_connection_string`
- `MONGODB_DB=cyberjoar`
- `MONGODB_COLLECTION=real_estate_zones`

If MongoDB variables are not present, the app uses `data/areas.json` as a writable local store.

## Live Demo

**Project Link:** https://real-estate-growth-prediction.onrender.com/

**Health Check:** https://real-estate-growth-prediction.onrender.com/api/health

## Files

- `index.html`
- `styles.css`
- `app.js`
- `server.js`
- `.env.example`
- `render.yaml`
- `package.json`
- `sample-data.csv`
- `sample-data.json`

## Deployment

1. Push this folder to GitHub.
2. Create a Render Web Service.
3. Use `npm start` as the start command.
4. Deploy and submit the live Render URL.
