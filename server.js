const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "areas.json");
const sampleFile = path.join(rootDir, "sample-data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(rootDir));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateMetrics(record) {
  const previousPrice = toNumber(record.previousPrice);
  const currentPrice = toNumber(record.currentPrice);

  if (previousPrice <= 0) {
    throw new Error("Previous price must be greater than 0.");
  }

  const priceGrowthPercent = ((currentPrice - previousPrice) / previousPrice) * 100;
  const priceGrowthScore = clamp(priceGrowthPercent * 4, 0, 100);
  const infrastructureScore = clamp(toNumber(record.infrastructureScore), 0, 100);
  const demandScore = clamp(toNumber(record.demandScore), 0, 100);
  const connectivityScore = clamp(toNumber(record.connectivityScore), 0, 100);
  const rentalYield = clamp(toNumber(record.rentalYield), 0, 12);
  const rentalYieldScore = clamp(rentalYield * 20, 0, 100);
  const growthScore =
    priceGrowthScore * 0.3 +
    infrastructureScore * 0.25 +
    demandScore * 0.2 +
    connectivityScore * 0.15 +
    rentalYieldScore * 0.1;

  let classification = "Low Priority Zone";
  if (growthScore >= 80) classification = "High Growth Zone";
  else if (growthScore >= 60) classification = "Emerging Zone";
  else if (growthScore >= 40) classification = "Moderate Zone";

  return {
    priceGrowthPercent,
    priceGrowthScore,
    rentalYieldScore,
    growthScore,
    classification,
  };
}

function normalizeArea(raw) {
  const latitude = toNumber(raw.latitude ?? raw.lat);
  const longitude = toNumber(raw.longitude ?? raw.lng ?? raw.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Each row must include valid latitude and longitude values.");
  }

  const base = {
    id: raw.id || randomUUID(),
    areaName: raw.areaName || raw.area || raw.name || "Unnamed Area",
    city: raw.city || raw.town || "Unknown",
    latitude,
    longitude,
    currentPrice: toNumber(raw.currentPrice),
    previousPrice: toNumber(raw.previousPrice),
    infrastructureScore: toNumber(raw.infrastructureScore ?? raw.infrastructure),
    demandScore: toNumber(raw.demandScore ?? raw.demand),
    connectivityScore: toNumber(raw.connectivityScore ?? raw.connectivity),
    rentalYield: toNumber(raw.rentalYield ?? raw.yield),
    listingDensity: toNumber(raw.listingDensity ?? raw.density),
    upcomingProject: raw.upcomingProject || raw.project || "No project listed",
  };

  return { ...base, ...calculateMetrics(base) };
}

function normalizeMany(rows) {
  return rows.map((row) => normalizeArea(row));
}

async function readSeedData() {
  try {
    const text = await fs.readFile(sampleFile, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function createJsonStore() {
  await fs.mkdir(dataDir, { recursive: true });

  async function ensureFile() {
    try {
      await fs.access(dataFile);
    } catch {
      const seed = await readSeedData();
      await fs.writeFile(dataFile, JSON.stringify(normalizeMany(seed), null, 2), "utf8");
    }
  }

  async function getAreas() {
    await ensureFile();
    const text = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(text || "[]");
    return normalizeMany(Array.isArray(parsed) ? parsed : []);
  }

  async function setAreas(nextAreas) {
    await fs.writeFile(dataFile, JSON.stringify(normalizeMany(nextAreas), null, 2), "utf8");
    return normalizeMany(nextAreas);
  }

  return {
    storageType: "json",
    getAreas,
    setAreas,
  };
}

async function createMongoStore() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || "cyberjoar";
    const collectionName = process.env.MONGODB_COLLECTION || "real_estate_zones";
    const collection = client.db(dbName).collection(collectionName);

    return {
      storageType: "mongodb",
      async getAreas() {
        const rows = await collection.find({}).toArray();
        return normalizeMany(rows);
      },
      async setAreas(nextAreas) {
        const normalized = normalizeMany(nextAreas);
        await collection.deleteMany({});
        if (normalized.length) {
          await collection.insertMany(normalized);
        }
        return normalized;
      },
    };
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

async function buildStore() {
  try {
    const mongoStore = await createMongoStore();
    if (mongoStore) {
      return mongoStore;
    }
  } catch (error) {
    console.warn("MongoDB unavailable, using local JSON store:", error.message);
  }

  return createJsonStore();
}

function successResponse(res, payload) {
  res.json(payload);
}

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

async function start() {
  const store = await buildStore();
  let cachedAreas = await store.getAreas();

  if (!cachedAreas.length) {
    const seed = await readSeedData();
    if (seed.length) {
      cachedAreas = normalizeMany(seed);
      await store.setAreas(cachedAreas);
    }
  }

  app.get("/api/health", (req, res) => {
    successResponse(res, {
      ok: true,
      storage: store.storageType,
      count: cachedAreas.length,
    });
  });

  app.get("/api/areas", async (req, res, next) => {
    try {
      cachedAreas = await store.getAreas();
      successResponse(res, { areas: cachedAreas });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/areas", async (req, res, next) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : req.body?.areas;
      if (!Array.isArray(payload)) {
        return badRequest(res, "Request body must contain an array of areas.");
      }

      cachedAreas = await store.setAreas(payload);
      successResponse(res, { areas: cachedAreas });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/areas", async (req, res, next) => {
    try {
      const nextArea = normalizeArea(req.body);
      cachedAreas = await store.setAreas([...cachedAreas, nextArea]);
      successResponse(res, { area: nextArea, areas: cachedAreas });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/areas/:id", async (req, res, next) => {
    try {
      const nextAreas = cachedAreas.filter((area) => area.id !== req.params.id);
      cachedAreas = await store.setAreas(nextAreas);
      successResponse(res, { areas: cachedAreas });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  });

  app.listen(port, () => {
    console.log(`Real Estate Growth Prediction System running on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});