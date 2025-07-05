// backend/src/controllers/driver.controller.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const ShipdayService = require('../services/shipday.service.js');
const { ERRORS } = require('../config/constants');

class DriverController {
  /**
   * Crea un conductor global. Solo para administradores.
   */
  async createDriver(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    try {
      // Ya no necesitamos company_id en el body
      const { full_name, email, phone, password } = req.body;

      // 1. Crear el conductor en Shipday
      const shipdayDriver = await ShipdayService.createDriver({
        name: full_name,
        email,
        phone,
      });

      // 2. Crear el usuario en la base de datos local sin asociarlo a una empresa
      const password_hash = await bcrypt.hash(password, 10);
      const newDriverUser = new User({
        full_name,
        email,
        phone,
        password_hash,
        company_id: null, // El conductor no pertenece a ninguna empresa
        role: 'driver',
        shipday_driver_id: shipdayDriver.id,
        is_active: true,
      });

      await newDriverUser.save();

      res.status(201).json({
        message: 'Conductor creado exitosamente.',
        driver: {
          id: newDriverUser._id,
          full_name: newDriverUser.full_name,
          email: newDriverUser.email,
          shipday_driver_id: newDriverUser.shipday_driver_id,
        },
      });

    } catch (error) {
      console.error('Error en la creación del conductor:', error);
      if (error.code === 11000) {
        return res.status(409).json({ error: 'El email o teléfono ya está registrado.' });
      }
      res.status(500).json({ error: error.message || ERRORS.SERVER_ERROR });
    }
  }

  /**
   * Obtiene la lista de todos los conductores. Solo para administradores.
   */
  async getAllDrivers(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }
    
    try {
      const drivers = await User.find({ role: 'driver' })
        .select('full_name email phone shipday_driver_id is_active');
      res.status(200).json(drivers);
    } catch (error) {
      console.error('Error obteniendo todos los conductores:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new DriverController();