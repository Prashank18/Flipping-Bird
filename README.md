<div align="center">
  <h1>Flipping Bird</h1>
  <p><strong>A tiny pixel bird, six skies, and always one more try.</strong></p>
  <p>A hand-crafted, browser-first arcade game with original pixel scenes, quick controls, and a little flock of birds.</p>
  <p>
    <img src="https://img.shields.io/badge/maps-06-4d9d3e?style=flat-square" alt="Six playable maps">
    <img src="https://img.shields.io/badge/birds-04-ec655b?style=flat-square" alt="Four selectable birds">
    <img src="https://img.shields.io/badge/web-mobile-178dbb?style=flat-square" alt="Web and mobile">
    <img src="https://img.shields.io/badge/license-MIT-39434a?style=flat-square" alt="MIT license">
  </p>
  <img src="screenshots/flight-desktop.png" alt="Flipping Bird home screen with its pixel-art game, bird selector, and flight controls" width="670">
  <p><em>Choose a bird. Pick a sky. See how far you can fly.</em></p>
</div>

## Six maps

Each map has its own palette and scenery. All six are open from the start.

| Map | Sky |
| --- | --- |
| Sunlit Meadow | A soft green beginning |
| Amber Orchard | Warm autumn colors |
| Whispering Canyon | Rust-red cliffs |
| Bluebell Coast | Sea-glass blues |
| Moonmilk Hollow | A quiet, starry night |
| Poppyfield Rise | Bright wildflower fields |

<div align="center">
  <img src="screenshots/worlds-desktop.png" alt="All six selectable pixel-art maps in Flipping Bird" width="670">
</div>

## Play

Tap or click the game, or press **Space** / **↑** to flap. Use **P** or **Esc** to pause. Fly between the gates to build your score.

Pick from four birds, cycle between Easy, Normal, and Hard, turn sound effects on or off, and check your personal bests and flight log. Progress is saved in your browser.

<div align="center">
  <img src="screenshots/flight-mobile.png" alt="Responsive Flipping Bird game screen on a phone-sized viewport" width="280">
</div>

## Run locally

No dependencies or build step are needed. Open `index.html`, or start a local server:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser. The game supports mouse, touch, and keyboard input.

## Files

```text
.
├── app.js
├── index.html
├── style.css
└── screenshots/
    ├── flight-desktop.png
    ├── flight-mobile.png
    └── worlds-desktop.png
```

## License

Released under the [MIT License](LICENSE).
