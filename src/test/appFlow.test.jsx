import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const mocks = vi.hoisted(() => ({ pose: null, set: vi.fn(), push: vi.fn(), database: {} }));
vi.mock('../firebase', () => ({ get database() { return mocks.database; } }));
vi.mock('firebase/database', () => ({
  ref: () => ({}), push: mocks.push, set: mocks.set, serverTimestamp: () => 123,
}));
vi.mock('../hooks/useLeaderboard', () => ({ default: () => [] }));
vi.mock('../hooks/useScrollLock', () => ({ default: () => () => {} }));
vi.mock('../hooks/useOdometerLayout', () => ({ default: () => ({
  targetCoords: { left: {}, center: {}, right: {} }, slotsRevealed: true,
}) }));
vi.mock('../components/Preloader', () => ({ default: ({ onReady, onResourcesLoaded }) =>
  <button onClick={() => { onResourcesLoaded({}, {}); onReady({}, {}); }}>Finish loading</button>,
}));
vi.mock('../components/CameraDetector', () => ({ default: ({ onPoseUpdate }) => {
  mocks.pose = onPoseUpdate;
  return <div data-testid="camera" />;
} }));
vi.mock('../components/Flames', () => ({ default: () => null }));
vi.mock('../components/AuraCanvas', () => ({ default: () => null }));
vi.mock('../components/ParticleCanvas', () => ({ default: () => null }));
vi.mock('../components/FloatingScores', () => ({ default: () => null }));
vi.mock('../components/ShockwaveRing', () => ({ default: () => null }));
vi.mock('../components/Certificate', () => ({ default: () => null }));
vi.mock('../components/AdminPanel', () => ({ default: ({ onBack }) =>
  <button onClick={onBack}>Back from admin</button>,
}));
vi.mock('../components/CreatorBadge', () => ({ default: () => null }));
vi.mock('../components/NoiseOverlay', () => ({ default: () => null }));

const high = { y: 0.2 };
const low = { y: 0.8 };
const pose = (left, right) => act(() => mocks.pose(left, right));
const advance = ms => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function startRound() {
  render(<App />);
  fireEvent.click(screen.getByText('Finish loading'));
  fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
  await advance(600);
  pose(high, low);
  for (let i = 0; i < 5; i++) pose(i % 2 ? high : low, i % 2 ? low : high);
  for (let i = 0; i < 3; i++) await advance(1000);
}

async function finishRound() {
  for (let i = 0; i < 15; i++) await advance(1000);
  await advance(2600);
  fireEvent.change(screen.getByRole('textbox', { name: 'Your nickname' }), { target: { value: 'PLAYER' } });
}

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({}, '', '/');
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.set.mockReset().mockResolvedValue(undefined);
  mocks.database = {};
  mocks.push.mockReset().mockImplementation(() => ({ key: 'entry' }));
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('game scoring and score submission', () => {
  it('renders the Arm Rush title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Arm Rush' })).toBeInTheDocument();
  });

  it('completes a round without publishing when no backend is configured', async () => {
    mocks.database = null;
    await startRound();
    await finishRound();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/Your result will not be published/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'VIEW RESULT' }));
    await advance(600);
    expect(screen.getByText('Time is up!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SEE CERTIFICATE/ })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('waits for preloaded resources before mounting the camera', () => {
    render(<App />);
    expect(screen.queryByTestId('camera')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Finish loading'));
    expect(screen.getByTestId('camera')).toBeInTheDocument();
  });

  it('can initialize the camera when starting a game after a direct admin visit', async () => {
    window.history.replaceState({}, '', '/?admin=1');
    render(<App />);
    fireEvent.click(screen.getByText('Back from admin'));
    fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
    await advance(600);
    expect(screen.getByTestId('camera')).toBeInTheDocument();
  });

  it('does not score a missing wrist or the first pose after reacquiring it', async () => {
    await startRound();
    const score = () => document.querySelector('.stats-bar--playing .score-punch').textContent;
    pose(high, low);
    pose(null, { y: 0.05 });
    expect(score()).toBe('0');
    pose(low, high);
    expect(score()).toBe('0');
    pose(high, low);
    expect(score()).toBe('1');
    pose({ y: 0.95 }, null);
    pose(low, high);
    expect(score()).toBe('1');
    pose(high, low);
    expect(score()).toBe('2');
    pose(null, null);
    pose(low, high);
    expect(score()).toBe('2');
    pose(high, low);
    expect(score()).toBe('3');
  });

  it('keeps the form while saving, blocks duplicates, and retries the same entry after failure', async () => {
    await startRound();
    await finishRound();
    let rejectSave;
    mocks.set.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject; }));
    const saveButton = screen.getByRole('button', { name: 'SAVE SCORE' });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.set.mock.calls[0][1]).toMatchObject({ name: 'PLAYER', score: 0, consentGiven: false });
    expect(screen.getByRole('textbox')).toBeDisabled();
    await advance(1000);
    expect(screen.queryByText('Time is up!')).not.toBeInTheDocument();
    await act(async () => rejectSave(new Error('permission denied')));
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('textbox')).toHaveValue('PLAYER');
    fireEvent.click(screen.getByRole('button', { name: 'TRY AGAIN' }));
    await advance(600);
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledTimes(2);
    expect(mocks.set.mock.calls[1][0]).toBe(mocks.set.mock.calls[0][0]);
    expect(screen.getByText('Time is up!')).toBeInTheDocument();
  });

  it('records promotional consent only when checked, including keyboard submission', async () => {
    await startRound();
    await finishRound();
    const consent = screen.getByRole('checkbox');
    expect(consent).not.toBeChecked();
    fireEvent.click(consent);
    const input = screen.getByRole('textbox');
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.set.mock.calls[0][1].consentGiven).toBe(true);
    await advance(600);
    expect(screen.getByText('Time is up!')).toBeInTheDocument();
  });
});
