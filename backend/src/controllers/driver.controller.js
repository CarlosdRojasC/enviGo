// backend/src/controllers/driver.controller.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const ShipdayService = require('../services/shipday.service.js');
const { ERRORS } = require('../config/constants');

class DriverController {
  /**
   * Obtiene la lista de todos los conductores. Solo para administradores.
   */
  async getAllDrivers(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      console.log('🚗 Obteniendo conductores desde Shipday...');
      
      // Obtener conductores desde Shipday
      const shipdayDrivers = await ShipdayService.getDrivers();
      
      // También obtener conductores locales si los tienes
      const localDrivers = await User.find({ role: 'driver' })
        .select('full_name email phone shipday_driver_id is_active');
      
      res.status(200).json({
        success: true,
        data: shipdayDrivers,
        local_drivers: localDrivers,
        total: shipdayDrivers?.length || 0,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || ERRORS.SERVER_ERROR 
      });
    }
  }

  /**
   * Crear nuevo conductor
   */
  async createDriver(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const driverData = req.body;
      console.log('👨‍💼 Creando conductor:', driverData);

      // Validaciones básicas
      if (!driverData.name || !driverData.email || !driverData.phone) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: name, email, phone'
        });
      }

      // Crear en Shipday
      const newDriver = await ShipdayService.createDriver(driverData);
      
      // Opcional: También crear en tu base de datos local
      try {
        const localDriver = new User({
          full_name: driverData.name,
          email: driverData.email,
          phone: driverData.phone,
          role: 'driver',
          shipday_driver_id: newDriver.email, // Shipday usa email como ID
          is_active: true
        });
        await localDriver.save();
      } catch (localError) {
        console.warn('⚠️ No se pudo crear conductor local:', localError.message);
        // No fallar si el conductor local no se puede crear
      }
      
      res.status(201).json({
        success: true,
        message: 'Conductor creado exitosamente',
        data: newDriver,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error creando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || ERRORS.SERVER_ERROR
      });
    }
  }

  /**
   * Obtener conductor específico
   */
  async getDriver(req, res) {
    try {
      const { driverId } = req.params;
      console.log('🔍 Obteniendo conductor:', driverId);

      const driver = await ShipdayService.getDriver(driverId);
      
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Conductor no encontrado'
        });
      }

      res.json({
        success: true,
        data: driver,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Actualizar conductor
   */
  async updateDriver(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const { driverId } = req.params;
      const updateData = req.body;
      
      console.log('🔄 Actualizando conductor:', driverId);

      const updatedDriver = await ShipdayService.updateDriver(driverId, updateData);
      
      // Actualizar también en base de datos local si existe
      try {
        await User.findOneAndUpdate(
          { shipday_driver_id: driverId },
          {
            full_name: updateData.name,
            phone: updateData.phone,
            is_active: updateData.isActive
          }
        );
      } catch (localError) {
        console.warn('⚠️ No se pudo actualizar conductor local:', localError.message);
      }
      
      res.json({
        success: true,
        message: 'Conductor actualizado exitosamente',
        data: updatedDriver,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Eliminar conductor
   */
  async deleteDriver(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const { driverId } = req.params;
      console.log('🗑️ Eliminando conductor:', driverId);

      // Eliminar de Shipday
      await ShipdayService.deleteDriver(driverId);
      
      // Eliminar también de base de datos local si existe
      try {
        const deletedDriver = await User.findOneAndDelete({ 
          shipday_driver_id: driverId 
        });
        console.log('🗑️ Conductor local eliminado:', deletedDriver?.full_name || 'No encontrado');
      } catch (localError) {
        console.warn('⚠️ No se pudo eliminar conductor local:', localError.message);
      }
      
      res.json({
        success: true,
        message: 'Conductor eliminado exitosamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

// Exportar instancia para usar como middleware
module.exports = new DriverController();