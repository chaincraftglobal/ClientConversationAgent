const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { pollAllAgents } = require('./services/emailPollingService');
const testConnectionRoutes = require('./routes/testConnectionRoutes');
const paymentGatewayRoutes = require('./routes/paymentGatewayRoutes');
// Start payment gateway scheduler
const merchantRoutes = require('./routes/merchantRoutes');  // ✅ ADD THIS
const paymentGatewayScheduler = require('./services/paymentGatewayScheduler');

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const clientRoutes = require('./routes/clientRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'https://client-conversation-agent.vercel.app',
    'https://client-conversation-agent-git-main-dipak-bhosales-projects.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/test-connection', testConnectionRoutes);
app.use('/api/payment-gateway', paymentGatewayRoutes);
app.use('/api/merchants', merchantRoutes);  // ✅ ADD THIS


// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'ClientConversationAgent API is running!',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

// Start email polling (every 3 minutes)
cron.schedule('*/3 * * * *', () => {
    console.log('⏰ Cron job triggered - polling emails');
    pollAllAgents();
});

// Start new email deduplication job (every 3 minutes)
require('./jobs/emailPolling');

console.log('✅ Email polling cron job started (every 3 minutes)');
console.log('✅ Email deduplication system initialized');

paymentGatewayScheduler.start();


// ✅ ADD THIS - Start merchant email scheduler
const merchantScheduler = require('./services/merchantScheduler');
merchantScheduler.start();
console.log('✅ Merchant email monitoring started');