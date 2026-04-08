const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Aapka Google Script URL (Bridge)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwnEn5vGx0htO9DkwuHfWThTlgQma8c0qHosAr6vXcdgQU6Qy1qKPkTzrKSqUczJEHQ/exec";

// Home Page
app.get('/', (req, res) => {
    res.send(`
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>🚀 OTP Server is Live!</h1>
            <p>OTP bhejne ke liye niche wala tarika use karein:</p>
            <code>/send-otp?email=aapkaemail@gmail.com</code>
        </body>
    `);
});

// Send OTP Route
app.get('/send-otp', async (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.send("Error: Email parameter missing!");
    }

    try {
        // Render se Google Script ko signal bhej rahe hain
        const response = await axios.get(`${GOOGLE_SCRIPT_URL}?email=${email}`);

        if (response.data.status === "success") {
            res.send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px; border: 2px solid green; border-radius: 10px; display: inline-block;">
                    <h1 style="color: green;">✅ OTP Sent!</h1>
                    <p>OTP Successfully bhej diya gaya hai: <b>${email}</b></p>
                    <p>Aapka OTP hai: <span style="font-size: 30px; font-weight: bold; color: blue;">${response.data.otp}</span></p>
                    <p>Apna Inbox ya Spam folder check karein.</p>
                </div>
            `);
        } else {
            res.status(500).send("Google Script Error: " + response.data.message);
        }
    } catch (error) {
        console.error("Error details:", error.message);
        res.status(500).send("Server Error: " + error.message);
    }
});

// Render Port
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});
