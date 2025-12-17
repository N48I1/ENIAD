const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from the frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Also serve artifacts from the root or frontend if necessary
// The hardhat config exports artifacts to ../frontend/artifacts, so they are already inside frontendPath.

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
