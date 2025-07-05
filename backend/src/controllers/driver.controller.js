// backend/src/controllers/driver.controller.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const ShipdayService = require('../services/shipday.service.js');
const { ERRORS } = require('../config/constants');

class DriverController {
  /**
   * Crea un conductor global. Solo para administradores.
   */
 async createDriver(driverInfo) {
    try {
      const payload = {
        name: driverInfo.name,
        email: driverInfo.email,
        phoneNumber: driverInfo.phone
      };

      console.log('Enviando payload a Shipday:', JSON.stringify(payload, null, 2));
      const response = await this.api.post('/drivers', payload);

      console.log('Conductor creado en Shipday:', response.data);
      return response.data;

    } catch (error) {
      // --- BLOQUE DE ERROR MEJORADO ---
      console.error('❌ Error detallado de la API de Shipday:', error.response?.data);
      
      let errorMessage = 'Error al crear conductor en Shipday.';
      if (error.response?.data?.message) {
        // Usar el mensaje específico de Shipday si existe
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Error de autenticación. Verifica que tu API Key de Shipday sea correcta.";
      }
      
      throw new Error(errorMessage);
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