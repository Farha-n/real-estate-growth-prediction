# Real Estate Growth Prediction System - Submission Summary

Problem Statement 3: Predictive Urban Growth Modeling for Real Estate Investment

Live Demo: https://real-estate-growth-prediction.onrender.com/
Repository: https://github.com/Farha-n/real-estate-growth-prediction

## What Evaluators Should See First

- Interactive hotspot map with marker + heatmap view
- Ranking table with growth-based ordering
- Price chart with projected trend extension
- Source visibility for imported/scraped records

## Practical Features Implemented

- Growth prediction pipeline
  - Price growth, infrastructure, demand, connectivity, rental yield
  - Weighted Growth Velocity Score
  - Zone classification (High, Emerging, Moderate, Low)
- Visual analytics
  - Leaflet map with heat layer and legend
  - Chart.js growth, price, radar charts
  - Table actions to view/edit/delete
- Data workflows
  - Manual area entry
  - CSV/JSON upload with unique merge
  - Add Sample Data (merge-safe)
  - Scrape Live Data (prototype multi-source import by city)

## API Endpoints (Key)

- GET /api/health
- GET /api/areas
- PUT /api/areas
- POST /api/areas
- DELETE /api/areas/:id
- POST /api/scrape

## System Logic (Displayed In UI)

1. Collect area, price, and infrastructure data
2. Measure price growth and rental yield
3. Normalize market indicators
4. Apply weighted Growth Velocity Score
5. Project forward investment trend
6. Visualize hotspots using heatmap, charts, and ranking

## Quick Run

```bash
npm install
npm start
```

Open: http://localhost:3000

## Scope Decision

Kept practical for evaluation:
- No login/auth
- No major architecture rewrite
- Scrape adapters are prototype connectors for ingestion narrative

Submitted by: Farhan Farooq
