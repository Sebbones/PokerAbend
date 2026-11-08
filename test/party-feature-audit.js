import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes.toString('utf8').replaceAll('\r\n','\n')).digest('hex');
// The old screenshots still prove the old integration, not today's registration.
// Validate BOTH byte sets: archived baseline AND the independently tested feature.
export function partyFeatureSharedSource(path) {
  const audit = JSON.parse(read('games/party-brett/source-audit.json'));
  const old = audit.previous_shared_sources.find((row) => row.path === path);
  if (!old) return read(path);
  const current = audit.current_sources.find((row) => row.path === path);
  assert.ok(current, `Missing current integration proof: ${path}`);
  assert.equal(hash(read(path)), current.sha256, `Current feature integration: ${path}`);
  const bytes = read(old.archive);
  assert.equal(hash(bytes), old.sha256, `Original screenshot integration: ${path}`);
  return bytes;
}
