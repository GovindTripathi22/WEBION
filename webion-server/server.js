const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Agora Token Route
app.get('/api/agora/token', (req, res) => {
  const { channelName } = req.query;
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }
  if (!appId || !appCertificate) {
    return res.status(500).json({ error: 'Agora App ID and Certificate are required in .env' });
  }

  // Set token expiry to 24 hours
  const expirationTimeInSeconds = 3600 * 24;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      0, // uid 0 lets Agora assign a uid
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );
    res.json({ token, channelName });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Socket.io AR Bridge Logic
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Listen for dimensions from Android (Salesperson)
  socket.on('send_ar_dimensions', (data) => {
    console.log('Received AR dimensions:', data);
    // Broadcast immediately to the Next.js Web App
    socket.broadcast.emit('receive_ar_dimensions', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Webion Server is running on port ${PORT}`);
});
