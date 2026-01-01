import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products.js';
import salesRouter from './routes/sales.js';
import inventoryRouter from './routes/inventory.js';
import settingsRouter from './routes/settings.js';
import backupRouter from './routes/backup.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy for Railway - use specific number instead of true for security
// This tells Express to trust the first proxy (Railway's load balancer)
app.set('trust proxy', 1);

// Middleware
// CORS configuration - restrict to allowed origins
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(url => url.trim()) || [];
const allowedOrigins = [...defaultOrigins, ...envOrigins];

// Also allow all Vercel preview and production domains
const vercelPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app\/.*$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Check if origin matches allowed list
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin?.startsWith(allowed))) {
      return callback(null, true);
    }
    
    // Check if origin matches Vercel pattern
    if (origin && vercelPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    // Reject if not in allowed list
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NovaGadget API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NovaGadget API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite`);
  // Database path removed from logs for security
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use.`);
    console.error(`   Please stop the other process using port ${PORT} or use a different port.`);
    console.error(`   You can set a different port with: PORT=3003 npm run server`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});


