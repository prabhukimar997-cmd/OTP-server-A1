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
        db = admin.firestore(); // Firestore instance
    }
} catch (error) {
    console.error("❌ Firebase Error:", error.message);
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEdamehSYY2plAkNIBuWJ_sxwxBV6ErCCe98N5V4Unj7N2FJgyVls4mPHaSHxCDioi/exec";
let otpStore = {};

// --- 2. Home Route (Landing Page) ---
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
                <p style="font-size: 14px; color: #666; margin-top: 15px;">Secure Identity & Cloudflare Worker Engine is active.</p>
                <div style="font-size: 12px; color: #999; margin-top: 20px;">© 2026 Bot Dock, Inc.</div>
            </div>
        </body>
        </html>
    `);
});

// --- 3. API: Send OTP ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error", message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, createdAt: Date.now() };

    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    const htmlTemplate = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #111;">Verification Code</h2>
        <p>Your code is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #0062ff; letter-spacing: 5px;">${otp}</div>
        <p style="color: #666;">Expires in 5 minutes.</p>
    </div>`;

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

        if (!email) return res.status(400).json({ error: "User Email is required" });
        if (!rawCode) return res.status(400).json({ error: "JS Code is required" });
        if (!db) return res.status(500).json({ error: "Database Connection Error" });

        // JavaScript ko Cloudflare format (ES Modules) mein wrap karna
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

        // Firebase Firestore: User ke apne collection mein save karna
        // Path: users -> {email} -> workers -> {fileName}
        const workerDoc = db.collection('users').doc(email).collection('workers').doc(fileName || `script-${Date.now()}`);

        await workerDoc.set({
            fileName: fileName || "Untitled",
            originalCode: rawCode,
            cloudflareCode: cloudflareFormat,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            status: "success",
            message: `Worker saved for ${email}`,
            preview: cloudflareFormat
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- 6. API: Get User Workers (Optional - Saare saved codes dekhne ke liye) ---
app.get('/get-my-workers', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Email required" });

        const snapshot = await db.collection('users').doc(email).collection('workers').get();
        const workers = [];
        snapshot.forEach(doc => workers.push(doc.data()));

        res.json({ status: "success", workers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot Dock Engine Started with Cloudflare Converter`));
