import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'

const app = express()
app.use(cors())
app.use(express.json())

const users = new Map()
const sessions = new Map()

const rankings = [
  { id: '1', name: 'Ava Groove', level: 38, accuracy: 98, bpm: 214 },
  { id: '2', name: 'Kai Pocket', level: 35, accuracy: 97, bpm: 210 },
  { id: '3', name: 'Noah Time', level: 33, accuracy: 96, bpm: 206 },
]

const groups = [
  { id: 'g1', name: 'Linear Lab', members: 27, style: 'Funk' },
  { id: 'g2', name: 'Odd Meter Club', members: 19, style: 'Progressive' },
]

const challenges = [{ id: 'c1', title: '7/8 Control Week', participants: 64, endsAt: '2026-10-31' }]
const grooves = [{ id: 'gr1', title: 'Pocket Shuffle 92', author: 'Ava Groove', style: 'Rock Shuffle' }]

function issueToken(user) {
  const token = `dm_${user.id}_${Math.random().toString(36).slice(2)}`
  sessions.set(token, user)
  return token
}

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.slice('Bearer '.length)
  const user = sessions.get(token)

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = user
  return next()
}

app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (users.has(email)) {
    return res.status(409).json({ error: 'User exists' })
  }

  const user = { id: randomUUID(), email, displayName, password }
  users.set(email, user)
  const token = issueToken(user)

  return res.json({ token, user: { id: user.id, email, displayName } })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = users.get(email)

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = issueToken(user)
  return res.json({ token, user: { id: user.id, email, displayName: user.displayName } })
})

app.get('/api/community/rankings', auth, (_req, res) => {
  res.json(rankings)
})

app.get('/api/community/friends', auth, (req, res) => {
  res.json([
    { id: 'f1', name: 'Nina Ghost', status: 'online', streak: 24 },
    { id: 'f2', name: 'Ravi Pocket', status: 'offline', streak: 12 },
    { id: req.user.id, name: req.user.displayName, status: 'you', streak: 19 },
  ])
})

app.post('/api/community/friends/request', auth, (req, res) => {
  res.status(201).json({ ok: true, requestedUser: req.body.name ?? 'Unknown' })
})

app.get('/api/community/groups', auth, (_req, res) => {
  res.json(groups)
})

app.get('/api/community/challenges', auth, (_req, res) => {
  res.json(challenges)
})

app.post('/api/community/challenges', auth, (req, res) => {
  const challenge = {
    id: randomUUID(),
    title: req.body.title ?? 'Untitled Challenge',
    participants: 1,
    endsAt: req.body.endsAt ?? '2026-11-15',
  }

  challenges.unshift(challenge)
  res.status(201).json(challenge)
})

app.get('/api/community/grooves', auth, (_req, res) => {
  res.json(grooves)
})

app.post('/api/community/grooves', auth, (req, res) => {
  const groove = {
    id: randomUUID(),
    title: req.body.title ?? 'Untitled Groove',
    author: req.user.displayName,
    style: req.body.style ?? 'Open',
  }

  grooves.unshift(groove)
  res.status(201).json(groove)
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => {
  console.log(`DrumMaster API listening on http://localhost:${port}`)
})
