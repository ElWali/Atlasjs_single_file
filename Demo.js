// Set the default icon path to a CDN
atlas.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

// Initialize the map and set its view to a chosen geographical coordinates and zoom level
var map = atlas.map('map').setView([31.7917, -7.0926], 6); // Centered on Morocco

// Add a tile layer to the map
atlas.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Add a marker to the map
atlas.marker([33.5731, -7.5898]).addTo(map) // Casablanca
    .bindPopup('<b>Hello from Casablanca!</b><br>This is a popup.')
    .openPopup();
