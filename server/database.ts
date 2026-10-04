import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Detection {
  id: string;
  upload_id: string;
  user_id: string;
  file_name: string;
  media_type: 'image' | 'video';
  result: 'REAL' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  model_name: string;
  processing_time: number;
  manipulated_region?: string;
  analysis_summary?: string;
  facial_artifacts?: string;
  frequency_anomaly?: string;
  blur_metric?: number;
  thumbnail_url?: string;
  frames_analyzed?: number;
  manipulated_frames?: number;
  temporal_consistency?: number | string;
  frame_timeline?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  email: string;
  action: string;
  timestamp: string;
}

class Database {
  private users: User[] = [];
  private detections: Detection[] = [];
  private activityLogs: ActivityLog[] = [];

  constructor() {
    this.initializeDemoData();
  }

  private initializeDemoData() {
    this.users = [
      {
        id: 'usr_admin_001',
        name: 'Admin User',
        email: 'admin@deepshield.ai',
        password_hash: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr_demo_001',
        name: 'Demo User',
        email: 'demo@deepshield.ai',
        password_hash: bcrypt.hashSync('demo123', 10),
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr_demo_002',
        name: 'Guest User',
        email: 'guest@deepshield.ai',
        password_hash: bcrypt.hashSync('guest123', 10),
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ];
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getAllUsers(): User[] {
    return this.users;
  }

  createUser(name: string, email: string, passwordHash: string, role: 'user' | 'admin' = 'user'): User {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      password_hash: passwordHash,
      role,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.find((u) => u.id === id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    const index = this.users.indexOf(user);
    this.users[index] = updated;
    return updated;
  }

  deleteUser(id: string): boolean {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }

  createDetection(data: Partial<Detection>): Detection {
    const detection: Detection = {
      id: `det_${Date.now()}`,
      upload_id: data.upload_id || '',
      user_id: data.user_id || '',
      file_name: data.file_name || '',
      media_type: data.media_type || 'image',
      result: data.result || 'UNCERTAIN',
      confidence: data.confidence || 0,
      model_name: data.model_name || 'default',
      processing_time: data.processing_time || 0,
      manipulated_region: data.manipulated_region,
      analysis_summary: data.analysis_summary,
      facial_artifacts: data.facial_artifacts,
      frequency_anomaly: data.frequency_anomaly,
      blur_metric: data.blur_metric,
      thumbnail_url: data.thumbnail_url,
      frames_analyzed: data.frames_analyzed,
      manipulated_frames: data.manipulated_frames,
      temporal_consistency: data.temporal_consistency,
      frame_timeline: data.frame_timeline,
      created_at: new Date().toISOString(),
    };
    this.detections.push(detection);
    return detection;
  }

  getDetectionById(id: string): Detection | undefined {
    return this.detections.find((d) => d.id === id);
  }

  getDetectionsByUser(userId: string): Detection[] {
    return this.detections.filter((d) => d.user_id === userId);
  }

  getAllDetections(): Detection[] {
    return this.detections;
  }

  deleteDetection(id: string): boolean {
    const index = this.detections.findIndex((d) => d.id === id);
    if (index === -1) return false;
    this.detections.splice(index, 1);
    return true;
  }

  clearUserDetections(userId: string): number {
    const initial = this.detections.length;
    this.detections = this.detections.filter((d) => d.user_id !== userId);
    return initial - this.detections.length;
  }

  getUserStats(userId: string) {
    const userDetections = this.detections.filter((d) => d.user_id === userId);
    return {
      totalDetections: userDetections.length,
      realCount: userDetections.filter((d) => d.result === 'REAL').length,
      fakeCount: userDetections.filter((d) => d.result === 'FAKE').length,
      uncertainCount: userDetections.filter((d) => d.result === 'UNCERTAIN').length,
      avgConfidence:
        userDetections.length > 0
          ? (userDetections.reduce((sum, d) => sum + d.confidence, 0) / userDetections.length).toFixed(2)
          : 0,
    };
  }

  getAdminStats() {
    return {
      totalUsers: this.users.length,
      totalDetections: this.detections.length,
      activeUsers: this.users.filter((u) => u.status === 'active').length,
      realCount: this.detections.filter((d) => d.result === 'REAL').length,
      fakeCount: this.detections.filter((d) => d.result === 'FAKE').length,
    };
  }

  logActivity(userId: string, email: string, action: string): void {
    this.activityLogs.push({
      id: `log_${Date.now()}`,
      user_id: userId,
      email,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  getActivityLogs(limit: number = 20): ActivityLog[] {
    return this.activityLogs.slice(-limit).reverse();
  }

  resetDatabase(): void {
    this.detections = [];
    this.activityLogs = [];
    this.initializeDemoData();
  }
}

export const db = new Database();
