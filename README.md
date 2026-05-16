# AirDraw AI

A futuristic, browser-based air drawing system powered by Google Gemini and MediaPipe.

## Features
- **Real-time Hand Tracking**: Use your index finger as a virtual pen.
- **Gesture Control**: 
  - Pinch (Thumb + Index) to draw.
  - Fist to switch to Eraser.
- **AI Integration**: Analyze your drawings with Gemini (Identify, Improve, Logo Concept, Captions).
- **Cyberpunk UI**: Modern glassmorphism interface with real-time feedback.
- **Performance**: Integrated FPS tracker and confidence metrics.

## Tech Stack
- Frontend: React, Tailwind CSS, Motion
- AI: Google Gemini API (Vision)
- Tracking: MediaPipe Hands
- Backend: Express (Proxy for Gemini)

## Running Locally

1. **Clone the repository** (if exported).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Open your browser** at `http://localhost:3000`.

## Future Improvements
- **Multi-hand Support**: Collaborative drawing in the same space.
- **3D Air Drawing**: Integration with WebGL for 3D strokes.
- **Voice Commands**: Control brush settings with speech.
- **Export to Video**: Capture the drawing process as a timelapse.
- **Custom Brushes**: Texture-based brushes for more artistic variety.
