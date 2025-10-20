// backend/src/routes/drivers.routes.js - CORREGIDO
const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { authenticateDriver } = require('../middlewares/driverAuth.middleware'); // ✅ Nuevo middleware
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// ==================== RUTAS PÚBLICAS PARA CONDUCTORES ====================

// 🔑 Login específico para conductores
router.post('/login', async (req, res) => {
    console.log('📝 Intentando login de driver:', req.body.email);

  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Correo y contraseña son requeridos' 
      });
    }

    // Buscar conductor activo con contraseña
    const driver = await Driver.findOne({ 
      email: email.toLowerCase(), 
      is_active: true 
    }).select('+password');
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conductor no encontrado o inactivo' 
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña incorrecta' 
      });
    }

    // ✅ Generar token con rol 'driver'
    const token = jwt.sign(
      { 
        id: driver._id, 
        role: 'driver',
        email: driver.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Respuesta consistente
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      driver: {
        id: driver._id,
        full_name: driver.full_name,
        email: driver.email,
        phone: driver.phone,
        home_address: driver.home_address,
        vehicle_type: driver.vehicle_type
      }
    });

  } catch (error) {
    console.error('❌ Error en login de conductor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// ==================== RUTAS PROTEGIDAS PARA CONDUCTORES ====================

// 👤 Perfil del conductor autenticado
router.get('/me', authenticateDriver, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).select('-password');
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conductor no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      driver: {
        id: driver._id,
        full_name: driver.full_name,
        email: driver.email,
        phone: driver.phone,
        home_address: driver.home_address,
        vehicle_type: driver.vehicle_type,
        company_id: driver.company_id
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo perfil del conductor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno al obtener perfil' 
    });
  }
});

// 🔐 Cambiar contraseña (conductor autenticado)
router.patch('/change-password', authenticateDriver, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contraseña actual y nueva contraseña son requeridas' 
      });
    }

    const driver = await Driver.findById(req.driver.id).select('+password');

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conductor no encontrado' 
      });
    }

    // Verificar contraseña actual
    const match = await bcrypt.compare(oldPassword, driver.password);
    if (!match) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contraseña actual incorrecta' 
      });
    }

    // Actualizar contraseña
    driver.password = await bcrypt.hash(newPassword, 10);
    await driver.save();

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada correctamente' 
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno al cambiar contraseña' 
    });
  }
});

// ==================== RUTAS SOLO ADMIN ====================

// Obtener todos los conductores
router.get('/', authenticateToken, isAdmin, driverController.getAllDrivers);

// Crear nuevo conductor
router.post('/', authenticateToken, isAdmin, driverController.createDriver);

// Obtener conductor por ID
router.get('/:driverId', authenticateToken, isAdmin, driverController.getDriver);

// Actualizar conductor
router.put('/:driverId', authenticateToken, isAdmin, driverController.updateDriver);

// Eliminar conductor
router.delete('/:driverId', authenticateToken, isAdmin, driverController.deleteDriver);

// Activar / desactivar conductor
router.patch('/:driverId/toggle', authenticateToken, isAdmin, driverController.toggleStatus);

// Reiniciar contraseña (admin)
router.post('/:driverId/reset-password', authenticateToken, isAdmin, driverController.resetPassword);

module.exports = router;