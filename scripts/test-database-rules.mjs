import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase, goOffline, ref, remove, set, update } from 'firebase/database';

// Deliberately fixed to loopback and a demo namespace; never uses the live project.
const projectId = 'demo-arm-rush-rules';
const origin = 'http://127.0.0.1:9007';
const score = { name: 'PLAYER', score: 12, consentGiven: false, timestamp: 123 };
const clients = [];

function client(claims) {
  const app = initializeApp({ projectId, databaseURL: `https://${projectId}.firebaseio.com` }, `rules-${clients.length}`);
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9007, claims === undefined ? undefined : {
    mockUserToken: { sub: `user-${clients.length}`, ...claims },
  });
  clients.push({ app, db });
  return db;
}

async function ownerWrite(path, body) {
  const response = await fetch(`${origin}/${path}.json?ns=${projectId}`, {
    method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body, signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200, await response.text());
}

before(async () => {
  const rulesPath = process.env.RULES_FILE || new URL('../database.rules.json', import.meta.url);
  await ownerWrite('.settings/rules', await readFile(rulesPath, 'utf8'));
});
beforeEach(async () => {
  await ownerWrite('', JSON.stringify({ leaderboard: { existing: score } }));
});
after(async () => {
  await Promise.all(clients.map(({ app, db }) => { goOffline(db); return deleteApp(app); }));
});

for (const [label, claims] of [['anonymous', undefined], ['signed-in non-admin', {}]]) {
  test(`${label} can submit a valid new score without promotional consent`, async () => {
    await set(ref(client(claims), 'leaderboard/new'), score);
  });
  test(`${label} cannot replace, delete, or edit an existing score`, async () => {
    const db = client(claims);
    await assert.rejects(set(ref(db, 'leaderboard/existing'), { ...score, score: 250 }), /PERMISSION_DENIED/);
    await assert.rejects(remove(ref(db, 'leaderboard/existing')), /PERMISSION_DENIED/);
    await assert.rejects(set(ref(db, 'leaderboard/existing/score'), 250), /PERMISSION_DENIED/);
  });
}

for (const admin of [false, 'true', 1]) {
  test(`admin claim ${JSON.stringify(admin)} does not grant deletion`, async () => {
    await assert.rejects(remove(ref(client({ admin }), 'leaderboard/existing')), /PERMISSION_DENIED/);
  });
}

test('a Boolean admin claim allows valid edits and deletion', async () => {
  const db = client({ admin: true });
  await update(ref(db, 'leaderboard/existing'), { score: 15 });
  await remove(ref(db, 'leaderboard/existing'));
});

test('invalid new scores remain rejected for players and administrators', async () => {
  for (const claims of [undefined, { admin: true }]) {
    const db = client(claims);
    await assert.rejects(set(ref(db, 'leaderboard/invalid'), { ...score, score: 251 }), /PERMISSION_DENIED/);
    await assert.rejects(set(ref(db, 'leaderboard/invalid'), { ...score, consentGiven: 'true' }), /PERMISSION_DENIED/);
  }
});

test('multipath writes cannot hide an unauthorized edit among new entries', async () => {
  const db = client({});
  await assert.rejects(update(ref(db), {
    'leaderboard/new': score, 'leaderboard/existing/score': 250,
  }), /PERMISSION_DENIED/);
  const response = await fetch(`${origin}/leaderboard/new.json?ns=${projectId}`);
  assert.equal(await response.json(), null);
});

test('new entries cannot grant themselves administrator permissions', async () => {
  const db = client({});
  await assert.rejects(set(ref(db, 'admins/self'), true), /PERMISSION_DENIED/);
  await set(ref(db, 'leaderboard/new'), { ...score, admin: true });
  await assert.rejects(remove(ref(db, 'leaderboard/existing')), /PERMISSION_DENIED/);
});
