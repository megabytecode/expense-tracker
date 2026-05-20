import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { authRouter } from './controllers/auth.controller.js';
import { accountRouter } from './controllers/account.controller.js';
import { categoryRouter } from './controllers/category.controller.js';
import { settingsRouter } from './controllers/settings.controller.js';
import { transactionRouter } from './controllers/transaction.controller.js';
import { transferRouter } from './controllers/transfer.controller.js';
import { debtRouter } from './controllers/debt.controller.js';
import { savingsGoalRouter } from './controllers/savings-goal.controller.js';
import { reportRouter } from './controllers/report.controller.js';
import { adminRouter } from './controllers/admin.controller.js';
import { attachmentRouter } from './controllers/attachment.controller.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const frontendDistDir = process.env.FRONTEND_DIST_DIR || '/app/public';
const apiDocsEnabled = process.env.API_DOCS_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Expense Tracker API',
    version: '1.0.0',
    description: 'API for Expense Tracker application',
  },
  servers: [
    {
      url: `http://localhost:${port}/api/v1`,
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is running',
          },
        },
      },
    },
    '/debts': {
      get: {
        summary: 'List debts for the authenticated user',
      },
      post: {
        summary: 'Create a debt for the authenticated user',
      },
    },
    '/debts/active-with-balance': {
      get: {
        summary: 'List active debts with remaining balance',
      },
    },
    '/savings-goals': {
      get: {
        summary: 'List savings goals for the authenticated user',
      },
      post: {
        summary: 'Create a savings goal for the authenticated user',
      },
    },
    '/savings-goals/overview': {
      get: {
        summary: 'Get savings goals overview and allocation summary',
      },
    },
    '/savings-goals/allocations': {
      put: {
        summary: 'Update organizational savings allocations across goals',
      },
    },
    '/transactions': {
      get: {
        summary: 'List transactions for the authenticated user',
      },
      post: {
        summary: 'Create a transaction for the authenticated user',
      },
    },
    '/transactions/{id}/attachments': {
      get: {
        summary: 'List attachments for an authenticated user transaction',
      },
      post: {
        summary: 'Upload receipts or documents for an authenticated user transaction',
      },
    },
    '/transfers/{id}/attachments': {
      get: {
        summary: 'List attachments for an authenticated user transfer',
      },
      post: {
        summary: 'Upload receipts or documents for an authenticated user transfer',
      },
    },
    '/attachments/{id}/download': {
      get: {
        summary: 'Download an authenticated user attachment',
      },
    },
    '/transactions/{id}': {
      patch: {
        summary: 'Update a transaction for the authenticated user',
      },
      delete: {
        summary: 'Soft delete a transaction for the authenticated user',
      },
    },
    '/reports/overview': {
      get: {
        summary: 'Get dashboard overview for the authenticated user',
      },
    },
    '/reports/category-breakdown': {
      get: {
        summary: 'Get income or expense totals grouped by category',
      },
    },
    '/reports/category-movements': {
      get: {
        summary: 'Get paginated transactions filtered by report category',
      },
    },
    '/reports/transfers': {
      get: {
        summary: 'Get transfer history and totals in a date range',
      },
    },
    '/settings/monthly-plan': {
      get: {
        summary: 'Get monthly expense base and category percentage planning',
      },
      put: {
        summary: 'Update monthly expense base and category percentage planning',
      },
    },
    '/admin/users': {
      get: {
        summary: 'List users for administrative management',
      },
    },
    '/admin/users/{id}/deactivate': {
      patch: {
        summary: 'Deactivate a user account as administrator',
      },
    },
    '/admin/users/{id}/limits': {
      patch: {
        summary: 'Update storage and attachment limits for a user',
      },
    },
    '/admin/users/{id}': {
      delete: {
        summary: 'Soft delete and anonymize a user account',
      },
    },
  },
};

if (apiDocsEnabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

const apiRouter = express.Router();

const healthHandler = (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

app.get('/health', healthHandler);
apiRouter.get('/health', healthHandler);

apiRouter.use('/auth', authRouter);
apiRouter.use('/accounts', accountRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/transactions', transactionRouter);
apiRouter.use('/transfers', transferRouter);
apiRouter.use('/debts', debtRouter);
apiRouter.use('/savings-goals', savingsGoalRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', attachmentRouter);

app.use('/api/v1', apiRouter);

if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
  app.get(/^\/(?!api\/|api-docs).*/, (req, res) => {
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

app.listen(Number(port), host, () => {
  console.log(`Server running on ${host}:${port}`);
  if (apiDocsEnabled) {
    console.log(`Swagger docs available at http://${host}:${port}/api-docs`);
  }
});
