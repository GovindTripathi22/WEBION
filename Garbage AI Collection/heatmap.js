let map, heatmap;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 28.6139, lng: 77.2090 }, // Example: Centered on New Delhi, India
    mapTypeId: "satellite",
  });

  heatmap = new google.maps.visualization.HeatmapLayer({
    data: [],
    map: map,
  });
}

function addHeatmapPoint(lat, lng) {
  const point = new google.maps.LatLng(lat, lng);
  heatmap.getData().push(point);
}

window.initMap = initMap;
