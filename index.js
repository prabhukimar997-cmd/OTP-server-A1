const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// Is route ko humne GET bana diya hai taaki Chrome se direct chale
app.get('/send-otp', (req, res) => {
    // URL se email lega: ?email=abc@gmail.com
    const email = req.query.email; 

    if (!email) {
        return res.send("Email likhna bhool gaye! URL ke aage ?email=aapka-email daalein");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Aapka OTP Code',
        text: `Aapka verification code hai: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send("Error: " + error.toString());
        }
        // Chrome mein ye message dikhega
        res.send(`<h1>OTP Bhej Diya Gaya Hai!</h1><p>Email: ${email}</p><p>OTP: ${otp}</p>`);
    });
});

app.get('/', (req, res) => res.send('OTP Server Online! Use /send-otp?email=YOUR_EMAIL'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started`));
