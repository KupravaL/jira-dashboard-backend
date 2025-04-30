const express = require('express');
const cors = require('cors');
const jiraRoutes = require('./routes/jira');
const prioritiesRoutes = require('./routes/priorities');

const app = express();

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL || 'https://jira-dashboard.vercel.app']
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/jira', jiraRoutes);
app.use('/api/priorities', prioritiesRoutes);

// Root route for API health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Jira Dashboard API is running'
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('CORS enabled for:', corsOptions.origin);
}); 