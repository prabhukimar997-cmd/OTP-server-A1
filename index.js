const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Aapka Naya Google Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-qPbVe4hZAbUW18Soj13cSkOQi6qaREJvUc5CZ6hioJuiJ-yEw5XTdqEtyruNfw4h_g/exec";

// Memory storage for OTPs
let otpStore = {};

app.get('/', (req, res) => res.send("<h1>🚀 Pro OTP System is Active</h1><p>Use /send-otp and /verify-otp</p>"));

// --- API 1: OTP Bhejna (Create API) ---
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ status: "error", message: "Email is required" });

    // 6 Digit Random OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Storage mein save karein
    otpStore[email] = {
        otp: otp,
        createdAt: Date.now()
    };

    // --- AUTOMATIC DELETE LOGIC (5 Minutes) ---
    // 5 min baad memory se khud delete ho jayega
    setTimeout(() => {
        if (otpStore[email]) {
            delete otpStore[email];
            console.log(`Log: OTP for ${email} automatically deleted after 5 minutes.`);
        }
    }, 5 * 60 * 1000);

    // Pro-Level HTML Email Template
    const htmlTemplate = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 450px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <div style="background: #0062ff; color: white; padding: 25px; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">Verification Code</h2>
            </div>
            <div style="padding: 35px; text-align: center; background: #ffffff;">
                <p style="color: #444; font-size: 16px; margin-bottom: 25px;">Aapne account verify karne ke liye request ki hai. Aapka security code niche hai:</p>
                <div style="font-size: 38px; font-weight: bold; color: #0062ff; letter-spacing: 10px; margin: 20px 0; padding: 15px; border: 2px dashed #0062ff; border-radius: 8px; display: inline-block; background: #f0f7ff;">
                    ${otp}
                </div>
                <p style="color: #d9534f; font-size: 13px; margin-top: 25px;">⚠️ Ye code sirf <b>5 minutes</b> tak kaam karega.</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
                Agar aapne ye request nahi ki, toh is email ko ignore karein.<br>
                <b>© Prabhu Workspace Services</b>
            </div>
        </div>
    `;

    try {
        await axios.get(GOOGLE_SCRIPT_URL, {
            params: {
                email: email,
                subject: `${otp} is your verification code`,
                body: htmlTemplate
            }
        });

        // Security: Response mein OTP NAHI dikhega
        res.json({ 
            status: "success", 
            message: "OTP sent successfully to email" 
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: "error", message: "Failed to send OTP via Google Bridge" });
    }
});

// --- API 2: OTP Check Karna (Check API) ---
app.get('/verify-otp', (req, res) => {
    const { email, otp } = req.query;

    if (!email || !otp) {
        return res.status(400).json({ status: "error", message: "Email and OTP are required" });
    }

    // 1. Check if OTP exists (Not expired)
    if (!otpStore[email]) {
        return res.json({ 
            status: "expired", 
            message: "OTP expired ho gaya hai ya kabhi bhej hi nahi gaya." 
        });
    }

    // 2. Check if Correct OTP
    if (otpStore[email].otp.toString() === otp.toString()) {
        delete otpStore[email]; // Sahi hone par turant delete karein
        res.json({ 
            status: "verified", 
            message: "OTP Verification Successful!" 
        });
    } else {
        res.json({ 
            status: "wrong", 
            message: "Galat OTP! Kripya sahi code dalein." 
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Pro Server live on port ${PORT}`));
