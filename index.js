const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. Firebase Admin Connection ---
let db;
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
            console.log("✅ Firebase Admin Initialized Successfully");
        }
        db = admin.firestore();
    }
} catch (error) {
    console.error("❌ Firebase Error:", error.message);
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEdamehSYY2plAkNIBuWJ_sxwxBV6ErCCe98N5V4Unj7N2FJgyVls4mPHaSHxCDioi/exec";
let otpStore = {};

// --- 2. Home Route (Bot Dock Engine UI) ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bot Dock Engine</title>
            <style>
                body { margin: 0; font-family: -apple-system, sans-serif; background: #fafafa; display: flex; justify-content: center; align-items: center; height: 100vh; color: #111; }
                .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: center; max-width: 350px; border: 1px solid #f0f0f0; }
                .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; }
                .status { color: #00b894; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; }
                .dot { width: 8px; height: 8px; background: #00b894; border-radius: 50%; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">BOT DOCK</div>
                <div class="status"><span class="dot"></span> Operational</div>
                <p style="font-size: 14px; color: #666; margin-top: 15px;">OTP & Cloudflare Logic Engine is running.</p>
            </div>
        </body>
        </html>
    `);
});

// --- 3. API: Send OTP (Original Premium UI Restored) ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error", message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, createdAt: Date.now() };

    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    // --- AAPKA ORIGINAL PREMIUM UI TEMPLATE ---
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
            .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 40px; color: #000; }
            .heading { font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111; letter-spacing: -0.2px; }
            .otp-container { background: #f4f4f7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
            .otp-code { font-family: 'SF Mono', monospace; font-size: 36px; font-weight: 700; color: #0062ff; letter-spacing: 6px; }
            .footer { font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 24px; margin-top: 40px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">BOT DOCK</div>
            <h1 class="heading">Confirm your email address</h1>
            <p>Please use the following verification code to complete your login. Do not share this code with anyone.</p>
            <div class="otp-container">
                <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes.</p>
            <div class="footer">
                <div style="font-weight: 600; color: #111;">Bot Dock</div>
                <div>&copy; 2026 Bot Dock, Inc. &bull; San Francisco, CA</div>
            </div>
        </div>
    </body>
    </html>`;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, {
            params: { email, subject: `${otp} is your verification code`, body: htmlTemplate }
        });
        res.json({ status: "success" });
    } catch (error) {
        res.status(500).json({ status: "error" });
    }
});

// --- 4. API: Verify Login ---
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

// --- 5. API: JS Converter & User Specific Save ---
app.post('/upload-worker', async (req, res) => {
    try {
        const { email, fileName, rawCode } = req.body;

        if (!email || !rawCode) return res.status(400).json({ error: "Email and JS Code required" });
        if (!db) return res.status(500).json({ error: "Firebase DB connection fail" });

        // Cloudflare format logic
        const cloudflareFormat = `
export default {
  async fetch(request, env, ctx) {
    try {
      ${rawCode}
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }
};`;

        // Firebase Path: users > {user_email} > workers > {file_name}
        const workerDoc = db.collection('users').doc(email).collection('workers').doc(fileName || `worker-${Date.now()}`);

        await workerDoc.set({
            fileName: fileName || "Untitled Worker",
            originalCode: rawCode,
            cloudflareCode: cloudflareFormat,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            status: "success",
            message: `Worker saved successfully for ${email}`,
            preview: cloudflareFormat
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot Dock Engine Started with Premium UI`));
