const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

// Environment variables load karne ke liye
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Gmail Transporter Setup (Optimized for Render)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Port 465 ke liye true
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    },
    tls: {
        rejectUnauthorized: false // Connection errors rokne ke liye
    },
    pool: true // Connection ko active rakhne ke liye
});

// 1. Home Route (Sirf check karne ke liye ki server on hai)
app.get('/', (req, res) => {
    res.send(`
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>✅ OTP Server Online!</h1>
            <p>OTP bhejne ke liye URL aise use karein:</p>
            <code>${req.protocol}://${req.get('host')}/send-otp?email=AapkaEmail@gmail.com</code>
        </body>
    `);
});

// 2. Direct Chrome se OTP bhejne wala Route (GET Method)
app.get('/send-otp', (req, res) => {
    const email = req.query.email; // URL se email lega (?email=xyz)

    if (!email) {
        return res.status(400).send("<h1>Error!</h1><p>URL ke aage <b>?email=aapka-email@gmail.com</b> lagayein.</p>");
    }

    // 6 Digit OTP Generate karein
    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
        from: `"OTP Verification" <${process.env.EMAIL}>`,
        to: email,
        subject: `${otp} is your OTP Code`,
        text: `Aapka verification code hai: ${otp}`,
        html: `
            <div style="font-family: Helvetica,Arial,sans-serif; min-width:1000px; overflow:auto; line-height:2">
                <div style="margin:50px auto; width:70%; padding:20px 0">
                    <p style="font-size:1.1em">Namaste,</p>
                    <p>Aapka OTP niche diya gaya hai:</p>
                    <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">
                        ${otp}
                    </h2>
                    <p style="font-size:0.9em;">Regards,<br />OTP System</p>
                </div>
            </div>
        `
    };

    // Email bhejein
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
        }
        // Chrome browser mein response dikhayega
        res.send(`
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: green;">✅ OTP Sent!</h1>
                <p>OTP successfully bhej diya gaya hai <b>${email}</b> par.</p>
                <p>Aapka OTP hai: <b>${otp}</b></p>
                <br>
                <a href="/">Wapas Jayein</a>
            </body>
        `);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
