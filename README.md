# Real Estate Growth Prediction System

A full-stack predictive geospatial dashboard that identifies high-growth real estate investment zones using property price appreciation, infrastructure development, market demand, connectivity, rental yield, and development activity.

## Overview

This project was built as a predictive urban growth modeling dashboard for real estate investment analysis. It helps identify areas with strong future investment potential over a 24 to 60 month horizon by calculating a weighted **Growth Velocity Score** and visualizing ranked zones on an interactive map.

The system is designed to simulate how real estate intelligence platforms can evaluate emerging hotspots using structured property and location indicators.

## Problem Statement

**Predictive Urban Growth Modeling for Real Estate Investment**

The objective is to predict future high-growth real estate zones using indicators such as:

- Government infrastructure projects
- Property price trends
- Listing density
- Rental demand
- Connectivity
- Development activity

## Key Features

- Interactive Leaflet map with color-coded area markers
- Weighted Growth Velocity Score calculation
- Manual area entry form
- CSV and JSON dataset upload
- Search and classification-based filtering
- Ranking table for investment potential
- Growth and pricing charts using Chart.js
- JSON and CSV export
- API-backed persistence
- MongoDB Atlas support with local JSON fallback

## Growth Scoring Logic

### 1. Price Growth Percentage

```text
Price Growth Percentage = ((Current Price - Previous Price) / Previous Price) x 100
```

### 2. Price Growth Score

```text
Price Growth Score = clamp(Price Growth Percentage x 4, 0, 100)
```

### 3. Rental Yield Score

```text
Rental Yield Score = clamp(Rental Yield x 20, 0, 100)
```

### 4. Growth Velocity Score

```text
Growth Velocity Score =
  (Price Growth Score x 0.30) +
  (Infrastructure Score x 0.25) +
  (Demand Score x 0.20) +
  (Connectivity Score x 0.15) +
  (Rental Yield Score x 0.10)
```

## Classification

- **80 - 100**: High Growth Zone
- **60 - 79.99**: Emerging Zone
- **40 - 59.99**: Moderate Zone
- **Below 40**: Low Priority Zone

## Data Fields

Each area record includes:

- `areaName`
- `city`
- `latitude`
- `longitude`
- `currentPrice`
- `previousPrice`
- `infrastructureScore`
- `demandScore`
- `connectivityScore`
- `rentalYield`
- `listingDensity`
- `upcomingProject`

## Sample Use Case

The dashboard can be used to compare locations such as:

- Greater Noida West
- Noida Sector 150
- Gurugram Sector 79
- Dwarka Expressway
- Faridabad Neharpar
- Sohna Road
- Yamuna Expressway
- Raj Nagar Extension

It helps answer:

**Which area has the strongest real estate investment potential in the next 24 to 60 months?**

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas
- **Map:** Leaflet
- **Charts:** Chart.js
- **Deployment:** Render

## Project Structure

- `index.html` - main dashboard UI
- `styles.css` - styling and layout
- `app.js` - frontend logic, charts, map rendering, upload/export handling
- `server.js` - Express server and API
- `.env.example` - environment variable template
- `render.yaml` - Render deployment configuration
- `data/areas.json` - local writable store for non-MongoDB mode
- `samples/sample-data.csv` - sample CSV dataset
- `samples/sample-data.json` - sample JSON dataset
- `samples/real-estate-sample.csv` - alternate sample CSV dataset

## API Endpoints

- `GET /api/health` - health check and storage mode
- `GET /api/areas` - fetch all areas
- `PUT /api/areas` - replace synced area list
- `POST /api/areas` - add a new area
- `DELETE /api/areas/:id` - delete an area

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Farha-n/real-estate-growth-prediction.git
cd real-estate-growth-prediction
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

### 4. Open in browser

```text
http://localhost:3000
```

## Environment Variables

Create a `.env` file using `.env.example` or set these variables in Render:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=cyberjoar
MONGODB_COLLECTION=real_estate_zones
```

If MongoDB variables are not provided, the app uses `data/areas.json` as a local writable store.

## Deployment

This project can be deployed easily on Render.

### Render Setup

1. Push the project to GitHub
2. Create a new **Web Service** on Render
3. Connect the repository
4. Use the following settings:

- **Build Command:** `npm install`
- **Start Command:** `npm start`

5. Add the required environment variables
6. Deploy the service

## Live Demo

- **Project Link:** [https://real-estate-growth-prediction.onrender.com/](https://real-estate-growth-prediction.onrender.com/)
- **Health Check:** [https://real-estate-growth-prediction.onrender.com/api/health](https://real-estate-growth-prediction.onrender.com/api/health)

## Submission Summary

This model predicts high-growth real estate zones by combining:

- property price appreciation
- infrastructure score
- demand score
- connectivity score
- rental yield

Each area is scored, classified, plotted on a map, and ranked to highlight future investment hotspots.

## Author

**Farhan Farooq**
