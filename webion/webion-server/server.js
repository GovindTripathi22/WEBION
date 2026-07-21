const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Root landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Webion API & Signaling Server</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 480px; }
          h1 { color: #38bdf8; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; }
          a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #0284c7; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
          a:hover { background: #0369a1; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 Webion API Server Active</h1>
          <p>WebRTC & Socket.io Signaling Server is running successfully on Port 4000.</p>
          <p>To access the Virtual Try-On UI and Storefront, open the Next.js Frontend:</p>
          <a href="http://localhost:3000">Open Virtual Fitting Room (Port 3000)</a>
        </div>
      </body>
    </html>
  `);
});

// ─── MySQL Connection Pool ───
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'webion_db',
  waitForConnections: true,
  connectionLimit: 10
});

// Test DB connection on startup
db.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to webion_db');
    conn.release();
  })
  .catch(err => console.error('❌ MySQL connection failed:', err.message));

// ─── Socket.io ───
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── AGORA TOKEN API (existing) ───
app.get('/api/agora/token', (req, res) => {
  const { channelName } = req.query;
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!channelName) return res.status(400).json({ error: 'channelName is required' });
  if (!appId || !appCertificate) return res.status(500).json({ error: 'Agora credentials missing' });

  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 86400;
  try {
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, 0, RtcRole.PUBLISHER, privilegeExpiredTs);
    res.json({ token, channelName });
  } catch (error) {
    res.status(500).json({ error: 'Token generation failed' });
  }
});

// ─── PRODUCTS API ───
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, products: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── AR DIMENSION APIs ───
app.post('/api/ar/garment-dimensions', async (req, res) => {
  try {
    const { product_id, shoulder_width, chest_width, garment_length, sleeve_length } = req.body;
    await db.query(
      'INSERT INTO garment_dimensions (product_id, shoulder_width, chest_width, garment_length, sleeve_length) VALUES (?, ?, ?, ?, ?)',
      [product_id, shoulder_width, chest_width, garment_length, sleeve_length]
    );
    res.json({ success: true, message: 'Garment dimensions saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ar/buyer-dimensions', async (req, res) => {
  try {
    const { session_id, shoulder_width, chest_width, torso_length, hip_width } = req.body;
    await db.query(
      'INSERT INTO buyer_dimensions (session_id, shoulder_width, chest_width, torso_length, hip_width) VALUES (?, ?, ?, ?, ?)',
      [session_id, shoulder_width, chest_width, torso_length, hip_width]
    );
    res.json({ success: true, message: 'Buyer dimensions saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── SIZE MATCH API ───
app.get('/api/ar/size-match', async (req, res) => {
  try {
    const { product_id, session_id } = req.query;

    const [garment] = await db.query(
      'SELECT * FROM garment_dimensions WHERE product_id = ? ORDER BY created_at DESC LIMIT 1',
      [product_id]
    );
    const [buyer] = await db.query(
      'SELECT * FROM buyer_dimensions WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
      [session_id]
    );

    if (garment.length === 0 || buyer.length === 0) {
      return res.json({ success: true, recommendation: 'INSUFFICIENT_DATA', fit_score: 0 });
    }

    const g = garment[0];
    const b = buyer[0];

    // Simple size matching logic
    const shoulderDiff = Math.abs(g.shoulder_width - b.shoulder_width);
    const chestDiff = Math.abs(g.chest_width - b.chest_width);

    let fit_score = 100;
    let recommendation = 'PERFECT_FIT';

    if (shoulderDiff > 5 || chestDiff > 5) {
      fit_score = 60;
      recommendation = g.shoulder_width < b.shoulder_width ? 'TOO_SMALL' : 'TOO_LARGE';
    } else if (shoulderDiff > 2 || chestDiff > 2) {
      fit_score = 82;
      recommendation = 'ACCEPTABLE_FIT';
    } else {
      fit_score = 96;
      recommendation = 'PERFECT_FIT';
    }

    // Save session
    await db.query(
      'INSERT INTO ar_sessions (buyer_session, product_id, fit_score, recommendation) VALUES (?, ?, ?, ?)',
      [session_id, product_id, fit_score, recommendation]
    );

    res.json({
      success: true,
      fit_score,
      recommendation,
      garment_dimensions: g,
      buyer_dimensions: b
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Socket.io (existing + enhanced) ───
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // --- WebRTC Signaling Logic ---
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('user-joined', { userId: socket.id });
  });

  socket.on('offer', (data) => {
    // data: { target, offer }
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('answer', (data) => {
    // data: { target, answer }
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    // data: { target, candidate }
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  // --- Webion Dimensions Logic ---
  socket.on('send_ar_dimensions', async (data) => {
    console.log('AR dimensions received:', data);

    // Save to database
    try {
      await db.query(
        'INSERT INTO garment_dimensions (product_id, shoulder_width, chest_width, garment_length, sleeve_length) VALUES (?, ?, ?, ?, ?)',
        [data.productId || 1, data.shoulderWidth || 0, data.chestWidth || 0, data.mannequinLength || 0, data.sleeveLength || 0]
      );
      console.log('✅ Dimensions saved to MySQL');
    } catch (err) {
      console.log('DB save error (non-fatal):', err.message);
    }

    socket.broadcast.emit('receive_ar_dimensions', data);
  });

  socket.on('negotiation_alert', (data) => {
    console.log('Negotiation alert:', data);
    socket.broadcast.emit('receive_negotiation_alert', data);
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webion Server running on port ${PORT}`);
});
