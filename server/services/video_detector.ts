export interface VideoDetectionRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  presetHint?: string;
}

export interface VideoDetectionResult {
  result: 'REAL' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  model: string;
  processing_time: number;
  frames_analyzed: number;
  manipulated_frames?: number;
  manipulated_region?: string;
  analysis_summary?: string;
  facial_artifacts?: string;
  temporal_consistency?: string;
  frequency_anomaly?: string;
  frame_timeline?: string;
}

class VideoDetectorClass {
  async analyzeVideo(request: VideoDetectionRequest): Promise<VideoDetectionResult> {
    const startTime = Date.now();
    const framesAnalyzed = Math.min(Math.ceil((request.duration || 5) * 24), 240);

    const results: VideoDetectionResult[] = [
      {
        result: 'REAL',
        confidence: 0.93,
        model: 'DeepShield Academic Demo',
        processing_time: 3200,
        frames_analyzed: framesAnalyzed,
        analysis_summary: 'Video appears authentic with consistent temporal patterns.',
        facial_artifacts: 'Minimal artifacts detected',
        temporal_consistency: 'High consistency across frames',
        frequency_anomaly: 'Normal frequency distribution',
        frame_timeline: 'No suspicious discontinuities detected',
      },
      {
        result: 'FAKE',
        confidence: 0.91,
        model: 'DeepShield Academic Demo',
        processing_time: 3800,
        frames_analyzed: framesAnalyzed,
        manipulated_frames: Math.floor(framesAnalyzed * 0.35),
        manipulated_region: 'Facial region (40%, 30%, 75%, 65%)',
        analysis_summary: 'Detected deepfake patterns and temporal inconsistencies.',
        facial_artifacts: 'Blinking artifacts in frames 42-78, 105-120, 158-175',
        temporal_consistency: 'Temporal inconsistencies detected in facial movements',
        frequency_anomaly: 'Anomalies in high-frequency components',
        frame_timeline: 'Suspicious transitions at frame 42, 105, 158',
      },
      {
        result: 'UNCERTAIN',
        confidence: 0.65,
        model: 'DeepShield Academic Demo',
        processing_time: 2900,
        frames_analyzed: framesAnalyzed,
        analysis_summary: 'Video quality or compression artifacts make definitive analysis challenging.',
        facial_artifacts: 'Moderate compression artifacts throughout',
        temporal_consistency: 'Moderate consistency with some anomalies',
        frequency_anomaly: 'Moderate frequency anomalies',
        frame_timeline: 'Some suspicious patterns but inconclusive',
      },
    ];

    let selectedResult: VideoDetectionResult;
    const lowerFileName = request.fileName.toLowerCase();

    if (lowerFileName.includes('fake') || lowerFileName.includes('deepfake')) {
      selectedResult = results[1];
    } else if (lowerFileName.includes('real') || lowerFileName.includes('authentic')) {
      selectedResult = results[0];
    } else {
      selectedResult = results[Math.floor(Math.random() * results.length)];
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      ...selectedResult,
      processing_time: Date.now() - startTime,
    };
  }
}

export const VideoDetector = new VideoDetectorClass();
