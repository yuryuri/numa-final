# Numa - AI-Powered Stem Separation and Remix Tool

Numa is a web application that allows users to separate YouTube songs into individual stems (vocals, drums, bass, and other instruments) and remix them in real-time. Built with Next.js and the Web Audio API, it provides an intuitive interface for music manipulation.

## Features

- 🎵 YouTube song stem separation using AI
- 🎚️ Real-time volume control for each stem
- 🔇 Individual stem muting/unmuting
- 📊 Waveform visualization with playhead tracking
- ⬇️ Download individual stems
- 🎯 Precise seeking and playback control
- 💬 Natural language control interface

## Tech Stack

- Next.js 13+ (App Router)
- TypeScript
- Web Audio API
- WaveSurfer.js
- Zustand for state management
- Tailwind CSS
- Heroicons

## Getting Started

### Prerequisites

This application requires the following system dependencies to process YouTube videos:

1. **Python 3.8+** with a virtual environment
2. **yt-dlp** for YouTube audio downloading
3. **demucs** for AI-powered stem separation

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yuryuri/numa-final.git
   cd numa-final
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Set up Python environment:
   ```bash
   # Create virtual environment
   python3 -m venv numa-env
   
   # Activate virtual environment
   source numa-env/bin/activate  # On Windows: numa-env\Scripts\activate
   
   # Install Python dependencies
   pip install yt-dlp demucs torch torchaudio
   ```

4. Update the demucs path in the code (if needed):
   Edit `src/app/api/youtube/route.ts` and update the `demucsPath` variable to match your installation.

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment Notes

⚠️ **This application cannot run on Vercel** due to system dependency requirements. For production deployment, consider:
- AWS EC2 with proper Python environment setup
- Google Cloud Run with custom container
- DigitalOcean Droplets
- Any VPS with Python/pip access

## Usage

1. Enter a YouTube URL on the home page
2. Wait for the AI to separate the stems
3. Use the controls to adjust volume, mute/unmute stems
4. Click on waveforms to seek to specific positions
5. Download individual stems using the download buttons
6. Use natural language commands to control the mix

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

<!-- Deployment trigger -->

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
