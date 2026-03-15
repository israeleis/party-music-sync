import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from '../roomManager.js';
import { handleHttp } from '../restRouter.js';

function makeMockReq(method: string, url: string) {
  return { method, url } as any;
}

function makeMockRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    writeHead: vi.fn((code: number, headers?: Record<string, string>) => {
      res.statusCode = code;
      if (headers) res.headers = { ...res.headers, ...headers };
    }),
    end: vi.fn((data?: string) => {
      if (data) res.body = data;
    }),
  };
  return res;
}

describe('restRouter', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager();
  });

  it('GET /rooms returns 200 with JSON array', () => {
    const req = makeMockReq('GET', '/rooms');
    const res = makeMockRes();
    handleHttp(req, res as any, rm);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(res.body);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('GET /rooms includes only discoverable rooms', () => {
    const ws1 = { readyState: 1, send: vi.fn(), on: vi.fn() } as any;
    const ws2 = { readyState: 1, send: vi.fn(), on: vi.fn() } as any;
    rm.createRoom(ws1, false);
    rm.createRoom(ws2, true);

    const req = makeMockReq('GET', '/rooms');
    const res = makeMockRes();
    handleHttp(req, res as any, rm);

    const parsed = JSON.parse(res.body);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveProperty('code');
    expect(parsed[0]).toHaveProperty('peerCount', 0);
    expect(parsed[0]).toHaveProperty('createdAt');
  });

  it('GET /other returns 404', () => {
    const req = makeMockReq('GET', '/other');
    const res = makeMockRes();
    handleHttp(req, res as any, rm);

    expect(res.statusCode).toBe(404);
  });

  it('OPTIONS /rooms returns 204', () => {
    const req = makeMockReq('OPTIONS', '/rooms');
    const res = makeMockRes();
    handleHttp(req, res as any, rm);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });
});
