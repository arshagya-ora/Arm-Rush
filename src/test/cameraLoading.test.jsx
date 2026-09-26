import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CameraDetector from '../components/CameraDetector';
import { MEDIAPIPE_WASM_URL } from '../utils/mediapipe';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), create: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.resolve },
  PoseLandmarker: { createFromOptions: mocks.create },
}));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.resolve.mockReset().mockResolvedValue({});
  mocks.create.mockReset().mockImplementation(async () => ({ close: vi.fn() }));
  vi.stubGlobal('navigator', {
    userAgent: '', hardwareConcurrency: 4,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['model', 'camera'])('retries a %s initialization failure in the fallback camera path', async failure => {
  (failure === 'model' ? mocks.create : navigator.mediaDevices.getUserMedia)
    .mockRejectedValueOnce(new Error('unavailable'));
  const { container } = render(<CameraDetector isActive onPoseUpdate={() => {}} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    failure === 'model' ? 'Could not load motion tracking' : 'error occurred while connecting',
  );
  fireEvent.click(screen.getByRole('button', { name: 'TRY AGAIN' }));
  await act(async () => {});
  expect(mocks.resolve).toHaveBeenLastCalledWith(MEDIAPIPE_WASM_URL);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(failure === 'model' ? 1 : 2);
  fireEvent.loadedMetadata(container.querySelector('video'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(container.querySelector('.loading-overlay')).not.toBeInTheDocument();
});
