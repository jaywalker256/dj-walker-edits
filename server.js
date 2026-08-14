import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configure Multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150MB max file size
});

// Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// JSON File Helper Utilities
const TRACKS_FILE = path.join(DATA_DIR, 'tracks.json');
const SITE_INFO_FILE = path.join(DATA_DIR, 'site-info.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

const defaultTracks = [
  {
    id: "track-1",
    title: "Good Morning My Love",
    artist: "DJ Walker UG",
    genre: "Ug Vibes",
    src: "/assets/audio/good-morning-my-love.wav",
    date: "2026-08-01",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    downloads: 1820,
    plays: 4890,
    featured: true
  },
  {
    id: "track-2",
    title: "Pearl of Africa Amapiano",
    artist: "DJ Walker UG",
    genre: "Amapiano & Ug Vibes",
    src: "/assets/audio/pearl-of-africa.wav",
    date: "2026-08-05",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    downloads: 3150,
    plays: 7200,
    featured: true
  },
  {
    id: "track-3",
    title: "Kampala Club Nonstop Vol 1",
    artist: "DJ Walker UG",
    genre: "Afrobeats & Dancehall",
    src: "/assets/audio/kampala-club-vol1.wav",
    date: "2026-08-08",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    downloads: 5890,
    plays: 14400,
    featured: true
  },
  {
    id: "track-4",
    title: "Stress Killer Party Mix",
    artist: "DJ Walker UG",
    genre: "Amapiano & Ug Vibes",
    src: "/assets/audio/stress-killer-mix.wav",
    date: "2026-08-10",
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    downloads: 7120,
    plays: 18800,
    featured: true
  }
];

const defaultSiteInfo = {
  djName: "DJ WALKER UG",
  tagline: "The Stress Killer",
  location: "Kampala & beyond",
  bio: "DJ Walker UG is a dynamic DJ and music producer rising out of Uganda's vibrant music scene. Known for his seamless transitions, energetic remixes, and engaging digital content.",
  bookingEmail: "jayw18239@gmail.com",
  bookingPhone: "0759924353",
  whatsappNumber: "256759924353",
  socials: {
    tiktok: "https://tiktok.com/@djwalkerug0",
    youtube: "https://youtube.com/@djwalkerug",
    audiomack: "https://audiomack.com/djwalker256"
  },
  stats: {
    showsDone: "250+",
    totalStreams: "150K+",
    "countriesReached": "12"
  }
};

function readJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Ensure initial files exist
if (!fs.existsSync(TRACKS_FILE)) writeJson(TRACKS_FILE, defaultTracks);
if (!fs.existsSync(SITE_INFO_FILE)) writeJson(SITE_INFO_FILE, defaultSiteInfo);
if (!fs.existsSync(BOOKINGS_FILE)) writeJson(BOOKINGS_FILE, []);

// ==================== API ROUTES ====================

// GET Tracks (Global)
app.get('/api/tracks', (req, res) => {
  const tracks = readJson(TRACKS_FILE, defaultTracks);
  res.json(tracks);
});

// POST New Track (Global)
app.post('/api/tracks', (req, res) => {
  const tracks = readJson(TRACKS_FILE, defaultTracks);
  const newTrack = {
    id: req.body.id || `track-${Date.now()}`,
    title: req.body.title || 'Untitled Track',
    artist: req.body.artist || 'DJ Walker UG',
    genre: req.body.genre || 'Ug Vibes',
    src: req.body.src || '',
    date: req.body.date || new Date().toISOString().split('T')[0],
    cover: req.body.cover || '',
    downloads: Number(req.body.downloads) || 0,
    plays: Number(req.body.plays) || 0,
    featured: req.body.featured !== undefined ? Boolean(req.body.featured) : true
  };

  tracks.unshift(newTrack);
  writeJson(TRACKS_FILE, tracks);
  broadcastRealtime({ type: 'TRACKS_UPDATED', tracks, timestamp: new Date().toISOString() });
  res.status(201).json({ success: true, track: newTrack, tracks });
});

// PUT Update Track (Global)
app.put('/api/tracks/:id', (req, res) => {
  const { id } = req.params;
  const tracks = readJson(TRACKS_FILE, defaultTracks);
  const index = tracks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Track not found' });
  }

  tracks[index] = {
    ...tracks[index],
    ...req.body,
    id // preserve ID
  };

  writeJson(TRACKS_FILE, tracks);
  broadcastRealtime({ type: 'TRACKS_UPDATED', tracks, timestamp: new Date().toISOString() });
  res.json({ success: true, track: tracks[index], tracks });
});

// DELETE Track (Global)
app.delete('/api/tracks/:id', (req, res) => {
  const { id } = req.params;
  let tracks = readJson(TRACKS_FILE, defaultTracks);
  const trackToDelete = tracks.find(t => t.id === id);

  if (trackToDelete) {
    // If files are hosted locally in /uploads, clean them up
    if (trackToDelete.src && trackToDelete.src.startsWith('/uploads/')) {
      const audioPath = path.join(__dirname, trackToDelete.src);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }
    if (trackToDelete.cover && trackToDelete.cover.startsWith('/uploads/')) {
      const coverPath = path.join(__dirname, trackToDelete.cover);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }
  }

  tracks = tracks.filter(t => t.id !== id);
  writeJson(TRACKS_FILE, tracks);
  broadcastRealtime({ type: 'TRACKS_UPDATED', tracks, timestamp: new Date().toISOString() });
  res.json({ success: true, tracks });
});

// POST File Upload (Audio/Cover)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl, filename: req.file.filename });
});

// Increment Track Downloads / Plays (Global Analytics)
app.post('/api/tracks/:id/stat', (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'play' or 'download'
  const tracks = readJson(TRACKS_FILE, defaultTracks);
  const track = tracks.find(t => t.id === id);

  if (track) {
    if (type === 'download') track.downloads = (track.downloads || 0) + 1;
    if (type === 'play') track.plays = (track.plays || 0) + 1;
    writeJson(TRACKS_FILE, tracks);
  }
  res.json({ success: true, track });
});

// GET Site Info (Global)
app.get('/api/site-info', (req, res) => {
  const info = readJson(SITE_INFO_FILE, defaultSiteInfo);
  info.socials = { ...defaultSiteInfo.socials, ...(info.socials || {}) };
  res.json(info);
});

// PUT Site Info (Global Update)
app.put('/api/site-info', (req, res) => {
  const current = readJson(SITE_INFO_FILE, defaultSiteInfo);
  const updated = {
    ...current,
    ...req.body,
    stats: { ...(current.stats || {}), ...(req.body.stats || {}) },
    socials: { ...(current.socials || {}), ...(req.body.socials || {}) }
  };
  writeJson(SITE_INFO_FILE, updated);
  writeJson(path.join(DATA_DIR, 'site_info.json'), updated);
  broadcastRealtime({ type: 'SITE_INFO_UPDATED', siteInfo: updated, timestamp: new Date().toISOString() });
  res.json({ success: true, siteInfo: updated });
});

// Global Real-time Multi-Device Engine (WebSockets + SSE)
const sseClients = new Set();
const wsClients = new Set();

const wss = new WebSocketServer({ server, path: '/ws' });

function getActiveDeviceCount() {
  return wsClients.size + sseClients.size;
}

function broadcastRealtime(eventData) {
  const jsonStr = JSON.stringify(eventData);

  // 1. Broadcast to all active WebSocket clients worldwide
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(jsonStr);
      } catch (err) {
        wsClients.delete(ws);
      }
    }
  });

  // 2. Broadcast to all active SSE clients worldwide
  const sseMsg = `data: ${jsonStr}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(sseMsg);
    } catch (err) {
      sseClients.delete(res);
    }
  });
}

// WebSocket connection management with Heartbeat
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  wsClients.add(ws);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send initial data snapshot
  try {
    const bookings = readJson(BOOKINGS_FILE, []);
    const tracks = readJson(TRACKS_FILE, defaultTracks);
    const siteInfo = readJson(SITE_INFO_FILE, defaultSiteInfo);
    ws.send(JSON.stringify({
      type: 'INIT',
      bookings,
      tracks,
      siteInfo,
      activeDevices: getActiveDeviceCount(),
      serverTime: new Date().toISOString()
    }));
  } catch (err) {}

  // Broadcast device presence
  broadcastRealtime({ type: 'PRESENCE', activeDevices: getActiveDeviceCount() });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', serverTime: new Date().toISOString() }));
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    broadcastRealtime({ type: 'PRESENCE', activeDevices: getActiveDeviceCount() });
  });

  ws.on('error', () => {
    wsClients.delete(ws);
  });
});

// Periodic Heartbeat Interval (20s) to keep cloud proxy sockets alive indefinitely
const heartbeatInterval = setInterval(() => {
  wsClients.forEach(ws => {
    if (ws.isAlive === false) {
      wsClients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });

  // SSE comment ping to keep HTTP connection alive
  sseClients.forEach(res => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      sseClients.delete(res);
    }
  });
}, 20000);

heartbeatInterval.unref();

// GET SSE Stream for fallback real-time streaming
app.get('/api/bookings/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', activeDevices: getActiveDeviceCount() })}\n\n`);
  sseClients.add(res);

  broadcastRealtime({ type: 'PRESENCE', activeDevices: getActiveDeviceCount() });

  req.on('close', () => {
    sseClients.delete(res);
    broadcastRealtime({ type: 'PRESENCE', activeDevices: getActiveDeviceCount() });
  });
});

// GET Bookings
app.get('/api/bookings', (req, res) => {
  const bookings = readJson(BOOKINGS_FILE, []);
  res.json(bookings);
});

// POST Submit Booking Request (Global + Real-time broadcast across all devices)
app.post('/api/bookings', (req, res) => {
  const bookings = readJson(BOOKINGS_FILE, []);
  const newBooking = {
    id: `booking-${Date.now()}`,
    name: req.body.name || 'Anonymous',
    email: req.body.email || '',
    phone: req.body.phone || '',
    eventType: req.body.eventType || 'Club Night',
    eventDate: req.body.eventDate || '',
    eventTime: req.body.eventTime || '',
    location: req.body.location || '',
    notes: req.body.notes || '',
    createdAt: new Date().toISOString(),
    status: 'Pending'
  };

  bookings.unshift(newBooking);
  writeJson(BOOKINGS_FILE, bookings);

  // Broadcast instantly to every device worldwide
  broadcastRealtime({
    type: 'NEW_BOOKING',
    booking: newBooking,
    bookingsCount: bookings.length,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, booking: newBooking });
});

// UPDATE Booking Status
app.put('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  let bookings = readJson(BOOKINGS_FILE, []);
  let updatedBooking = null;

  bookings = bookings.map(b => {
    if (b.id === id) {
      updatedBooking = { ...b, status: status || b.status };
      return updatedBooking;
    }
    return b;
  });

  if (!updatedBooking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  writeJson(BOOKINGS_FILE, bookings);

  // Broadcast real-time update event to all devices
  broadcastRealtime({
    type: 'UPDATE_BOOKING',
    booking: updatedBooking,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, booking: updatedBooking });
});

// DELETE Clear all done / completed bookings
app.delete('/api/bookings/clear-done', (req, res) => {
  let bookings = readJson(BOOKINGS_FILE, []);
  const initialCount = bookings.length;
  const doneBookings = bookings.filter(b => b.status === 'Done' || b.status === 'Completed');
  const doneIds = doneBookings.map(b => b.id);

  bookings = bookings.filter(b => b.status !== 'Done' && b.status !== 'Completed');
  writeJson(BOOKINGS_FILE, bookings);

  // Broadcast real-time delete events
  doneIds.forEach(id => {
    broadcastRealtime({ type: 'DELETE_BOOKING', id });
  });

  res.json({ success: true, removedCount: initialCount - bookings.length, bookings });
});

// DELETE Booking Request
app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  let bookings = readJson(BOOKINGS_FILE, []);
  bookings = bookings.filter(b => b.id !== id);
  writeJson(BOOKINGS_FILE, bookings);

  // Broadcast real-time delete event to all devices
  broadcastRealtime({
    type: 'DELETE_BOOKING',
    id,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, bookings });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DJ Walker UG Server running on http://0.0.0.0:${PORT} with WebSocket & SSE Real-time`);
});
