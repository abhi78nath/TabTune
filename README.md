# TabTune

Ever been deep into work when a song hits *just right*?  
You want the lyrics — *now* — but tab switching kills the vibe.

This extension brings lyrics and media controls right to you.  
It detects media playing in **any browser tab**, shows real-time progress, and lets you fetch lyrica if you want to sing along with a single click — no distractions, no lost focus, just good music and productivity.


## ✨ Key Features

- **� Universal Media Detection**: Automatically detects and lists media playing in any browser tab.
- **📜 One-Click Lyrics**: Fetches and display lyrics for the currently playing track with a single click.
- **🕹️ Quick Controls**:
  - Play/Pause toggle
  - Prev/Next switch
  - Mute/Unmute toggle
  - One-click tab focusing
- **🎧 Currently supports only Spotify**: Specialized metadata extraction for Spotify Web Player (Work in progress for other platforms).
- **🎨 Dynamic Theming**: The UI automatically adapts its color scheme to match the current album art:
  - **Extracts dominant colors** for backgrounds.
  - **Automatically calculates accessible text colors** to ensure readability (WCAG compliant).

## 🚀 Installation

### For Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abhi78nath/TabTune.git
   cd TabTune
   ```

2. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner.
   - Click "Load unpacked" and select the project directory.

3. **Usage**:
   - Open any media-playing site (e.g., [Spotify](https://open.spotify.com)).
   - Click the extension icon in your toolbar to manage your media and fetch lyrics.

## 🛠️ Technical Overview

The project is built using vanilla JavaScript and the Chrome Extension Manifest V3 API.

### Core Components

- **`manifest.json`**: Extension configuration and permissions.
- **`background.js`**: Service worker that monitors tab states and maintains the global media registry.
- **`popup.js` & `popup.html`**: The interactive user interface.
- **`spotify-extractor.js`**: DOM-injected script for rich Spotify metadata extraction.
- **`dominant-color.js`**: Image processing utility for color quantization and palette generation.
- **`readable-text-color.js`**: Advanced contrast ratio algorithm for dynamic accessibility.
- **`lyrics-service.js`**: Integration with the `lyrics.ovh` API.

## 🌐 API Dependencies

- [lyrics.ovh](https://api.lyrics.ovh/): Used for fetching song lyrics.

## 📄 License

This project is licensed under the MIT License.
