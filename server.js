const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const logger = require('./src/utils/logger');
const priceService = require('./src/services/priceService');
const tradingService = require('./src/services/tradingService');
const { MIN_CAPITAL } = require('./src/utils/constants');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }
});

// Security middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Enable CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle OPTIONS requests
app.options('*', cors());

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket connection
io.on('connection', (socket) => {
  logger.info('Client connected');
  socket.emit('initialData', tradingService.getStats());

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Update prices every 5 seconds
setInterval(() => {
  priceService.updatePrices();
}, 5000);

// API Routes
app.get('/api/trading-data', (req, res) => {
  res.json(tradingService.getStats());
});

app.post('/api/bot/toggle', (req, res) => {
  try {
    const { action, capital } = req.body;
    
    if (action === 'start' && capital < MIN_CAPITAL) {
      return res.status(400).json({ error: `Minimum capital requirement is ${MIN_CAPITAL} USDT` });
    }

    if (action === 'start') {
      tradingService.start(capital);
    } else {
      tradingService.stop();
    }

    res.json({ success: true, status: tradingService.getStats() });
  } catch (error) {
    logger.error('Bot toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle bot' });
  }
});

app.get('/api/profit-data', (req, res) => {
  const stats = tradingService.getStats();
  res.json({
    trades: stats.trades,
    dailyProfit: stats.profits.daily,
    totalProfit: stats.profits.total,
    initialInvestment: stats.capital
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});