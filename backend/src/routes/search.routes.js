// backend/src/routes/search.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const searchController = require('../controllers/search.controller');

// GET /api/search/global
router.get('/global', authenticateToken, searchController.globalSearch);

module.exports = router;