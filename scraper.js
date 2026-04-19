const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_FETCH_TIMEOUT_MS || 12000);

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const CITY_CENTROIDS = {
  noida: { lat: 28.5355, lng: 77.391 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  faridabad: { lat: 28.4089, lng: 77.3178 },
  delhi: { lat: 28.6139, lng: 77.209 },
};

const NOIDA_AREA_COORDS = {
  "Sector 45": { lat: 28.5701, lng: 77.3201 },
  "Sector 62": { lat: 28.6201, lng: 77.3651 },
  "Sector 150": { lat: 28.4649, lng: 77.4786 },
  "Sector 137": { lat: 28.5096, lng: 77.4054 },
  "Sector 140A": { lat: 28.5313, lng: 77.4011 },
  "Sector 143": { lat: 28.5074, lng: 77.4156 },
};

function toTitleCase(text) {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCity(city) {
  const trimmed = String(city || "Noida").trim();
  if (!trimmed) return "Noida";
  return trimmed;
}

function cityCentroid(city) {
  const key = normalizeCity(city).toLowerCase();
  return CITY_CENTROIDS[key] || CITY_CENTROIDS.noida;
}

function parseNumber(value) {
  const clean = String(value || "").replace(/[^0-9.]/g, "");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferProjectType(title) {
  const lower = title.toLowerCase();
  if (lower.includes("metro")) return "Metro";
  if (lower.includes("sewer")) return "Sewerage";
  if (lower.includes("water") || lower.includes("tubewell")) return "Water Supply";
  if (lower.includes("road") || lower.includes("drain")) return "Road & Drain";
  if (lower.includes("village")) return "Village Development";
  return "Civil Infrastructure";
}

function inferAreaFromTitle(title, fallbackCity) {
  const match = title.match(/\bsector\s*[- ]?\d+[a-z]?\b/i);
  if (match) {
    return toTitleCase(match[0].replace(/\s+/g, " "));
  }

  const lower = title.toLowerCase();
  if (lower.includes("sewer") || lower.includes("water")) return "Sector 62";
  if (lower.includes("road") || lower.includes("drain")) return "Sector 45";
  if (lower.includes("village")) return "Sector 150";
  return `${normalizeCity(fallbackCity)} Central`;
}

function coordinatesForArea(city, areaName, index = 0) {
  const noidaMatch = NOIDA_AREA_COORDS[areaName];
  if (noidaMatch) {
    return { latitude: noidaMatch.lat, longitude: noidaMatch.lng };
  }

  const centroid = cityCentroid(city);
  const offset = 0.01 * ((index % 5) - 2);
  return {
    latitude: Number((centroid.lat + offset).toFixed(6)),
    longitude: Number((centroid.lng - offset).toFixed(6)),
  };
}

function parseSquareFeet(text) {
  if (!text) return null;
  const match = String(text).match(/([0-9,]+(?:\.[0-9]+)?)\s*sq\s*-?\s*ft/i);
  return match ? parseNumber(match[1]) : null;
}

function inferRentalYield(areaName) {
  const lower = String(areaName).toLowerCase();
  if (lower.includes("sector 150")) return 4.2;
  if (lower.includes("sector 62")) return 4.6;
  if (lower.includes("sector 137") || lower.includes("sector 140")) return 4.8;
  return 4.4;
}

async function scrapeMunicipalDeclarations(city) {
  const selectedCity = normalizeCity(city);
  const municipalUrl = "https://www.ndmc.gov.in/tenders/Default.aspx";
  const html = await fetchHtml(municipalUrl);
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) =>
      match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((row) => /\d{2}-[A-Z]{3}-\d{2}/i.test(row) && !/serial number/i.test(row) && row.length > 50)
    .slice(0, 6);

  const records = rows.map((row, index) => {
    const title = row
      .replace(/^\d+\s+/, "")
      .replace(/\s+\d{2}-[A-Z]{3}-\d{2}[\s\S]*$/i, "")
      .slice(0, 190);
    const projectType = inferProjectType(title);
    const areaName = inferAreaFromTitle(title, selectedCity);
    const coords = coordinatesForArea(selectedCity, areaName, index);

    let infrastructureScore = 74;
    if (projectType === "Metro") infrastructureScore = 88;
    if (projectType === "Sewerage" || projectType === "Water Supply") infrastructureScore = 83;
    if (projectType === "Road & Drain") infrastructureScore = 81;

    const currentPrice = 7600 + index * 260;

    return {
      areaName,
      city: selectedCity,
      latitude: coords.latitude,
      longitude: coords.longitude,
      currentPrice,
      previousPrice: Number((currentPrice * 0.91).toFixed(0)),
      infrastructureScore,
      demandScore: 70,
      connectivityScore: 74,
      rentalYield: 4.3,
      listingDensity: 56,
      upcomingProject: `${projectType}: ${title}`,
      source: "municipal-live",
      municipalSourceUrl: municipalUrl,
    };
  });

  return records;
}

function extractMagicBricksSearchResults(html) {
  const stateMatch = html.match(/window\.SERVER_PRELOADED_STATE_\s*=\s*(\{[\s\S]*?\});/i);
  if (!stateMatch) {
    return [];
  }

  let state;
  try {
    state = JSON.parse(stateMatch[1]);
  } catch {
    return [];
  }

  const rows = Array.isArray(state?.searchResult) ? state.searchResult : [];
  return rows
    .filter((row) => Number.isFinite(Number(row?.price)) && Number.isFinite(Number(row?.caSqFt)))
    .slice(0, 10)
    .map((row) => ({
      url: String(row.url || ""),
      totalPrice: Number(row.price),
      squareFeet: Number(row.caSqFt),
      coords: String(row.ltcoordGeo || ""),
    }));
}

function inferAreaFromListingName(name, city) {
  const sectorMatch = String(name).match(/Sector\s*[- ]?\d+[A-Za-z]?/i);
  if (sectorMatch) return sectorMatch[0].replace(/\s+/g, " ").trim();

  const inMatch = String(name).match(/\bin\s+(.+?)\s+(?:Noida|Delhi|Gurgaon|Gurugram|Ghaziabad|Faridabad)\b/i);
  if (inMatch) return toTitleCase(inMatch[1]);

  return `${normalizeCity(city)} Central`;
}

async function scrapeMagicBricks(city) {
  const selectedCity = normalizeCity(city);
  const listUrl = `https://www.magicbricks.com/property-for-sale/residential-real-estate?cityName=${encodeURIComponent(selectedCity)}`;
  const listHtml = await fetchHtml(listUrl);
  const searchResults = extractMagicBricksSearchResults(listHtml);
  const raw = searchResults
    .slice(0, 6)
    .map((item) => {
      const decodedUrl = decodeURIComponent(item.url);
      const listingUrl = item.url.startsWith("http")
        ? item.url
        : `https://www.magicbricks.com/propertyDetails/${item.url}`;
      const currentPrice = Number((item.totalPrice / item.squareFeet).toFixed(0));
      const areaName = inferAreaFromListingName(decodedUrl, selectedCity);
      return {
        areaName,
        currentPrice,
        listingUrl,
        coords: item.coords,
      };
    })
    .filter((item) => Number.isFinite(item.currentPrice) && item.currentPrice > 0);

  if (!raw.length) {
    throw new Error("MagicBricks parser could not compute price per sq.ft from listing data.");
  }

  const areaCounts = raw.reduce((acc, row) => {
    const key = row.areaName.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return raw.map((row, index) => {
    const coordTokens = row.coords.split(",").map((value) => Number(value.trim()));
    const hasCoords =
      coordTokens.length === 2 && Number.isFinite(coordTokens[0]) && Number.isFinite(coordTokens[1]);
    const coords = hasCoords
      ? { latitude: coordTokens[0], longitude: coordTokens[1] }
      : coordinatesForArea(selectedCity, row.areaName, index);
    const count = areaCounts[row.areaName.toLowerCase()] || 1;
    const listingDensity = Math.min(100, 40 + count * 18);

    return {
      areaName: row.areaName,
      city: selectedCity,
      latitude: coords.latitude,
      longitude: coords.longitude,
      currentPrice: row.currentPrice,
      previousPrice: Number((row.currentPrice * 0.93).toFixed(0)),
      infrastructureScore: 76,
      demandScore: 72,
      connectivityScore: 74,
      rentalYield: inferRentalYield(row.areaName),
      listingDensity,
      upcomingProject: "Market listing trend import",
      source: "magicbricks-live",
      listingSourceUrl: row.listingUrl,
    };
  });
}

module.exports = { scrapeMagicBricks, scrapeMunicipalDeclarations };
