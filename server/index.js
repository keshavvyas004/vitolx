let app;
try {
  app = require('./server');
} catch (e) {
  console.error('Failed to load ./server in index.js:', e);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'INDEX_REQUIRE_SERVER_FAILED',
      message: e.message,
      stack: e.stack,
    });
  });
}
module.exports = app;
