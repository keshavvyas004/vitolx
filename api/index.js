let app;
try {
  app = require('../server/server');
} catch (err) {
  console.error('Failed to load server/server in api/index.js:', err);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'SERVER_BOOTSTRAP_ERROR',
      message: err.message,
      stack: err.stack,
    });
  });
}

module.exports = app;
