const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(cors());

// --- Firebase Admin Init ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-qPbVe4hZAbUW18Soj13cSkOQi6qaREJvUc5CZ6hioJuiJ-yEw5XTdqEtyruNfw4h_g/exec";
let otpStore = {};

app.get('/', (req, res) => res.send("Passwordless OTP Login Server Live!"));

// 1. Send OTP API
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp: otp, createdAt: Date.now() };

    setTimeout(() => { if (otpStore[email]) delete otpStore[email]; }, 5 * 60 * 1000);

    const htmlTemplate = `<h1>Login OTP: ${otp}</h1><p>Ye code 5 min tak valid hai.</p>`;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, { params: { email, subject: "Login OTP Code", body: htmlTemplate } });
        res.json({ status: "success", message: "OTP sent" });
    } catch (error) { res.status(500).json({ status: "error" }); }
});

// 2. Verify and Generate Firebase Token
app.get('/verify-login', async (req, res) => {
    const { email, otp } = req.query;

    if (!otpStore[email]) return res.json({ status: "expired", message: "OTP Expired!" });

    if (otpStore[email].otp.toString() === otp.toString()) {
        try {
            let userRecord;
            try {
                // Check if user exists
                userRecord = await admin.auth().getUserByEmail(email);
            } catch (e) {
                // User nahi hai toh naya banao (Auto Sign-up)
                userRecord = await admin.auth().createUser({ email: email });
            }

            // Firebase Custom Token banayein
            const customToken = await admin.auth().createCustomToken(userRecord.uid);
            
            delete otpStore[email];
            res.json({ status: "success", token: customToken });
        } catch (error) {
            res.json({ status: "error", message: error.message });
        }
    } else {
        res.json({ status: "wrong", message: "Galat OTP!" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running`));
