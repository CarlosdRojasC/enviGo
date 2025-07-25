

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


// ==================== IMPORTAR RUTAS SEPARADAS ====================
const shipdayRoutes = require('./shipday.routes');
const comunasRoutes = require('./comunas.routes');
const channelRoutes = require('./channels.routes');
const notificationRoutes = require('./notifications.routes');

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

router.use('/api/notifications', notificationRoutes);

// Dashboard y estadísticas
router.use('/', dashboardRoutes);
// ==================== USAR RUTAS SEPARADAS ====================
router.use('/shipday', shipdayRoutes);
router.use('/communes', comunasRoutes);
router.use('/channels', channelRoutes);


module.exports = router;