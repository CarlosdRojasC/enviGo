const Order = require('../models/Order');
const { ORDER_STATUS } = require('../config/constants');

class PickupScannerController {

  // ✅ Escanear QR y marcar como recogido (Modo Recogida Rápida)
  async scanPackageForPickup(req, res) {
    try {
      let { code } = req.body;
      const driverId = req.user.driver_id || req.user._id;
      const driverName = req.user.full_name || req.user.name || 'Conductor';

      console.log(`📱 Conductor ${driverName} escaneando código: "${code}"`);

      // Validar código
      if (!code || code === 'undefined' || code.trim() === '') {
        console.log('❌ Código vacío o undefined recibido');
        return res.status(400).json({
          success: false,
          error: 'Por favor ingresa un código válido'
        });
      }

      // 🔍 Intentar detectar si el QR es un JSON (Mercado Libre)
      try {
        const parsed = JSON.parse(code);
        if (parsed?.id) {
          console.log('🟡 QR de Mercado Libre detectado:', parsed);
          code = parsed.id.toString();
        }
      } catch (_) {
        // No es JSON, continuar normal
      }

      const cleanCode = code.trim();

      // 🔎 Buscar por order_number, external_order_id o ml_shipping_id
      const order = await Order.findOne({
        $or: [
          { order_number: cleanCode },
          { external_order_id: cleanCode },
          { ml_shipping_id: cleanCode }
        ]
      }).populate('company_id', 'name');

      if (!order) {
        console.log(`❌ No se encontró pedido con código: "${cleanCode}"`);
        return res.status(404).json({
          success: false,
          error: `Pedido "${cleanCode}" no encontrado. Verifica el código.`
        });
      }

      console.log(`✅ Pedido encontrado: ${order.order_number} (${order.customer_name})`);

      // Verificar estado válido para recogida
      const validStatuses = ['pending', 'ready_for_pickup', 'processing'];
      if (!validStatuses.includes(order.status)) {
        // Si ya está retirado, informar quién y cuándo
        if (order.status === 'picked_up') {
          return res.status(400).json({
            success: false,
            error: `El pedido ${order.order_number} ya fue retirado`,
            pickup_info: {
              pickup_time: order.pickup_time,
              pickup_driver: order.pickup_driver_name
            }
          });
        }

        return res.status(400).json({
          success: false,
          error: `El pedido ${order.order_number} no está disponible para recogida (estado: ${order.status})`
        });
      }

      // 🚚 Marcar como retirado
      order.status = ORDER_STATUS.PICKED_UP || 'picked_up';
      order.pickup_time = new Date();
      order.pickup_driver_id = driverId;
      order.pickup_driver_name = driverName;
      order.updated_at = new Date();

      await order.save();

      console.log(`✅ Pedido ${order.order_number} marcado como RETIRADO por ${driverName}`);

      res.json({
        success: true,
        message: `Pedido ${order.order_number} retirado correctamente`,
        package: {
          order_id: order._id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          company: order.company_id?.name,
          pickup_time: order.pickup_time,
          pickup_driver: driverName,
          status: 'picked_up'
        }
      });

    } catch (error) {
      console.error('❌ Error escaneando paquete:', error);
      res.status(500).json({
        success: false,
        error: 'Error del servidor al procesar el escaneo'
      });
    }
  }

  // 🧩 Validar código (Modo Asignación a Ruta)
  async validateCode(req, res) {
    try {
      const { code } = req.body;

      console.log(`🔍 Validando order_number: "${code}"`);

      if (!code || code === 'undefined' || code.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Código vacío'
        });
      }

      // Igual que scanPackageForPickup, intentar detectar JSON
      let cleanCode = code.trim();
      try {
        const parsed = JSON.parse(code);
        if (parsed?.id) cleanCode = parsed.id.toString();
      } catch (_) {}

      const order = await Order.findOne({
        $or: [
          { order_number: cleanCode },
          { external_order_id: cleanCode },
          { ml_shipping_id: cleanCode }
        ]
      }).populate('company_id', 'name');

      if (!order) {
        return res.status(404).json({
          success: false,
          error: `Pedido "${cleanCode}" no encontrado`
        });
      }

      const canPickup = ['pending', 'ready_for_pickup', 'processing'].includes(order.status);
      const alreadyPickedUp = order.status === 'picked_up';

      res.json({
        success: true,
        package: {
          // ✅ CAMBIO IMPORTANTE: Devolvemos el ID para que el frontend pueda asignarlo
          order_id: order._id, 
          order_number: order.order_number,
          customer_name: order.customer_name,
          shipping_address: order.shipping_address, // También útil para mostrar en la lista
          company: order.company_id?.name,
          status: order.status,
          can_pickup: canPickup,
          already_picked_up: alreadyPickedUp,
          pickup_info: alreadyPickedUp
            ? {
                pickup_time: order.pickup_time,
                pickup_driver: order.pickup_driver_name
              }
            : null
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

  // 🚚 Historial de recogidas del conductor
  async getDriverPickupHistory(req, res) {
    try {
      const driverId = req.user.driver_id || req.user._id;
      const { page = 1, limit = 20, date_from, date_to } = req.query;

      const filter = {
        pickup_driver_id: driverId,
        status: ORDER_STATUS.PICKED_UP || 'picked_up'
      };

      if (date_from || date_to) {
        filter.pickup_time = {};
        if (date_from) filter.pickup_time.$gte = new Date(date_from);
        if (date_to) filter.pickup_time.$lte = new Date(date_to);
      }

      const orders = await Order.find(filter)
        .populate('company_id', 'name')
        .select('order_number customer_name pickup_time company_id total_amount')
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

  // 📊 Estadísticas del conductor
  async getDriverPickupStats(req, res) {
    try {
      const driverId = req.user.driver_id || req.user._id;
      const { timeframe = '7d' } = req.query;

      const now = new Date();
      let startDate;
      switch (timeframe) {
        case '24h':
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const stats = await Order.aggregate([
        {
          $match: {
            pickup_driver_id: driverId,
            pickup_time: { $gte: startDate },
            status: ORDER_STATUS.PICKED_UP || 'picked_up'
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
        timeframe,
        period: { start: startDate, end: now },
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
}

module.exports = new PickupScannerController();