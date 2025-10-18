

const express = require('express');
const router = express.Router();

// ==================== IMPORTAR RUTAS MODULARES ====================
const authRoutes = require('./auth.routes');
const companyRoutes = require('./companies.routes');
const orderRoutes = require('./orders.routes');
const userRoutes = require('./users.routes');
const driverRoutes = require('./drivers.routes');
const billingRoutes = require('./billing.routes');
const webhookRoutes = require('./webhooks.routes');
const dashboardRoutes = require('./dashboard.routes');
const searchRoutes = require('./search.routes');

// ==================== IMPORTAR RUTAS SEPARADAS ====================
const shipdayRoutes = require('./shipday.routes');
const comunasRoutes = require('./comunas.routes');
const channelRoutes = require('./channels.routes');
const manifestRoutes = require('./manifest.routes');
const notificationRoutes = require('./notifications.routes');
const driverHistoryRoutes = require('./driverHistory.routes');
const labelRoutes = require('./labels.routes');
const pickupRoutes = require('./pickup.routes');
const driverScannerRoutes = require('./driver-scanner.routes');
const collectionRoutes = require('./collection.routes');
const sessionsRoutes = require('./sessions.routes');
const contactRoutes = require('./contact.routes');
const routeRoutes = require('./routes');
// ==================== USAR RUTAS MODULARES ====================
// Rutas de autenticación (login, registro, perfil, etc.)
router.use('/sessions', sessionsRoutes);


router.use('/auth', authRoutes);

// Empresas
router.use('/companies', companyRoutes);

// Pedidos
router.use('/orders', orderRoutes);

// Usuarios
router.use('/users', userRoutes);
// Conductores
router.use('/drivers', driverRoutes);

// Facturación
router.use('/billing', billingRoutes);

// Webhooks (sin autenticación)
router.use('/webhooks', webhookRoutes);

router.use('/notifications', notificationRoutes);

// Dashboard y estadísticas
router.use('/', dashboardRoutes);
router.use('/search', searchRoutes);
// ==================== USAR RUTAS SEPARADAS ====================
router.use('/shipday', shipdayRoutes);
router.use('/communes', comunasRoutes);
router.use('/channels', channelRoutes);
router.use('/manifests', manifestRoutes); 
router.use('/driver-history', driverHistoryRoutes);
router.use('/labels', labelRoutes);
router.use('/pickups', pickupRoutes);

router.use('/driver-scanner', driverScannerRoutes);
router.use('/collections', collectionRoutes);
router.use('/contact', contactRoutes);
router.use('/routes', routeRoutes);

module.exports = router;