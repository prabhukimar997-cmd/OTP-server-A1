const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Gmail Config - Port 587 try karte hain (Cloud friendly)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 ke liye false
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    },
    tls: {
        rejectUnauthorized: false, // Connection block hone se rokta hai
        minVersion: "TLSv1.2"
    }
});

app.get('/', (req, res) => res.send("OTP Server is Live!"));

app.get('/send-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.send("Email missing!");

    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
        from: `"Verification" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Your OTP Code',
        text: `Aapka OTP hai: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.send(`<h1>Success!</h1><p>OTP sent to ${email}</p><h2>OTP: ${otp}</h2>`);
    } catch (error) {
        console.error("Detailed Error:", error);
        res.status(500).send(`<h1>SMTP Error</h1><p>${error.message}</p>`);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
