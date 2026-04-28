#!/usr/bin/env node

/**
 * Validate Development Environment
 * Checks all prerequisites and services are working correctly
 * Run: pnpm validate:setup
 */

import { execSync } from 'child_process';
import https from 'https';

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  detail?: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => boolean, message: string) {
  try {
    const pass = fn();
    results.push({
      name,
      status: pass ? 'PASS' : 'FAIL',
      message: pass ? `✅ ${message}` : `❌ ${message}`,
    });
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      message: `❌ ${message}`,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function warn(name: string, message: string) {
  results.push({
    name,
    status: 'WARN',
    message: `⚠️  ${message}`,
  });
}

function httpCheck(url: string, name: string, expectedStatus: number = 200): Promise<boolean> {
  return new Promise((resolve) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        resolve(res.statusCode === expectedStatus);
      })
      .on('error', () => {
        // Try http fallback
        const http = require('http');
        http
          .get(url.replace('https://', 'http://'), (res: any) => {
            resolve(res.statusCode === expectedStatus);
          })
          .on('error', () => resolve(false));
      });
  });
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Development Environment Validation    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // ─── System Prerequisites ────────────────────────────────────────────────

  console.log('📋 System Prerequisites');
  console.log('─'.repeat(40));

  check(
    'Node.js',
    () => {
      const version = execSync('node --version').toString();
      const major = parseInt(version.split('.')[0].substring(1));
      return major >= 20;
    },
    `Node.js v20+ (${execSync('node --version').toString().trim()})`,
  );

  check(
    'pnpm',
    () => {
      const version = execSync('pnpm --version').toString();
      return version.includes('.');
    },
    `pnpm installed (${execSync('pnpm --version').toString().trim()})`,
  );

  check(
    'Docker',
    () => {
      const version = execSync('docker --version').toString();
      return version.includes('Docker');
    },
    `Docker installed (${execSync('docker --version').toString().trim()})`,
  );

  check(
    'Docker daemon',
    () => {
      execSync('docker ps');
      return true;
    },
    'Docker daemon is running',
  );

  console.log('');

  // ─── Dependencies ────────────────────────────────────────────────────────

  console.log('📦 Project Dependencies');
  console.log('─'.repeat(40));

  check(
    'node_modules',
    () => {
      try {
        execSync('ls node_modules > /dev/null 2>&1 || [ -d node_modules ]');
        return true;
      } catch {
        return false;
      }
    },
    'node_modules directory exists',
  );

  check(
    'packages installed',
    () => {
      try {
        execSync('pnpm list --depth=0 > /dev/null 2>&1');
        return true;
      } catch {
        return false;
      }
    },
    'All packages installed',
  );

  console.log('');

  // ─── Services ───────────────────────────────────────────────────────────

  console.log('🐳 Docker Services');
  console.log('─'.repeat(40));

  const services = ['dynamodb', 'dynamodb-admin', 'mock-api'];
  for (const service of services) {
    check(
      `${service}-running`,
      () => {
        try {
          const output = execSync(
            `docker compose ps ${service} 2>/dev/null | grep -c Up || true`,
          ).toString();
          return parseInt(output) > 0;
        } catch {
          return false;
        }
      },
      `${service} service is running`,
    );
  }

  console.log('');

  // ─── Network Connectivity ────────────────────────────────────────────────

  console.log('🌐 Service Connectivity');
  console.log('─'.repeat(40));

  const dynamoDBCheck = await httpCheck('http://localhost:8000/', 'DynamoDB', 200);
  results.push({
    name: 'DynamoDB connectivity',
    status: dynamoDBCheck ? 'PASS' : 'FAIL',
    message: dynamoDBCheck
      ? '✅ DynamoDB Local is responding'
      : '❌ Cannot reach DynamoDB Local (localhost:8000)',
  });

  const adminUICheck = await httpCheck('http://localhost:8001/', 'DynamoDB Admin', 200);
  results.push({
    name: 'Admin UI connectivity',
    status: adminUICheck ? 'PASS' : 'FAIL',
    message: adminUICheck
      ? '✅ DynamoDB Admin UI is responding'
      : '❌ Cannot reach DynamoDB Admin UI (localhost:8001)',
  });

  const graphqlCheck = await httpCheck('http://localhost:4000/graphql', 'GraphQL API', 200);
  results.push({
    name: 'GraphQL API connectivity',
    status: graphqlCheck ? 'PASS' : 'FAIL',
    message: graphqlCheck
      ? '✅ GraphQL API is responding'
      : '❌ Cannot reach GraphQL API (localhost:4000)',
  });

  console.log('');

  // ─── Database Setup ─────────────────────────────────────────────────────

  console.log('🗄️  Database Configuration');
  console.log('─'.repeat(40));

  check(
    'DynamoDB table exists',
    () => {
      try {
        const output = execSync(
          'aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1 2>/dev/null | grep -c wfl-main || true',
        ).toString();
        return parseInt(output) > 0;
      } catch {
        return false;
      }
    },
    'wfl-main-dev table exists',
  );

  console.log('');

  // ─── Tools & Features ───────────────────────────────────────────────────

  console.log('🛠️  Tools & Features');
  console.log('─'.repeat(40));

  check(
    'GraphQL codegen',
    () => {
      try {
        execSync('which graphql-codegen > /dev/null 2>&1');
        return true;
      } catch {
        return false;
      }
    },
    'GraphQL code generation available',
  );

  check(
    'Git hooks',
    () => {
      try {
        execSync('test -f .husky/pre-commit');
        return true;
      } catch {
        return false;
      }
    },
    'Pre-commit hooks installed',
  );

  console.log('');

  // ─── Summary ────────────────────────────────────────────────────────────

  console.log('╔════════════════════════════════════════╗');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  results.forEach((r) => console.log(r.message));

  console.log('╠════════════════════════════════════════╣');
  console.log(`║ ✅ ${passed} passing                      ║`);
  if (failed > 0) console.log(`║ ❌ ${failed} failing                       ║`);
  if (warned > 0) console.log(`║ ⚠️  ${warned} warnings                      ║`);
  console.log('╚════════════════════════════════════════╝');

  console.log('');

  if (failed === 0) {
    console.log('✅ Development environment is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. pnpm dev:mobile    (start mobile app)');
    console.log('  2. pnpm local:test    (run integration tests)');
    console.log('  3. Start building!');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. See details above.');
    console.log('');
    console.log('Fixes:');
    if (!dynamoDBCheck || !graphqlCheck || !adminUICheck) {
      console.log('  • Start services: pnpm local:setup');
    }
    if (!results.find((r) => r.name === 'DynamoDB table exists')?.status) {
      console.log('  • Create tables: pnpm local:migrate');
    }
    console.log('  • Full reset: pnpm local:reset');
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
