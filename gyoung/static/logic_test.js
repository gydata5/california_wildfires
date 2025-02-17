let tableData = [];
let wildfireSortOrder = 'asc'; // Global sort order for wildfires
let acresSortOrder = 'asc';    // Global sort order for acres
let countySortOrder = 'asc';   // Global sort order for county
let yearSortOrder = 'asc';

let markersByCounty = {}; // New global variable to map county to a marker
let tableExpanded = false;         // New global flag for table expansion
let lastRenderData = [];           // New global storage for last rendered data

function generateTable() {
    d3.json("http://127.0.0.1:5000/api/v1.0/table_data").then(function(data) {
        tableData = data;
        renderTable(data);
        renderBarChart(data); // Added: Render bar chart on data load
    }).catch(function(error) {
        console.error("Error loading the data:", error);
    });
}

function renderTable(data) {
    const tableBody = document.getElementById('wildfireTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    lastRenderData = data; // Store for future toggling
    const rowsToShow = (!tableExpanded && data.length > 23) ? data.slice(0, 23) : data;
    rowsToShow.forEach(row => {
        const newRow = tableBody.insertRow();
        newRow.setAttribute("data-county", row.county); // Attach county to the row
        newRow.addEventListener("click", function() {
            const county = this.getAttribute("data-county");
            if (markersByCounty[county]) {
                const markerLatLng = markersByCounty[county].getLatLng();
                map.setView(markerLatLng, 10); // Zoom in to the county
                markersByCounty[county].openPopup();
            }
        });
        newRow.innerHTML = `
            <td>${row.county}</td>
            <td>${row.num_wildfires}</td>
            <td>${row.total_acres_burned}</td>
            <td>${row.year}</td>
        `;
    });
    if(data.length > 23){
        const buttonRow = tableBody.insertRow();
        const cell = buttonRow.insertCell();
        cell.colSpan = 4; // Adjust based on number of columns
        if(!tableExpanded) {
            cell.innerHTML = '<button class="btn btn-secondary btn-sm" onclick="expandTable()">Show More</button>';
        } else {
            cell.innerHTML = '<button class="btn btn-secondary btn-sm" onclick="collapseTable()">Show Less</button>';
        }
    }
}

// New function to expand the table
function expandTable() {
    tableExpanded = true;
    renderTable(lastRenderData);
}

// New function to collapse the table
function collapseTable() {
    tableExpanded = false;
    renderTable(lastRenderData);
}

function toggleSortWildfires() {
    wildfireSortOrder = wildfireSortOrder === 'asc' ? 'desc' : 'asc';
    const selectedYear = document.getElementById("yearSelect").value;
    const filteredData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    const sortedData = [...filteredData].sort((a, b) =>
        wildfireSortOrder === 'asc' ? a.num_wildfires - b.num_wildfires : b.num_wildfires - a.num_wildfires
    );
    renderTable(sortedData);
}

function toggleSortAcres() {
    acresSortOrder = acresSortOrder === 'asc' ? 'desc' : 'asc';
    const selectedYear = document.getElementById("yearSelect").value;
    const filteredData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    const sortedData = [...filteredData].sort((a, b) =>
        acresSortOrder === 'asc' ? a.total_acres_burned - b.total_acres_burned : b.total_acres_burned - a.total_acres_burned
    );
    renderTable(sortedData);
}

function toggleSortCounty() {
    countySortOrder = countySortOrder === 'asc' ? 'desc' : 'asc';
    const selectedYear = document.getElementById("yearSelect").value;
    const filteredData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    const sortedData = [...filteredData].sort((a, b) => 
        countySortOrder === 'asc' 
            ? a.county.localeCompare(b.county) 
            : b.county.localeCompare(a.county)
    );
    renderTable(sortedData);
}
  
function toggleSortYear() {
    yearSortOrder = yearSortOrder === 'asc' ? 'desc' : 'asc';
    const selectedYear = document.getElementById("yearSelect").value;
    const filteredData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    const sortedData = [...filteredData].sort((a, b) => 
        yearSortOrder === 'asc' 
            ? a.year - b.year 
            : b.year - a.year
    );
    renderTable(sortedData);
}

// Call the function to generate the table
generateTable();

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
  center: [37.4783, -119.4179],
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
// Modified createMarkers function: clear previous markers before adding new ones and store first marker per county
function createMarkers(response) {
  markersGroup.clearLayers(); // Remove previous markers
  markersByCounty = {}; // Reset county marker mapping
  for (let i = 0; i < response.length; i++) {
      let location = response[i];
      if (location) {
          let marker = L.marker([location.latitude, location.longitude])
              .bindPopup("<h3>" + location.name + "</h3><hr><p><b>Acres Burned:</b> " + 
                          location.acres_burned + "<br><b>Year:</b> " + location.year +
                          "<br><b>County:</b> " + location.county + "</p>");
          // Store first marker of the county for navigation
          if (!markersByCounty[location.county]) {
              markersByCounty[location.county] = marker;
          }
          markersGroup.addLayer(marker);
      }
  }
}

// Create a function to retrieve the data
function getData() {
  let url = "http://127.0.0.1:5000/api/v1.0/map_data";
  d3.json(url).then(function(response) {
      let selectedYear = document.getElementById("yearSelect").value;
      let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
      createMarkers(filteredResponse);
  });
}

// New function to render bar chart with Plotly
function renderBarChart(data) {
    // Extract y (county) and x (number of wildfires) for horizontal bar chart
    const yValues = data.map(item => item.county);
    const xValues = data.map(item => item.num_wildfires);

    var trace = {
        x: xValues,
        y: yValues,
        type: 'bar',
        orientation: 'h',
        marker: { color: '#df691a' } // Updated: Set bar color to match the Generate Visualization button
    };

    var layout = {
        xaxis: { title: 'Number of Wildfires' },
        margin: { t: 30, l: 150 }, // Increased left margin to prevent cut off labels
        paper_bgcolor: 'rgba(0,0,0,0)', // Remove paper background
        plot_bgcolor: 'rgba(0,0,0,0)',   // Remove plot background
        font: { color: 'white' } // Added: Set font color to white
    };

    Plotly.newPlot('barChart', [trace], layout);
}

// Define the updateVisualization() function with filtering and marker clearing
function updateVisualization() {
    let selectedYear = document.getElementById("yearSelect").value;
    tableExpanded = false; // Reset table expansion flag for new selection
    // Reset map zoom and center to default values
    map.setView([37.4783, -119.4179], 6);
    
    // Update markers on the map
    let url = "http://127.0.0.1:5000/api/v1.0/map_data";
    d3.json(url).then(function(response) {
        let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
        createMarkers(filteredResponse);
    });
    
    // Update table data
    let filteredTableData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    renderTable(filteredTableData);
    
    // Update bar chart visualization
    renderBarChart(filteredTableData);
}

// Add layer control to the map
let baseMaps = {
  "Base Map": basemap,
  "Street Map": streetmap
};

let layerControl = L.control.layers(baseMaps).addTo(map);

// Call the getData function
getData();