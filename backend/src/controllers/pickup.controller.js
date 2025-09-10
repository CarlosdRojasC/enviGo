const Pickup = require('../models/Pickup');

class PickupController {
  /**
   * Obtener todos los retiros (pickups)
   */
  async getAll(req, res) {
    try {
      const { status, company_id, driver_id } = req.query;
      const filters = {};

      if (status) filters.status = status;
      if (company_id) filters.company_id = company_id;
      if (driver_id) filters.driver_id = driver_id;

      const pickups = await Pickup.find(filters)
  .populate('company_id', 'name email') // Traemos también el email de la empresa
  .populate('manifest_id', 'manifest_number')
  .populate('driver_id', 'name phone') // <-- AÑADE ESTA LÍNEA PARA TRAER LOS DATOS DEL CONDUCTOR
  .sort({ created_at: -1 })
  .lean();

      res.json(pickups);
    } catch (error) {
      console.error('Error obteniendo los retiros:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener un retiro específico por su ID
   */
  async getById(req, res) {
    try {
      const pickup = await Pickup.findById(req.params.id)
        .populate('company_id', 'name address')
        .populate('manifest_id', 'manifest_number total_orders')
        .populate('orders_to_pickup', 'order_number customer_name shipping_address') // <-- Para ver el detalle de los pedidos
        .lean();

      if (!pickup) {
        return res.status(404).json({ error: 'Retiro no encontrado' });
      }
      res.json(pickup);
    } catch (error) {
      console.error('Error obteniendo el retiro por ID:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Asignar un conductor a un retiro
   */
  async assignDriver(req, res) {
    try {
      const { driver_id } = req.body;
      if (!driver_id) {
        return res.status(400).json({ error: 'Se requiere el ID del conductor.' });
      }

      const pickup = await Pickup.findByIdAndUpdate(
        req.params.id,
        {
          driver_id: driver_id,
          status: 'assigned',
          assigned_at: new Date(),
        },
        { new: true } // Devuelve el documento actualizado
      );

      if (!pickup) {
        return res.status(404).json({ error: 'Retiro no encontrado' });
      }
      res.json({ message: 'Conductor asignado exitosamente', pickup });
    } catch (error) {
      console.error('Error asignando conductor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Actualizar el estado de un retiro
   */
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Se requiere un nuevo estado.' });
      }

      const update = { status };
      if (status === 'completed') {
        update.completed_at = new Date();
      }

      const pickup = await Pickup.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true }
      );

      if (!pickup) {
        return res.status(404).json({ error: 'Retiro no encontrado' });
      }
      res.json({ message: 'Estado del retiro actualizado', pickup });
    } catch (error) {
      console.error('Error actualizando estado del retiro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new PickupController();