import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getDatabase: vi.fn(() => ({ name: 'test-database' })),
  getAuth: vi.fn(() => ({ name: 'test-auth' })),
}));
vi.mock('firebase/app', () => ({ initializeApp: mocks.initializeApp }));
vi.mock('firebase/database', () => ({ getDatabase: mocks.getDatabase }));
vi.mock('firebase/auth', () => ({ getAuth: mocks.getAuth }));

const config = {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'arm-rush-test.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'arm-rush-test',
  VITE_FIREBASE_DATABASE_URL: 'https://arm-rush-test.invalid',
  VITE_FIREBASE_APP_ID: 'test-app-id',
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const key of Object.keys(config)) vi.stubEnv(key, '');
});
afterEach(() => vi.unstubAllEnvs());

describe('optional Firebase configuration', () => {
  it('does not initialize Firebase without configuration', async () => {
    const { database, auth, isFirebaseConfigured } = await import('../firebase');
    expect(isFirebaseConfigured).toBe(false);
    expect(database).toBeNull();
    expect(auth).toBeNull();
    expect(mocks.initializeApp).not.toHaveBeenCalled();
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it('does not connect with partial configuration', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', config.VITE_FIREBASE_API_KEY);
    expect((await import('../firebase')).isFirebaseConfigured).toBe(false);
    expect(mocks.initializeApp).not.toHaveBeenCalled();
  });

  it('uses only the supplied project configuration', async () => {
    for (const [key, value] of Object.entries(config)) vi.stubEnv(key, value);
    const { database, auth, isFirebaseConfigured } = await import('../firebase');
    expect(isFirebaseConfigured).toBe(true);
    expect(mocks.initializeApp).toHaveBeenCalledExactlyOnceWith({
      apiKey: config.VITE_FIREBASE_API_KEY,
      authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: config.VITE_FIREBASE_PROJECT_ID,
      databaseURL: config.VITE_FIREBASE_DATABASE_URL,
      appId: config.VITE_FIREBASE_APP_ID,
    });
    expect(database).toEqual({ name: 'test-database' });
    expect(auth).toEqual({ name: 'test-auth' });
  });
});
