import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { db } from './server/database';
import { modelLoader, AIMode } from './server/services/model_loader';
import { ImageDetector } from './server/services/image_detector';
import { VideoDetector } from './server/services/video_detector';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'deepshield-cybersecurity-ai-jwt-secret-key-2026';

// Middleware for parsing JSON with increased limit for base64 images/media
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth Token Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If demo mode or unauthenticated fallback for quick preview
    req.user = { id: 'usr_demo_002', email: 'demo@deepshield.ai', role: 'user' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      req.user = { id: 'usr_demo_002', email: 'demo@deepshield.ai', role: 'user' };
      return next();
    }
    req.user = decodedUser as any;
    next();
  });
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication token required.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser: any) => {
    if (err || !decodedUser || decodedUser.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden: Admin privileges required.' });
      return;
    }
    req.user = decodedUser;
    next();
  });
};

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// System health & config
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'DeepShield AI Detection Platform',
    version: '2.4.0-academic',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: modelLoader.getModelInfo(),
  });
});

// Auth Routes
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUser = db.createUser(name, email, passwordHash, 'user');

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please login.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at,
      },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, error: 'Account has been deactivated by administrator.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    db.logActivity(user.id, user.email, 'User logged in');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Admin email and password required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials or insufficient role privileges.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    db.logActivity(user.id, user.email, 'Admin accessed security control center');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        created_at: user.created_at,
      },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Admin login failed.' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user) {
    db.logActivity(req.user.id, req.user.email, 'User logged out');
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Image Detection Endpoint
app.post('/api/detect/image', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileSize, base64Data, mimeType, presetHint } = req.body;

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'File name is required.' });
    }

    // Validate image format
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(fileName).toLowerCase();
    if (!validExts.includes(ext) && !mimeType?.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: `Unsupported format. Allowed formats: ${validExts.join(', ')}`,
      });
    }

    const userId = req.user?.id || 'usr_demo_002';

    // Run AI Detection Pipeline
    const aiResult = await ImageDetector.analyzeImage({
      fileName,
      fileSize: fileSize || 1024 * 500,
      base64Data,
      mimeType: mimeType || 'image/jpeg',
      presetHint,
    });

    // Save detection record in database
    const record = db.createDetection({
      upload_id: `upl_${Date.now()}`,
      user_id: userId,
      file_name: fileName,
      media_type: 'image',
      result: aiResult.result,
      confidence: aiResult.confidence,
      model_name: aiResult.model,
      processing_time: aiResult.processing_time,
      manipulated_region: aiResult.manipulated_region,
      analysis_summary: aiResult.analysis_summary,
      facial_artifacts: aiResult.facial_artifacts,
      frequency_anomaly: aiResult.frequency_anomaly,
      blur_metric: aiResult.blur_metric,
      thumbnail_url: base64Data || undefined,
    });

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err: any) {
    console.error('Image detection failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Image detection pipeline error.',
    });
  }
});

// Video Detection Endpoint
app.post('/api/detect/video', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileSize, mimeType, duration, presetHint } = req.body;

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'File name is required.' });
    }

    // Validate video format
    const validExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = path.extname(fileName).toLowerCase();
    if (!validExts.includes(ext) && !mimeType?.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: `Unsupported video format. Allowed formats: ${validExts.join(', ')}`,
      });
    }

    const userId = req.user?.id || 'usr_demo_002';

    // Run AI Detection Pipeline
    const aiResult = await VideoDetector.analyzeVideo({
      fileName,
      fileSize: fileSize || 1024 * 1024 * 15,
      mimeType: mimeType || 'video/mp4',
      duration,
      presetHint,
    });

    // Save detection record in database
    const record = db.createDetection({
      upload_id: `upl_${Date.now()}`,
      user_id: userId,
      file_name: fileName,
      media_type: 'video',
      result: aiResult.result,
      confidence: aiResult.confidence,
      model_name: aiResult.model,
      processing_time: aiResult.processing_time,
      frames_analyzed: aiResult.frames_analyzed,
      manipulated_frames: aiResult.manipulated_frames,
      manipulated_region: aiResult.manipulated_region,
      analysis_summary: aiResult.analysis_summary,
      facial_artifacts: aiResult.facial_artifacts,
      temporal_consistency: aiResult.temporal_consistency,
      frequency_anomaly: aiResult.frequency_anomaly,
      frame_timeline: aiResult.frame_timeline,
    });

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err: any) {
    console.error('Video detection failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Video detection pipeline error.',
    });
  }
});

// Detection History & Detail
app.get('/api/detections', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'usr_demo_002';
  const { type, result, search } = req.query;

  let detections = db.getDetectionsByUser(userId);

  if (type && type !== 'all') {
    detections = detections.filter((d) => d.media_type === type);
  }
  if (result && result !== 'all') {
    detections = detections.filter((d) => d.result === result);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    detections = detections.filter(
      (d) => d.file_name.toLowerCase().includes(q) || d.model_name.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    data: detections,
  });
});

app.get('/api/detections/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const detection = db.getDetectionById(id);

  if (!detection) {
    return res.status(404).json({ success: false, error: 'Detection record not found.' });
  }

  return res.json({
    success: true,
    data: detection,
  });
});

app.delete('/api/detections/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deleteDetection(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Detection record not found.' });
  }
  return res.json({ success: true, message: 'Detection deleted successfully.' });
});

app.delete('/api/detections', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'usr_demo_001';
  const count = db.clearUserDetections(userId);
  return res.json({ success: true, message: `Cleared ${count} audit detection records.` });
});

app.post('/api/database/reset', (req: Request, res: Response) => {
  db.resetDatabase();
  return res.json({ success: true, message: 'Database reset to default demo state successfully.' });
});

// User Dashboard Stats
app.get('/api/stats/dashboard', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'usr_demo_002';
  const stats = db.getUserStats(userId);
  const recentDetections = db.getDetectionsByUser(userId).slice(0, 5);

  res.json({
    success: true,
    data: {
      stats,
      recentDetections,
    },
  });
});

// Reports
app.get('/api/reports/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const detection = db.getDetectionById(id);

  if (!detection) {
    return res.status(404).json({ success: false, error: 'Report not found.' });
  }

  const user = db.getUserById(detection.user_id);

  return res.json({
    success: true,
    data: {
      reportId: `REP-${detection.id.toUpperCase()}`,
      detection,
      user: {
        name: user?.name || 'Verified Researcher',
        email: user?.email || 'user@deepshield.ai',
      },
      generatedAt: new Date().toISOString(),
      academicDisclaimer:
        'This AI-generated result is intended for research and demonstration purposes and should not be considered absolute proof of media authenticity.',
    },
  });
});

// User Profile
app.get('/api/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'usr_demo_002';
  const user = db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  const stats = db.getUserStats(userId);

  return res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      stats,
    },
  });
});

app.put('/api/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'usr_demo_002';
  const { name, currentPassword, newPassword } = req.body;

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  const updates: any = {};
  if (name) updates.name = name;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Current password required to set new password.' });
    }
    const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Incorrect current password.' });
    }
    const salt = bcrypt.genSaltSync(10);
    updates.password_hash = bcrypt.hashSync(newPassword, salt);
  }

  const updated = db.updateUser(userId, updates);
  db.logActivity(userId, user.email, 'Updated profile settings');

  return res.json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      id: updated?.id,
      name: updated?.name,
      email: updated?.email,
      role: updated?.role,
      status: updated?.status,
    },
  });
});

// ----------------------------------------------------
// ADMIN REST APIs
// ----------------------------------------------------

app.get('/api/admin/users', requireAdmin, (req: AuthRequest, res: Response) => {
  const users = db.getAllUsers().map((u) => {
    const userStats = db.getUserStats(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      total_detections: userStats.totalDetections,
    };
  });

  res.json({
    success: true,
    data: users,
  });
});

app.put('/api/admin/users/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, role, name } = req.body;

  const updated = db.updateUser(id, { status, role, name });
  if (!updated) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  db.logActivity(req.user?.id || 'admin', 'admin@deepshield.ai', `Admin modified user ${updated.email} (Status: ${updated.status})`);

  return res.json({
    success: true,
    message: 'User updated successfully.',
    data: updated,
  });
});

app.delete('/api/admin/users/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deleteUser(id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  db.logActivity(req.user?.id || 'admin', 'admin@deepshield.ai', `Admin deleted user ID ${id}`);

  return res.json({
    success: true,
    message: 'User deleted successfully.',
  });
});

app.get('/api/admin/detections', requireAdmin, (req: AuthRequest, res: Response) => {
  const detections = db.getAllDetections();
  const enhanced = detections.map((d) => {
    const user = db.getUserById(d.user_id);
    return {
      ...d,
      user_name: user?.name || 'Unknown User',
      user_email: user?.email || 'N/A',
    };
  });

  res.json({
    success: true,
    data: enhanced,
  });
});

app.get('/api/admin/analytics', requireAdmin, (req: AuthRequest, res: Response) => {
  const stats = db.getAdminStats();
  const allDetections = db.getAllDetections();
  const activityLogs = db.getActivityLogs(20);

  // Group by last 7 days
  const last7Days: { date: string; real: number; fake: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayDetections = allDetections.filter((item) => item.created_at.startsWith(dateStr));
    last7Days.push({
      date: dateStr.slice(5), // MM-DD
      real: dayDetections.filter((item) => item.result === 'REAL').length,
      fake: dayDetections.filter((item) => item.result === 'FAKE').length,
      total: dayDetections.length,
    });
  }

  res.json({
    success: true,
    data: {
      stats,
      dailyTrends: last7Days,
      activityLogs,
    },
  });
});

app.post('/api/admin/config', requireAdmin, (req: AuthRequest, res: Response) => {
  const { mode } = req.body;
  if (mode && ['demo', 'production', 'gemini'].includes(mode)) {
    modelLoader.setMode(mode as AIMode);
    return res.json({
      success: true,
      message: `AI Model mode updated to '${mode}'.`,
      data: modelLoader.getModelInfo(),
    });
  }
  return res.status(400).json({ success: false, error: 'Invalid mode. Allowed: demo, production, gemini' });
});

// ----------------------------------------------------
// VITE & STATIC SERVING INTEGRATION
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ======================================================`);
    console.log(`  🛡️  DeepShield AI Forensic Platform Server Online`);
    console.log(`  ======================================================`);
    console.log(`  ➜ Local URL:    http://localhost:${PORT}`);
    console.log(`  ➜ Network URL:  http://127.0.0.1:${PORT}`);
    console.log(`  ➜ Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`  ======================================================\n`);
  });
}

startServer();
