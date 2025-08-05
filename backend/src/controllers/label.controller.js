// backend/src/controllers/label.controller.js

const Order = require('../models/Order');

class LabelController {
  
  // Generar código único para un pedido
  async generateCode(req, res) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findById(orderId).populate('company_id');
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      // Verificar permisos (solo la empresa propietaria o admin)
      if (req.user.role !== 'admin' && 
          req.user.company_id.toString() !== order.company_id._id.toString()) {
        return res.status(403).json({ error: 'No tienes permisos para generar esta etiqueta' });
      }

      // Generar código único
      const uniqueCode = await order.generateEnvigoCode();

      // Preparar datos para la etiqueta
      const labelData = {
        unique_code: uniqueCode,
        company_name: order.company_id.name,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone || '',
        shipping_address: order.shipping_address,
        shipping_commune: order.shipping_commune,
        priority: order.priority || 'normal',
        notes: order.notes || '',
        order_date: order.order_date,
        generated_at: order.envigo_label.generated_at
      };

      res.json({
        success: true,
        label: labelData,
        message: 'Código enviGo generado exitosamente'
      });

    } catch (error) {
      console.error('Error generando código enviGo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Generar códigos para múltiples pedidos
  async generateBulkCodes(req, res) {
    try {
      const { orderIds } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos' });
      }

      const orders = await Order.find({ _id: { $in: orderIds } }).populate('company_id');
      
      // Filtrar pedidos según permisos
      const allowedOrders = orders.filter(order => {
        return req.user.role === 'admin' || 
               req.user.company_id.toString() === order.company_id._id.toString();
      });

      if (allowedOrders.length === 0) {
        return res.status(403).json({ error: 'No tienes permisos para generar estas etiquetas' });
      }

      // Generar códigos para todos los pedidos permitidos
      const labels = [];
      for (const order of allowedOrders) {
        const uniqueCode = await order.generateEnvigoCode();
        
        labels.push({
          order_id: order._id,
          unique_code: uniqueCode,
          company_name: order.company_id.name,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || '',
          shipping_address: order.shipping_address,
          shipping_commune: order.shipping_commune,
          priority: order.priority || 'normal',
          notes: order.notes || ''
        });
      }

      res.json({
        success: true,
        labels,
        total: labels.length,
        message: `${labels.length} códigos enviGo generados exitosamente`
      });

    } catch (error) {
      console.error('Error generando códigos masivos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Marcar etiqueta como impresa
  async markPrinted(req, res) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findById(orderId).populate('company_id');
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && 
          req.user.company_id.toString() !== order.company_id._id.toString()) {
        return res.status(403).json({ error: 'No tienes permisos para marcar esta etiqueta' });
      }

      // Marcar como impresa
      await order.markLabelPrinted(req.user._id);

      res.json({
        success: true,
        message: 'Etiqueta marcada como impresa',
        printed_count: order.envigo_label.printed_count
      });

    } catch (error) {
      console.error('Error marcando etiqueta como impresa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Buscar pedido por código enviGo (para repartidores)
  async findByCode(req, res) {
    try {
      const { code } = req.params;
      
      const order = await Order.findOne({
        'envigo_label.unique_code': code
      }).populate('company_id', 'name phone address');

      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: 'Código enviGo no encontrado' 
        });
      }

      // Información para repartidores (solo datos necesarios)
      const orderInfo = {
        unique_code: order.envigo_label.unique_code,
        company: {
          name: order.company_id.name,
          phone: order.company_id.phone,
          address: order.company_id.address
        },
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        shipping_address: order.shipping_address,
        shipping_commune: order.shipping_commune,
        status: order.status,
        priority: order.priority || 'normal',
        notes: order.notes,
        order_date: order.order_date
      };

      res.json({
        success: true,
        order: orderInfo
      });

    } catch (error) {
      console.error('Error buscando por código enviGo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener estadísticas de etiquetas para una empresa
  async getStats(req, res) {
    try {
      let companyId;
      
      if (req.user.role === 'admin') {
        companyId = req.query.company_id;
        if (!companyId) {
          return res.status(400).json({ error: 'company_id requerido para admin' });
        }
      } else {
        companyId = req.user.company_id;
      }

      const stats = await Order.aggregate([
        { $match: { company_id: mongoose.Types.ObjectId(companyId) } },
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            orders_with_labels: {
              $sum: {
                $cond: [{ $ne: ['$envigo_label.unique_code', null] }, 1, 0]
              }
            },
            labels_printed: {
              $sum: {
                $cond: [{ $gt: ['$envigo_label.printed_count', 0] }, 1, 0]
              }
            },
            total_prints: { $sum: '$envigo_label.printed_count' }
          }
        }
      ]);

      const result = stats[0] || {
        total_orders: 0,
        orders_with_labels: 0,
        labels_printed: 0,
        total_prints: 0
      };

      res.json({
        success: true,
        stats: result
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de etiquetas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new LabelController();