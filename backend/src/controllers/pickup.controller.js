const Pickup = require('../models/Pickup');
const Driver = require('../models/Driver');
const ShipdayService = require('../services/shipday.service');
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
      // Este es el ID de SHIPDAY que envía el frontend
      const { driver_id: shipdayDriverId } = req.body;
      const { id: pickupId } = req.params;

      if (!shipdayDriverId) {
        return res.status(400).json({ error: 'Se requiere el ID del conductor de Shipday.' });
      }

      // 1. Buscamos nuestro conductor local que corresponde al de Shipday
      const localDriver = await Driver.findOne({ shipday_id: shipdayDriverId });
      if (!localDriver) {
        return res.status(404).json({ error: 'El conductor de Shipday no se encuentra sincronizado en la base de datos local.' });
      }

      // 2. Obtenemos el pickup
      const pickup = await Pickup.findById(pickupId).populate('company_id', 'name');
      if (!pickup) return res.status(404).json({ error: 'Retiro no encontrado' });
      
      // ... (El resto de la lógica para crear la orden en Shipday que te di antes sigue igual)
      // Solo nos aseguramos de usar los IDs correctos

      const shipdayOrderData = {
        orderNumber: `PICKUP-${pickup.manifest_id?.manifest_number || pickup._id.toString().slice(-6)}`,
        customerName: `Retiro en ${pickup.company_id.name}`,
        customerAddress: pickup.pickup_address,
        restaurantName: "Bodega enviGo",
        restaurantAddress: "Tu Dirección de Bodega, Santiago, Chile", // <-- IMPORTANTE: Pon aquí tu dirección real
        deliveryInstruction: `Retirar ${pickup.total_orders} órdenes (${pickup.total_packages} bultos). Manifiesto: ${pickup.manifest_id?.manifest_number}`,
      };
      
      const shipdayOrder = await ShipdayService.createOrder(shipdayOrderData);
      if (!shipdayOrder || !shipdayOrder.orderId) {
        throw new Error('No se pudo crear la orden en Shipday.');
      }
      
      // Usamos el shipdayDriverId directamente para asignar en Shipday
      await ShipdayService.assignOrder(shipdayOrder.orderId, shipdayDriverId);

      // 3. Actualizamos nuestro documento con el ID LOCAL del conductor
      pickup.driver_id = localDriver._id; // <-- Guardamos el Mongo ID
      pickup.status = 'assigned';
      pickup.assigned_at = new Date();
      pickup.shipday_order_id = shipdayOrder.orderId;
      pickup.shipday_tracking_url = shipdayOrder.trackingLink || '';

      await pickup.save();

      res.json({ message: 'Conductor asignado y tarea creada en Shipday exitosamente', pickup });

    } catch (error) {
      console.error('Error asignando conductor y creando en Shipday:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
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