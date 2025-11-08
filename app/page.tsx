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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4 md:p-8">
      {/* Animated background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-6 py-2 rounded-full border border-cyan-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-cyan-300 text-sm font-semibold tracking-wider uppercase">AI Powered</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4 drop-shadow-lg">
            Gaming Character Simulator
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
            Transform any image into a fully interactive gaming character with AI-powered motion generation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Left Panel - Controls & Upload */}
          <div className="space-y-6">
            {/* Upload Card */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl hover:border-cyan-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Character Upload</h2>
              </div>
              
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
                className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {selectedFile ? 'Change Character Image' : 'Select Character Image'}
              </button>

              {previewUrl && (
                <div className="mt-5 rounded-2xl overflow-hidden border-2 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 shadow-lg">
                  <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                </div>
              )}
            </div>

            {/* Generate Button */}
            {selectedFile && !allVideosReady && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-7 px-8 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-800 text-white text-xl rounded-2xl font-black transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="relative z-10">{isGenerating ? 'Generating Motion AI...' : '🎮 Generate Character'}</span>
              </button>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {isGenerating ? (
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-blue-100 leading-relaxed">{statusMessage}</p>
                    {isGenerating && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-blue-200 mb-2 font-semibold">
                          <span>Processing</span>
                          <span>{videosReady} / {totalVideos} complete</span>
                        </div>
                        <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                            style={{ width: `${(videosReady / totalVideos) * 100}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Controls Card */}
            {allVideosReady && (
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Game Controls</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg">W</div>
                    <span className="text-slate-300 font-semibold">Forward</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg">S</div>
                    <span className="text-slate-300 font-semibold">Backward</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg">A</div>
                    <span className="text-slate-300 font-semibold">Left</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg">D</div>
                    <span className="text-slate-300 font-semibold">Right</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-green-500/50 transition-all col-span-2">
                    <div className="w-24 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg">SPACE</div>
                    <span className="text-slate-300 font-semibold">Jump</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-4 rounded-xl border border-purple-500/30">
                    <span className="text-slate-300 font-semibold">Current Action:</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-black text-lg uppercase tracking-wider">{currentState}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 backdrop-blur-xl rounded-2xl p-6 border border-red-500/50 shadow-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-100 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Character View */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl lg:sticky lg:top-8 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Live Preview</h2>
              {allVideosReady && (
                <div className="ml-auto flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 text-xs font-bold uppercase">Live</span>
                </div>
              )}
            </div>
            
            <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-slate-300 text-lg font-semibold mb-2">Processing Character...</p>
                      <div className="flex items-center justify-center gap-2 text-cyan-400">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <p className="text-sm text-slate-400 mt-4 font-semibold">{videosReady} / {totalVideos} animations ready</p>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-400 font-semibold">Upload an image to begin</p>
                      <p className="text-slate-500 text-sm mt-2">Your character will appear here</p>
                    </div>
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
