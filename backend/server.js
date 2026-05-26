const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const listRoutes = require('./routes/lists');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/users');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/users', userRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeSync API is running smoothly' });
});

// Serve Static Assets in Production (Vite React Frontend Build)
const fs = require('fs');
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  console.log('Serving React static build assets from:', distPath);
  app.use(express.static(distPath));
  
  // Fallback for SPA routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An internal server error occurred',
  });
});

// Database Connection and Server Startup
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`Express server is listening on port ${PORT}...`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failure:', error.message);
    process.exit(1);
  });
