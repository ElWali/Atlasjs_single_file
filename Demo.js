// Set the default icon path to a CDN
atlas.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

// Initialize the map
const map = new atlas.Map('map');

// Set the view to Morocco
map.setView([31.7917, -7.0926], 6);

// Add a tile layer
const tileLayer = new atlas.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
map.addLayer(tileLayer);

// Add a marker for Casablanca
const marker = new atlas.Marker([33.5731, -7.5898]);
marker.bindPopup('<b>Hello from Casablanca!</b><br>This is a popup.');
map.addLayer(marker);
marker._openPopup();

// Add controls
map.addControl(new atlas.ZoomControl());
map.addControl(new atlas.AttributionControl());
map.addControl(new atlas.ScaleControl());
