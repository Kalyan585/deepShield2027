export interface ImageDetectionRequest {
  fileName: string;
  fileSize: number;
  base64Data?: string;
  mimeType: string;
  presetHint?: string;
}

export interface DetectionResult {
  result: 'REAL' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  model: string;
  processing_time: number;
  manipulated_region?: string;
  analysis_summary?: string;
  facial_artifacts?: string;
  frequency_anomaly?: string;
  blur_metric?: number;
}

class ImageDetectorClass {
  async analyzeImage(request: ImageDetectionRequest): Promise<DetectionResult> {
    const startTime = Date.now();

    // Simulate AI analysis based on filename or preset
    const results: DetectionResult[] = [
      {
        result: 'REAL',
        confidence: 0.95,
        model: 'DeepShield Academic Demo',
        processing_time: 1200,
        analysis_summary: 'Image appears to be authentic with no signs of manipulation.',
        facial_artifacts: 'None detected',
        frequency_anomaly: 'Normal',
        blur_metric: 0.05,
      },
      {
        result: 'FAKE',
        confidence: 0.88,
        model: 'DeepShield Academic Demo',
        processing_time: 1500,
        manipulated_region: 'Center face region (65%, 35%, 80%, 60%)',
        analysis_summary: 'Detected facial manipulation and deepfake artifacts.',
        facial_artifacts: 'High-frequency artifacts in eye region',
        frequency_anomaly: 'Anomalies detected in facial boundary',
        blur_metric: 0.42,
      },
      {
        result: 'UNCERTAIN',
        confidence: 0.62,
        model: 'DeepShield Academic Demo',
        processing_time: 1100,
        analysis_summary: 'Image quality and compression make definitive analysis difficult.',
        facial_artifacts: 'Possible compression artifacts',
        frequency_anomaly: 'Moderate anomalies',
        blur_metric: 0.55,
      },
    ];

    // Select based on filename pattern or random
    let selectedResult: DetectionResult;
    const lowerFileName = request.fileName.toLowerCase();

    if (lowerFileName.includes('fake') || lowerFileName.includes('deepfake')) {
      selectedResult = results[1];
    } else if (lowerFileName.includes('real') || lowerFileName.includes('authentic')) {
      selectedResult = results[0];
    } else {
      selectedResult = results[Math.floor(Math.random() * results.length)];
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const processingTime = Date.now() - startTime;
    return {
      ...selectedResult,
      processing_time: processingTime,
    };
  }
}

export const ImageDetector = new ImageDetectorClass();
