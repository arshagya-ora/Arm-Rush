import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Preloader from '../components/Preloader';
import { dependencies } from '../../package.json';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), create: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.resolve },
  PoseLandmarker: { createFromOptions: mocks.create },
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.resolve.mockReset().mockResolvedValue({});
  mocks.create.mockReset().mockResolvedValue({ close: vi.fn() });
  vi.stubGlobal('navigator', {
    permissions: { query: vi.fn().mockResolvedValue({ state: 'prompt' }) },
    userAgent: '', hardwareConcurrency: 4,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
  });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['runtime', 'model'])('recovers from a %s load failure without reloading the page', async failure => {
  (failure === 'runtime' ? mocks.resolve : mocks.create).mockRejectedValueOnce(new Error('network failed'));
  const onReady = vi.fn();
  render(<Preloader onReady={onReady} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load motion tracking');
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'TRY AGAIN' }));
  await act(async () => {});
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(mocks.resolve).toHaveBeenLastCalledWith(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${dependencies['@mediapipe/tasks-vision']}/wasm`,
  );
  fireEvent.click(screen.getByRole('button', { name: 'TURN ON CAMERA' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
});
