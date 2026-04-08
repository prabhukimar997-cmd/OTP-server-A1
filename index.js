const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Firebase Admin Setup with Crash Protection ---
try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.log("⚠️ Warning: Firebase Environment Variables missing!");
    } else {
        // Fix for Private Key newlines
        privateKey = privateKey.replace(/\\n/g, '\n');

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                })
            });
            console.log("✅ Firebase Admin Initialized Successfully!");
        }
    }
} catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
}

// Aapka Google Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-qPbVe4hZAbUW18Soj13cSkOQi6qaREJvUc5CZ6hioJuiJ-yEw5XTdqEtyruNfw4h_g/exec";

// In-memory OTP storage
let otpStore = {};

app.get('/', (req, res) => res.send("<h1>🚀 Pro OTP Login Server is Running!</h1>"));

// --- API 1: Send OTP ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error", message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, createdAt: Date.now() };

    // Auto-delete after 5 minutes
    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    // Professional HTML Template
    const htmlTemplate = `
        <div style="font-family: Arial; text-align: center; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #0062ff;">Login Verification</h2>
            <p>Aapka OTP niche diya gaya hai (Valid for 5 mins):</p>
            <h1 style="background: #f0f7ff; display: inline-block; padding: 10px 20px; color: #0062ff; border-radius: 5px;">${otp}</h1>
            <p style="color: #888; font-size: 12px;">© Prabhu Workspace Service</p>
        </div>
    `;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, {
            params: { email, subject: `${otp} is your login code`, body: htmlTemplate }
        });
        res.json({ status: "success", message: "OTP sent successfully" });
    } catch (error) {
        console.error("Mail Error:", error.message);
        res.status(500).json({ status: "error", message: "Failed to send email" });
    }
});

// --- API 2: Verify & Passwordless Login ---
app.get('/verify-login', async (req, res) => {
    const { email, otp } = req.query;

    if (!otpStore[email]) {
        return res.json({ status: "expired", message: "OTP expired or not found" });
    }

    if (otpStore[email].otp.toString() === otp.toString()) {
        try {
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(email);
            } catch (e) {
                // Agar naya user hai toh account bana do
                userRecord = await admin.auth().createUser({ email });
                console.log("New user created:", email);
            }

            // Create Firebase Custom Token
            const customToken = await admin.auth().createCustomToken(userRecord.uid);
            
            delete otpStore[email];
            res.json({ status: "success", token: customToken });

        } catch (error) {
            console.error("Firebase Auth Error:", error.message);
            res.status(500).json({ status: "error", message: error.message });
        }
    } else {
        res.json({ status: "wrong", message: "Invalid OTP" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
