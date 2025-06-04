import app from './main.js';
import { AddressInfo } from 'net';

describe('API endpoints', () => {
  test('GET /healthz returns ok', async () => {
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    const body = await res.json();
    server.close();
    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
  });
});
