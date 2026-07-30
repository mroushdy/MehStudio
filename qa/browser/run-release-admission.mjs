#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../..');
const runner = path.resolve(here, 'run-visual-qa.mjs');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function respondJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/pins') {
      if (request.method === 'GET') {
        respondJson(response, 200, { pins: [] });
        return;
      }
      if (request.method === 'POST') {
        request.resume();
        request.on('end', () => respondJson(response, 200, { ok: true, pins: [] }));
        return;
      }
      respondJson(response, 405, { ok: false, error: 'method' });
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405);
      response.end('method not allowed');
      return;
    }
    const relative = decodeURIComponent(
      url.pathname === '/' ? '/meh5.html' : url.pathname,
    );
    const file = path.resolve(appRoot, `.${relative}`);
    if (file !== appRoot && !file.startsWith(`${appRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file).toLowerCase()]
        || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('not found');
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const address = server.address();
if (!address || typeof address === 'string') {
  server.close();
  throw new Error('browser admission server did not expose a TCP address');
}

const targetUrl = `http://127.0.0.1:${address.port}/meh5.html`;
const child = spawn(process.execPath, [runner, ...process.argv.slice(2)], {
  cwd: path.resolve(here, '..'),
  env: {
    ...process.env,
    MEH_VISUAL_QA_URL: targetUrl,
  },
  stdio: 'inherit',
});

const exitCode = await new Promise((resolveExit, rejectExit) => {
  child.once('error', rejectExit);
  child.once('exit', (code, signal) => {
    if (signal) {
      rejectExit(new Error(`visual QA terminated by ${signal}`));
      return;
    }
    resolveExit(code ?? 1);
  });
}).finally(() => new Promise((resolveClose) => server.close(resolveClose)));

process.exitCode = exitCode;
