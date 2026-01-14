function errorHandler(err, req, res, next) {
    console.error(err);

    // duplicate key email
    if (err && err.code === 11000) {
        return res.status(409).json({ message: "email already exists" });
    }

    return res.status(500).json({ message: "server error" });
}

module.exports = errorHandler;