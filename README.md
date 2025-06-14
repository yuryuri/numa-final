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

### Quick Setup (Recommended - Fadr API)

1. Clone the repository:
   ```bash
   git clone https://github.com/yuryuri/numa-final.git
   cd numa-final
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Get a Fadr API key:
   - Visit [fadr.com/plus](https://fadr.com/plus)
   - Subscribe to Fadr Plus ($10/month)
   - Get your API key from your account dashboard

4. Set up environment variables:
   ```bash
   # Create .env.local file
   echo "FADR_API_KEY=your_fadr_api_key_here" > .env.local
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to use the app

### ✅ Benefits of Fadr Integration

- **Works on Vercel**: No Python dependencies needed
- **Super Fast**: ~30 seconds vs 3+ minutes locally  
- **Better Quality**: Professional AI models
- **More Features**: 16 stem types, MIDI export, key/tempo detection
- **Cost Effective**: $0.05 per minute vs expensive server costs

### Legacy Setup (Local Processing)

If you prefer to run processing locally (not recommended):

1. Install Python dependencies:
   ```bash
   pip install yt-dlp demucs torch torchaudio
   ```

2. Revert the API to use local demucs processing

⚠️ **Note**: Local processing requires powerful hardware and takes 3+ minutes per track

### Deployment Notes

✅ **This application can now run on Vercel** with Fadr API integration! Deploy directly by:
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
