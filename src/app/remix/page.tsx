"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { useAudioStore } from "@/store/audioStore";
import WaveformVisualizer from '../components/WaveformVisualizer';

function RemixPageContent() {
  const searchParams = useSearchParams();
  const ytUrl = searchParams.get("url") || "";
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedStem, setSelectedStem] = useState<string | null>(null);
  
  // Get state from store
  const { 
    isProcessing, 
    loadingProgress, 
    isPlaying, 
    songTitle, 
    error,
    stems,
    currentTime,
    toggleStem,
    adjustStemVolume,
    processYoutubeUrl,
    playAllStems, 
    pauseAllStems,
    seekTo
  } = useAudioStore();
  
  // Removed unused ref
  
  // Process YouTube URL on component mount
  useEffect(() => {
    if (ytUrl) {
      processYoutubeUrl(ytUrl);
    }
    
    // Cleanup function to pause all audio when component unmounts
    return () => {
      pauseAllStems();
    };
  }, [ytUrl, processYoutubeUrl, pauseAllStems]);
  
  // Watch for store errors and update local error state
  useEffect(() => {
    if (error) {
      setAudioError(error);
    }
  }, [error]);
  
  // Toggle play/pause
  const togglePlayback = () => {
    // Clear any previous errors
    setAudioError(null);
    
    try {
      if (isPlaying) {
        pauseAllStems();
      } else {
        // Check if we have any loaded stems
        const hasLoadedStems = stems.some(stem => stem.active && stem.loaded);
        if (!hasLoadedStems) {
          setAudioError("Audio is still loading. Please wait a moment and try again.");
          return;
        }
        
        playAllStems();
      }
    } catch (err) {
      console.error("Playback error:", err);
      setAudioError("Could not play audio. Please try again.");
    }
  };
  
  // Handle time updates from any waveform
  const handleTimeUpdate = (time: number, stemId: string) => {
    if (Math.abs(time - currentTime) > 0.1) {
      seekTo(time);
      setSelectedStem(stemId);
    }
  };
  
  // When currentTime changes globally, update all stems except the one that triggered it
  useEffect(() => {
    if (selectedStem && isPlaying) {
      // Get audio elements
      const audioElements = (window as unknown as { audioElements?: Record<string, HTMLAudioElement> }).audioElements;
      if (!audioElements) return;
      
      // Synchronize all other stems to the currentTime
      Object.entries(audioElements).forEach(([stemId, audio]: [string, HTMLAudioElement]) => {
        if (stemId !== selectedStem && audio instanceof HTMLAudioElement) {
          // Only adjust if the difference is significant (>100ms)
          if (Math.abs(audio.currentTime - currentTime) > 0.1) {
            audio.currentTime = currentTime;
          }
        }
      });
    }
  }, [currentTime, selectedStem, isPlaying]);
  
  // Apply natural language instruction
  const applyInstruction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const instruction = formData.get('instruction')?.toString().toLowerCase() || '';
    
    // Clear any previous errors
    setAudioError(null);
    
    // Very simple parsing for demo purposes
    if (instruction.includes("mute") || instruction.includes("remove")) {
      if (instruction.includes("vocals")) {
        toggleStem("vocals");
      } else if (instruction.includes("drums")) {
        toggleStem("drums");
      } else if (instruction.includes("bass")) {
        toggleStem("bass");
      } else if (instruction.includes("other")) {
        toggleStem("other");
      } else if (instruction.includes("all")) {
        stems.forEach(stem => toggleStem(stem.id));
      }
    } else if (instruction.includes("boost") || instruction.includes("increase")) {
      if (instruction.includes("vocals")) {
        adjustStemVolume("vocals", 1.0);
      } else if (instruction.includes("drums")) {
        adjustStemVolume("drums", 1.0);
      } else if (instruction.includes("bass")) {
        adjustStemVolume("bass", 1.0);
      } else if (instruction.includes("other")) {
        adjustStemVolume("other", 1.0);
      }
    } else if (instruction.includes("lower") || instruction.includes("reduce")) {
      if (instruction.includes("vocals")) {
        adjustStemVolume("vocals", 0.3);
      } else if (instruction.includes("drums")) {
        adjustStemVolume("drums", 0.3);
      } else if (instruction.includes("bass")) {
        adjustStemVolume("bass", 0.3);
      } else if (instruction.includes("other")) {
        adjustStemVolume("other", 0.3);
      }
    } else if (instruction.includes("play")) {
      playAllStems();
    } else if (instruction.includes("stop") || instruction.includes("pause")) {
      pauseAllStems();
    } else {
      setAudioError("I didn't understand that instruction. Try something like 'mute vocals' or 'boost bass'.");
    }
    
    form.reset();
  };
  
  // Calculate if any stems are still loading
  const stemsLoading = stems.some(stem => !stem.loaded);
  const allStemsLoaded = stems.length > 0 && stems.every(stem => stem.loaded);
  
  // Toggle specific stem playback (currently unused but kept for future functionality)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleStemMute = (stemId: string) => {
    // Get audio elements
    const audioElements = (window as unknown as { audioElements?: Record<string, HTMLAudioElement> }).audioElements;
    if (!audioElements) return;

    const audio = audioElements[stemId];
    if (!audio) return;

    // Toggle this specific stem only
    const stem = stems.find(s => s.id === stemId);

    if (!stem) return;

    // Use the gainNodes to effectively mute/unmute this stem
    const gainNodes = (window as unknown as { gainNodes?: Record<string, GainNode> }).gainNodes;
    if (!gainNodes || !gainNodes[stemId]) return;

    // Apply the change to the gain node
    const audioContext = (window as unknown as { audioContext?: AudioContext }).audioContext;
    const gainNode = gainNodes[stemId];
    const now = audioContext?.currentTime || 0;

    // Update the gain to reflect active state (opposite of current state since we're toggling)
    if (stem.active) {
      // Muting - set to 0
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      audio.volume = 0;
    } else {
      // Unmuting - set to volume level
      const safeVolume = Math.max(stem.volume, 0.0001);
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(safeVolume, now);
      audio.volume = safeVolume;
    }

    
    // Update state
    toggleStem(stemId);
  };
  
  if (!ytUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-xl mb-4">No YouTube URL provided</p>
        <Link 
          href="/"
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-white"
        >
          Go back
        </Link>
      </div>
    );
  }
  
  if (error && !isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Processing Error</h2>
          <p className="text-red-400 mb-4 text-sm leading-relaxed">{error}</p>
          
          {error.includes('Fadr API key') ? (
            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
              <h3 className="font-semibold mb-2">🔑 Fadr API Setup Required:</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>Get API key at <a href="https://fadr.com/plus" target="_blank" rel="noopener" className="text-blue-400 underline">fadr.com/plus</a></li>
                <li>Add <code className="bg-gray-700 px-1 rounded">FADR_API_KEY=your_key</code> to .env.local</li>
                <li>Restart your development server</li>
              </ol>
            </div>
          ) : error.includes('system dependencies') || error.includes('Vercel') ? (
            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
              <h3 className="font-semibold mb-2">🚀 Upgrade to Fadr API:</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>Get API key at <a href="https://fadr.com/plus" target="_blank" rel="noopener" className="text-blue-400 underline">fadr.com/plus</a></li>
                <li>Much faster processing (~30 seconds)</li>
                <li>Works on Vercel deployment</li>
              </ol>
            </div>
          ) : null}
          
          <div className="flex gap-2 justify-center">
            <Link 
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-white text-sm"
            >
              Try Again
            </Link>
            <a 
              href="https://github.com/yuryuri/numa-final#getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white text-sm"
            >
              Setup Guide
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <main className="flex min-h-screen flex-col p-4 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href="/"
          className="p-2 rounded-full hover:bg-gray-800"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold truncate flex-1">
          {songTitle || "Loading..."}
        </h1>
      </div>
      
      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin mb-4">
            <ArrowPathIcon className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-medium mb-2">Processing Audio</h2>
          <p className="text-gray-400 mb-4">Separating stems with AI...</p>
          <div className="w-full max-w-md bg-gray-800 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-400">{Math.round(loadingProgress)}%</p>
        </div>
      ) : (
        <>
          {/* Audio Error Alert */}
          {audioError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2">
              <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{audioError}</p>
            </div>
          )}
          
          {/* Loading Status */}
          {stemsLoading && (
            <div className="mb-4 p-3 bg-indigo-900/30 border border-indigo-700 rounded-lg flex items-center gap-2">
              <div className="animate-spin flex-shrink-0">
                <ArrowPathIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-indigo-300 text-sm">
                Loading audio samples...
                ({stems.filter(s => s.loaded).length}/{stems.length} stems ready)
              </p>
            </div>
          )}
          
          {/* Waveform visualization */}
          <div className="space-y-4 mb-6">
            {stems.map((stem) => (
              <div key={stem.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium capitalize">{stem.id}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStem(stem.id)}
                      className={`p-1 rounded ${
                        stem.active ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}
                    >
                      {stem.active ? (
                        <SpeakerWaveIcon className="w-4 h-4" />
                      ) : (
                        <SpeakerXMarkIcon className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stem.volume}
                      onChange={(e) => adjustStemVolume(stem.id, parseFloat(e.target.value))}
                      className="w-24 slider-thumb accent-indigo-500"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${stem.color}80 ${stem.volume * 100}%, #374151 ${stem.volume * 100}%)`,
                        height: '6px',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                    <a
                      href={stem.url}
                      download={`${songTitle || 'song'}-${stem.id}.wav`}
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600"
                      title={`Download ${stem.id} stem`}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <WaveformVisualizer
                  audioUrl={stem.url}
                  onTimeUpdate={(time) => handleTimeUpdate(time, stem.id)}
                  color={stem.id === 'vocals' ? '#ef4444' : 
                         stem.id === 'drums' ? '#22c55e' :
                         stem.id === 'bass' ? '#3b82f6' :
                         '#6366f1'}
                  stemId={stem.id}
                />
              </div>
            ))}
          </div>
          
          {/* Playback controls */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <button 
              onClick={togglePlayback}
              className={`p-3 rounded-full transition-colors ${
                allStemsLoaded
                  ? "bg-indigo-600 hover:bg-indigo-700" 
                  : "bg-indigo-900/50 cursor-wait"
              }`}
              disabled={!allStemsLoaded}
            >
              {isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
          </div>
          
          {/* Natural language controls */}
          <h2 className="text-lg font-medium mb-3">Natural Language Control</h2>
          <form onSubmit={applyInstruction} className="flex gap-2">
            <input
              type="text"
              name="instruction"
              placeholder="E.g., 'boost the bass' or 'mute vocals'"
              className="flex-1 rounded-lg border border-gray-700 bg-black px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Apply
            </button>
          </form>
        </>
      )}
    </main>
  );
}

export default function RemixPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin">
          <ArrowPathIcon className="w-10 h-10 text-indigo-500" />
        </div>
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    }>
      <RemixPageContent />
    </Suspense>
  );
}