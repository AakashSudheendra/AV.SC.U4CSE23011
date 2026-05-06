const express = require("express");

const logger = require("./middleware/logger");

const app = express();

/*
    Middleware
*/
app.use(express.json());

/*
    Logging Middleware
*/
app.use(logger);

/*
    Test Route
*/
app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Backend server running successfully"
    });
});

const PORT = 3000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);
});