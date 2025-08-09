// backend/src/controllers/driver.controller.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const ShipdayService = require('../services/shipday.service.js');
const { ERRORS } = require('../config/constants');
const circuitController = require('./circuit.controller');
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
    console.log('--- INICIO DEL PROCESO DE CREACIÓN DE CONDUCTOR ---');
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: ERRORS.FORBIDDEN });
        }

        const driverData = req.body;
        console.log('1. DATOS RECIBIDOS DEL FORMULARIO:', driverData);

        if (!driverData.name || !driverData.email || !driverData.phone) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: name, email, phone' });
        }
        
        // --- PASO A: Crear en Shipday ---
        console.log('2. Intentando crear en Shipday...');
        const shipdayDriver = await ShipdayService.createDriver(driverData);
        if (!shipdayDriver || !shipdayDriver.id) {
            throw new Error('La creación en Shipday falló o no devolvió un ID.');
        }
        console.log('✅ Éxito en Shipday. ID:', shipdayDriver.id);

        // --- PASO B: Crear en Circuit ---
        console.log('3. Intentando crear en Circuit...');
        const circuitDriver = await circuitController.createDriverInCircuit(driverData);
        if (circuitDriver && circuitDriver.id) {
            console.log(`✅ Éxito en Circuit. ID: ${circuitDriver.id}`);
        } else {
            console.warn('⚠️ Fallo en Circuit. El conductor no se creó en la plataforma de Circuit, pero el proceso continuará.');
        }

        // --- PASO C: Preparar para guardar en base de datos ---
        console.log('4. Preparando datos para guardar en la base de datos local...');
        const newDriver = new Driver({
            full_name: driverData.name,
            email: driverData.email,
            phone: driverData.phone,
            company_id: driverData.company_id,
            is_active: true,
            shipday_driver_id: shipdayDriver.id,
            circuit_driver_id: circuitDriver?.id, // Guarda el ID de Circuit si existe
        });
        console.log('   -> Datos a guardar:', newDriver.toObject());

        // --- PASO D: Guardar en la base de datos ---
        console.log('5. Intentando guardar en la base de datos (MongoDB)...');
        await newDriver.save();
        console.log('✅ Éxito al guardar en la base de datos.');

        console.log('--- PROCESO COMPLETADO EXITOSAMENTE ---');
        res.status(201).json({
            success: true,
            message: 'Conductor creado exitosamente.',
            data: newDriver,
        });
        
    } catch (error) {
        // ESTE BLOQUE ES EL MÁS IMPORTANTE PARA NOSOTROS
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('❌ ERROR CRÍTICO DURANTE LA CREACIÓN DEL CONDUCTOR ❌');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Mensaje de error:', error.message);
        console.error('Stack de error:', error.stack); // El stack nos dirá la línea exacta del error
        
        res.status(500).json({ 
            success: false, 
            error: 'Ocurrió un error en el servidor. Revisa la consola del backend para más detalles.',
            errorMessage: error.message 
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