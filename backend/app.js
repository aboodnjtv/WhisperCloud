const express = require("express");
const app = express();
const path = require('path');
const ejsMate = require("ejs-mate");
const User = require("./models/user");
const session = require("express-session");

require('dotenv').config();
require("./config/db");

// View engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "../frontend/views"));

// 1. Body parsers FIRST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: false
    }
}));

// 3. User locals
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ============================================
// IMPORT ALL ROUTES
// ============================================
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const pageRoutes = require("./routes/pageRoutes");
const gossipRoutes = require("./routes/gossipRoutes");

app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/", pageRoutes);
app.use("/", gossipRoutes);  

app.get("/", (req, res) => {
    res.render("./index");
});

app.get("/db", async (req, res) => {
    const admins = await User.find({ type: "admin" });
    const peers = await User.find({ type: "peer" });

    res.render("./admin/db", {
        title: "DB | WhisperCloud",
        admins,
        peers,
        adminCount: admins.length,
        peerCount: peers.length
    });
});


app.use(express.static(path.join(__dirname, "../frontend/public")));


app.use((req, res) => {
    // Filter out harmless browser requests
    const harmless = ['/favicon.ico', '/.well-known/', '/apple-touch-icon'];
    if (!harmless.some(path => req.url.includes(path))) {
        console.log('404 Not Found:', req.method, req.url);
    }
    res.status(404).send("Page Not Found!");
});

// ============================================
// START SERVER
// ============================================
const port = 3000;

app.listen(port, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║     WhisperCloud Server Started         ║`);
    console.log(`╚══════════════════════════════════════════╝`);
    console.log(`\n📡 Server: http://localhost:${port}`);
    console.log(`🕐 Started: ${new Date().toLocaleTimeString()}\n`);
    
    // Check DB connection after a delay
    setTimeout(() => {
        const mongoose = require('mongoose');
        const dbStatus = mongoose.connection.readyState === 1;
    }, 1000);
});