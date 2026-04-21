require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- AUCTION ROUTES ---

app.get('/api/auctions', async (req, res) => {
  try {
    const auctions = await prisma.auction.findMany({
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: {
        bids: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        },
        creator: { select: { name: true, email: true } }
      }
    });
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auctions', authenticateToken, async (req, res) => {
  try {
    const { title, description, imageUrl, startingPrice, endTime } = req.body;

    const auction = await prisma.auction.create({
      data: {
        title,
        description,
        imageUrl,
        startingPrice: parseFloat(startingPrice),
        currentPrice: parseFloat(startingPrice),
        endTime: new Date(endTime),
        creatorId: req.user.id
      }
    });

    io.emit('auctionCreated', auction);
    res.status(201).json(auction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ADMIN MIDDLEWARE ---
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.put('/api/auctions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, startingPrice, endTime, status } = req.body;
    const auction = await prisma.auction.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        imageUrl,
        startingPrice: startingPrice ? parseFloat(startingPrice) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        status
      }
    });
    // Emit update event so clients refresh
    io.emit('auctionUpdated', auction);
    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/auctions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Delete bids first due to foreign key constraints
    await prisma.bid.deleteMany({ where: { auctionId: req.params.id } });
    await prisma.auction.delete({ where: { id: req.params.id } });
    io.emit('auctionDeleted', req.params.id);
    res.json({ message: 'Auction deleted' });
  } catch (error) {
    console.error('Error deleting auction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- BIDDING ROUTE ---

app.post('/api/auctions/:id/bid', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const auctionId = req.params.id;
    const userId = req.user.id;
    const bidAmount = Number.parseFloat(amount);

    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });

    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status !== 'ACTIVE') return res.status(400).json({ error: 'Auction is not active' });
    if (new Date() > new Date(auction.endTime)) {
      // Auto-close if past end time
      await prisma.auction.update({ where: { id: auctionId }, data: { status: 'COMPLETED' } });
      return res.status(400).json({ error: 'Auction has expired' });
    }
    if (bidAmount <= auction.currentPrice) return res.status(400).json({ error: 'Bid must be higher than current price' });

    // Create bid and update auction in a transaction
    const [bid, updatedAuction] = await prisma.$transaction([
      prisma.bid.create({
        data: { amount: bidAmount, auctionId, userId },
        include: { user: { select: { name: true } } }
      }),
      prisma.auction.update({
        where: { id: auctionId },
        data: { currentPrice: bidAmount }
      })
    ]);

    // Emit real-time update
    io.emit('bidPlaced', {
      auctionId,
      currentPrice: bidAmount,
      bid
    });

    res.json({ message: 'Bid placed successfully', bid, auction: updatedAuction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- SOCKET.IO ---

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
