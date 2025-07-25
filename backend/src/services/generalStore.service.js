const Channel = require("../models/Channel");
const Company = require("../models/Company");
const Order = require("../models/Order");

class GeneralStoreService {
  
  // Crear pedido desde tienda general
  static async createOrder(channelId, orderData, createdByUserId) {
    try {
      console.log('🏪 Creando pedido para Tienda General...');
      
      const channel = await Channel.findById(channelId).populate('company_id');
      if (!channel || channel.channel_type !== 'general_store') {
        throw new Error('Canal de Tienda General no encontrado');
      }
      
      const company = channel.company_id;
      const fixedShippingCost = company.price_per_order || 0;
      
      // Generar número de orden único
      const orderNumber = await this.generateOrderNumber(channel.company_id._id);
      
      const newOrder = new Order({
        company_id: channel.company_id._id,
        channel_id: channelId,
        external_order_id: `gs_${Date.now()}`, // Prefijo para tienda general
        order_number: orderNumber,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email || '',
        customer_phone: orderData.customer_phone || '',
        shipping_address: orderData.shipping_address,
        shipping_commune: orderData.shipping_commune,
        shipping_state: orderData.shipping_state || 'Región Metropolitana',
        shipping_zip: orderData.shipping_zip || '',
        shipping_cost: fixedShippingCost,
        total_amount: parseFloat(orderData.total_amount) || 0,
        status: 'pending',
        channel: 'general_store',
        order_date: new Date(),
        notes: orderData.notes || '',
        
        // Metadata específica de tienda general
        channel_metadata: {
          source_platform: orderData.source_platform || 'instagram', // instagram, facebook, whatsapp, phone
          created_by_user: createdByUserId,
          original_post_url: orderData.original_post_url, // URL del post de IG/FB si aplica
          customer_social_handle: orderData.customer_social_handle, // @usuario
          interaction_type: orderData.interaction_type || 'dm', // dm, comment, whatsapp, phone
          order_source_details: orderData.order_source_details
        },
        
        // Items del pedido
        items: orderData.items || [],
        
        raw_data: {
          source: 'general_store_manual',
          created_via: 'enviGo_panel',
          original_data: orderData
        }
      });
      
      await newOrder.save();
      
      console.log(`✅ Pedido ${orderNumber} creado para Tienda General`);
      return newOrder;
      
    } catch (error) {
      console.error('❌ Error creando pedido en Tienda General:', error);
      throw error;
    }
  }
  
  // Generar número único de orden
  static async generateOrderNumber(companyId) {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    // Contar órdenes del día para esta empresa
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const ordersToday = await Order.countDocuments({
      company_id: companyId,
      order_date: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const sequence = (ordersToday + 1).toString().padStart(3, '0');
    return `GS${datePrefix}${sequence}`; // Ejemplo: GS20250724001
  }
  
  // Validar datos de pedido
  static validateOrderData(orderData) {
    const required = ['customer_name', 'customer_phone', 'shipping_address', 'shipping_commune', 'total_amount'];
    const missing = required.filter(field => !orderData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
    
    if (isNaN(parseFloat(orderData.total_amount)) || parseFloat(orderData.total_amount) <= 0) {
      throw new Error('El monto total debe ser un número válido mayor a 0');
    }
  }
  
  // Obtener estadísticas del canal
  static async getChannelStats(channelId, period = '30d') {
    const dateFilter = this.getDateFilter(period);
    
    const stats = await Order.aggregate([
      {
        $match: {
          channel_id: channelId,
          order_date: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total_amount' },
          avgOrderValue: { $avg: '$total_amount' },
          ordersByStatus: {
            $push: { status: '$status', amount: '$total_amount' }
          },
          ordersBySource: {
            $push: { 
              source: '$channel_metadata.source_platform', 
              amount: '$total_amount' 
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      ordersByStatus: [],
      ordersBySource: []
    };
  }
  
  static getDateFilter(period) {
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const startDate = new Date(now - (days[period] || 30) * 24 * 60 * 60 * 1000);
    return { $gte: startDate };
  }
}

module.exports = GeneralStoreService;