const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Firebase Admin Connection ---
try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey })
            });
            console.log("✅ Firebase Admin Active");
        }
    }
} catch (error) {
    console.error("❌ Firebase Error:", error.message);
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-qPbVe4hZAbUW18Soj13cSkOQi6qaREJvUc5CZ6hioJuiJ-yEw5XTdqEtyruNfw4h_g/exec";
let otpStore = {};

// --- API: Send OTP (High-End Professional UI) ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, createdAt: Date.now() };

    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    // --- Silicon Valley Style Minimalist Template ---
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
            .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 40px; color: #000; text-align: left; }
            .heading { font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111; letter-spacing: -0.2px; }
            .body-text { font-size: 16px; color: #444; margin-bottom: 32px; }
            .otp-container { background: #f4f4f7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
            .otp-code { font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace; font-size: 36px; font-weight: 700; color: #0062ff; letter-spacing: 6px; }
            .footer { font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 24px; margin-top: 40px; }
            .footer-brand { font-weight: 600; color: #111; margin-bottom: 4px; display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">BOT DOCK</div>
            <h1 class="heading">Confirm your email address</h1>
            <p class="body-text">Please use the following verification code to complete your login. To maintain account security, do not share this code with anyone.</p>
            
            <div class="otp-container">
                <div class="otp-code">${otp}</div>
            </div>
            
            <p class="body-text" style="font-size: 14px; color: #666;">This code will expire in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
            
            <div class="footer">
                <span class="footer-brand">Bot Dock</span>
                <div>&copy; 2024 Bot Dock, Inc. All rights reserved.</div>
                <div style="margin-top: 8px;">San Francisco, CA &bull; Premium Identity Security</div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, {
            params: { 
                email, 
                subject: `${otp} is your Bot Dock verification code`, // Crisp Subject Line
                body: htmlTemplate 
            }
        });
        res.json({ status: "success" });
    } catch (error) {
        res.status(500).json({ status: "error" });
    }
});

// --- API: Verify Login ---
app.get('/verify-login', async (req, res) => {
    const { email, otp } = req.query;
    if (!otpStore[email]) return res.json({ status: "expired" });

    if (otpStore[email].otp.toString() === otp.toString()) {
        try {
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(email);
            } catch (e) {
                userRecord = await admin.auth().createUser({ email });
            }
            const token = await admin.auth().createCustomToken(userRecord.uid);
            delete otpStore[email];
            res.json({ status: "success", token });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    } else {
        res.json({ status: "wrong" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot Dock Engine Started`));
