/**
 * Local Mock GraphQL API
 * Replaces AppSync + Cognito for local development
 * Connects to DynamoDB Local for data storage
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'wfl-api-local' });
});

// GraphQL endpoint (placeholder - full implementation in Phase B)
app.post('/graphql', async (req, res) => {
  const { query, variables, operationName } = req.body;

  // Mock GraphQL responses for common queries
  if (query && query.includes('getProfile')) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return res.json({
        data: {
          getProfile: {
            userId: decoded.sub,
            email: decoded.email,
            displayName: 'Dev User',
            timezone: 'UTC',
            units: 'metric',
            __typename: 'Profile',
          },
        },
      });
    } catch (error) {
      return res.status(401).json({ errors: [{ message: 'Unauthorized' }] });
    }
  }

  if (query && query.includes('listHouseholds')) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return res.json({
        data: {
          listHouseholds: [
            {
              householdId: 'household-dev-001',
              name: 'Dev Kitchen',
              ownerId: decoded.sub,
              createdAt: new Date().toISOString(),
              __typename: 'Household',
            },
          ],
        },
      });
    } catch (error) {
      return res.status(401).json({ errors: [{ message: 'Unauthorized' }] });
    }
  }

  // Default mock response
  res.json({
    data: null,
    errors: [{ message: 'Not implemented in local mock' }],
  });
});

// Auth endpoint - Generate JWT token for testing
app.post('/auth/mock-login', (req, res) => {
  const { email = 'dev@example.com', userId = 'user-dev-001' } = req.body;

  const token = jwt.sign(
    {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );

  res.json({
    token,
    userId,
    email,
    expiresIn: 3600,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Local GraphQL API running on http://localhost:${PORT}`);
  console.log(`📝 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`🔐 Get JWT token: POST http://localhost:${PORT}/auth/mock-login`);
  console.log(`\nDynamoDB: ${process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000'}\n`);
});
