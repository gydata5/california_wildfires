let tableData = [];
let wildfireSortOrder = 'asc'; // Global sort order for wildfires
let acresSortOrder = 'asc';    // Global sort order for acres
let countySortOrder = 'asc';   // Global sort order for county
let yearSortOrder = 'asc';

let markersByCounty = {}; // New global variable to map county to a marker
let tableExpanded = false;         // New global flag for table expansion
let lastRenderData = [];           // New global storage for last rendered data

// New global variables for choropleth map
let countyLayer;
let aggregatedAcres = {};

function generateTable() {
    d3.json("/api/v1.0/table_data").then(function(data) {
        tableData = data;
        renderTable(data);
        renderBarChart(data); // Added: Render bar chart on data load
        updateChoropleth(data); // New: Update choropleth based on table data
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
  layers: [streetmap]
});

// Add the basemap to the map
streetmap.addTo(map);

// Create and add a global marker cluster group to be toggled via overlay control
let markersGroup = L.markerClusterGroup();
// Instead of adding markersGroup directly, it will be added through layer control
// map.addLayer(markersGroup); 

// Function to determine color based on acres burned
function getColor(acres) {
    return acres > 1000000 ? '#800026' :
           acres > 500000  ? '#BD0026' :
           acres > 200000  ? '#E31A1C' :
           acres > 100000  ? '#FC4E2A' :
           acres > 50000   ? '#FD8D3C' :
           acres > 20000   ? '#FEB24C' :
           acres > 10000   ? '#FED976' :
                             '#FFEDA0';
}

// Function to style each county feature using aggregated acres data
function styleFeature(feature) {
    let countyName = feature.properties.name;
    let acres = aggregatedAcres[countyName] || 0;
    return {
        fillColor: getColor(acres),
        weight: 1.5,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.7
    };
}

// Function to update choropleth style by aggregating acres burned per county
function updateChoropleth(data) {
    aggregatedAcres = {};
    data.forEach(row => {
        let county = row.county;
        let acres = +row.total_acres_burned || 0;
        aggregatedAcres[county] = (aggregatedAcres[county] || 0) + acres;
    });
    if (countyLayer) {
        countyLayer.setStyle(styleFeature);
    }
}

// Replace existing GeoJSON layer creation with choropleth layer
let countiesGeoJSONUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson";
d3.json(countiesGeoJSONUrl).then(function(data) {
    countyLayer = L.geoJson(data, {
        style: styleFeature
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
  let url = "/api/v1.0/map_data";
  d3.json(url).then(function(response) {
      let selectedYear = document.getElementById("yearSelect").value;
      let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
      createMarkers(filteredResponse);
  });
}

// Render bar chart with Plotly
function renderBarChart(data) {
    // Colors for each year
    const yearColors = {
        "2013": "rgba(255, 99, 132, 0.6)",
        "2014": "rgba(54, 162, 235, 0.6)",
        "2015": "rgba(255, 206, 86, 0.6)",
        "2016": "rgba(75, 192, 192, 0.6)",
        "2017": "rgba(153, 102, 255, 0.6)",
        "2018": "rgba(255, 159, 64, 0.6)",
        "2019": "rgba(199, 199, 199, 0.6)",
};
    // Filter out Mexico and Nevada
    let filteredData = data.filter(item => item.county !== "Mexico" && item.county !== "State of Nevada" && item.county !== "State of Oregon");

    // Extract y (county) and x (number of wildfires) for horizontal bar chart
    let sortedData = filteredData.sort((a,b)=> a.num_wildfires - b.num_wildfires);
    console.log(sortedData)

    // Separate data by year
    let groupedByYear = {};
    sortedData.forEach(item => {
        if (!groupedByYear[item.year]) {
            groupedByYear[item.year] = { counties: [], wildfireCounts: [] };
        }
        groupedByYear[item.year].counties.push(item.county);
        groupedByYear[item.year].wildfireCounts.push(item.num_wildfires);
    });

    // Prepare traces for the bar chart
    let traceData = [];
    const selectedYear = document.getElementById("yearSelect").value;

    if (selectedYear === "all") {
        // If "All Years" is selected, create a trace for each year with different colors
        Object.keys(groupedByYear).forEach(year => {
            traceData.push({
                x: groupedByYear[year].wildfireCounts,
                y: groupedByYear[year].counties,
                type: 'bar',
                orientation: 'h',
                name: year,
                marker: {
                    color: yearColors[year] 
                }
            });
        });
    } else {
        // If a specific year is selected, create one trace for that year
        traceData.push({
            x: groupedByYear[selectedYear].wildfireCounts,
            y: groupedByYear[selectedYear].counties,
            type: 'bar',
            orientation: 'h',
            name: selectedYear,
            marker: {
                color: yearColors[selectedYear]  
            }
        });
    }

    // Layout for the bar chart
    var layout = {
        xaxis: { title: 'Number of Wildfires' },
        margin: { t: 30, l: 150 }, // Increased left margin to prevent cut off labels
        paper_bgcolor: 'rgba(0,0,0,0)', // Remove paper background
        plot_bgcolor: 'rgba(0,0,0,0)',   // Remove plot background
        font: { color: 'white' }, // Set font color to white
        barmode: 'stack' // Stack the bars when multiple years are shown
    };

    // Create the bar chart
    Plotly.newPlot('barChart', traceData, layout);
}

// Define the updateVisualization() function with filtering and marker clearing
function updateVisualization() {
    let selectedYear = document.getElementById("yearSelect").value;
    tableExpanded = false; // Reset table expansion flag for new selection
    // Reset map zoom and center to default values
    map.setView([37.4783, -119.4179], 6);
    
    // Update markers on the map
    let url = "/api/v1.0/map_data";
    d3.json(url).then(function(response) {
        let filteredResponse = selectedYear === "all" ? response : response.filter(item => item.year == selectedYear);
        createMarkers(filteredResponse);
    });
    
    // Update table data and choropleth
    let filteredTableData = selectedYear === "all" ? tableData : tableData.filter(row => row.year == selectedYear);
    renderTable(filteredTableData);
    renderBarChart(filteredTableData);
    updateChoropleth(filteredTableData); // New: Refresh choropleth based on filtered data
}

// Add layer control to the map
let baseMaps = {
  "Base Map": basemap,
  "Street Map": streetmap
};
let overlayMaps = {
  "Markers": markersGroup
};
let layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

// New: Add legend to the map for Choropleth colors with title
let legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    let div = L.DomUtil.create('div', 'info legend');
    // Add legend title
    div.innerHTML = '<strong>Total Acres Burned</strong><br>';
    let grades = [0, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
    return div;
};
legend.addTo(map);

// New: Global flag and function to toggle legend visibility
let legendOn = true;
function toggleLegend() {
    if (legendOn) {
        map.removeControl(legend);
        legendOn = false;
    } else {
        legend.addTo(map);
        legendOn = true;
    }
}

// New: Define custom control for toggling legend on the map with bold text
let LegendToggleControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function(map) {
        let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px';
        container.style.cursor = 'pointer';
        container.style.color = 'black';
        container.title = 'Toggle Legend';
        container.innerHTML = '<b>Toggle Legend</b>';
        container.onclick = function() {
            toggleLegend();
        };
        return container;
    }
});
let legendToggleControl = new LegendToggleControl();
legendToggleControl.addTo(map);

// Call the getData function
getData();