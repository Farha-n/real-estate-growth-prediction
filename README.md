# Real Estate Growth Prediction System

Problem Statement 3: Predictive Urban Growth Modeling for Real Estate Investment

Submitted by: Farhan Farooq

Live Demo: https://real-estate-growth-prediction.onrender.com/
Repository: https://github.com/Farha-n/real-estate-growth-prediction

---

## What This System Delivers

This full-stack dashboard predicts high-growth investment zones over a 24 to 60 month horizon and visualizes them on map, charts, and ranking views.

Recent practical upgrades included:
- True heatmap overlay on the map
- Scrape Live Data flow (live multi-source ingestion)
- Deployment-safe scrape fallback (never hard-fails on upstream source outages)
- Forecast extension line in the price chart
- Source badges (manual, sample, scraped sources)
- Clear system logic panel for evaluator readability

---

## Final Workflow (System Logic)

1. Collect area, price, and infrastructure data
2. Measure price growth and rental yield
3. Normalize market indicators
4. Apply weighted Growth Velocity Score
5. Project forward investment trend
6. Visualize hotspots using heatmap, charts, and ranking

---

## Core Features

### Prediction and Scoring
- Weighted Growth Velocity Score across:
  - Price growth
  - Infrastructure score
  - Demand score
  - Connectivity score
  - Rental yield score
- Zone classification:
  - High Growth Zone
  - Emerging Zone
  - Moderate Zone
  - Low Priority Zone

### Visualization
- Leaflet hotspot map with:
  - Classification markers
  - Heatmap layer (leaflet.heat)
  - Heatmap legend
- Hero status pills showing:
  - API state
  - Last scrape timestamp and health state (healthy/degraded)
- Ranking table with interactive row actions
- Chart.js analytics:
  - Growth score bar chart
  - Current vs previous price line chart
  - Projected Trend forecast extension
  - Radar chart for factor balance

### Data Workflows
- Manual area entry form
- CSV/JSON upload with unique merge behavior
- Add Sample Data merge behavior
- Scrape Live Data button with city input
- Source labels visible in popup and table
- JSON and CSV export

### Live Source Connectors Implemented
- Municipal/public source:
  - NDMC tender notices page (`https://www.ndmc.gov.in/tenders/Default.aspx`)
  - Parsed fields: tender title, inferred project type, inferred area mapping, infrastructure score signal
  - Normalized source label: `municipal-live`
- Market/listing source:
  - MagicBricks city listings + listing detail pages
  - Parsed fields: locality/area (from listing names), total property price, sq.ft from listing title
  - Derived metrics: `currentPrice` (price/sq.ft), `listingDensity` from repeated localities
  - Normalized source label: `magicbricks-live`

---

## Growth Score Formula

```text
Price Growth % = ((Current Price - Previous Price) / Previous Price) * 100
Price Growth Score = clamp(Price Growth % * 4, 0, 100)
Rental Yield Score = clamp(Rental Yield * 20, 0, 100)

Growth Velocity Score =
  (Price Growth Score * 0.30) +
  (Infrastructure Score * 0.25) +
  (Demand Score * 0.20) +
  (Connectivity Score * 0.15) +
  (Rental Yield Score * 0.10)
```

---

## API Endpoints

- GET /api/health
  - Service health, storage mode, area count
- GET /api/areas
  - Fetch all areas
- PUT /api/areas
  - Replace synchronized area list
- POST /api/areas
  - Add one area
- DELETE /api/areas/:id
  - Delete by id
- POST /api/scrape
  - Scrape/import live municipal + market data for a city

Request body example for scrape:

```json
{ "city": "Noida" }
```

Response shape (example):

```json
{
  "ok": true,
  "city": "Noida",
  "scrapedAt": "2026-04-19T11:00:00.000Z",
  "marketData": [],
  "infraData": [],
  "liveSourcesUsed": ["magicbricks", "ndmc-tenders"],
  "sourceErrors": [],
  "warnings": []
}
```

Scrape route reliability behavior:
- Uses per-source `Promise.allSettled` execution
- Returns HTTP 200 with structured warnings even if one or both upstream sources are unavailable
- Enforces outbound fetch timeouts to avoid deployment hangs

---

## Data Model

Each area is normalized to include:
- id
- areaName
- city
- source
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
- priceGrowthPercent
- priceGrowthScore
- rentalYieldScore
- growthScore
- classification

Common source values:
- manual
- sample
- magicbricks-live
- municipal-live

---

## Local Setup

```bash
git clone https://github.com/Farha-n/real-estate-growth-prediction.git
cd real-estate-growth-prediction
npm install
npm start
```

Open: http://localhost:3000

### Environment Variables

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=cyberjoar
MONGODB_COLLECTION=real_estate_zones
SCRAPE_FETCH_TIMEOUT_MS=12000
```

Fallback behavior:
- If MongoDB is not configured or unavailable, the app uses local JSON storage in data/areas.json.

---

## Project Structure

```text
model-2-real-estate-prediction/
  app.js
  index.html
  styles.css
  server.js
  scraper.js
  data/
    areas.json
  samples/
    sample-data.csv
    sample-data.json
    real-estate-sample.csv
  render.yaml
  package.json
```

---

## Scope Notes

This version is intentionally practical for evaluation:
- No login/auth flow
- No major architecture refactor
- Live scraping adapters with lightweight parsing and normalization

---

## Author

Farhan Farooq
GitHub: https://github.com/Farha-n
