// backend/src/services/jumpseller.service.js - Versión OAuth2
const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class JumpsellerService {
  static API_BASE_URL = 'https://api.jumpseller.com/v1';
  static OAUTH_BASE_URL = 'https://accounts.jumpseller.com/oauth';
  
  /**
   * Genera URL de autorización OAuth2 para Jumpseller
   */
  static getAuthorizationUrl(channelId, redirectUri = null) {
    const clientId = process.env.JUMPSELLER_CLIENT_ID;
    const defaultRedirectUri = `${process.env.FRONTEND_URL}/integrations/jumpseller/callback`;
    
    if (!clientId) {
      throw new Error('JUMPSELLER_CLIENT_ID no configurado en variables de entorno');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri || defaultRedirectUri,
      response_type: 'code',
      scope: 'read_orders read_products read_customers read_store write_orders',
      state: channelId // Pasar el ID del canal para identificarlo en el callback
    });

    return `${this.OAUTH_BASE_URL}/authorize?${params.toString()}`;
  }

  /**
   * Intercambia código de autorización por tokens de acceso
   */
  static async exchangeCodeForTokens(code, redirectUri = null) {
    try {
      const clientId = process.env.JUMPSELLER_CLIENT_ID;
      const clientSecret = process.env.JUMPSELLER_CLIENT_SECRET;
      const defaultRedirectUri = `${process.env.FRONTEND_URL}/integrations/jumpseller/callback`;

      if (!clientId || !clientSecret) {
        throw new Error('JUMPSELLER_CLIENT_ID y JUMPSELLER_CLIENT_SECRET requeridos');
      }

      const response = await axios.post(`${this.OAUTH_BASE_URL}/token`, {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri || defaultRedirectUri
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope
      };

    } catch (error) {
      console.error('[Jumpseller OAuth] Error intercambiando código:', error.response?.data || error.message);
      throw new Error(`Error en OAuth: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Renueva el token de acceso usando refresh token
   */
  static async refreshAccessToken(channel) {
    try {
      const clientId = process.env.JUMPSELLER_CLIENT_ID;
      const clientSecret = process.env.JUMPSELLER_CLIENT_SECRET;

      if (!channel.settings?.refresh_token) {
        throw new Error('No hay refresh token disponible');
      }

      const response = await axios.post(`${this.OAUTH_BASE_URL}/token`, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: channel.settings.refresh_token
      });

      // Actualizar tokens en el canal
      channel.api_key = response.data.access_token;
      channel.settings = {
        ...channel.settings,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_updated_at: new Date()
      };
      
      await channel.save();
      return response.data.access_token;

    } catch (error) {
      console.error('[Jumpseller] Error renovando token:', error.response?.data || error.message);
      throw new Error('No se pudo renovar el token de acceso');
    }
  }

  /**
   * Obtiene token de acceso válido (renueva si es necesario)
   */
  static async getValidAccessToken(channel) {
    if (!channel.api_key) {
      throw new Error('Canal no tiene token de acceso. Requiere autorización OAuth.');
    }

    // Verificar si el token necesita renovación
    if (channel.settings?.expires_in && channel.settings?.token_updated_at) {
      const tokenAge = Date.now() - new Date(channel.settings.token_updated_at).getTime();
      const expiresIn = channel.settings.expires_in * 1000; // convertir a ms
      
      // Renovar si queda menos de 10 minutos
      if (tokenAge > (expiresIn - 600000)) {
        console.log('[Jumpseller] Token próximo a expirar, renovando...');
        return await this.refreshAccessToken(channel);
      }
    }

    return channel.api_key;
  }

  /**
   * Prueba la conexión con Jumpseller
   */
  static async testConnection(channel) {
    try {
      if (!channel.api_key) {
        return {
          success: false,
          message: 'Canal requiere autorización OAuth2. Haz clic en "Autorizar" para conectar.',
          requires_auth: true
        };
      }

      const accessToken = await this.getValidAccessToken(channel);

      // Obtener información de la tienda
      const response = await axios.get(`${this.API_BASE_URL}/store/info.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.store) {
        const store = response.data.store;
        
        // Actualizar información de la tienda
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
      console.error('[Jumpseller] Error en testConnection:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Token de acceso inválido o expirado. Requiere nueva autorización.',
          requires_auth: true
        };
      }

      return {
        success: false,
        message: `Error de conexión: ${error.response?.data?.error || error.message}`
      };
    }
  }

  /**
   * Sincroniza pedidos desde Jumpseller
   */
  static async syncOrders(channel, dateFrom, dateTo) {
    try {
      console.log(`🔄 [Jumpseller] Iniciando sincronización para canal: ${channel.channel_name}`);
      
      const accessToken = await this.getValidAccessToken(channel);

      // Parámetros de consulta
      const params = {
        limit: 50,
        page: 1
      };

      // Agregar filtros de fecha si se proporcionan
      if (dateFrom) {
        params.updated_since = new Date(dateFrom).toISOString();
      }

      let totalImported = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`📄 [Jumpseller] Procesando página ${params.page}...`);
        
        const response = await axios.get(`${this.API_BASE_URL}/orders.json`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params
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
        hasMorePages = orders.length === params.limit;
        params.page++;
        
        // Prevenir bucles infinitos
        if (params.page > 100) {
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
  static getAuthorizationUrl(channelId, redirectUri = null) {
  const clientId = process.env.JUMPSELLER_CLIENT_ID;
  const defaultRedirectUri = `${process.env.BACKEND_URL}/api/channels/jumpseller/callback`;
  
  if (!clientId) {
    throw new Error('JUMPSELLER_CLIENT_ID no configurado en variables de entorno');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri || defaultRedirectUri,
    response_type: 'code',
    scope: 'read_orders read_products read_customers read_store write_orders',
    state: channelId
  });

  return `https://accounts.jumpseller.com/oauth/authorize?${params.toString()}`;
}

static async exchangeCodeForTokens(code, redirectUri = null) {
  try {
    const clientId = process.env.JUMPSELLER_CLIENT_ID;
    const clientSecret = process.env.JUMPSELLER_CLIENT_SECRET;
    const defaultRedirectUri = `${process.env.BACKEND_URL}/api/channels/jumpseller/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('JUMPSELLER_CLIENT_ID y JUMPSELLER_CLIENT_SECRET requeridos');
    }

    const response = await axios.post('https://accounts.jumpseller.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri || defaultRedirectUri
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      scope: response.data.scope
    };

  } catch (error) {
    console.error('[Jumpseller OAuth] Error intercambiando código:', error.response?.data || error.message);
    throw new Error(`Error en OAuth: ${error.response?.data?.error_description || error.message}`);
  }
}
}

module.exports = JumpsellerService;