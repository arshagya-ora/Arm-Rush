import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import useLanguage from '../hooks/useLanguage';
import { translations } from '../translations';
import AdminPanel from '../components/AdminPanel';

vi.mock('../firebase', () => ({ auth: {}, database: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, callback) => {
    callback({ uid: 'test-admin' });
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: (_ref, callback) => {
    callback({ val: () => ({
      one: { name: 'PLAYER', score: 10, consentGiven: true, timestamp: 1700000000000, photoUrl: 'data:image/png;base64,' },
      two: { name: 'GUEST', score: 5, consentGiven: false },
    }) });
    return () => {};
  },
  remove: vi.fn(),
}));
vi.mock('../components/Certificate', () => ({ default: () => null }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('ships only English UI text', () => {
  expect(Object.keys(translations)).toEqual(['en']);
});

it('uses English regardless of browser language and makes no country lookup', () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { result, rerender } = renderHook(() => useLanguage());
  const lookup = result.current.t;
  expect(result.current.lang).toBe('en');
  expect(lookup('startGame')).toBe('START GAME');
  expect(lookup('missing-key')).toBe('missing-key');
  rerender();
  expect(result.current.t).toBe(lookup);
  expect(fetch).not.toHaveBeenCalled();
});

it('renders admin labels, consent, image descriptions, and dates in English', () => {
  const dateFormat = vi.spyOn(Date.prototype, 'toLocaleString');
  render(<AdminPanel onBack={() => {}} />);
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
    'Place', 'Nickname', 'Score', 'Date', 'Consent', 'Certificate', 'Actions',
  ]);
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  expect(screen.getByText('✅ YES')).toBeInTheDocument();
  expect(screen.getByText('❌ NO')).toBeInTheDocument();
  expect(screen.getByText('No date')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Certificate for PLAYER' })).toBeInTheDocument();
  expect(screen.getByTitle('View full certificate')).toBeInTheDocument();
  expect(dateFormat).toHaveBeenCalledWith('en-GB');
});
