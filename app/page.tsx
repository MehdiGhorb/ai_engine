'use client';

import { useState, useEffect, useRef } from 'react';

type MovementState = 'walk-forward' | 'walk-backward' | 'walk-left' | 'walk-right' | 'jump' | 'idle';

type VideoLibrary = {
  [key: string]: string;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoLibrary>({});
  const [currentState, setCurrentState] = useState<MovementState>('idle');
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<{[key: string]: boolean}>({});
  const [videosReady, setVideosReady] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());
  const currentVideoRef = useRef<string>('');

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setVideos({});
      setStatusMessage('');
      setGenerationProgress({});
      setVideosReady(0);
    }
  };

  // Poll for video status
  const pollVideoStatus = async (taskUUID: string, direction: string) => {
    const maxAttempts = 60; // 5 minutes max (reduced from 10)
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/generate?taskUUID=${taskUUID}`);
        const data = await response.json();

        if (data.status === 'success' && data.videoURL) {
          setVideos(prev => ({ ...prev, [direction]: data.videoURL }));
          setGenerationProgress(prev => ({ ...prev, [direction]: true }));
          setVideosReady(prev => prev + 1);
          console.log(`✅ ${direction} ready`);
          return;
        }

        if (data.status === 'error') {
          console.error(`❌ ${direction} failed`);
          setGenerationProgress(prev => ({ ...prev, [direction]: false }));
          setVideosReady(prev => prev + 1); // Count it as "done" even if failed
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          console.error(`⏱️ ${direction} timeout after ${maxAttempts * 5}s`);
          setGenerationProgress(prev => ({ ...prev, [direction]: false }));
          setVideosReady(prev => prev + 1); // Count it as "done" even if timeout
          setStatusMessage(prev => prev + ` (${direction} timed out - you can try again later)`);
        }
      } catch (err) {
        console.error(`Error polling ${direction}:`, err);
      }
    };

    poll();
  };

  // Generate all videos
  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setError('');
    setStatusMessage('Removing background and generating 25 movement videos...');
    setGenerationProgress({});
    setVideosReady(0);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const data = await response.json();
      
      if (data.success && data.videos) {
        setTotalVideos(data.videos.length);
        setStatusMessage(`Generating ${data.videos.length} videos (this will take ~5 minutes)...`);
        
        data.videos.forEach((task: any) => {
          if (task.success) {
            pollVideoStatus(task.taskUUID, task.direction);
          }
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsGenerating(false);
    }
  };

  // Check if all 6 videos are ready
  const allVideosReady = ['walk-forward', 'walk-backward', 'walk-left', 'walk-right', 'jump', 'idle'].every(
    dir => generationProgress[dir] === true
  );

  useEffect(() => {
    if (videosReady === totalVideos && totalVideos > 0) {
      setIsGenerating(false);
      
      const successCount = Object.values(generationProgress).filter(v => v === true).length;
      const failedCount = totalVideos - successCount;
      
      if (successCount === 6) {
        setStatusMessage('✅ All 6 videos ready! Use W/A/S/D to move, SPACE to jump');
        setCurrentState('idle');
      } else if (successCount >= 4) {
        setStatusMessage(`⚠️ ${successCount}/6 videos ready (${failedCount} failed/timeout). You can still play!`);
        setCurrentState('idle');
      } else {
        setStatusMessage(`❌ Only ${successCount}/6 videos ready. Try uploading a different image.`);
      }
    } else if (videosReady > 0 && totalVideos > 0) {
      setStatusMessage(`Generating videos... ${videosReady}/${totalVideos} complete`);
    }
  }, [videosReady, totalVideos, generationProgress]);

  // Play video - simple and direct
  const playVideo = (videoKey: string) => {
    if (!videoRef.current || !videos[videoKey]) return;
    
    const video = videoRef.current;
    
    // Only change video if it's different
    if (currentVideoRef.current !== videoKey) {
      currentVideoRef.current = videoKey;
      video.src = videos[videoKey];
      video.loop = true; // All videos loop
      video.load();
      video.play().catch(() => {});
    }
  };

  // Handle state changes - instant switching
  const changeState = (newState: MovementState) => {
    if (newState !== currentState) {
      setCurrentState(newState);
      playVideo(newState);
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!allVideosReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);

      let newState: MovementState | null = null;

      if (key === 'w') newState = 'walk-forward';
      else if (key === 's') newState = 'walk-backward';
      else if (key === 'a') newState = 'walk-left';
      else if (key === 'd') newState = 'walk-right';
      else if (key === ' ') newState = 'jump';

      if (newState) {
        changeState(newState);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.current.delete(key);

      // Return to idle when no keys pressed
      if (pressedKeys.current.size === 0) {
        changeState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [allVideosReady, currentState, videos]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            AI Character Engine
          </h1>
          <p className="text-purple-200 text-lg">
            Professional character controller with smooth transitions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-4">Upload Character</h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
              >
                {selectedFile ? 'Change Image' : 'Select Image'}
              </button>

              {previewUrl && (
                <div className="mt-4 rounded-xl overflow-hidden border-2 border-white/30">
                  <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                </div>
              )}
            </div>

            {selectedFile && !allVideosReady && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-6 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-xl rounded-2xl font-bold transition-all shadow-2xl"
              >
                {isGenerating ? 'Generating...' : 'Generate Movement System'}
              </button>
            )}

            {statusMessage && (
              <div className="bg-blue-500/20 backdrop-blur-md rounded-2xl p-6 border border-blue-500/50">
                <p className="text-blue-200 mb-2">{statusMessage}</p>
                {isGenerating && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-white mb-2">
                      <span>Progress</span>
                      <span>{videosReady} / {totalVideos}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(videosReady / totalVideos) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {allVideosReady && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">W</div>
                    <span className="text-purple-200">Forward</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                    <span className="text-purple-200">Backward</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
                    <span className="text-purple-200">Left</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">D</div>
                    <span className="text-purple-200">Right</span>
                  </div>
                  <div className="flex items-center space-x-3 col-span-2">
                    <div className="w-20 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SPACE</div>
                    <span className="text-purple-200">Jump</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-purple-200 text-sm">
                    Current: <span className="text-white font-bold">{currentState}</span>
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-500/50">
                <p className="text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Character View</h2>
            
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-white/30">
              {videos[currentState] ? (
                <video
                  ref={videoRef}
                  src={videos[currentState]}
                  loop={true}
                  muted
                  playsInline
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                      <p>Processing character...</p>
                      <p className="text-sm mt-2">{videosReady} / {totalVideos} videos ready</p>
                    </div>
                  ) : (
                    <p>Upload and generate to start</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
