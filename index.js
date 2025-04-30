require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jiraRoutes = require('./routes/jira');
const prioritiesRoutes = require('./routes/priorities');
const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://jira-dashboard-frontend.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 3600 // Cache preflight request for 1 hour
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Add headers middleware for additional CORS support
app.use((req, res, next) => {
  // Set additional headers if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-JSON');
  next();
});

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Jira Dashboard API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      jira: '/api/jira/*',
      priorities: '/api/priorities/*'
    }
  });
});

// Routes
app.use('/api/jira', jiraRoutes);
app.use('/api/priorities', prioritiesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      details: `Route ${req.method} ${req.url} not found`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Handle Axios errors
  if (err.isAxiosError) {
    return res.status(err.response?.status || 500).json({
      error: {
        message: 'Jira API error',
        details: err.response?.data || err.message,
        status: err.response?.status
      }
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        details: err.message
      }
    });
  }

  // Handle other errors
  res.status(500).json({
    error: {
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
Server is running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
API Documentation: http://localhost:${PORT}
CORS enabled for: ${Array.isArray(corsOptions.origin) ? corsOptions.origin.join(', ') : corsOptions.origin}
Jira API URL: ${process.env.JIRA_API_URL}
  `);
}); 