import test from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Response } from 'express';
import { requireAdmin, type AuthenticatedRequest } from './auth.middleware.js';

function createResponseMock() {
  let statusCode = 200;
  let payload: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      payload = body;
      return this;
    },
  } as Partial<Response> as Response;

  return {
    response,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
}

test('requireAdmin rejects unauthenticated requests', async () => {
  const req = {} as AuthenticatedRequest;
  const res = createResponseMock();
  let nextCalled = false;

  await requireAdmin(req, res.response, (() => {
    nextCalled = true;
  }) as NextFunction);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { error: 'Forbidden. Admin role required.' });
});

test('requireAdmin rejects authenticated non-admin users', async () => {
  const req = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
      currencyCode: 'COP',
      isActive: true,
    },
  } as AuthenticatedRequest;
  const res = createResponseMock();
  let nextCalled = false;

  await requireAdmin(req, res.response, (() => {
    nextCalled = true;
  }) as NextFunction);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { error: 'Forbidden. Admin role required.' });
});

test('requireAdmin allows admin users', async () => {
  const req = {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      currencyCode: 'COP',
      isActive: true,
    },
  } as AuthenticatedRequest;
  const res = createResponseMock();
  let nextCalled = false;

  await requireAdmin(req, res.response, (() => {
    nextCalled = true;
  }) as NextFunction);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
