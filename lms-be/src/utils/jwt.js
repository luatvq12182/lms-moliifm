const jwt = require("jsonwebtoken");

function signToken(user, { secret, expiresIn }) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        secret,
        { expiresIn }
    );
}

module.exports = { signToken };