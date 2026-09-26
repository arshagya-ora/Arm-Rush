import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminPanel from '../components/AdminPanel';
import useLeaderboard from '../hooks/useLeaderboard';

const mocks = vi.hoisted(() => ({ ref: vi.fn(), onValue: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('../firebase', () => ({ auth: null, database: null }));
vi.mock('firebase/database', () => ({
  ref: mocks.ref, onValue: mocks.onValue, remove: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithEmailAndPassword: vi.fn(), signOut: vi.fn(),
}));
vi.mock('../components/Certificate', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('returns an empty leaderboard without creating a database subscription', () => {
  const { result } = renderHook(() => useLeaderboard());
  expect(result.current).toEqual([]);
  expect(mocks.ref).not.toHaveBeenCalled();
  expect(mocks.onValue).not.toHaveBeenCalled();
});

it('shows a configuration notice and working back button without initializing auth', () => {
  const onBack = vi.fn();
  render(<AdminPanel onBack={onBack} />);
  expect(screen.getByRole('status')).toHaveTextContent('not configured');
  expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
  expect(mocks.onAuthStateChanged).not.toHaveBeenCalled();
  expect(mocks.ref).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
  expect(onBack).toHaveBeenCalledOnce();
});
