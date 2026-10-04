export type AIMode = 'demo' | 'production' | 'gemini';

export interface ModelInfo {
  mode: AIMode;
  modelName: string;
  description: string;
  capabilities: string[];
  status: 'online' | 'offline';
}

class ModelLoader {
  private mode: AIMode = 'demo';

  private readonly models: Record<AIMode, ModelInfo> = {
    demo: {
      mode: 'demo',
      modelName: 'DeepShield Academic Demo',
      description: 'Lightweight demo model for testing',
      capabilities: ['image-analysis', 'video-analysis', 'basic-detection'],
      status: 'online',
    },
    production: {
      mode: 'production',
      modelName: 'DeepShield Pro v2.4',
      description: 'Production-grade detection model',
      capabilities: ['advanced-image-analysis', 'advanced-video-analysis', 'real-time-detection', 'batch-processing'],
      status: 'online',
    },
    gemini: {
      mode: 'gemini',
      modelName: 'Google Gemini Integration',
      description: 'Google Gemini powered detection',
      capabilities: ['image-analysis', 'video-analysis', 'advanced-reasoning'],
      status: 'online',
    },
  };

  constructor() {
    this.mode = 'demo';
  }

  getMode(): AIMode {
    return this.mode;
  }

  setMode(mode: AIMode): void {
    if (this.models[mode]) {
      this.mode = mode;
    }
  }

  getModelInfo(): ModelInfo {
    return this.models[this.mode];
  }

  async loadModel(): Promise<void> {
    console.log(`Loading model: ${this.mode}`);
  }
}

export const modelLoader = new ModelLoader();
