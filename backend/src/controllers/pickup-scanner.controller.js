// backend/src/controllers/pickup-scanner.controller.js

const Order = require('../models/Order');
const { ORDER_STATUS, ERRORS } = require('../config/constants');

class PickupScannerController {
  
  // Método principal: Escanear QR y marcar como recogido
  async scanPackageForPickup(req, res) {
    try {
      const { code } = req.body;
      const driverId = req.user.driver_id || req.user._id;
      const driverName = req.user.full_name || req.user.name || 'Conductor';

      // Verificar que es un conductor (opcional, puedes comentar esta línea si no la necesitas)
      if (req.user.role && req.user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          error: 'Solo los conductores pueden escanear paquetes'
        });
      }

      console.log(`📱 Conductor ${driverName} escaneando código: ${code}`);
      
      // Buscar el pedido por código (tracking_code, order_number, etc.)
      const order = await Order.findOne({
        $or: [
          { tracking_code: code },
          { order_number: code },
          { _id: code }
        ]
      }).populate('company_id', 'name');

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Código no encontrado en el sistema'
        });
      }

      // Verificar que el pedido esté en un estado válido para recogida
      const validStatuses = ['pending', 'ready_for_pickup', 'processing'];
      if (!validStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          error: `El paquete no está disponible para recogida (estado actual: ${order.status})`
        });
      }

      // Verificar que no esté ya recogido
      if (order.status === 'warehouse_received') {
        return res.status(400).json({
          success: false,
          error: 'Este paquete ya fue recogido',
          pickup_info: {
            pickup_time: order.pickup_time,
            pickup_driver: order.pickup_driver_name
          }
        });
      }

      // Marcar como recogido
      order.status = ORDER_STATUS.WAREHOUSE_RECEIVED;
      order.pickup_time = new Date();
      order.pickup_driver_id = driverId;
      order.pickup_driver_name = driverName;
      order.updated_at = new Date();

      await order.save();

      console.log(`✅ Paquete ${order.tracking_code} marcado como recogido por ${driverName}`);

      res.json({
        success: true,
        message: `Paquete ${order.tracking_code} recogido correctamente`,
        package: {
          order_id: order._id,
          tracking_code: order.tracking_code,
          customer_name: order.customer_name,
          company: order.company_id?.name,
          pickup_time: order.pickup_time,
          pickup_driver: driverName
        }
      });

    } catch (error) {
      console.error('❌ Error escaneando paquete:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error del servidor' 
      });
    }
  }

  // Método para obtener historial de paquetes recogidos por el conductor
  async getDriverPickupHistory(req, res) {
    try {
      const driverId = req.user.driver_id || req.user._id;
      const { page = 1, limit = 20, date_from, date_to } = req.query;

      const filter = {
        pickup_driver_id: driverId,
        status: ORDER_STATUS.WAREHOUSE_RECEIVED
      };

      // Filtrar por fechas si se proporcionan
      if (date_from || date_to) {
        filter.pickup_time = {};
        if (date_from) filter.pickup_time.$gte = new Date(date_from);
        if (date_to) filter.pickup_time.$lte = new Date(date_to);
      }

      const orders = await Order.find(filter)
        .populate('company_id', 'name')
        .select('tracking_code customer_name pickup_time company_id total_amount')
        .sort({ pickup_time: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Order.countDocuments(filter);

      res.json({
        success: true,
        pickups: orders,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error del servidor' 
      });
    }
  }

  // Método para obtener estadísticas de recogidas del conductor
  async getDriverPickupStats(req, res) {
    try {
      const driverId = req.user.driver_id || req.user._id;
      const { timeframe = '7d' } = req.query;

      // Calcular fecha de inicio
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Obtener estadísticas
      const stats = await Order.aggregate([
        {
          $match: {
            pickup_driver_id: driverId,
            pickup_time: { $gte: startDate },
            status: ORDER_STATUS.WAREHOUSE_RECEIVED
          }
        },
        {
          $group: {
            _id: null,
            total_pickups: { $sum: 1 },
            total_value: { $sum: '$total_amount' },
            companies_served: { $addToSet: '$company_id' }
          }
        }
      ]);

      const result = stats[0] || {
        total_pickups: 0,
        total_value: 0,
        companies_served: []
      };

      result.companies_count = result.companies_served.length;
      delete result.companies_served;

      res.json({
        success: true,
        timeframe: timeframe,
        period: {
          start: startDate,
          end: now
        },
        stats: result
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error del servidor' 
      });
    }
  }

  // Método para validar un código antes de escanearlo
  async validateCode(req, res) {
    try {
      const { code } = req.body;

      console.log(`🔍 Validando código: ${code}`);
      
      const order = await Order.findOne({
        $or: [
          { tracking_code: code },
          { order_number: code },
          { _id: code }
        ]
      }).populate('company_id', 'name');

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Código no encontrado'
        });
      }

      const canPickup = ['pending', 'ready_for_pickup', 'processing'].includes(order.status);
      const alreadyPickedUp = order.status === 'warehouse_received';

      res.json({
        success: true,
        package: {
          tracking_code: order.tracking_code,
          customer_name: order.customer_name,
          company: order.company_id?.name,
          status: order.status,
          can_pickup: canPickup,
          already_picked_up: alreadyPickedUp,
          pickup_info: alreadyPickedUp ? {
            pickup_time: order.pickup_time,
            pickup_driver: order.pickup_driver_name
          } : null
        }
      });

    } catch (error) {
      console.error('❌ Error validando código:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error del servidor' 
      });
    }
  }
}

module.exports = new PickupScannerController();