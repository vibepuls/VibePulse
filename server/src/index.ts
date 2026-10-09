import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import { randomInt, randomUUID } from 'node:crypto';

const app = express(); const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000); if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) throw new Error('AUTH_SECRET must be configured in production'); const AUTH_SECRET = process.env.AUTH_SECRET || 'development-only-change-this-secret-please';
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' })); app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    cb(null, true);
  }
});
function hasValidImageSignature(buffer:Buffer) {
  const png = buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = buffer.length >= 3 && buffer[0]===255 && buffer[1]===216 && buffer[2]===255;
  const gif = buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString('ascii'));
  const webp = buffer.length >= 12 && buffer.subarray(0,4).toString('ascii')==='RIFF' && buffer.subarray(8,12).toString('ascii')==='WEBP';
  return png || jpeg || gif || webp;
}

async function auth(req:any,res:any,next:any){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({error:'Please log in'});try{const payload=jwt.verify(h.slice(7),AUTH_SECRET) as any;const current=await prisma.user.findUnique({where:{id:String(payload.id)},select:{id:true,username:true,role:true,status:true}});if(!current||current.status!=='ACTIVE')return res.status(403).json({error:'Account is not active'});req.user={id:current.id,username:current.username,role:current.role};next();}catch{return res.status(401).json({error:'Invalid or expired session'});}}
function admin(req:any,res:any,next:any){if(req.user?.role!=='ADMIN') return res.status(403).json({error:'Admin access required'}); next();}
const safeUser=(u:any)=>({id:u.id,username:u.username,displayName:u.displayName,bio:u.bio,avatarUrl:u.avatarUrl,points:u.points,role:u.role,createdAt:u.createdAt});
const dayKey = () => new Date().toISOString().slice(0, 10);
async function recordMissionProgress(tx:any,userId:string,actionType:string,amount=1) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${userId}), hashtext(${actionType}))`;
  const missions = await tx.dailyMission.findMany({ where: { actionType, active: true } });
  const periodKey = dayKey();
  for (const mission of missions) {
    const where = { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } };
    const existing = await tx.missionProgress.findUnique({ where });
    const nextProgress = Math.min(mission.target, (existing?.progress || 0) + amount);
    const values = { progress: nextProgress, completed: nextProgress >= mission.target };
    if (existing) await tx.missionProgress.update({ where: { id: existing.id }, data: values });
    else await tx.missionProgress.create({ data: { userId, missionId: mission.id, periodKey, ...values } });
  }
}
app.post('/api/media/upload', auth, (req:any,res:any,next:any)=>upload.single('file')(req,res,(error:any)=>{if(error)return res.status(400).json({error:error.message||'Invalid image upload'});next();}), async (req:any, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'vibepulse-media';
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Image uploads are not configured on the API yet' });
  if (!req.file || !hasValidImageSignature(req.file.buffer)) return res.status(400).json({ error: 'Choose a valid image file (JPG, PNG, WEBP, or GIF)' });
  const extension:any = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const objectPath = `${req.user.id}/${randomUUID()}.${extension[req.file.mimetype]}`;
  const encodedPath = objectPath.split('/').map((part:string) => encodeURIComponent(part)).join('/');
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': req.file.mimetype, 'x-upsert': 'false' },
      body: req.file.buffer
    });
    if (!response.ok) {
      console.error('Supabase Storage upload failed:', response.status, await response.text());
      return res.status(502).json({ error: 'Image storage rejected the upload. Check the storage bucket settings.' });
    }
    res.status(201).json({ url: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}` });
  } catch (error) {
    console.error('Image upload failed:', error);
    res.status(502).json({ error: 'Image upload failed. Please try again.' });
  }
});

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'VibePulse API'}));
app.post('/api/auth/register',async(req,res)=>{try{const data=z.object({username:z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),displayName:z.string().min(1).max(60),email:z.string().email().optional().or(z.literal('')),password:z.string().min(8).max(100)}).parse(req.body); const username=data.username.toLowerCase(); const hash=await bcrypt.hash(data.password,12); const user=await prisma.user.create({data:{username,displayName:data.displayName,email:data.email||null,passwordHash:hash}}); const token=jwt.sign({id:user.id,username:user.username,role:user.role},AUTH_SECRET,{expiresIn:'7d'}); res.status(201).json({token,user:safeUser(user)});}catch(e:any){res.status(e?.code==='P2002'?409:400).json({error:e?.code==='P2002'?'Username or email already exists':e.message||'Registration failed'});}});
app.post('/api/auth/login',async(req,res)=>{const data=z.object({username:z.string(),password:z.string()}).safeParse(req.body);if(!data.success)return res.status(400).json({error:'Username and password required'});const user=await prisma.user.findUnique({where:{username:data.data.username.toLowerCase()}});if(!user||!(await bcrypt.compare(data.data.password,user.passwordHash)))return res.status(401).json({error:'Incorrect username or password'});if(user.status!=='ACTIVE')return res.status(403).json({error:'Account is not active'});const token=jwt.sign({id:user.id,username:user.username,role:user.role},AUTH_SECRET,{expiresIn:'7d'});res.json({token,user:safeUser(user)});});
app.get('/api/me',auth,async(req:any,res)=>{const u=await prisma.user.findUnique({where:{id:req.user.id}});if(!u)return res.status(404).json({error:'User not found'});res.json(safeUser(u));});
app.patch('/api/me/profile', auth, async (req:any, res) => {
  const parsed = z.object({
    displayName: z.string().trim().min(1).max(60),
    bio: z.string().max(500).default(''),
    avatarUrl: z.string().url().max(2000).optional().or(z.literal(''))
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Display name, bio or avatar URL is invalid' });
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { displayName: parsed.data.displayName, bio: parsed.data.bio, avatarUrl: parsed.data.avatarUrl || null }
  });
  res.json(safeUser(updated));
});
app.get('/api/users',async(req,res)=>{const q=String(req.query.q||'').slice(0,40);const users=await prisma.user.findMany({where:{status:'ACTIVE',OR:[{username:{contains:q,mode:'insensitive'}},{displayName:{contains:q,mode:'insensitive'}}]},select:{id:true,username:true,displayName:true,avatarUrl:true,points:true},take:20,orderBy:{points:'desc'}});res.json(users);});
app.get('/api/leaderboard',async(_req,res)=>{const users=await prisma.user.findMany({where:{status:'ACTIVE'},select:{id:true,username:true,displayName:true,avatarUrl:true,points:true},orderBy:{points:'desc'},take:50});res.json(users.map((u,i)=>({...u,rank:i+1})));});
app.get('/api/trending', async (_req, res) => {
  const posts = await prisma.post.findMany({
    where: { hidden: false, privacy: 'PUBLIC' },
    include: { author: { select: { username: true, displayName: true, avatarUrl: true } }, _count: { select: { likes: true, comments: true } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 100
  });
  const ranked = posts.map((post:any) => ({
    ...post,
    hotScore: Number(post.points || 0) + post._count.likes * 3 + post._count.comments * 2,
    isHot: post.createdAt.getTime() >= Date.now() - 60 * 60 * 1000 && (post._count.likes + post._count.comments) >= 3
  })).sort((a:any,b:any) => b.hotScore - a.hotScore || b.createdAt.getTime() - a.createdAt.getTime());
  res.json(ranked.slice(0, 50));
});

app.get('/api/rising-users', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let users = await prisma.user.findMany({
    where: { status: 'ACTIVE', createdAt: { gte: since } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, points: true, createdAt: true },
    orderBy: [{ points: 'desc' }, { createdAt: 'desc' }],
    take: 10
  });
  if (!users.length) users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, username: true, displayName: true, avatarUrl: true, points: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { points: 'desc' }],
    take: 10
  });
  res.json(users);
});

app.get('/api/leaderboard/:period', async (req, res) => {
  const period = String(req.params.period).toLowerCase();
  if (!['daily', 'weekly'].includes(period)) return res.status(404).json({ error: 'Leaderboard period not found' });
  const now = new Date();
  const start = new Date(now);
  if (period === 'daily') start.setUTCHours(0, 0, 0, 0);
  else start.setUTCDate(start.getUTCDate() - 7);
  const [users, transactions] = await Promise.all([
    prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, username: true, displayName: true, avatarUrl: true, points: true } }),
    prisma.pointTransaction.findMany({ where: { createdAt: { gte: start } }, select: { senderId: true, receiverId: true, amount: true } })
  ]);
  const net = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.receiverId) net.set(tx.receiverId, (net.get(tx.receiverId) || 0) + tx.amount);
    if (tx.senderId) net.set(tx.senderId, (net.get(tx.senderId) || 0) - tx.amount);
  }
  users.sort((a:any, b:any) => (net.get(b.id) || 0) - (net.get(a.id) || 0) || b.points - a.points);
  res.json(users.slice(0, 50).map((user:any, index:number) => ({ ...user, rank: index + 1, periodPoints: net.get(user.id) || 0 })));
});

app.get('/api/posts',async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1);let viewerId:string|null=null;const header=req.headers.authorization;if(header?.startsWith('Bearer ')){try{const payload=jwt.verify(header.slice(7),AUTH_SECRET) as any;viewerId=String(payload.id)}catch{}}const privacyFilter:any=viewerId?{OR:[{privacy:'PUBLIC'},{authorId:viewerId},{privacy:'FOLLOWERS',author:{followsIn:{some:{followerId:viewerId}}}}]}:{privacy:'PUBLIC'};const posts=await prisma.post.findMany({where:{hidden:false,...privacyFilter},include:{author:{select:{username:true,displayName:true,avatarUrl:true}},_count:{select:{likes:true,comments:true}}},orderBy:[{points:'desc'},{createdAt:'desc'}],skip:(page-1)*20,take:20});res.json(posts);});
app.post('/api/posts',auth,async(req:any,res)=>{
  const d=z.object({imageUrl:z.string().url().max(2000),caption:z.string().max(2000).default(''),privacy:z.enum(['PUBLIC','FOLLOWERS','PRIVATE']).default('PUBLIC')}).safeParse(req.body);
  if(!d.success)return res.status(400).json({error:'A valid image URL and caption are required'});
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${req.user.id}), hashtext('daily-post-reward'))`;
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setUTCHours(0, 0, 0, 0);
      const postsToday = await tx.post.count({ where: { authorId: req.user.id, createdAt: { gte: dayStart } } });
      const reward = postsToday < 5 ? 10 : 0;
      const post = await tx.post.create({data:{authorId:req.user.id,...d.data,points:reward},include:{author:{select:{username:true,displayName:true,avatarUrl:true}}}});
      await recordMissionProgress(tx, req.user.id, 'POST', 1);
      if (reward > 0) {
        await tx.user.update({where:{id:req.user.id},data:{points:{increment:reward}}});
        await tx.pointTransaction.create({data:{receiverId:req.user.id,amount:reward,type:'POST_REWARD',note:'Daily photo post reward'}});
      }
      return { post, reward };
    });
    res.status(201).json({ ...result.post, reward: result.reward });
  } catch (error:any) {
    res.status(400).json({error:'Could not publish post'});
  }
});
app.patch('/api/posts/:id',auth,async(req:any,res)=>{const post=await prisma.post.findUnique({where:{id:req.params.id}});if(!post)return res.status(404).json({error:'Post not found'});if(post.authorId!==req.user.id&&req.user.role!=='ADMIN')return res.status(403).json({error:'Not your post'});if(post.lastEditedAt&&Date.now()-post.lastEditedAt.getTime()<4*60*60*1000)return res.status(429).json({error:`You can edit again after ${new Date(post.lastEditedAt.getTime()+4*60*60*1000).toISOString()}`});const d=z.object({imageUrl:z.string().url().optional(),caption:z.string().max(2000).optional(),privacy:z.enum(['PUBLIC','FOLLOWERS','PRIVATE']).optional()}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid post data'});const updated=await prisma.post.update({where:{id:post.id},data:{...d.data,lastEditedAt:new Date()}});res.json(updated);});
app.post('/api/posts/:id/like',auth,async(req:any,res)=>{try{const like=await prisma.$transaction(async tx=>{const post=await tx.post.findUniqueOrThrow({where:{id:req.params.id},select:{authorId:true,hidden:true}});if(post.hidden)throw new Error('HIDDEN_POST');if(post.authorId===req.user.id)throw new Error('SELF_LIKE');const created=await tx.like.create({data:{postId:req.params.id,userId:req.user.id}});await recordMissionProgress(tx,req.user.id,'LIKE',1);await tx.post.update({where:{id:req.params.id},data:{points:{increment:1}}});await tx.user.update({where:{id:post.authorId},data:{points:{increment:1}}});await tx.pointTransaction.create({data:{receiverId:post.authorId,amount:1,type:'POST_ENGAGEMENT',note:'Like received'}});await tx.notification.create({data:{userId:post.authorId,text:`@${req.user.username} liked your photo post. +1 point.`}});return created;});res.json({liked:true,id:like.id});}catch(e:any){const msg=e.message==='SELF_LIKE'?'You cannot like your own post':e.message==='HIDDEN_POST'?'This post is unavailable':'Already liked or post does not exist';res.status(409).json({error:msg});}});
app.post('/api/posts/:id/comments',auth,async(req:any,res)=>{const body=z.string().trim().min(1).max(1000).safeParse(req.body.body);if(!body.success)return res.status(400).json({error:'Comment must be 1–1000 characters'});const comment=await prisma.$transaction(async tx=>{const post=await tx.post.findUniqueOrThrow({where:{id:req.params.id},select:{authorId:true,hidden:true}});if(post.hidden)throw new Error('HIDDEN_POST');const created=await tx.comment.create({data:{postId:req.params.id,authorId:req.user.id,body:body.data},include:{author:{select:{username:true,displayName:true}}}});await recordMissionProgress(tx,req.user.id,'COMMENT',1);if(post.authorId!==req.user.id){await tx.post.update({where:{id:req.params.id},data:{points:{increment:2}}});await tx.user.update({where:{id:post.authorId},data:{points:{increment:2}}});await tx.pointTransaction.create({data:{receiverId:post.authorId,amount:2,type:'POST_ENGAGEMENT',note:'Comment received'}});await tx.notification.create({data:{userId:post.authorId,text:`@${req.user.username} commented on your photo post. +2 points.`}});}return created;});res.status(201).json(comment);});
app.post('/api/points/steal/:targetUsername',auth,async(req:any,res)=>{const thiefId=req.user.id;const target=await prisma.user.findUnique({where:{username:String(req.params.targetUsername).toLowerCase()}});if(!target)return res.status(404).json({error:'User not found'});if(target.id===thiefId)return res.status(400).json({error:'You cannot steal from yourself'});if(target.shieldUntil&&target.shieldUntil>new Date())return res.status(409).json({error:'This user is protected by a shield'});try{const result=await prisma.$transaction(async tx=>{const now=new Date();const dayStart=new Date(now);dayStart.setUTCHours(0,0,0,0);const dailySteals=await tx.pointTransaction.count({where:{receiverId:thiefId,type:'STEAL',createdAt:{gte:dayStart}}});if(dailySteals>=200)throw new Error('DAILY_LIMIT');const prior=await tx.stealCooldown.findUnique({where:{thiefId_targetId:{thiefId,targetId:target.id}}});if(prior){const claimed=await tx.stealCooldown.updateMany({where:{id:prior.id,lastAt:{lte:new Date(now.getTime()-4000)}},data:{lastAt:now}});if(!claimed.count)throw new Error('COOLDOWN');}else{await tx.stealCooldown.create({data:{thiefId,targetId:target.id,lastAt:now}});}const debit=await tx.user.updateMany({where:{id:target.id,points:{gte:3}},data:{points:{decrement:3}}});if(!debit.count)throw new Error('LOW_BALANCE');const me=await tx.user.update({where:{id:thiefId},data:{points:{increment:3}}});await tx.pointTransaction.create({data:{senderId:target.id,receiverId:thiefId,amount:3,type:'STEAL',note:'Points stolen'}});await tx.notification.create({data:{userId:target.id,text:`@${req.user.username} stole 3 points from you.`}});return me;});res.json({success:true,stolen:3,balance:result.points});}catch(e:any){const msg=e.message==='COOLDOWN'||e?.code==='P2002'?'Wait 4 seconds before stealing from this user again':e.message==='LOW_BALANCE'?'This user does not have enough points':e.message==='DAILY_LIMIT'?'Daily steal limit reached (200 per day)':e.message;res.status(409).json({error:msg});}});
app.post('/api/points/gift',auth,async(req:any,res)=>{const d=z.object({username:z.string(),amount:z.number().int().min(1).max(1000000)}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid gift amount or recipient'});const target=await prisma.user.findUnique({where:{username:d.data.username.toLowerCase()}});if(!target||target.id===req.user.id)return res.status(400).json({error:'Invalid recipient'});try{const updated=await prisma.$transaction(async tx=>{const debit=await tx.user.updateMany({where:{id:req.user.id,points:{gte:d.data.amount}},data:{points:{decrement:d.data.amount}}});if(!debit.count)throw new Error('NOT_ENOUGH');const sender=await tx.user.findUniqueOrThrow({where:{id:req.user.id}});const receiver=await tx.user.update({where:{id:target.id},data:{points:{increment:d.data.amount}}});await tx.pointTransaction.create({data:{senderId:sender.id,receiverId:receiver.id,amount:d.data.amount,type:'GIFT',note:'User gift'}});await tx.notification.create({data:{userId:receiver.id,text:`@${sender.username} sent you ${d.data.amount.toLocaleString()} points.`}});return {balance:sender.points};});res.json({success:true,...updated});}catch(e:any){res.status(409).json({error:e.message==='NOT_ENOUGH'?'Not enough points': 'Gift could not be completed'});}});
app.post('/api/games/quick-tap/start', auth, async (req:any, res) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const playedToday = await prisma.gameSession.count({ where: { userId: req.user.id, startedAt: { gte: startOfDay } } });
  if (playedToday >= 5) return res.status(429).json({ error: 'Daily practice reward limit reached. Try again tomorrow.' });
  const session = await prisma.gameSession.create({ data: { userId: req.user.id, endsAt: new Date(Date.now() + 10_000), score: 0 } });
  res.status(201).json({ id: session.id, endsAt: session.endsAt, durationSeconds: 10, dailyGamesRemaining: 4 - playedToday });
});

app.post('/api/games/quick-tap/:id/tap', auth, async (req:any, res) => {
  const now = new Date();
  const updated = await prisma.gameSession.updateMany({
    where: { id: req.params.id, userId: req.user.id, claimedAt: null, endsAt: { gt: now }, score: { lt: 100 } },
    data: { score: { increment: 1 } }
  });
  if (!updated.count) return res.status(409).json({ error: 'This game is not active or the tap limit was reached' });
  const session = await prisma.gameSession.findUniqueOrThrow({ where: { id: req.params.id }, select: { score: true } });
  res.json({ accepted: true, score: session.score || 0 });
});

app.post('/api/games/quick-tap/:id/finish', auth, async (req:any, res) => {
  const session = await prisma.gameSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!session) return res.status(404).json({ error: 'Game session not found' });
  if (session.claimedAt) return res.status(409).json({ error: 'This game reward was already claimed' });
  const now = new Date();
  if (now < session.endsAt) return res.status(409).json({ error: 'Finish the full 10-second round before claiming points' });
  const score = Math.max(0, Math.min(100, Number(session.score || 0)));
  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: session.id, userId: req.user.id, claimedAt: null, endsAt: { lte: now } },
        data: { claimedAt: now }
      });
      if (!claimed.count) throw new Error('ALREADY_CLAIMED');
      const user = await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: score } } });
      if (score > 0) await tx.pointTransaction.create({ data: { receiverId: user.id, amount: score, type: 'GAME', note: 'Quick Tap skill game' } });
      return { score, balance: user.points };
    });
    res.json({ success: true, ...result });
  } catch (error:any) {
    res.status(409).json({ error: 'This game reward was already claimed' });
  }
});

app.get('/api/battles', async (_req, res) => {
  const battles = await prisma.battle.findMany({
    include: {
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      opponent: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challengerPost: { select: { id: true, imageUrl: true, caption: true } },
      opponentPost: { select: { id: true, imageUrl: true, caption: true } },
      _count: { select: { votes: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(battles);
});

app.post('/api/battles', auth, async (req:any, res) => {
  const parsed = z.object({
    opponentUsername: z.string().min(3).max(24),
    challengerPostId: z.string().min(1),
    opponentPostId: z.string().min(1),
    title: z.string().max(120).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose an opponent and one photo from each player' });
  const opponent = await prisma.user.findUnique({ where: { username: parsed.data.opponentUsername.toLowerCase() } });
  if (!opponent || opponent.status !== 'ACTIVE') return res.status(404).json({ error: 'Opponent not found' });
  if (opponent.id === req.user.id) return res.status(400).json({ error: 'You cannot battle yourself' });
  const [myPost, opponentPost] = await Promise.all([
    prisma.post.findUnique({ where: { id: parsed.data.challengerPostId } }),
    prisma.post.findUnique({ where: { id: parsed.data.opponentPostId } })
  ]);
  if (!myPost || myPost.authorId !== req.user.id) return res.status(400).json({ error: 'Choose one of your own photo posts' });
  if (!opponentPost || opponentPost.authorId !== opponent.id || opponentPost.hidden) return res.status(400).json({ error: 'Opponent photo is invalid or hidden' });
  const battle = await prisma.$transaction(async (tx) => {
    const created = await tx.battle.create({
      data: {
        title: parsed.data.title?.trim() || `@${req.user.username} vs @${opponent.username}`,
        status: 'OPEN',
        creatorId: req.user.id,
        challengerId: req.user.id,
        opponentId: opponent.id,
        challengerPostId: myPost.id,
        opponentPostId: opponentPost.id,
        reward: 100,
        endsAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    await tx.notification.create({ data: { userId: opponent.id, text: `@${req.user.username} challenged you to a photo battle. Voting closes in 10 minutes.` } });
    return created;
  });
  res.status(201).json(battle);
});

app.post('/api/battles/:id/vote', auth, async (req:any, res) => {
  const parsed = z.object({ choice: z.enum(['CHALLENGER', 'OPPONENT']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a battle photo to vote for' });
  const battle = await prisma.battle.findUnique({ where: { id: req.params.id } });
  if (!battle || !battle.challengerId || !battle.opponentId) return res.status(404).json({ error: 'Battle not found' });
  if (battle.status !== 'OPEN' || !battle.endsAt || battle.endsAt <= new Date()) return res.status(409).json({ error: 'Voting has closed for this battle' });
  if (battle.challengerId === req.user.id || battle.opponentId === req.user.id) return res.status(403).json({ error: 'Battle participants cannot vote in their own battle' });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.battleVote.create({ data: { battleId: battle.id, userId: req.user.id, choice: parsed.data.choice } });
      return tx.battle.update({
        where: { id: battle.id },
        data: parsed.data.choice === 'CHALLENGER' ? { challengerVotes: { increment: 1 } } : { opponentVotes: { increment: 1 } }
      });
    });
    res.json({ success: true, challengerVotes: updated.challengerVotes, opponentVotes: updated.opponentVotes });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'You have already voted in this battle' });
    res.status(400).json({ error: 'Vote could not be saved' });
  }
});

app.post('/api/battles/:id/finish', auth, async (req:any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({ where: { id: req.params.id } });
      if (!battle) throw new Error('NOT_FOUND');
      if (battle.status !== 'OPEN') return { status: battle.status, winnerId: battle.winnerId, alreadyFinished: true };
      if (!battle.endsAt || battle.endsAt > new Date()) throw new Error('TOO_EARLY');
      const locked = await tx.battle.updateMany({ where: { id: battle.id, status: 'OPEN', endsAt: { lte: new Date() } }, data: { status: 'FINISHING' } });
      if (!locked.count) {
        const current = await tx.battle.findUniqueOrThrow({ where: { id: battle.id } });
        return { status: current.status, winnerId: current.winnerId, alreadyFinished: true };
      }
      const winnerId = battle.challengerVotes === battle.opponentVotes ? null : battle.challengerVotes > battle.opponentVotes ? battle.challengerId : battle.opponentId;
      const status = winnerId ? 'FINISHED' : 'TIED';
      await tx.battle.update({ where: { id: battle.id }, data: { status, winnerId } });
      if (winnerId) {
        await tx.user.update({ where: { id: winnerId }, data: { points: { increment: battle.reward } } });
        await tx.pointTransaction.create({ data: { receiverId: winnerId, amount: battle.reward, type: 'BATTLE', note: `Won photo battle: ${battle.title}` } });
        await tx.notification.create({ data: { userId: winnerId, text: `You won the photo battle “${battle.title}” and earned ${battle.reward} points.` } });
      }
      return { status, winnerId, reward: winnerId ? battle.reward : 0 };
    });
    res.json(result);
  } catch (error:any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Battle not found' });
    if (error.message === 'TOO_EARLY') return res.status(409).json({ error: 'This battle is still accepting votes' });
    res.status(400).json({ error: 'Battle could not be finished' });
  }
});

app.get('/api/teams', async (_req, res) => {
  const teams = await prisma.team.findMany({
    include: {
      creator: { select: { username: true, displayName: true } },
      members: { include: { user: { select: { id: true, username: true, displayName: true, points: true } } } },
      _count: { select: { members: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(teams.map((team:any) => ({
    id: team.id, name: team.name, description: team.description, creator: team.creator,
    memberCount: team._count.members,
    totalPoints: team.members.reduce((sum:number, member:any) => sum + member.user.points, 0),
    members: team.members.map((member:any) => member.user)
  })));
});

app.post('/api/teams', auth, async (req:any, res) => {
  const parsed = z.object({ name: z.string().trim().min(3).max(40), description: z.string().max(300).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Team name must be 3–40 characters' });
  try {
    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({ data: { name: parsed.data.name, description: parsed.data.description || '', creatorId: req.user.id } });
      await tx.teamMember.create({ data: { teamId: created.id, userId: req.user.id } });
      return created;
    });
    res.status(201).json(team);
  } catch (error:any) {
    res.status(error?.code === 'P2002' ? 409 : 400).json({ error: error?.code === 'P2002' ? 'A team with that name already exists' : 'Could not create team' });
  }
});

app.post('/api/teams/:id/join', auth, async (req:any, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  try {
    await prisma.teamMember.create({ data: { teamId: team.id, userId: req.user.id } });
    res.json({ joined: true });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'You are already on this team' });
    res.status(400).json({ error: 'Could not join team' });
  }
});

app.post('/api/teams/:id/leave', auth, async (req:any, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creatorId === req.user.id) return res.status(400).json({ error: 'Team creator cannot leave; create another team or ask an admin to transfer ownership' });
  await prisma.teamMember.deleteMany({ where: { teamId: team.id, userId: req.user.id } });
  res.json({ joined: false });
});

app.post('/api/rewards/mystery', auth, async (req:any, res) => {
  const periodKey = dayKey();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const [missionDone, gameDone] = await Promise.all([
    prisma.missionProgress.findFirst({ where: { userId: req.user.id, periodKey, completed: true } }),
    prisma.gameSession.findFirst({ where: { userId: req.user.id, startedAt: { gte: startOfDay }, claimedAt: { not: null } } })
  ]);
  if (!missionDone && !gameDone) return res.status(403).json({ error: 'Complete a daily mission or a skill game first' });
  const rewards = [
    { rewardType: 'POINTS', amount: 50 },
    { rewardType: 'POINTS', amount: 100 },
    { rewardType: 'POINTS', amount: 200 },
    { rewardType: 'SHIELD', amount: 0 }
  ];
  const chosen = rewards[randomInt(rewards.length)];
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.mysteryRewardClaim.create({ data: { userId: req.user.id, periodKey, rewardType: chosen.rewardType, amount: chosen.amount } });
      let balance = (await tx.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { points: true } })).points;
      let shieldUntil:Date|null = null;
      if (chosen.rewardType === 'POINTS') {
        const user = await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: chosen.amount } } });
        balance = user.points;
        await tx.pointTransaction.create({ data: { receiverId: user.id, amount: chosen.amount, type: 'MYSTERY_REWARD', note: 'Free daily mystery reward' } });
      } else {
        shieldUntil = new Date(Date.now() + 30 * 60 * 1000);
        await tx.user.update({ where: { id: req.user.id }, data: { shieldUntil } });
      }
      await tx.notification.create({ data: { userId: req.user.id, text: chosen.rewardType === 'SHIELD' ? 'Mystery reward unlocked: 30-minute point shield.' : `Mystery reward unlocked: +${chosen.amount} points.` } });
      return { ...chosen, balance, shieldUntil };
    });
    res.json({ success: true, ...result });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'You already opened today’s mystery reward' });
    res.status(400).json({ error: 'Mystery reward could not be opened' });
  }
});

app.get('/api/achievements/me', auth, async (req:any, res) => {
  const defaults = [
    { key: 'first-post', title: 'First Photo', description: 'Publish your first photo post.', metric: 'POSTS', target: 1, active: true },
    { key: 'first-1000', title: 'First 1,000', description: 'Reach 1,000 points.', metric: 'POINTS', target: 1000, active: true },
    { key: 'first-10000', title: 'Point Collector', description: 'Reach 10,000 points.', metric: 'POINTS', target: 10000, active: true },
    { key: 'first-steal', title: 'First Heist', description: 'Collect points from another player once.', metric: 'STEALS', target: 1, active: true },
    { key: 'steal-100', title: 'Shadow Collector', description: 'Collect points 100 times.', metric: 'STEALS', target: 100, active: true },
    { key: 'first-gift', title: 'Generous Friend', description: 'Send your first point gift.', metric: 'GIFTS', target: 1, active: true },
    { key: 'gift-50', title: 'Big Heart', description: 'Send 50 point gifts.', metric: 'GIFTS', target: 50, active: true },
    { key: 'first-battle-win', title: 'Battle Winner', description: 'Win a photo battle.', metric: 'BATTLE_WINS', target: 1, active: true },
    { key: 'team-player', title: 'Team Player', description: 'Join a team.', metric: 'TEAMS', target: 1, active: true }
  ];
  for (const item of defaults) await prisma.achievement.upsert({ where: { key: item.key }, update: {}, create: item });
  const [user, posts, steals, gifts, battleWins, teamCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { points: true } }),
    prisma.post.count({ where: { authorId: req.user.id } }),
    prisma.pointTransaction.count({ where: { receiverId: req.user.id, type: 'STEAL' } }),
    prisma.pointTransaction.count({ where: { senderId: req.user.id, type: 'GIFT' } }),
    prisma.battle.count({ where: { winnerId: req.user.id, status: 'FINISHED' } }),
    prisma.teamMember.count({ where: { userId: req.user.id } })
  ]);
  const metrics:any = { POSTS: posts, POINTS: user.points, STEALS: steals, GIFTS: gifts, BATTLE_WINS: battleWins, TEAMS: teamCount };
  const achievements = await prisma.achievement.findMany({ where: { active: true } });
  for (const achievement of achievements) {
    if ((metrics[achievement.metric] || 0) >= achievement.target) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: req.user.id, achievementId: achievement.id } },
        update: {},
        create: { userId: req.user.id, achievementId: achievement.id }
      });
    }
  }
  const unlocked = await prisma.userAchievement.findMany({ where: { userId: req.user.id }, select: { achievementId: true, unlockedAt: true } });
  const unlockedMap = new Map(unlocked.map((item:any) => [item.achievementId, item.unlockedAt]));
  res.json(achievements.map((achievement:any) => ({
    ...achievement,
    unlocked: unlockedMap.has(achievement.id),
    unlockedAt: unlockedMap.get(achievement.id) || null,
    current: metrics[achievement.metric] || 0
  })));
});

app.get('/api/missions', auth, async (req:any, res) => {
  const defaults = [
    { key: 'daily-post', title: 'Photo starter', description: 'Publish one photo post today.', actionType: 'POST', target: 1, reward: 100, active: true },
    { key: 'follow-three', title: 'Meet the community', description: 'Follow three players today.', actionType: 'FOLLOW', target: 3, reward: 150, active: true },
    { key: 'comment-five', title: 'Join the conversation', description: 'Write five comments today.', actionType: 'COMMENT', target: 5, reward: 150, active: true },
    { key: 'like-ten', title: 'Show appreciation', description: 'Like ten posts today.', actionType: 'LIKE', target: 10, reward: 100, active: true },
    { key: 'shield-posts', title: 'Protect your points', description: 'Publish three photo posts today to earn a 30-minute shield.', actionType: 'POST', target: 3, reward: 0, rewardType: 'SHIELD', active: true }
  ];
  for (const mission of defaults) await prisma.dailyMission.upsert({ where: { key: mission.key }, update: {}, create: mission });
  const rows = await prisma.dailyMission.findMany({
    where: { active: true },
    include: { progress: { where: { userId: req.user.id, periodKey: dayKey() } } },
    orderBy: { reward: 'desc' }
  });
  res.json(rows.map((mission:any) => {
    const progress = mission.progress[0];
    return { id: mission.id, key: mission.key, title: mission.title, description: mission.description, target: mission.target, reward: mission.reward, rewardType: mission.rewardType, progress: progress?.progress || 0, completed: Boolean(progress?.completed), claimed: Boolean(progress?.claimed) };
  }));
});

app.post('/api/missions/:id/claim', auth, async (req:any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const progress = await tx.missionProgress.findUnique({
        where: { userId_missionId_periodKey: { userId: req.user.id, missionId: req.params.id, periodKey: dayKey() } },
        include: { mission: true }
      });
      if (!progress || !progress.completed || progress.claimed) throw new Error('NOT_READY');
      const claimLock = await tx.missionProgress.updateMany({ where: { id: progress.id, completed: true, claimed: false }, data: { claimed: true } });
      if (!claimLock.count) throw new Error('NOT_READY');
      let user:any;
      if (progress.mission.rewardType === 'SHIELD') {
        const shieldUntil = new Date(Date.now() + 30 * 60 * 1000);
        user = await tx.user.update({ where: { id: req.user.id }, data: { shieldUntil } });
        await tx.notification.create({ data: { userId: user.id, text: `Mission complete: ${progress.mission.title}. Your points are protected for 30 minutes.` } });
        return { reward: 0, balance: user.points, shieldUntil };
      }
      user = await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: progress.mission.reward } } });
      await tx.pointTransaction.create({ data: { receiverId: user.id, amount: progress.mission.reward, type: 'MISSION', note: progress.mission.title } });
      await tx.notification.create({ data: { userId: user.id, text: `Mission complete: ${progress.mission.title}. +${progress.mission.reward} points.` } });
      return { reward: progress.mission.reward, balance: user.points };
    });
    res.json({ success: true, ...result });
  } catch (error:any) {
    res.status(409).json({ error: error.message === 'NOT_READY' ? 'Complete the mission first or it has already been claimed' : 'Mission reward could not be claimed' });
  }
});

app.get('/api/notifications',auth,async(req:any,res)=>res.json(await prisma.notification.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'},take:50})));
app.post('/api/messages',auth,async(req:any,res)=>{const d=z.object({toUsername:z.string(),body:z.string().trim().min(1).max(2000)}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid message'});const to=await prisma.user.findUnique({where:{username:d.data.toUsername.toLowerCase()}});if(!to||to.id===req.user.id)return res.status(400).json({error:'Invalid recipient'});const message=await prisma.$transaction(async tx=>{const created=await tx.message.create({data:{senderId:req.user.id,receiverId:to.id,body:d.data.body}});await tx.notification.create({data:{userId:to.id,text:`New message from @${req.user.username}.`}});return created;});res.status(201).json(message);});
app.get('/api/messages/:username',auth,async(req:any,res)=>{const other=await prisma.user.findUnique({where:{username:String(req.params.username).toLowerCase()}});if(!other)return res.status(404).json({error:'User not found'});const msgs=await prisma.message.findMany({where:{OR:[{senderId:req.user.id,receiverId:other.id},{senderId:other.id,receiverId:req.user.id}]},orderBy:{createdAt:'asc'},take:200});await prisma.message.updateMany({where:{senderId:other.id,receiverId:req.user.id,readAt:null},data:{readAt:new Date()}});res.json(msgs);});
app.post('/api/reports',auth,async(req:any,res)=>{const d=z.object({targetType:z.enum(['USER','POST','COMMENT','MESSAGE']),targetId:z.string().min(1),category:z.enum(['SPAM','HARASSMENT','FAKE_ACCOUNT','ILLEGAL_CONTENT','COPYRIGHT','ABUSE','OTHER']),details:z.string().max(1000).optional()}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid report'});res.status(201).json(await prisma.report.create({data:{reporterId:req.user.id,...d.data}}));});
app.get('/api/admin/reports',auth,admin,async(_req,res)=>res.json(await prisma.report.findMany({where:{status:'OPEN'},orderBy:{createdAt:'asc'},take:100})));
app.post('/api/admin/points',auth,admin,async(req:any,res)=>{const d=z.object({username:z.string(),amount:z.number().int().min(-1000000).max(1000000),note:z.string().max(200).default('Admin adjustment')}).safeParse(req.body);if(!d.success||d.data.amount===0)return res.status(400).json({error:'Invalid adjustment'});const u=await prisma.user.findUnique({where:{username:d.data.username.toLowerCase()}});if(!u)return res.status(404).json({error:'User not found'});try{const updated=await prisma.$transaction(async tx=>{let next:any;if(d.data.amount<0){const debit=await tx.user.updateMany({where:{id:u.id,points:{gte:Math.abs(d.data.amount)}},data:{points:{decrement:Math.abs(d.data.amount)}}});if(!debit.count)throw new Error('NEGATIVE');next=await tx.user.findUniqueOrThrow({where:{id:u.id}})}else{next=await tx.user.update({where:{id:u.id},data:{points:{increment:d.data.amount}}})}await tx.pointTransaction.create({data:{senderId:d.data.amount<0?u.id:null,receiverId:d.data.amount>0?u.id:null,amount:Math.abs(d.data.amount),type:'ADMIN_ADJUSTMENT',note:`${d.data.note} (${d.data.amount>0?'+':''}${d.data.amount})`}});await tx.adminAction.create({data:{actorId:req.user.id,action:'POINT_ADJUSTMENT',targetType:'USER',targetId:u.id,details:`${d.data.note} (${d.data.amount>0?'+':''}${d.data.amount})`}});return next;});res.json(safeUser(updated));}catch{return res.status(409).json({error:'Adjustment would make balance negative'});}});
app.get('/api/admin/users',auth,admin,async(_req,res)=>res.json((await prisma.user.findMany({select:{id:true,username:true,displayName:true,points:true,status:true,role:true,createdAt:true},orderBy:{createdAt:'desc'},take:100}))));

/* Social gaming MVP: profile, follow, wallet history, referrals and moderation. */
app.get('/api/users/:username/profile', async (req, res) => {
  const username = String(req.params.username).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true, bio: true, avatarUrl: true,
      points: true, role: true, status: true, createdAt: true,
      _count: { select: { followsIn: true, followsOut: true, posts: true } }
    }
  });
  if (!user || user.status !== 'ACTIVE') return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, followers: user._count.followsIn, following: user._count.followsOut, postCount: user._count.posts, _count: undefined });
});

app.get('/api/users/:username/posts', async (req:any, res) => {
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username).toLowerCase() }, select: { id: true, status: true } });
  if (!target || target.status !== 'ACTIVE') return res.status(404).json({ error: 'User not found' });
  let viewerId:string|null = null;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) { try { const payload = jwt.verify(header.slice(7), AUTH_SECRET) as any; viewerId = String(payload.id); } catch {} }
  const isFollowing = viewerId && viewerId !== target.id ? await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: target.id } } }) : null;
  const privacy:any = viewerId === target.id
    ? { OR: [{ privacy: 'PUBLIC' }, { privacy: 'FOLLOWERS' }, { privacy: 'PRIVATE' }] }
    : isFollowing
      ? { OR: [{ privacy: 'PUBLIC' }, { privacy: 'FOLLOWERS' }] }
      : { privacy: 'PUBLIC' };
  const posts = await prisma.post.findMany({
    where: { authorId: target.id, hidden: false, ...privacy },
    include: { author: { select: { username: true, displayName: true, avatarUrl: true } }, _count: { select: { likes: true, comments: true } } },
    orderBy: { createdAt: 'desc' }, take: 50
  });
  res.json(posts);
});

app.post('/api/follows/:username', auth, async (req:any, res) => {
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!target || target.status !== 'ACTIVE') return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself' });
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } } });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return res.json({ following: false });
  }
  await prisma.$transaction(async (tx) => {
    await tx.follow.create({ data: { followerId: req.user.id, followingId: target.id } });
    await recordMissionProgress(tx, req.user.id, 'FOLLOW', 1);
    await tx.notification.create({ data: { userId: target.id, text: `@${req.user.username} started following you.` } });
  });
  res.json({ following: true });
});

app.get('/api/follows/me', auth, async (req:any, res) => {
  const follows = await prisma.follow.findMany({ where: { followerId: req.user.id }, include: { following: { select: { username: true } } } });
  res.json(follows.map((item:any) => item.following.username));
});

app.get('/api/admin/posts', auth, admin, async (_req, res) => {
  res.json(await prisma.post.findMany({
    include: { author: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: 'desc' }, take: 100
  }));
});

app.get('/api/points/transactions', auth, async (req:any, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50));
  const page = Math.max(1, Number(req.query.page) || 1);
  const transactions = await prisma.pointTransaction.findMany({
    where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    include: {
      sender: { select: { username: true, displayName: true } },
      receiver: { select: { username: true, displayName: true } }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });
  res.json(transactions.map((tx:any) => ({
    id: tx.id, amount: tx.amount, type: tx.type, note: tx.note, createdAt: tx.createdAt,
    direction: tx.receiverId === req.user.id ? 'in' : 'out',
    sender: tx.sender, receiver: tx.receiver
  })));
});

app.post('/api/notifications/:id/read', auth, async (req:any, res) => {
  const updated = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { readAt: new Date() }
  });
  if (!updated.count) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

app.get('/api/referrals/me', auth, async (req:any, res) => {
  const [sent, user] = await Promise.all([
    prisma.referral.count({ where: { referrerId: req.user.id } }),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true } })
  ]);
  const base = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  res.json({ username: user?.username, referralCount: sent, referralUrl: `${base}/?ref=${encodeURIComponent(user?.username || '')}#auth` });
});

app.post('/api/referrals/share-reward', auth, async (req:any, res) => {
  const periodKey = new Date().toISOString().slice(0, 10);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralShareClaim.create({ data: { userId: req.user.id, periodKey } });
      await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: 30 } } });
      await tx.pointTransaction.create({ data: { receiverId: req.user.id, amount: 30, type: 'REFERRAL_SHARE', note: 'Daily referral sharing reward' } });
    });
    res.json({ success: true, reward: 30, periodKey });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Daily referral share reward already claimed' });
    res.status(400).json({ error: 'Could not claim referral share reward' });
  }
});

app.post('/api/referrals/claim', auth, async (req:any, res) => {
  const parsed = z.object({ referrerUsername: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid referral username' });
  const username = parsed.data.referrerUsername.toLowerCase();
  const referrer = await prisma.user.findUnique({ where: { username } });
  if (!referrer || referrer.status !== 'ACTIVE') return res.status(404).json({ error: 'Referrer not found' });
  if (referrer.id === req.user.id) return res.status(400).json({ error: 'You cannot use your own referral link' });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referral.create({ data: { referrerId: referrer.id, referredId: req.user.id } });
      await tx.user.update({ where: { id: referrer.id }, data: { points: { increment: 10000 } } });
      await tx.pointTransaction.create({ data: { senderId: null, receiverId: referrer.id, amount: 10000, type: 'REFERRAL', note: `Signup referral: @${req.user.username}` } });
      await tx.notification.create({ data: { userId: referrer.id, text: `@${req.user.username} joined using your referral link. +10,000 points.` } });
    });
    res.json({ success: true, reward: 10000 });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A referral has already been claimed for this account' });
    res.status(400).json({ error: 'Referral could not be claimed' });
  }
});

app.post('/api/admin/notifications/global', auth, admin, async (req:any, res) => {
  const parsed = z.object({ text: z.string().trim().min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Notification text must be 1–500 characters' });
  const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    if (users.length) await tx.notification.createMany({ data: users.map((user:any) => ({ userId: user.id, text: parsed.data.text })) });
    await tx.adminAction.create({ data: { actorId: req.user.id, action: 'GLOBAL_NOTIFICATION_SENT', targetType: 'ALL_USERS', targetId: 'all', details: parsed.data.text } });
  });
  res.json({ success: true, sent: users.length });
});

app.get('/api/admin/audit-logs', auth, admin, async (_req, res) => {
  res.json(await prisma.adminAction.findMany({
    include: { actor: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: 'desc' }, take: 200
  }));
});

app.get('/api/admin/transactions', auth, admin, async (_req, res) => {
  res.json(await prisma.pointTransaction.findMany({
    include: { sender: { select: { username: true } }, receiver: { select: { username: true } } },
    orderBy: { createdAt: 'desc' }, take: 200
  }));
});

app.patch('/api/admin/users/:username/status', auth, admin, async (req:any, res) => {
  const parsed = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status must be ACTIVE, SUSPENDED or BANNED' });
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own account status' });
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: target.id }, data: { status: parsed.data.status } });
    await tx.adminAction.create({ data: { actorId: req.user.id, action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId: target.id, details: `status=${parsed.data.status}` } });
    await tx.notification.create({ data: { userId: target.id, text: `Your account status was changed to ${parsed.data.status} by an administrator.` } });
    return user;
  });
  res.json(safeUser(updated));
});

app.patch('/api/admin/posts/:id/moderation', auth, admin, async (req:any, res) => {
  const parsed = z.object({ hidden: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'hidden must be true or false' });
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.post.update({ where: { id: post.id }, data: { hidden: parsed.data.hidden } });
    await tx.adminAction.create({ data: { actorId: req.user.id, action: parsed.data.hidden ? 'POST_HIDDEN' : 'POST_RESTORED', targetType: 'POST', targetId: post.id } });
    return result;
  });
  res.json({ id: updated.id, hidden: updated.hidden });
});

app.patch('/api/admin/reports/:id/status', auth, admin, async (req:any, res) => {
  const parsed = z.object({ status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid report status' });
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const updated = await prisma.report.update({ where: { id: report.id }, data: { status: parsed.data.status } });
  await prisma.adminAction.create({ data: { actorId: req.user.id, action: 'REPORT_STATUS_CHANGED', targetType: 'REPORT', targetId: report.id, details: `status=${parsed.data.status}` } });
  res.json(updated);
});

app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(500).json({error:'Internal server error'});});
app.listen(PORT,()=>console.log(`VibePulse API listening on ${PORT}`));
