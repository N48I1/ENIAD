const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'frontend' directory (which is one level up)
// We use ../frontend because this file is in the /backend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Send index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur simple lancé sur http://localhost:${PORT}`));
