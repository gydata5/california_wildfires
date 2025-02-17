// Create the base map with a corrected URL (removed stray quote)
let basemap = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    });

// Create a new street map tileLayer
let streetmap = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }
);

// Create the map object with center in California
let map = L.map('map', {
    center: [36.7783, -119.4179],
    zoom: 6,
    layers: [basemap]
});

// Add the basemap to the map
basemap.addTo(map);

// Add a global marker cluster group to hold markers and add it to the map
let markersGroup = L.markerClusterGroup();
map.addLayer(markersGroup);

// Make request to California GeoJSON and create a layer
let url = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson";
d3.json(url).then(function(data) {
    L.geoJson(data, {
        style: function(feature) {
            return {
                color: "black",
                fillColor: "white",
                fillOpacity: 0.5,
                weight: 1.5
            };
        }
    }).addTo(map);
});

// Connect to the California wildfires data API
// Modified createMarkers function: clear previous markers before adding new ones
function createMarkers(response) {
    markersGroup.clearLayers(); // Remove previous markers
    for (let i = 0; i < response.length; i++) {
        let location = response[i];
        if (location) {
            markersGroup.addLayer(
                L.marker([location.latitude, location.longitude])
                 .bindPopup("<h3>" + location.name + "</h3><hr><p><b>Acres Burned:</b> " + 
                            location.acres_burned + "<br><b>Year:</b> " + location.year +
                            "<br><b>County:</b> " + location.county + "</p>")
            );
        }
    }
}

// Create a function to retrieve the data
function getData() {
    let url = "http://127.0.0.1:5000/api/v1.0/map_data";
    d3.json(url).then(function(response) {
        let selectedYear = document.getElementById("year").value;
        let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
        createMarkers(filteredResponse);
    });
}

// Define the updateVisualization() function with filtering and marker clearing
function updateVisualization() {
    let selectedYear = document.getElementById("year").value;
    let url = "http://127.0.0.1:5000/api/v1.0/map_data";
    d3.json(url).then(function(response) {
        let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
        createMarkers(filteredResponse);
    });
}

// Add layer control to the map
let baseMaps = {
    "Base Map": basemap,
    "Street Map": streetmap
};

let layerControl = L.control.layers(baseMaps).addTo(map);

// Call the getData function
getData();