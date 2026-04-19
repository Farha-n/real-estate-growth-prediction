async function scrapeMagicBricks(city) {
  return [
    {
      areaName: `${city} Sector 45`,
      city,
      latitude: 28.5701,
      longitude: 77.3201,
      currentPrice: 7200,
      previousPrice: 6100,
      infrastructureScore: 78,
      demandScore: 72,
      connectivityScore: 75,
      rentalYield: 4.4,
      listingDensity: 78,
      upcomingProject: "Listing market import",
      source: "magicbricks-prototype",
    },
    {
      areaName: `${city} Sector 62`,
      city,
      latitude: 28.6201,
      longitude: 77.3651,
      currentPrice: 8500,
      previousPrice: 7200,
      infrastructureScore: 74,
      demandScore: 68,
      connectivityScore: 73,
      rentalYield: 4.2,
      listingDensity: 65,
      upcomingProject: "Listing market import",
      source: "magicbricks-prototype",
    },
  ];
}

async function scrapeMunicipalDeclarations(city) {
  return [
    {
      areaName: `${city} Sector 45`,
      city,
      latitude: 28.5701,
      longitude: 77.3201,
      currentPrice: 7200,
      previousPrice: 6100,
      infrastructureScore: 85,
      demandScore: 72,
      connectivityScore: 75,
      rentalYield: 4.4,
      listingDensity: 78,
      upcomingProject: "Metro Phase 3 Extension",
      source: "municipal-corp-prototype",
    },
  ];
}

module.exports = { scrapeMagicBricks, scrapeMunicipalDeclarations };
