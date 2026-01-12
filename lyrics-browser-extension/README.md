# TabTune

Ever been deep into work when a song hits *just right*?  
You want the lyrics — *now* — but tab switching kills the vibe.

**TabTune** brings lyrics and media controls right to you. It detects media playing in **any browser tab**, shows real-time progress, and lets you fetch lyrics to sing along with a single click — no distractions, no lost focus, just good music and productivity.

## ✨ Key Features

- **🌐 Universal Media Detection**: Automatically detects and lists media playing in any browser tab.
- **📜 One-Click Lyrics**: Fetches and displays lyrics for the currently playing track with a single click.
- **🕹️ Quick Controls**:
  - Play/Pause toggle
  - Prev/Next switch
  - Mute/Unmute toggle
  - One-click tab focusing
- **🎧 Spotify Deep Integration**: Specialized metadata extraction for Spotify Web Player, including high-quality album art and real-time progress.
- **🎨 Dynamic Theming**: The UI automatically adapts its color scheme to match the current album art:
  - **Extracts dominant colors** for backgrounds.
  - **Calculates accessible text colors** to ensure readability (WCAG compliant).

## 🚀 Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 7](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **API:** Chrome Extension Manifest V3

## 🛠️ Installation

### For Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abhi78nath/TabTune.git
   cd TabTune/lyrics-browser-extension
   ```

2. **Install & Build**:
   ```bash
   bun install
   bun run build
   ```

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right corner).
   - Click **Load unpacked** and select the `lyrics-browser-extension/dist` directory.

## � Technical Overview

The version in this directory is a high-performance port built with **React** and **TypeScript**.

### Core Components

- **`manifest.json`**: Extension configuration and permissions.
- **`background.ts`**: Service worker monitoring tab states and maintaining the media registry.
- **`App.tsx` & `components/`**: The modern React-based user interface.
- **`services/lyrics-service.ts`**: Integration with lyrics APIs with fallback support.
- **`utils/dominant-color.ts`**: Image processing for color quantization and palette generation.
- **`utils/readable-text-color.ts`**: Accessibility algorithm for dynamic contrast.

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ by [Abhinath](https://github.com/abhi78nath)
