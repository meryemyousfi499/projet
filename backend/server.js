const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/milestones', require('./routes/milestoneRoutes'));
app.use('/api/deliverables', require('./routes/deliverableRoutes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// ✅ Détection automatique : si le fichier est require() par les tests
// il ne démarre pas le serveur sur un port
let server;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // require.main === module → true seulement si lancé directement (node server.js)
    // false si importé par les tests (require('../server'))
    if (require.main === module) {
      console.log('✅ MongoDB Connected');
      server = app.listen(process.env.PORT || 5000, () => {
        console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
      });
    }
  })
  .catch(err => {     
    console.error('❌ MongoDB connection error:', err);

    if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
    }
  });
module.exports = app;