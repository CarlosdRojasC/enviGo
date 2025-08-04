// backend/src/services/jumpseller.service.js - Versión Simple (API Login + Auth Token)
const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class JumpsellerService {
  static API_BASE_URL = 'https://api.jumpseller.com/v1';
  
  /**
   * Prueba la conexión con Jumpseller usando API Login + Auth Token
   */
  static async testConnection(channel) {
    try {
      if (!channel.api_key || !channel.api_secret) {
        return {
          success: false,
          message: 'API Login y Auth Token requeridos para Jumpseller'
        };
      }

      // En Jumpseller: api_key = API Login, api_secret = Auth Token
      const apiLogin = channel.api_key;
      const authToken = channel.api_secret;

      // Obtener información de la tienda para verificar la conexión
      const response = await axios.get(`${this.API_BASE_URL}/store/info.json`, {
        params: {
          login: apiLogin,
          authtoken: authToken
        }
      });

      if (response.status === 200 && response.data.store) {
        const store = response.data.store;
        
        // Actualizar información de la tienda en el canal
        channel.settings = {
          ...channel.settings,
          store_id: store.id,
          store_name: store.name,
          store_url: store.url,
          currency: store.currency,
          last_connection_test: new Date()
        };
        
        await channel.save();

        return {
          success: true,
          message: `Conexión exitosa con ${store.name}`,
          store_info: {
            id: store.id,
            name: store.name,
            url: store.url,
            currency: store.currency
          }
        };
      }

      return {
        success: false,
        message: 'Respuesta inesperada de Jumpseller'
      };

    } catch (error) {
      console.error('[Jumpseller Service] Error en testConnection:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'API Login o Auth Token inválidos'
        };
      }
      
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Tienda no encontrada'
        };
      }

      return {
        success: false,
        message: `Error de conexión: ${error.response?.data?.message || error.message}`
      };
    }
  }

  /**
   * Sincroniza pedidos desde Jumpseller
   */
  static async syncOrders(channel, dateFrom, dateTo) {
    try {
      console.log(`🔄 [Jumpseller] Iniciando sincronización para canal: ${channel.channel_name}`);
      
      if (!channel.api_key || !channel.api_secret) {
        throw new Error('API Login y Auth Token requeridos para sincronizar con Jumpseller');
      }

      const apiLogin = channel.api_key;
      const authToken = channel.api_secret;

      // Parámetros base
      const baseParams = {
        login: apiLogin,
        authtoken: authToken,
        limit: 50,
        page: 1
      };

      // Agregar filtros de fecha si se proporcionan
      if (dateFrom) {
        baseParams.updated_since = new Date(dateFrom).toISOString();
      }

      let totalImported = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`📄 [Jumpseller] Procesando página ${baseParams.page}...`);
        
        const response = await axios.get(`${this.API_BASE_URL}/orders.json`, {
          params: baseParams
        });

        const orders = response.data.orders || response.data || [];
        
        if (!Array.isArray(orders) || orders.length === 0) {
          hasMorePages = false;
          break;
        }

        // Procesar cada pedido
        for (const jumpsellerOrder of orders) {
          try {
            const imported = await this.processOrder(jumpsellerOrder, channel);
            if (imported) totalImported++;
          } catch (orderError) {
            console.error(`❌ [Jumpseller] Error procesando pedido ${jumpsellerOrder.id}:`, orderError.message);
          }
        }

        // Verificar si hay más páginas
        hasMorePages = orders.length === baseParams.limit;
        baseParams.page++;
        
        // Prevenir bucles infinitos
        if (baseParams.page > 100) {
          console.warn('⚠️ [Jumpseller] Detenido en página 100 para prevenir bucle infinito');
          break;
        }
      }

      console.log(`✅ [Jumpseller] Sincronización completada: ${totalImported} pedidos importados`);
      
      return {
        success: true,
        imported_orders: totalImported,
        message: `${totalImported} pedidos sincronizados exitosamente`
      };

    } catch (error) {
      console.error('[Jumpseller] Error en sincronización:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Procesa un pedido individual de Jumpseller
   */
  static async processOrder(jumpsellerOrder, channel) {
    try {
      // Verificar si el pedido ya existe
      const existingOrder = await Order.findOne({
        external_order_id: jumpsellerOrder.id.toString(),
        channel_id: channel._id
      });

      if (existingOrder) {
        return await this.updateExistingOrder(existingOrder, jumpsellerOrder);
      }

      return await this.createNewOrder(jumpsellerOrder, channel);

    } catch (error) {
      console.error(`[Jumpseller] Error procesando pedido ${jumpsellerOrder.id}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo pedido desde datos de Jumpseller
   */
  static async createNewOrder(jumpsellerOrder, channel) {
    try {
      const status = this.mapJumpsellerStatus(jumpsellerOrder.status);
      
      // Procesar dirección de envío
      const shippingAddress = jumpsellerOrder.shipping_address || {};
      
      // Crear items del pedido
      const items = (jumpsellerOrder.products || []).map(product => ({
        product_id: product.id?.toString() || '',
        name: product.name || '',
        sku: product.sku || '',
        quantity: parseInt(product.pivot?.quantity) || 1,
        price: parseFloat(product.pivot?.price) || 0,
        variant_title: product.pivot?.variant_name || null
      }));

      // Calcular totales
      const subtotal = parseFloat(jumpsellerOrder.subtotal) || 0;
      const shipping_cost = parseFloat(jumpsellerOrder.shipping) || 0;
      const tax_amount = parseFloat(jumpsellerOrder.tax) || 0;
      const total_amount = parseFloat(jumpsellerOrder.total) || subtotal + shipping_cost + tax_amount;

      const newOrder = new Order({
        company_id: channel.company_id,
        channel_id: channel._id,
        external_order_id: jumpsellerOrder.id.toString(),
        order_number: jumpsellerOrder.token || jumpsellerOrder.id.toString(),
        
        // Información del cliente
        customer_name: `${jumpsellerOrder.customer?.first_name || ''} ${jumpsellerOrder.customer?.last_name || ''}`.trim(),
        customer_email: jumpsellerOrder.customer?.email || '',
        customer_phone: jumpsellerOrder.customer?.phone || shippingAddress.phone || '',
        
        // Dirección de envío
        shipping_address: {
          address_line_1: shippingAddress.address || '',
          address_line_2: shippingAddress.address_2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postal_code: shippingAddress.zip || '',
          country: shippingAddress.country || 'CL',
          commune: shippingAddress.city || ''
        },
        
        // Productos y totales
        items,
        subtotal,
        shipping_cost,
        tax_amount,
        total_amount,
        currency: jumpsellerOrder.currency || 'CLP',
        
        // Fechas y estado
        order_date: new Date(jumpsellerOrder.created_at),
        status,
        payment_status: this.mapPaymentStatus(jumpsellerOrder.financial_status),
        
        // Metadatos
        channel_data: {
          jumpseller_id: jumpsellerOrder.id,
          jumpseller_token: jumpsellerOrder.token,
          jumpseller_status: jumpsellerOrder.status,
          financial_status: jumpsellerOrder.financial_status,
          fulfillment_status: jumpsellerOrder.fulfillment_status,
          notes: jumpsellerOrder.notes || '',
          created_at: jumpsellerOrder.created_at,
          updated_at: jumpsellerOrder.updated_at
        },
        
        created_at: new Date(),
        updated_at: new Date()
      });

      await newOrder.save();
      console.log(`✅ [Jumpseller] Pedido ${jumpsellerOrder.id} creado exitosamente`);
      
      return true;

    } catch (error) {
      console.error(`❌ [Jumpseller] Error creando pedido ${jumpsellerOrder.id}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza un pedido existente
   */
  static async updateExistingOrder(existingOrder, jumpsellerOrder) {
    try {
      const newStatus = this.mapJumpsellerStatus(jumpsellerOrder.status);
      const newPaymentStatus = this.mapPaymentStatus(jumpsellerOrder.financial_status);
      
      let updated = false;

      if (existingOrder.status !== newStatus) {
        existingOrder.status = newStatus;
        updated = true;
      }

      if (existingOrder.payment_status !== newPaymentStatus) {
        existingOrder.payment_status = newPaymentStatus;
        updated = true;
      }

      if (updated) {
        existingOrder.updated_at = new Date();
        await existingOrder.save();
        console.log(`🔄 [Jumpseller] Pedido ${jumpsellerOrder.id} actualizado`);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`❌ [Jumpseller] Error actualizando pedido ${jumpsellerOrder.id}:`, error);
      throw error;
    }
  }

  /**
   * Mapeo de estados
   */
  static mapJumpsellerStatus(jumpsellerStatus) {
    const statusMap = {
      'pending': 'pending',
      'processing': 'confirmed',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'completed': 'delivered'
    };

    return statusMap[jumpsellerStatus] || 'pending';
  }

  static mapPaymentStatus(financialStatus) {
    const paymentMap = {
      'pending': 'pending',
      'paid': 'paid',
      'partially_paid': 'partially_paid',
      'refunded': 'refunded',
      'voided': 'cancelled'
    };

    return paymentMap[financialStatus] || 'pending';
  }
}

module.exports = JumpsellerService;