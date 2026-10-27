import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import customersRouter from './routes/customers.js';
import billsRouter from './routes/bills.js';
import paymentsRouter from './routes/payments.js';
import ledgerRouter from './routes/ledger.js';
import dashboardRouter from './routes/dashboard.js';
import settingsRouter from './routes/settings.js';
import { initializeVoucherSequences } from './services/voucher.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/customers', customersRouter);
app.use('/api/bills', billsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start
app.listen(PORT, async () => {
  console.log(`🚀 Matrix Ledger API running on http://localhost:${PORT}`);
  
  try {
    await initializeVoucherSequences();
  } catch (err) {
    console.error('Failed to initialize voucher sequences:', err);
  }
});

export default app;
