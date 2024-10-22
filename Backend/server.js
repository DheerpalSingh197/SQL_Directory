const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const { performance } = require('perf_hooks');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// CORS setup
app.use('*', cors());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Create a MySQL pool
const pool = mysql.createPool(dbConfig);

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    res.send({ message: 'File uploaded successfully', file: req.file });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Middleware to attach user_id and IP to the request
app.use((req, res, next) => {
  req.user_id = req.headers['user-id'] || 'unknown_user';
  req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
});

// SQL query endpoint
app.post('/query', (req, res) => {
  const { sqlQuery } = req.body;
  const startTime = performance.now();

  // Execute SQL query
  pool.query(sqlQuery, (error, results, fields) => {
    const endTime = performance.now();
    const totalTime = (endTime - startTime).toFixed(2);

    if (error) {
      console.error('SQL Error:', error);
      res.status(500).json({ error: { message: 'Error executing SQL query.', details: error.message } });
    } else {
      // Log the query details into query_log table
      const logQuery = 'INSERT INTO query_log (user_id, query, timestamp, total_time, ip) VALUES (?, ?, NOW(), ?, ?)';
      const logParams = [req.user_id, sqlQuery, totalTime, req.ip];

      pool.query(logQuery, logParams, (logError, logResults) => {
        if (logError) {
          console.error('Log SQL Error:', logError);
        }
      });

      // Return the results of the query, include row count and affected rows
      res.json({
        results: Array.isArray(results) ? results : [],
        rowCount: results.length,
        affectedRows: results.affectedRows || 0,
      });
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
