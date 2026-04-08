const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Firebase Admin Setup ---
try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.log("⚠️ Warning: Firebase Environment Variables missing!");
    } else {
        privateKey = privateKey.replace(/\\n/g, '\n');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey })
            });
            console.log("✅ Firebase Admin Initialized Successfully!");
        }
    }
} catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-qPbVe4hZAbUW18Soj13cSkOQi6qaREJvUc5CZ6hioJuiJ-yEw5XTdqEtyruNfw4h_g/exec";
let otpStore = {};

// --- Home Route (Beautiful Status Page) ---
app.get('/', (req, res) => {
    res.send(`
        <body style="margin:0; font-family:'Segoe UI',sans-serif; background:#f4f7fe; display:flex; justify-content:center; align-items:center; height:100vh;">
            <div style="background:white; padding:40px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.05); text-align:center; max-width:400px;">
                <div style="width:60px; height:60px; background:#0062ff; border-radius:15px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; color:white; font-size:30px; font-weight:bold;">B</div>
                <h1 style="color:#2d3436; margin:0;">Bot Dock</h1>
                <p style="color:#636e72; font-size:14px; margin:10px 0 25px;">OTP Authentication Server is <span style="color:#00b894; font-weight:bold;">Online</span></p>
                <div style="background:#f1f2f6; padding:15px; border-radius:10px; font-family:monospace; font-size:12px; color:#2d3436;">
                    Status: 200 OK <br> Secure: Enabled
                </div>
                <p style="margin-top:25px; font-size:12px; color:#b2bec3;">© 2024 Bot Dock - Premium Security</p>
            </div>
        </body>
    `);
});

// --- API 1: Send OTP (Modern Email UI) ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error", message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, createdAt: Date.now() };

    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    // --- Premium HTML Email Template ---
    const htmlTemplate = `
        <div style="background-color:#f9fafb; padding:50px 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            <div style="max-width:400px; margin:0 auto; background-color:#ffffff; border-radius:16px; padding:40px; box-shadow:0 4px 12px rgba(0,0,0,0.05); text-align:center; border:1px solid #f0f0f0;">
                <h2 style="margin:0 0 10px; color:#111827; font-size:24px; font-weight:700;">Verification Code</h2>
                <p style="margin:0 0 30px; color:#6b7280; font-size:15px; line-height:1.5;">Kripya niche diye gaye OTP ka upyog karein login pura karne ke liye. Ye code 5 minute tak valid hai.</p>
                
                <div style="background-color:#f3f4f6; border-radius:12px; padding:20px; margin-bottom:30px;">
                    <span style="font-size:36px; font-weight:800; letter-spacing:8px; color:#0062ff;">${otp}</span>
                </div>
                
                <p style="margin:0; color:#9ca3af; font-size:13px;">Agar aapne ye request nahi ki hai, toh kripya is email ko ignore karein.</p>
                
                <div style="margin-top:40px; padding-top:20px; border-top:1px solid #f3f4f6;">
                    <p style="margin:0; color:#4b5563; font-size:14px; font-weight:600;">Bot Dock</p>
                    <p style="margin:4px 0 0; color:#9ca3af; font-size:12px;">© 2024 Bot Dock - Simple & Secure</p>
                </div>
            </div>
        </div>
    `;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, {
            params: { email, subject: `${otp} is your Bot Dock code`, body: htmlTemplate }
        });
        res.json({ status: "success", message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Mail Delivery Failed" });
    }
});

// --- API 2: Verify & Login ---
app.get('/verify-login', async (req, res) => {
    const { email, otp } = req.query;

    if (!otpStore[email]) return res.json({ status: "expired", message: "OTP Expired" });

    if (otpStore[email].otp.toString() === otp.toString()) {
        try {
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(email);
            } catch (e) {
                userRecord = await admin.auth().createUser({ email });
            }
            const customToken = await admin.auth().createCustomToken(userRecord.uid);
            delete otpStore[email];
            res.json({ status: "success", token: customToken });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    } else {
        res.json({ status: "wrong", message: "Invalid Code" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot Dock Server running`));
