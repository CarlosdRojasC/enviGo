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
 async getAll(req, res) {
  try {
    const drivers = await Driver.find().lean(); // .lean() para que sea más rápido

    // Para cada conductor, calculamos sus estadísticas en paralelo
    const driversWithStats = await Promise.all(drivers.map(async (driver) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Contar pedidos entregados este mes
      const deliveredThisMonth = await Order.countDocuments({
        driver_id: driver._id,
        status: 'delivered',
        delivery_date: { $gte: startOfMonth }
      });

      // Contar todos los pedidos asignados
      const totalAssigned = await Order.countDocuments({ driver_id: driver._id });
      
      // Contar pedidos con problemas (ej. cancelados después de asignar)
      const issuesCount = await Order.countDocuments({
        driver_id: driver._id,
        status: 'cancelled' // O cualquier otro estado que consideres un problema
      });

      return {
        ...driver,
        stats: {
          deliveredThisMonth,
          totalAssigned,
          issuesCount
        }
      };
    }));

    res.json(driversWithStats);
  } catch (error) {
    console.error('Error getting drivers with stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
  async deleteDriver(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }
    try {
      const { driverId } = req.params;

      // 1. Encontrar el usuario/conductor en tu base de datos
      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(404).json({ error: 'Conductor no encontrado.' });
      }

      // 2. Llamar al servicio para eliminarlo de Shipday usando su email
      // El servicio que me pasaste usa el email para borrar, así que lo usamos.
      await ShipdayService.deleteDriver(driver.email);
      
      // 3. Si se elimina de Shipday, eliminarlo de tu base de datos
      await User.findByIdAndDelete(driverId);

      res.status(200).json({ message: 'Conductor eliminado exitosamente.' });
    } catch (error) {
      console.error('Error eliminando conductor:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
}

module.exports = new DriverController();