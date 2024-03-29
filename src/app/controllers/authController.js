const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const authConfig = require('../../config/auth.json');

const User = require('../models/User');

const router = express.Router();


function generateToken(params = {}) {
    return jwt.sign(params , authConfig.secret, {
        expiresIn: 86400
    });
}

router.post('/register', async(req, res) => {
    const { email } = req.body;

    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'User already exists!'})

        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({
            user,
            token: generateToken({ id: user.id })
        });
    } catch (err) {
        return res.status(400).send({ error: "Registration failed" });
    }
});

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if(!user)
        return res.status(400).send({ error: 'User not found' });
    
    if (!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Invalid Password' });
    
    user.password = undefined;
    
    res.send({
        user,
        token: generateToken({ id: user.id })
    });
})

router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;
    
    try {
        
        const user = await User.findOne({ email });

        if(!user)
            return res.status(400).send({ error: 'User not found!' });
        
        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours + 1);

        const userEdited = await User.findByIdAndUpdate(user._id, {
            passwordResetToken: token,
            passwordResetExpires: now
        });

        console.log('AAQUI');
        console.log(token, now, userEdited);
    } catch (err) {
        res.status(400).send({ error: 'Error on forgot password, try again!' });
    }
});

router.post('/validate-token', async (req, res) => {
    const { token, userId } = req.body;

    const user = await User.findOne({ _id: userId });

    await jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err) {
            console.error('Error on verifying token', err)
            return res.status(401).send({ error: err.message })
        }
        
        return res.send({
            success: "Validated Token!",
            token,
            user, 
            isAuthenticaded: true
        })
    })
})

module.exports = app => app.use('/auth', router);