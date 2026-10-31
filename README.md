<div align="center">
  <h1>Littlewing</h1>
  <p><strong>A small bird. Six hand-drawn skies. One more try.</strong></p>
  <p>A lovingly illustrated, browser-first Flappy-style game. No build step, no account, just open the page and fly.</p>
  <p>
    <img src="https://img.shields.io/badge/worlds-06-55795c?style=flat-square" alt="Six playable worlds">
    <img src="https://img.shields.io/badge/platform-web%20%2B%20mobile-dd7d4e?style=flat-square" alt="Web and mobile">
    <img src="https://img.shields.io/badge/license-MIT-778f6d?style=flat-square" alt="MIT license">
  </p>
  <br>
  <img src="screenshots/flight-desktop.png" alt="Littlewing flight screen, with a hand-drawn bird above the Sunlit Meadow" width="920">
  <p><em>Take a breath. Then take flight.</em></p>
</div>

## Six skies to explore

Each world has its own palette, scenery, and little details, from meadow flowers to the stars of Moonmilk Hollow. Every map is playable from the start.

<div align="center">
  <img src="screenshots/worlds-desktop.png" alt="The six selectable Littlewing worlds: Sunlit Meadow, Amber Orchard, Whispering Canyon, Bluebell Coast, Moonmilk Hollow, and Poppyfield Rise" width="920">
</div>

| World | A little piece of the view |
| --- | --- |
| **Sunlit Meadow** | Sleepy clouds, green hills, and nodding flowers |
| **Amber Orchard** | Warm leaves and a soft autumn sky |
| **Whispering Canyon** | Rust-red cliffs and open air |
| **Bluebell Coast** | Sea-glass colors and rolling waves |
| **Moonmilk Hollow** | A velvet night sky and sleepy stars |
| **Poppyfield Rise** | A bright jumble of wildflowers |

## How to play

Tap or click the game, or press **Space** / **↑** to flap. Slip through each gate to score. **P** or **Esc** pauses the flight.

Choose a different bird or world from the navigation tabs. Your best score, flights, and visited worlds are saved in your browser.

## Run it locally

There are no dependencies or build tools. Open `index.html` in a modern browser, or serve the folder locally:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. The game supports touch, mouse, and keyboard input, and its layout adapts to phone and desktop screens.

## Project files

```text
.
├── app.js                    # Canvas game, worlds, controls, and local progress
├── index.html                # Game interface
├── style.css                 # Responsive paper-and-ink styling
├── screenshots/
│   ├── flight-desktop.png    # Flight screen
│   └── worlds-desktop.png    # World selection
└── LICENSE
```

## License

Released under the [MIT License](LICENSE).
