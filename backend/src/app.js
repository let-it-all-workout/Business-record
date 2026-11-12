import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import productsRouter from '../routes/products.js';
import salesRouter from '../routes/sales.js';
import inventoryRouter from '../routes/inventory.js';
import settingsRouter from '../routes/settings.js';
import backupRouter from '../routes/backup.js';
import authRouter from '../routes/auth.js';
import { errorHandlerMiddleware } from '../middleware/errorHandler.js';
import { engine } from '../database/index.js';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(appDirectory, '../../frontend/dist');

function allowedOrigins() {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production') return configured;
  return [
    ...configured,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];
}

function originHost(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
}

// Browser requests that send Authorization and JSON include Origin even when
// the page and the API share a host. Allow that host, and Railway's public
// domain, without opening the API to every website.
function originIsThisService(origin, req) {
  const host = originHost(origin);
  if (!host) return false;
  const requestHost = String(req.get('host') || '').split(',')[0].trim();
  if (requestHost && host === requestHost) return true;
  const railwayDomain = String(process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();
  return railwayDomain !== '' && host === railwayDomain;
}

export function createApp() {
  const app = express();
  const production = process.env.NODE_ENV === 'production';
  const serveFrontend = production && existsSync(frontendDist);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(compression());
  app.use('/api', express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    if (production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // CORS only on /api. Static assets are same-origin when we serve the SPA.
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !allowedOrigins().includes(origin) && !originIsThisService(origin, req)) {
      return res.status(403).json({ error: 'Origin is not allowed.' });
    }
    return cors({ origin: true, credentials: true })(req, res, next);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Business Record API is running',
      database: engine,
      ui: serveFrontend ? 'bundled' : 'separate',
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/backup', backupRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'No such API route.' });
  });

  if (serveFrontend) {
    app.use(express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      return res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use(errorHandlerMiddleware);
  return app;
}
