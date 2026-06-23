import tls from 'tls';

export async function checkSslExpiry(url: string): Promise<Date | null> {
  try {
    const { hostname } = new URL(url);
    if (!url.startsWith('https')) return null;
    return await new Promise((resolve) => {
      const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        resolve(cert?.valid_to ? new Date(cert.valid_to) : null);
      });
      socket.on('error', () => resolve(null));
      socket.setTimeout(5000, () => { socket.destroy(); resolve(null); });
    });
  } catch {
    return null;
  }
}

export interface CheckResult {
  status: 'up' | 'down' | 'timeout';
  statusCode: number | null;
  responseMs: number;
  error: string | null;
}

export async function checkEndpoint(
  url: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: string,
  expectedStatus = 200,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { 'User-Agent': 'ServerMonitor/1.0', ...headers },
      body: body && method !== 'GET' && method !== 'HEAD' ? body : undefined,
    });
    clearTimeout(tid);
    const responseMs = Date.now() - start;
    const statusCode = res.status;
    const status = statusCode === expectedStatus ? 'up' : 'down';
    return { status, statusCode, responseMs, error: null };
  } catch (err) {
    const responseMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg.includes('abort') || msg.includes('signal') ? 'timeout' : 'down';
    return { status, statusCode: null, responseMs, error: msg };
  }
}

export async function checkUrl(url: string, expectedStatus = 200): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ServerMonitor/1.0' },
    });
    clearTimeout(tid);
    const responseMs = Date.now() - start;
    const statusCode = res.status;
    const status = statusCode === expectedStatus ? 'up' : 'down';
    return { status, statusCode, responseMs, error: null };
  } catch (err) {
    const responseMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg.includes('abort') || msg.includes('signal') ? 'timeout' : 'down';
    return { status, statusCode: null, responseMs, error: msg };
  }
}
