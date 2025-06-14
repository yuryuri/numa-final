import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Fadr API configuration
const FADR_API_KEY = process.env.FADR_API_KEY;
const FADR_API_BASE = 'https://api.fadr.com/v1';

interface FadrUploadResponse {
  asset_id: string;
  upload_url: string;
}

interface FadrTaskResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    vocals: { url: string };
    drums: { url: string };
    bass: { url: string };
    melody: { url: string };
    instrumental: { url: string };
    midi?: {
      vocals?: { url: string };
      bass?: { url: string };
      melody?: { url: string };
      chords?: { url: string };
    };
    key?: string;
    tempo?: number;
  };
  progress?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎵 Processing YouTube URL with Fadr API...');
    
    // Check for Fadr API key
    if (!FADR_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Fadr API key not configured. Please add FADR_API_KEY to your environment variables.' 
        },
        { status: 500 }
      );
    }

    // Get YouTube URL from query params
    const searchParams = request.nextUrl.searchParams;
    const youtubeUrl = searchParams.get('url');
    
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'No YouTube URL provided' },
        { status: 400 }
      );
    }

    console.log('Processing YouTube URL:', youtubeUrl);

    // Step 1: Download audio from YouTube
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    console.log('📥 Downloading audio from YouTube...');
    const audioBuffer = await downloadYouTubeAudio(youtubeUrl);
    
    // Step 2: Upload to Fadr
    console.log('☁️ Uploading to Fadr API...');
    const assetId = await uploadToFadr(audioBuffer);
    
    // Step 3: Create stem separation task
    console.log('🎛️ Creating stem separation task...');
    const taskId = await createStemTask(assetId);
    
    // Step 4: Wait for completion and get results
    console.log('⏳ Processing stems with Fadr AI...');
    const result = await waitForTaskCompletion(taskId);
    
    // Step 5: Return the results in the expected format
    if (!result) {
      throw new Error('No result returned from Fadr processing');
    }

    const stemPaths = {
      vocals: result.vocals?.url || '',
      drums: result.drums?.url || '',
      bass: result.bass?.url || '',
      other: result.melody?.url || '',
      instrumental: result.instrumental?.url || ''
    };

    console.log('✅ Fadr processing completed successfully!');
    
    return NextResponse.json({
      success: true,
      videoId,
      stemPaths,
      metadata: {
        key: result.key,
        tempo: result.tempo,
        midi: result.midi,
        processingTime: '~30 seconds',
        provider: 'Fadr AI'
      }
    });

  } catch (error) {
    console.error('❌ Error processing with Fadr:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process audio with Fadr API',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Download audio from YouTube using yt-dlp
async function downloadYouTubeAudio(youtubeUrl: string): Promise<Buffer> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'numa-yt-'));
  const outputPath = path.join(tempDir, 'audio.wav');
  
  try {
    // Use yt-dlp to download audio
    const ytDlCommand = `yt-dlp -x --audio-format wav --audio-quality 0 --max-filesize 100M --output "${outputPath}" "${youtubeUrl}"`;
    console.log('Executing:', ytDlCommand);
    
    const { stderr } = await execAsync(ytDlCommand, { 
      timeout: 60000 // 1 minute timeout for download
    });
    
    if (stderr) {
      console.log('yt-dlp warnings:', stderr);
    }
    
    // Read the downloaded file
    const audioBuffer = fs.readFileSync(outputPath);
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return audioBuffer;
    
  } catch (error) {
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw new Error(`Failed to download YouTube audio: ${error}`);
  }
}

// Upload audio buffer to Fadr
async function uploadToFadr(audioBuffer: Buffer): Promise<string> {
  // Step 1: Get upload URL
  const uploadResponse = await fetch(`${FADR_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FADR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: 'audio.wav',
      content_type: 'audio/wav'
    })
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to get Fadr upload URL: ${error}`);
  }

  const uploadData: FadrUploadResponse = await uploadResponse.json();
  
  // Step 2: Upload the actual file
  const uploadFileResponse = await fetch(uploadData.upload_url, {
    method: 'PUT',
    body: audioBuffer,
    headers: {
      'Content-Type': 'audio/wav'
    }
  });

  if (!uploadFileResponse.ok) {
    throw new Error(`Failed to upload audio to Fadr: ${uploadFileResponse.statusText}`);
  }

  return uploadData.asset_id;
}

// Create stem separation task
async function createStemTask(assetId: string): Promise<string> {
  const taskResponse = await fetch(`${FADR_API_BASE}/stems`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FADR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset_id: assetId,
      include_midi: true,
      include_chords: true,
      include_key_tempo: true
    })
  });

  if (!taskResponse.ok) {
    const error = await taskResponse.text();
    throw new Error(`Failed to create Fadr stem task: ${error}`);
  }

  const taskData: FadrTaskResponse = await taskResponse.json();
  return taskData.task_id;
}

// Wait for task completion
async function waitForTaskCompletion(taskId: string): Promise<FadrTaskResponse['result']> {
  const maxAttempts = 60; // Max 2 minutes waiting
  const pollInterval = 2000; // Poll every 2 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(`${FADR_API_BASE}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${FADR_API_KEY}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check Fadr task status: ${statusResponse.statusText}`);
    }

    const taskData: FadrTaskResponse = await statusResponse.json();
    
    console.log(`Task status: ${taskData.status} ${taskData.progress ? `(${taskData.progress}%)` : ''}`);
    
    if (taskData.status === 'completed' && taskData.result) {
      return taskData.result;
    }
    
    if (taskData.status === 'failed') {
      throw new Error(`Fadr processing failed: ${taskData.error || 'Unknown error'}`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Fadr processing timed out after 2 minutes');
} 