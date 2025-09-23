const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const collectionController = require('../controllers/collection.controller');

// Solicitar colecta (clientes)
router.post('/request', authenticateToken, collectionController.requestCollection);

// Ver solicitudes (admin)
router.get('/requests', authenticateToken, isAdmin, collectionController.getCollectionRequests);

module.exports = router;