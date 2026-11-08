import { test as base, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
export { expect };
export { login, selectGame } from './helpers.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const test = base.extend({
  app: async ({}, use) => {
    const password = 'Release-Test-Only-2026', child = fork(join(root,'test/release-server.mjs'), [], {
      cwd: root, env: { ...process.env, PORT:'0', DATA_DIR:mkdtempSync(join(tmpdir(),'release-audit-')), POKER_NO_DOTENV:'1', SITE_PASSWORD:password, CREATE_LIMIT:'100' },
      stdio:['ignore','pipe','pipe','ipc'],
    });
    let stderr = '', request = 0; child.stderr.on('data', (b) => { stderr += b; });
    const pending = new Map();
    child.on('message', (m) => { if (m.request) { pending.get(m.request)?.(m); pending.delete(m.request); } });
    try {
      const port = await new Promise((resolve,reject) => {
        const timer = setTimeout(() => reject(Error('Release server startup: '+stderr)), 45000);
        child.on('message',(m) => { if(m.ready) { clearTimeout(timer); resolve(m.port); } });
        child.once('error',reject);
      });
      const control = (code, drive) => new Promise((resolve,reject) => {
        const id = ++request, timer = setTimeout(() => { pending.delete(id); reject(Error('Release driver timeout')); },10000);
        pending.set(id,(m) => { clearTimeout(timer); resolve(m); }); child.send({request:id,code,drive});
      });
      await use({url:'http://localhost:'+port,password,control});
    } finally {
      if (child.exitCode === null && child.signalCode === null) { const stopped = new Promise((resolve) => child.once('exit',resolve)); child.kill(); await stopped; }
    }
  },
});
