const STORAGE_KEY = "realEstateGrowthPredictionAreas";
const API_HEALTH_URL = "/api/health";
const API_AREAS_URL = "/api/areas";

const sampleAreas = [
  {
    id: crypto.randomUUID(),
    areaName: "Greater Noida West",
    city: "Noida",
    latitude: 28.5801,
    longitude: 77.4253,
    currentPrice: 6200,
    previousPrice: 5100,
    infrastructureScore: 86,
    demandScore: 78,
    connectivityScore: 82,
    rentalYield: 4.8,
    listingDensity: 72,
    upcomingProject: "Metro extension and expressway connectivity",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Noida Sector 150",
    city: "Noida",
    latitude: 28.4649,
    longitude: 77.4786,
    currentPrice: 9400,
    previousPrice: 7800,
    infrastructureScore: 84,
    demandScore: 81,
    connectivityScore: 79,
    rentalYield: 4.3,
    listingDensity: 68,
    upcomingProject: "Sports city and metro corridor",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Gurugram Sector 79",
    city: "Gurugram",
    latitude: 28.3869,
    longitude: 76.9986,
    currentPrice: 11200,
    previousPrice: 9300,
    infrastructureScore: 88,
    demandScore: 85,
    connectivityScore: 91,
    rentalYield: 4.9,
    listingDensity: 76,
    upcomingProject: "Dwarka expressway linkage",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Dwarka Expressway",
    city: "Gurugram",
    latitude: 28.4721,
    longitude: 77.0294,
    currentPrice: 11800,
    previousPrice: 9600,
    infrastructureScore: 90,
    demandScore: 87,
    connectivityScore: 94,
    rentalYield: 5.1,
    listingDensity: 80,
    upcomingProject: "Expressway completion and commercial nodes",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Faridabad Neharpar",
    city: "Faridabad",
    latitude: 28.3964,
    longitude: 77.3152,
    currentPrice: 5600,
    previousPrice: 4900,
    infrastructureScore: 72,
    demandScore: 68,
    connectivityScore: 70,
    rentalYield: 4.4,
    listingDensity: 61,
    upcomingProject: "Metro extension and urban road upgrades",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Sohna Road",
    city: "Gurugram",
    latitude: 28.3336,
    longitude: 77.0587,
    currentPrice: 8500,
    previousPrice: 7200,
    infrastructureScore: 79,
    demandScore: 74,
    connectivityScore: 77,
    rentalYield: 4.6,
    listingDensity: 66,
    upcomingProject: "Commercial corridor and road widening",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Yamuna Expressway",
    city: "Greater Noida",
    latitude: 28.5781,
    longitude: 77.6088,
    currentPrice: 6800,
    previousPrice: 5900,
    infrastructureScore: 83,
    demandScore: 75,
    connectivityScore: 80,
    rentalYield: 4.7,
    listingDensity: 70,
    upcomingProject: "Noida airport access and logistics hub",
  },
  {
    id: crypto.randomUUID(),
    areaName: "Raj Nagar Extension",
    city: "Ghaziabad",
    latitude: 28.6811,
    longitude: 77.4373,
    currentPrice: 5400,
    previousPrice: 4700,
    infrastructureScore: 69,
    demandScore: 64,
    connectivityScore: 67,
    rentalYield: 4.2,
    listingDensity: 59,
    upcomingProject: "Highway access improvements",
  },
];

let areas = [];
let activeFilter = "ALL";
let searchTerm = "";
let apiAvailable = false;
let growthChart;
let priceChart;
let factorChart;
let map;
let markers = new Map();
let editingAreaId = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requiredNumber(value, fieldName, options = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${fieldName} must be greater than or equal to ${options.min}.`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${fieldName} must be less than or equal to ${options.max}.`);
  }

  return parsed;
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
  const latitude = requiredNumber(raw.latitude ?? raw.lat, "Latitude");
  const longitude = requiredNumber(raw.longitude ?? raw.lng ?? raw.lon, "Longitude");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Each row must include valid latitude and longitude values.");
  }

  const currentPrice = requiredNumber(raw.currentPrice, "Current Price", { min: 0.01 });
  const previousPrice = requiredNumber(raw.previousPrice, "Previous Price", { min: 0.01 });
  const infrastructureScore = requiredNumber(raw.infrastructureScore ?? raw.infrastructure, "Infrastructure Score", {
    min: 0,
    max: 100,
  });
  const demandScore = requiredNumber(raw.demandScore ?? raw.demand, "Demand Score", {
    min: 0,
    max: 100,
  });
  const connectivityScore = requiredNumber(raw.connectivityScore ?? raw.connectivity, "Connectivity Score", {
    min: 0,
    max: 100,
  });
  const rentalYield = requiredNumber(raw.rentalYield ?? raw.yield, "Rental Yield", { min: 0 });
  const listingDensity = requiredNumber(raw.listingDensity ?? raw.density, "Listing Density", {
    min: 0,
    max: 100,
  });

  const base = {
    id: raw.id || crypto.randomUUID(),
    areaName: raw.areaName || raw.area || raw.name || "Unnamed Area",
    city: raw.city || raw.town || "Unknown",
    latitude,
    longitude,
    currentPrice,
    previousPrice,
    infrastructureScore,
    demandScore,
    connectivityScore,
    rentalYield,
    listingDensity,
    upcomingProject: raw.upcomingProject || raw.project || "No project listed",
  };

  return { ...base, ...calculateMetrics(base) };
}

function normalizeMany(rows) {
  return rows.map((row) => normalizeArea(row));
}

function mergeUniqueAreas(existingAreas, incomingAreas) {
  const existingKeys = new Set(
    existingAreas.map((area) => `${area.areaName.toLowerCase()}-${area.city.toLowerCase()}`),
  );

  const merged = [...existingAreas];

  for (const area of incomingAreas) {
    const key = `${area.areaName.toLowerCase()}-${area.city.toLowerCase()}`;
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    merged.push(area);
  }

  return merged;
}

function sampleDataset() {
  return sampleAreas.map((area) => normalizeArea({ ...area, id: crypto.randomUUID() }));
}

function loadLocalAreas() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? normalizeMany(parsed) : [];
  } catch {
    return [];
  }
}

function persistLocalAreas() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
  } catch {
    // Ignore localStorage failures in private mode or file:// contexts.
  }
}

function updateStatus(text, tone = "neutral") {
  const status = document.querySelector("#apiStatus");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("muted", tone === "muted");
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function badgeHtml(label) {
  const className =
    label === "High Growth Zone"
      ? "high"
      : label === "Emerging Zone"
        ? "emerging"
        : label === "Moderate Zone"
          ? "moderate"
          : "low";

  return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
}

function markerClass(area) {
  if (area.classification === "High Growth Zone") return "high";
  if (area.classification === "Emerging Zone") return "emerging";
  if (area.classification === "Moderate Zone") return "moderate";
  return "low";
}

function markerIcon(area) {
  return L.divIcon({
    className: "",
    html: `<span class="marker ${markerClass(area)}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -8],
  });
}

function popupHtml(area) {
  return `
    <article class="popup">
      <h3>${escapeHtml(area.areaName)}</h3>
      <p><strong>City:</strong> ${escapeHtml(area.city)}</p>
      <p><strong>Growth Score:</strong> ${formatNumber(area.growthScore)}</p>
      <p><strong>Price Growth:</strong> ${formatNumber(area.priceGrowthPercent, 2)}%</p>
      <p><strong>Classification:</strong> ${escapeHtml(area.classification)}</p>
      <div class="meta">
        <p><strong>Rental Yield:</strong> ${formatNumber(area.rentalYield, 1)}%</p>
        <p><strong>Listing Density:</strong> ${formatNumber(area.listingDensity, 0)}</p>
        <p><strong>Project:</strong> ${escapeHtml(area.upcomingProject)}</p>
      </div>
    </article>
  `;
}

function filteredAreas() {
  const query = searchTerm.trim().toLowerCase();
  return areas.filter((area) => {
    const matchesFilter = activeFilter === "ALL" || area.classification === activeFilter;
    const matchesSearch =
      !query ||
      [area.areaName, area.city, area.upcomingProject, area.classification]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesFilter && matchesSearch;
  });
}

function getSortedAreas(source = areas) {
  return source.slice().sort((left, right) => right.growthScore - left.growthScore);
}

function ensureMap() {
  if (map) return;

  map = L.map("map", { zoomControl: false }).setView([28.5, 77.2], 8);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri | Data &copy; OpenStreetMap contributors",
    },
  ).addTo(map);
}

function renderMap() {
  ensureMap();

  markers.forEach((marker) => marker.remove());
  markers = new Map();

  const visible = filteredAreas();

  visible.forEach((area) => {
    const marker = L.marker([area.latitude, area.longitude], { icon: markerIcon(area) })
      .addTo(map)
      .bindPopup(popupHtml(area));

    markers.set(area.id, marker);
  });

  if (visible.length) {
    const bounds = L.latLngBounds(visible.map((area) => [area.latitude, area.longitude]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
  }
}

function renderStats() {
  const total = areas.length;
  const average = total ? areas.reduce((sum, area) => sum + area.growthScore, 0) / total : 0;
  const bestArea = total ? getSortedAreas(areas)[0] : null;
  const highCount = areas.filter((area) => area.classification === "High Growth Zone").length;

  document.querySelector("#totalAreas").textContent = String(total);
  document.querySelector("#avgScore").textContent = formatNumber(average);
  document.querySelector("#bestZone").textContent = bestArea ? bestArea.areaName : "-";
  document.querySelector("#highCount").textContent = String(highCount);
}

function focusArea(areaId) {
  const area = areas.find((item) => item.id === areaId);
  const marker = markers.get(areaId);
  if (!area || !marker) return;

  document.querySelector("#map").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  map.flyTo([area.latitude, area.longitude], 12, { duration: 0.7 });

  window.setTimeout(() => {
    marker.openPopup();
  }, 750);
}

function setEditingArea(area) {
  editingAreaId = area.id;

  document.querySelector("#areaNameInput").value = area.areaName;
  document.querySelector("#cityInput").value = area.city;
  document.querySelector("#latInput").value = area.latitude;
  document.querySelector("#lngInput").value = area.longitude;
  document.querySelector("#currentPriceInput").value = area.currentPrice;
  document.querySelector("#previousPriceInput").value = area.previousPrice;
  document.querySelector("#infraInput").value = area.infrastructureScore;
  document.querySelector("#demandInput").value = area.demandScore;
  document.querySelector("#connectivityInput").value = area.connectivityScore;
  document.querySelector("#yieldInput").value = area.rentalYield;
  document.querySelector("#densityInput").value = area.listingDensity;
  document.querySelector("#projectInput").value = area.upcomingProject;

  document.querySelector("#submitAreaBtn").textContent = "Update Area";
  document.querySelector("#cancelEditBtn").hidden = false;

  document.querySelector("#areaForm").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function clearEditMode() {
  editingAreaId = null;
  document.querySelector("#areaForm").reset();
  document.querySelector("#submitAreaBtn").textContent = "Add Area";
  document.querySelector("#cancelEditBtn").hidden = true;
}

function removeArea(areaId) {
  areas = areas.filter((area) => area.id !== areaId);
  persistLocalAreas();
  syncAreas();
  renderAll();
}

function renderTable() {
  const body = document.querySelector("#rankingBody");
  const visible = filteredAreas();
  const sorted = getSortedAreas(visible);

  body.innerHTML = "";

  sorted.forEach((area) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(area.areaName)}</td>
      <td>${escapeHtml(area.city)}</td>
      <td>${formatNumber(area.growthScore)}</td>
      <td>${formatNumber(area.priceGrowthPercent, 2)}%</td>
      <td>${formatNumber(area.rentalYield, 1)}%</td>
      <td>${formatNumber(area.listingDensity, 0)}</td>
      <td>${badgeHtml(area.classification)}</td>
      <td>
        <div class="table-actions">
          <button class="table-button" type="button" data-action="view">View</button>
          <button class="table-button" type="button" data-action="edit">Edit</button>
          <button class="table-button danger" type="button" data-action="delete">Delete</button>
        </div>
      </td>
    `;

    row.addEventListener("click", () => focusArea(area.id));
    row.querySelector('[data-action="view"]').addEventListener("click", (event) => {
      event.stopPropagation();
      focusArea(area.id);
    });
    row.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
      event.stopPropagation();
      setEditingArea(area);
    });
    row.querySelector('[data-action="delete"]').addEventListener("click", (event) => {
      event.stopPropagation();
      const confirmed = window.confirm(`Delete ${area.areaName}?`);
      if (confirmed) removeArea(area.id);
    });

    body.appendChild(row);
  });

  document.querySelector("#resultCount").textContent = `${sorted.length} result${sorted.length === 1 ? "" : "s"}`;
}

function ensureCharts() {
  const growthCtx = document.querySelector("#growthChart");
  const priceCtx = document.querySelector("#priceChart");
  const factorCtx = document.querySelector("#factorChart");

  if (!growthChart) {
    growthChart = new Chart(growthCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Growth Score",
            data: [],
            borderRadius: 8,
            backgroundColor: "rgba(11,114,105,0.8)",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, suggestedMax: 100 },
        },
      },
    });
  }

  if (!priceChart) {
    priceChart = new Chart(priceCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Current Price",
            data: [],
            borderColor: "rgba(219,108,47,1)",
            backgroundColor: "rgba(219,108,47,0.16)",
            tension: 0.3,
            fill: true,
          },
          {
            label: "Previous Price",
            data: [],
            borderColor: "rgba(11,114,105,1)",
            backgroundColor: "rgba(11,114,105,0.12)",
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  if (!factorChart) {
    factorChart = new Chart(factorCtx, {
      type: "radar",
      data: {
        labels: ["Price Growth", "Infrastructure", "Demand", "Connectivity", "Rental Yield"],
        datasets: [
          {
            label: "Average Factor Score",
            data: [0, 0, 0, 0, 0],
            backgroundColor: "rgba(11,114,105,0.18)",
            borderColor: "rgba(11,114,105,1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(11,114,105,1)",
          },
        ],
      },
      options: {
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
      },
    });
  }
}

function renderCharts() {
  ensureCharts();

  const visible = getSortedAreas(filteredAreas());
  const displayAreas = visible.length ? visible : [];

  growthChart.data.labels = displayAreas.map((area) => area.areaName);
  growthChart.data.datasets[0].data = displayAreas.map((area) => Number(area.growthScore.toFixed(2)));
  growthChart.update();

  priceChart.data.labels = displayAreas.map((area) => area.areaName);
  priceChart.data.datasets[0].data = displayAreas.map((area) => Number(area.currentPrice));
  priceChart.data.datasets[1].data = displayAreas.map((area) => Number(area.previousPrice));
  priceChart.update();

  const total = displayAreas.length || 1;
  const averagePriceGrowthScore = displayAreas.reduce((sum, area) => sum + area.priceGrowthScore, 0) / total;
  const averageInfrastructure = displayAreas.reduce((sum, area) => sum + area.infrastructureScore, 0) / total;
  const averageDemand = displayAreas.reduce((sum, area) => sum + area.demandScore, 0) / total;
  const averageConnectivity = displayAreas.reduce((sum, area) => sum + area.connectivityScore, 0) / total;
  const averageRentalYieldScore = displayAreas.reduce((sum, area) => sum + area.rentalYieldScore, 0) / total;

  factorChart.data.datasets[0].data = [
    Number(averagePriceGrowthScore.toFixed(1)),
    Number(averageInfrastructure.toFixed(1)),
    Number(averageDemand.toFixed(1)),
    Number(averageConnectivity.toFixed(1)),
    Number(averageRentalYieldScore.toFixed(1)),
  ];
  factorChart.update();
}

function renderAll() {
  renderStats();
  renderMap();
  renderTable();
  renderCharts();
}

async function syncAreas() {
  persistLocalAreas();

  if (!apiAvailable) {
    updateStatus("Local fallback active", "muted");
    return;
  }

  try {
    const response = await fetch(API_AREAS_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ areas }),
    });

    if (!response.ok) {
      throw new Error("Failed to sync areas");
    }

    const payload = await response.json();
    if (Array.isArray(payload.areas) && payload.areas.length) {
      areas = normalizeMany(payload.areas);
      persistLocalAreas();
    }

    updateStatus("API connected", "neutral");
  } catch {
    apiAvailable = false;
    updateStatus("Local fallback active", "muted");
  }
}

async function bootstrapAreas() {
  const backup = loadLocalAreas();

  try {
    const healthResponse = await fetch(API_HEALTH_URL);
    if (!healthResponse.ok) {
      throw new Error("Health check failed");
    }

    const payload = await fetch(API_AREAS_URL).then((response) => response.json());
    const serverAreas = Array.isArray(payload.areas) ? normalizeMany(payload.areas) : [];

    apiAvailable = true;
    areas = serverAreas.length ? serverAreas : backup.length ? backup : sampleDataset();
    persistLocalAreas();

    if (!serverAreas.length) {
      await syncAreas();
    }

    updateStatus("API connected", "neutral");
  } catch {
    apiAvailable = false;
    areas = backup.length ? backup : sampleDataset();
    persistLocalAreas();
    updateStatus("Local fallback active", "muted");
  }

  renderAll();
}

document.querySelector("#areaForm").addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const newArea = normalizeArea({
      areaName: document.querySelector("#areaNameInput").value,
      city: document.querySelector("#cityInput").value,
      latitude: document.querySelector("#latInput").value,
      longitude: document.querySelector("#lngInput").value,
      currentPrice: document.querySelector("#currentPriceInput").value,
      previousPrice: document.querySelector("#previousPriceInput").value,
      infrastructureScore: document.querySelector("#infraInput").value,
      demandScore: document.querySelector("#demandInput").value,
      connectivityScore: document.querySelector("#connectivityInput").value,
      rentalYield: document.querySelector("#yieldInput").value,
      listingDensity: document.querySelector("#densityInput").value,
      upcomingProject: document.querySelector("#projectInput").value,
    });

    areas = editingAreaId
      ? areas.map((area) =>
          area.id === editingAreaId ? { ...newArea, id: editingAreaId } : area,
        )
      : [...areas, newArea];

    clearEditMode();
    renderAll();
    syncAreas();
  } catch (error) {
    window.alert(error.message);
  }
});

document.querySelector("#cancelEditBtn").addEventListener("click", () => {
  clearEditMode();
});

document.querySelector("#searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderAll();
});

document.querySelector("#uploadInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".json")
      ? JSON.parse(text)
      : parseCsv(text);

    const rows = Array.isArray(parsed) ? parsed : parsed.records;
    const uploadedAreas = normalizeMany(rows);

    const nextAreas = mergeUniqueAreas(areas, uploadedAreas);
    const newAreas = nextAreas.slice(areas.length);

    areas = nextAreas;

    renderAll();
    syncAreas();

    if (newAreas.length === 0) {
      window.alert("Uploaded records already exist.");
    } else {
      window.alert(`Added ${newAreas.length} uploaded records.`);
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#loadSampleBtn").addEventListener("click", () => {
  const samples = sampleDataset();

  const nextAreas = mergeUniqueAreas(areas, samples);
  const newSamples = nextAreas.slice(areas.length);

  areas = nextAreas;

  renderAll();
  syncAreas();

  if (newSamples.length === 0) {
    window.alert("Sample records are already loaded.");
  } else {
    window.alert(`Added ${newSamples.length} sample records.`);
  }
});

document.querySelector("#exportJsonBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(areas, null, 2)], { type: "application/json" });
  downloadFile(blob, "real-estate-growth-predictions.json");
});

document.querySelector("#exportCsvBtn").addEventListener("click", () => {
  const csv = toCsv(areas);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadFile(blob, "real-estate-growth-predictions.csv");
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((node) => node.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderAll();
  });
});

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length || currentRow.length) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows.shift().map((header) => header.trim());

  return rows.map((row) => {
    return headers.reduce((record, header, index) => {
      record[header] = row[index] || "";
      return record;
    }, {});
  });
}

function toCsv(rows) {
  const headers = [
    "areaName",
    "city",
    "latitude",
    "longitude",
    "currentPrice",
    "previousPrice",
    "infrastructureScore",
    "demandScore",
    "connectivityScore",
    "rentalYield",
    "listingDensity",
    "upcomingProject",
    "priceGrowthPercent",
    "growthScore",
    "classification",
  ];

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header] ?? row[header] ?? "")).join(","),
    ),
  ].join("\n");
}

function downloadFile(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

bootstrapAreas();
