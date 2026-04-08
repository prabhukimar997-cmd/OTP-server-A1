const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Email Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL, // Aapki Gmail ID
        pass: process.env.PASSWORD // Aapka App Password
    }
});

// OTP Generate aur Send karne ka Route
app.post('/send-otp', (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // 6 Digit OTP

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Aapka OTP Code',
        text: `Aapka verification code hai: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.status(200).json({ message: 'OTP bhej diya gaya hai!', otp: otp }); 
        // Note: Real system mein OTP ko database mein save karein, response mein na bhejein.
    });
});

app.get('/', (req, res) => res.send('OTP Server Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
