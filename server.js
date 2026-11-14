import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});



const PgSession = connectPgSimple(session);
const uploadDir = path.join(__dirname, 'private_uploads');
fs.mkdirSync(uploadDir, { recursive: true });

if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      mediaSrc: ["'self'", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  name: 'melomane.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aac', 'audio/ogg']);
    cb(allowed.has(file.mimetype), allowed.has(file.mimetype) ? true : new Error('Format audio non autorisé.'));
  }
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const requireAuth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Connexion requise.' });
const requireAdmin = (req, res, next) => req.session.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Accès administrateur requis.' });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', name: 'MELÓMANE API' }));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName || password.length < 12) {
    return res.status(400).json({ error: 'Renseigne tous les champs. Le mot de passe doit contenir au moins 12 caractères.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO users(email,password_hash,display_name,role) VALUES($1,$2,$3,$4) RETURNING id,email,display_name,role',
      [normalizedEmail, hash, String(displayName).trim().slice(0, 80), 'user']
    );
    req.session.user = result.rows[0];
    res.status(201).json({ user: req.session.user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée.' });
    throw e;
  }
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const result = await pool.query('SELECT id,email,password_hash,display_name,role FROM users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Impossible de créer la session.' });
    req.session.user = { id: user.id, email: user.email, display_name: user.display_name, role: user.role };
    res.json({ user: req.session.user });
  });
}));

app.post('/api/auth/logout', requireAuth, (req, res) => req.session.destroy(() => {
  res.clearCookie('melomane.sid');
  res.json({ ok: true });
}));

app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

app.get('/api/tracks', asyncRoute(async (_req, res) => {
  const result = await pool.query(
  `SELECT id, title, artist_name, created_at, cover_name, cover_mime_type, album_name
   FROM tracks
   WHERE is_published = TRUE
   ORDER BY created_at DESC
   LIMIT 100`
);
  res.json({ tracks: result.rows });
}));

app.post('/api/submissions', requireAuth, upload.single('audio'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ajoute un fichier audio.' });
  const { title, artistName, rightsModel, rightsConfirmed } = req.body;
  if (!title || !artistName || !['artist_retains_rights', 'platform_license'].includes(rightsModel) || rightsConfirmed !== 'true') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Informations ou confirmation des droits manquantes.' });
  }
  const result = await pool.query(
    `INSERT INTO submissions(user_id,artist_name,track_title,file_name,stored_name,mime_type,file_size,rights_model,rights_confirmed)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
     RETURNING id,status,created_at`,
    [req.session.user.id, String(artistName).slice(0,100), String(title).slice(0,120), req.file.originalname.slice(0,255), req.file.filename, req.file.mimetype, req.file.size, rightsModel]
  );
  res.status(201).json({ submission: result.rows[0] });
}));

app.get('/api/my-submissions', requireAuth, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id,artist_name,track_title,rights_model,status,admin_note,created_at FROM submissions WHERE user_id=$1 ORDER BY created_at DESC',
    [req.session.user.id]
  );
  res.json({ submissions: result.rows });
}));

app.get('/api/admin/submissions', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT s.id,s.artist_name,s.track_title,s.rights_model,s.status,s.created_at,u.email
     FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 200`
  );
  res.json({ submissions: result.rows });
}));

app.post('/api/admin/submissions/:id/review', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Décision invalide.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [req.params.id]);
    const sub = found.rows[0];
    if (!sub) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Proposition introuvable.' }); }
    if (sub.status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Cette proposition a déjà été traitée.' }); }
    await client.query(
      'UPDATE submissions SET status=$1,admin_note=$2,reviewed_at=NOW() WHERE id=$3',
      [decision, String(note || '').slice(0,1000), sub.id]
    );
    if (decision === 'approved') {
      await client.query(
        `INSERT INTO tracks(submission_id,artist_name,title,stored_name,mime_type)
         VALUES($1,$2,$3,$4,$5)`,
        [sub.id, sub.artist_name, sub.track_title, sub.stored_name, sub.mime_type]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, status: decision });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}));

// Streaming endpoint: authenticated access only. Add subscription/territory checks here before launch.
const SUPABASE_BUCKET_URL = 'https://gfhugxkdcaskexcmeocv.supabase.co/storage/v1/object/public/Music%20and%20Covers';

// Streaming endpoint: lit depuis Supabase et renvoie directement au navigateur
app.get('/api/tracks/:id/audio', requireAuth, asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT stored_name, mime_type FROM tracks WHERE id=$1 AND is_published=TRUE', [req.params.id]);
  const track = result.rows[0];
  if (!track || !track.stored_name) return res.status(404).json({ error: 'Morceau introuvable.' });

  const fileUrl = `${SUPABASE_BUCKET_URL}/${encodeURIComponent(track.stored_name)}`;
  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range; // Indispensable pour avancer/reculer dans la barre de lecture

  const upstream = await fetch(fileUrl, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    return res.status(upstream.status).json({ error: 'Fichier audio introuvable sur Supabase.' });
  }

  res.status(upstream.status);
  res.setHeader('Content-Type', upstream.headers.get('content-type') || track.mime_type || 'audio/wav');
  if (upstream.headers.get('content-length')) res.setHeader('Content-Length', upstream.headers.get('content-length'));
  if (upstream.headers.get('content-range')) res.setHeader('Content-Range', upstream.headers.get('content-range'));
  res.setHeader('Accept-Ranges', 'bytes');

  const { Readable } = await import('node:stream');
  Readable.fromWeb(upstream.body).pipe(res);
}));

// Cover endpoint: lit l'image depuis Supabase et la renvoie directement au navigateur
app.get('/api/tracks/:id/cover', requireAuth, asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT cover_name, cover_mime_type FROM tracks WHERE id=$1 AND is_published=TRUE', [req.params.id]);
  const track = result.rows[0];
  if (!track || !track.cover_name) return res.status(404).json({ error: 'Pochette introuvable.' });

  const fileUrl = `${SUPABASE_BUCKET_URL}/${encodeURIComponent(track.cover_name)}`;
  const upstream = await fetch(fileUrl);
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: 'Pochette introuvable sur Supabase.' });
  }

  res.setHeader('Content-Type', upstream.headers.get('content-type') || track.cover_mime_type || 'image/jpeg');
  const { Readable } = await import('node:stream');
  Readable.fromWeb(upstream.body).pipe(res);
}));


app.use((err, _req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Fichier trop volumineux ou invalide.' });
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Erreur serveur.' : err.message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`MELÓMANE lancé sur http://localhost:${port}`));
