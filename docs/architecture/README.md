# Arm Rush runtime architecture

[Interactive HTML](runtime-overview.html) · [Archify source](runtime-overview.architecture.json) · [README preview](../images/runtime-architecture.png)

Download the standalone HTML and open it locally. The preview includes the diagram and its three supporting cards. Green arrows identify the primary path; dashed pink outlines mark trust boundaries. Arrow direction follows the primary request or data movement; subscriptions and responses are explained in the cards.

## Code evidence

Inspected application revision: `febee1af7df977501b31c833240a893f17613dbd`.

| Runtime component | Source | What the diagram represents |
| --- | --- | --- |
| Player interface and round engine | [`App.jsx`](../../src/App.jsx), [`gameLogic.js`](../../src/gameLogic.js) | Practice, countdown, timer, scoring, result state and optional submission. |
| Local pose tracking | [`Preloader.jsx`](../../src/components/Preloader.jsx), [`CameraDetector.jsx`](../../src/components/CameraDetector.jsx) | Camera permission, model loading and browser-side pose inference. |
| External tracking assets | [`mediapipe.js`](../../src/utils/mediapipe.js), [`devicePerformance.js`](../../src/utils/devicePerformance.js) | Version-matched jsDelivr WASM and Google-hosted Lite/Full/Heavy pose models. |
| Certificate | [`Certificate.jsx`](../../src/components/Certificate.jsx) | Canvas rendering, PNG download and jsPDF export. |
| Optional Firebase | [`firebase.js`](../../src/firebase.js), [`useLeaderboard.js`](../../src/hooks/useLeaderboard.js), [`database.rules.json`](../../database.rules.json) | Client configuration, public score subscriptions, write validation and administrator claims. |

All gameplay modules run inside the browser. There is no separate inference server. Fonts are a secondary external asset dependency documented in a card. The Firebase node groups Auth and Realtime Database to keep the diagram focused. Camera snapshots are not uploaded with leaderboard submissions.

## Validation receipt

Generated with Archify 2.17, diagram type `architecture`.

| Check | Result |
| --- | --- |
| Deterministic delivery | 9/9 showcase checks; 0 errors; 0 warnings |
| Automated browser evidence | Passed at 1440×900, 1600×1000, 1920×1080 and 2048×1320 |
| Perceptual review | Passed after inspecting light/dark captures and the README preview |
| Focused geometry corrections | 1 round: placed two vertical-edge labels using validator diagnostics |

Specification SHA-256: `8695bb74e4ab5ef2dd8c79d2be41cd9cb145980b87266d312a8e92ee5fac60b7` (4,279 bytes).

HTML SHA-256: `154964225925f358d4f75631fd681d5d1e012736dd6a7511d44d1e02e2ce5dc7` (806,973 bytes).

The deterministic receipt validates artifact structure and composition. Browser checks establish containment and captures; visual review is a separate inspection. The source and HTML are frozen at the hashes above.

To regenerate using an installed Archify skill, run its CLI from this directory:

```sh
node /path/to/archify/bin/archify.mjs validate architecture runtime-overview.architecture.json --quality showcase --json
node /path/to/archify/bin/archify.mjs deliver architecture runtime-overview.architecture.json runtime-overview.html --quality showcase --json
node /path/to/archify/bin/archify.mjs visual-check runtime-overview.html --json
```

Recapture the README preview after updating the diagram. The PNG is a browser capture of the delivered viewer's title, diagram and cards; only viewer controls are excluded from the capture.
