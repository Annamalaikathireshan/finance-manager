const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

require('./models/User');
require('./models/Transaction');
require('./services/passport');

const keys = require('./config/keys');

if (!keys.mongoURI) {
    console.error('CRITICAL: MONGO_URI is not defined in environment variables.');
} else {
    mongoose.connect(keys.mongoURI)
        .then(() => console.log('Successfully connected to MongoDB.'))
        .catch(err => {
            console.error('CRITICAL: MongoDB connection error:', err.message);
            console.error('Please ensure your IP is whitelisted in MongoDB Atlas.');
        });
}

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(
    cookieSession({
        maxAge: 30 * 24 * 60 * 60 * 1000,
        keys: [keys.cookieKey]
    })
);

// Fix for Passport 0.6.0+ incompatibility with cookie-session
app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb) => {
            cb();
        };
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb) => {
            cb();
        };
    }
    next();
});
app.use(passport.initialize());
app.use(passport.session());

require('./routes/authRoutes')(app);
require('./routes/budgetRoutes')(app);

// In Vercel, static files are handled by the vercel.json routes
// So we don't need the static serving logic here usually,
// but we'll keep it as a fallback if needed.
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.use(express.static('client/dist/finance-manager'));
    const path = require('path');
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'dist', 'finance-manager', 'index.html'));
    });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Local: http://localhost:${PORT}`);
    });
}

module.exports = app;
