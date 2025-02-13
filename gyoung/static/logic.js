// Function to determine the color based on total acres burned
function chooseColor(acres) {
  if (acres > 100000) return "#ea2c2c"; // high acres burned
  if (acres > 50000) return "#ea822c"; // medium-high acres burned
  if (acres > 10000) return "#ee9c00"; // medium acres burned
  return "#98ee00"; // low acres burned
}

// Fetch and display the map with wildfire data by county
function createMap() {
  // Create base map layers
  let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  });

  // Fetch wildfire data (acres burned by county)
  fetch(`/api/v1.0/map_data`)
    .then(response => response.json())
    .then(wildfireData => {
      // Fetch CSV and then GeoJSON for California counties
      // fetch('NEED A Pathcalifornia-counties.geojson')
        .then(response => response.json())
        .then(countyGeoJSON => {
          // Create map object
          let myMap = L.map("map", {
            center: [37.5, -119.5], // Center the map on California
            zoom: 6,
            layers: [street] // Start with the street layer
          });
      
      
      
        console.log(data); 
      });

          // Create map object
          let myMap = L.map("map", {
            center: [37.5, -119.5], 
            zoom: 6,
            layers: [street] 
          });

          // Add GeoJSON layer for counties with color coding based on acres burned
          L.geoJSON(countyGeoJSON, {
            style: function (feature) {
              // Find the corresponding wildfire data for the county
              let county = wildfireData.find(data => data.county === feature.properties.name);
              let acresBurned = county ? county.total_acres_burned : 0;
              
              return {
                color: chooseColor(acresBurned),
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
              };
            },
            onEachFeature: function (feature, layer) {
              // Display county name and acres burned on hover
              let county = wildfireData.find(data => data.county === feature.properties.name);
              let acresBurned = county ? county.total_acres_burned : 0;
              let numWildfires = county ? county.num_wildfires : 0;
              layer.bindPopup(`<h3>${feature.properties.name}</h3>
                               <p>Acres Burned: ${acresBurned.toLocaleString()}</p>
                               <p>Number of Wildfires: ${numWildfires}</p>`);
            }
          }).addTo(myMap);

          // Add the layer control for switching base layers
          let baseMaps = {
            Street: street,
            Topography: topo
          };

          L.control.layers(baseMaps).addTo(myMap);
        });
}

// Event listener for page load
window.onload = function() {
  createMap(); // Initialize the map on page load
};
