// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4P_46dseUNMjhexYFZnYu0GlXbzjBRJk",
  authDomain: "garbage-heatmap-tool-8cf5a.firebaseapp.com",
  projectId: "garbage-heatmap-tool-8cf5a",
  storageBucket: "garbage-heatmap-tool-8cf5a.firebasestorage.app",
  messagingSenderId: "320588132963",
  appId: "1:320588132963:web:ab7003082ee5e7cab6be56"
};
const db = firebase.firestore();
const auth = firebase.auth();

let map; // OpenStreetMap instance
let markers = []; // Store garbage report markers
let complaints = []; // Stores complaints and their status

// Initialize Map
function initMap() {
  map = L.map('map').setView([51.505, -0.09], 13); // Default to London

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors',
  }).addTo(map);

  // Add markers to the map
  markers.forEach(({ lat, lng, location, feedback }) => {
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`<b>${location}</b><br>${feedback || 'No feedback provided'}`);
  });
}

// Load Reports from Firestore
function loadReports() {
  db.collection("garbageReports")
    .orderBy("timestamp", "desc")
    .get()
    .then((querySnapshot) => {
      markers = []; // Clear existing markers
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        markers.push({
          lat: data.lat,
          lng: data.lng,
          location: data.location,
          feedback: data.feedback,
        });
      });
      initMap(); // Refresh the map
    })
    .catch((error) => console.error("Error loading reports:", error));
}

// Handle Report Submission
document.getElementById('report-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const location = document.getElementById('location').value.trim();
  const feedback = document.getElementById('feedback').value.trim();
  const image = document.getElementById('image').files[0];

  if (location && image) {
    // Geocode location using Nominatim API
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`)
      .then((response) => response.json())
      .then((data) => {
        const lat = data[0]?.lat || 51.505;
        const lng = data[0]?.lon || -0.09;

        // Save to Firestore
        db.collection("garbageReports")
          .add({
            location,
            feedback,
            lat,
            lng,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          })
          .then(() => {
            alert("Garbage reported successfully!");
            loadReports(); // Refresh map
          })
          .catch((error) => console.error("Error saving report:", error));
      })
      .catch((error) => console.error("Error fetching location:", error));
  }
});

// Authentication
auth.onAuthStateChanged((user) => {
  const userInfo = document.getElementById("user-info");
  if (user) {
    userInfo.textContent = `Logged in as ${user.email}`;
  } else {
    userInfo.textContent = "Not logged in.";
  }
});

// Handle sign-up form submission
document.getElementById('sign-up-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert("Signed up successfully!"))
    .catch((error) => alert(error.message));
});

// Handle login form submission
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert("Logged in successfully!"))
    .catch((error) => alert(error.message));
});

// Logout functionality
document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut()
    .then(() => alert("Logged out successfully!"))
    .catch((error) => console.error("Error logging out:", error));
});

// Load reports and initialize map on page load
document.addEventListener('DOMContentLoaded', loadReports);
