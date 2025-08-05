// backend/src/services/jumpseller.service.js - VERSIÓN CORREGIDA

const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class JumpsellerService {
  static API_BASE_URL = 'https://api.jumpseller.com/v1';
  static OAUTH_BASE_URL = 'https://accounts.jumpseller.com/oauth';
  
  /**
   * ✅ CORREGIR: Genera URL de autorización OAuth2 para Jumpseller
   */
  static getAuthorizationUrl(channelId) {
    const clientId = process.env.JUMPSELLER_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL}/api/channels/jumpseller/callback`;
    
    console.log('🔍 [Jumpseller Auth] Variables de entorno:', {
      clientId: !!clientId,
      backendUrl: process.env.BACKEND_URL,
      redirectUri
    });
    
    if (!clientId) {
      throw new Error('JUMPSELLER_CLIENT_ID no configurado en variables de entorno');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read_orders read_products read_customers read_store write_orders',
      state: channelId // Pasar el ID del canal para identificarlo en el callback
    });

    const authUrl = `${this.OAUTH_BASE_URL}/authorize?${params.toString()}`;
    
    console.log('✅ [Jumpseller Auth] URL generada:', authUrl);
    
    return authUrl;
  }

  /**
   * ✅ CORREGIR: Intercambia código de autorización por tokens de acceso
   */
  static async exchangeCodeForTokens(code) {
    try {
      const clientId = process.env.JUMPSELLER_CLIENT_ID;
      const clientSecret = process.env.JUMPSELLER_CLIENT_SECRET;
      const redirectUri = `${process.env.BACKEND_URL}/api/channels/jumpseller/callback`;

      console.log('🔄 [Jumpseller OAuth] === DEBUGGING EXCHANGE ===');
      console.log('🔄 [Jumpseller OAuth] Code:', code?.substring(0, 10) + '...');
      console.log('🔄 [Jumpseller OAuth] Client ID:', clientId);
      console.log('🔄 [Jumpseller OAuth] Client Secret exists:', !!clientSecret);
      console.log('🔄 [Jumpseller OAuth] Redirect URI:', redirectUri);

      if (!clientId || !clientSecret) {
        throw new Error('JUMPSELLER_CLIENT_ID y JUMPSELLER_CLIENT_SECRET requeridos en variables de entorno');
      }

      const payload = {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      };

      console.log('🔄 [Jumpseller OAuth] Payload a enviar:', {
        ...payload,
        client_secret: '***',
        code: code?.substring(0, 10) + '...'
      });

      const response = await axios.post(`${this.OAUTH_BASE_URL}/token`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      console.log('✅ [Jumpseller OAuth] Response status:', response.status);
      console.log('✅ [Jumpseller OAuth] Tokens recibidos:', {
        access_token: !!response.data.access_token,
        refresh_token: !!response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope
      };

    } catch (error) {
      console.error('❌ [Jumpseller OAuth] ERROR COMPLETO:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Mejorar mensaje de error
      let errorMessage = 'Error desconocido en OAuth';
      if (error.response?.data?.error_description) {
        errorMessage = error.response.data.error_description;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(`Error en OAuth de Jumpseller: ${errorMessage}`);
    }
  }

  /**
   * ✅ MEJORAR: Renueva el token de acceso usando refresh token
   */
  static async refreshAccessToken(channel) {
    try {
      const clientId = process.env.JUMPSELLER_CLIENT_ID;
      const clientSecret = process.env.JUMPSELLER_CLIENT_SECRET;

      if (!channel.settings?.refresh_token) {
        throw new Error('No hay refresh token disponible para este canal');
      }

      console.log('🔄 [Jumpseller] Renovando token para canal:', channel._id);

      const response = await axios.post(`${this.OAUTH_BASE_URL}/token`, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: channel.settings.refresh_token
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      // Actualizar tokens en el canal
      channel.api_key = response.data.access_token;
      channel.settings = {
        ...channel.settings,
        refresh_token: response.data.refresh_token || channel.settings.refresh_token, // Mantener el anterior si no se proporciona uno nuevo
        expires_in: response.data.expires_in,
        token_updated_at: new Date()
      };
      
      await channel.save();
      
      console.log('✅ [Jumpseller] Token renovado exitosamente');
      return response.data.access_token;

    } catch (error) {
      console.error('❌ [Jumpseller] Error renovando token:', error.response?.data || error.message);
      throw new Error(`No se pudo renovar el token de acceso: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * ✅ MEJORAR: Obtiene token de acceso válido (renueva si es necesario)
   */
  static async getValidAccessToken(channel) {
    if (!channel.api_key) {
      throw new Error('Canal no tiene token de acceso. Requiere autorización OAuth.');
    }

    // Verificar si el token necesita renovación
    if (channel.settings?.expires_in && channel.settings?.token_updated_at) {
      const tokenAge = Date.now() - new Date(channel.settings.token_updated_at).getTime();
      const expiresIn = channel.settings.expires_in * 1000; // convertir a ms
      
      // Renovar si queda menos de 10 minutos (600000 ms)
      if (tokenAge > (expiresIn - 600000)) {
        console.log('⏰ [Jumpseller] Token próximo a expirar, renovando...');
        return await this.refreshAccessToken(channel);
      }
    }

    return channel.api_key;
  }

  /**
   * ✅ MEJORAR: Prueba la conexión con Jumpseller
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

      console.log('🔍 [Jumpseller] Probando conexión para canal:', channel._id);

      const accessToken = await this.getValidAccessToken(channel);

      // Obtener información de la tienda
      const response = await axios.get(`${this.API_BASE_URL}/store/info.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.store) {
        const store = response.data.store;
        
        console.log('✅ [Jumpseller] Información de tienda obtenida:', {
          id: store.id,
          name: store.name,
          url: store.url
        });
        
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
        message: 'Respuesta inesperada de Jumpseller API'
      };

    } catch (error) {
      console.error('❌ [Jumpseller] Error en testConnection:', error.response?.data || error.message);
      
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
      console.log(`📅 [Jumpseller] Filtrando desde: ${params.updated_since}`);
    }

    let totalImported = 0;
    let totalProcessed = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      console.log(`📄 [Jumpseller] Procesando página ${params.page}...`);
      
      try {
        const response = await axios.get(`${this.API_BASE_URL}/orders.json`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params,
          timeout: 15000
        });

        console.log(`📋 [Jumpseller] Respuesta de API - Status: ${response.status}`);
        console.log(`📋 [Jumpseller] Estructura de respuesta:`, Object.keys(response.data));
        console.log(`📋 [Jumpseller] Primer elemento:`, response.data[0] ? Object.keys(response.data[0]) : 'EMPTY');

        // ✅ CORRECCIÓN PRINCIPAL: La API de Jumpseller devuelve [{"order": {...}}]
        let orders = [];
        
        if (Array.isArray(response.data)) {
          // Extraer los objetos "order" de cada elemento
          orders = response.data.map(item => {
            if (item && typeof item === 'object' && item.order) {
              return item.order; // ✅ EXTRAER EL OBJETO 'order'
            }
            return item; // Si no tiene estructura order, usar directamente
          }).filter(order => order && typeof order === 'object');
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
          orders = response.data.orders;
        } else {
          console.warn(`⚠️ [Jumpseller] Estructura de respuesta inesperada:`, response.data);
          break;
        }

        console.log(`📊 [Jumpseller] Página ${params.page}: ${orders.length} pedidos encontrados`);
        
        // Log de estructura del primer pedido para debug
        if (orders.length > 0) {
          console.log(`🔍 [Jumpseller] Estructura del primer pedido:`, {
            id: orders[0].id,
            keys: Object.keys(orders[0]),
            hasCustomer: !!orders[0].customer,
            hasProducts: !!orders[0].products,
            status: orders[0].status
          });
        }
        
        if (orders.length === 0) {
          console.log(`📭 [Jumpseller] No más pedidos en página ${params.page}, finalizando`);
          hasMorePages = false;
          break;
        }

        // Procesar cada pedido con validación mejorada
        for (let i = 0; i < orders.length; i++) {
          const jumpsellerOrder = orders[i];
          totalProcessed++;
          
          try {
            // ✅ VALIDAR que el pedido tenga los campos mínimos requeridos
            if (!jumpsellerOrder || typeof jumpsellerOrder !== 'object') {
              console.warn(`⚠️ [Jumpseller] Pedido ${i} es inválido:`, jumpsellerOrder);
              continue;
            }

            if (!jumpsellerOrder.id) {
              console.warn(`⚠️ [Jumpseller] Pedido ${i} no tiene ID. Campos disponibles:`, Object.keys(jumpsellerOrder));
              continue;
            }

            console.log(`🔄 [Jumpseller] Procesando pedido ${jumpsellerOrder.id} (${i + 1}/${orders.length})`);
            
            const imported = await this.processOrder(jumpsellerOrder, channel);
            if (imported) {
              totalImported++;
              console.log(`✅ [Jumpseller] Pedido ${jumpsellerOrder.id} procesado exitosamente`);
            } else {
              console.log(`📝 [Jumpseller] Pedido ${jumpsellerOrder.id} ya existía (actualizado)`);
            }
            
          } catch (orderError) {
            console.error(`❌ [Jumpseller] Error procesando pedido ${jumpsellerOrder?.id || 'ID_UNDEFINED'}:`, {
              error: orderError.message,
              orderData: jumpsellerOrder ? Object.keys(jumpsellerOrder) : 'NULL_ORDER'
            });
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

        // Pequeña pausa entre páginas para no sobrecargar la API
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (pageError) {
        console.error(`❌ [Jumpseller] Error obteniendo página ${params.page}:`, pageError.message);
        break;
      }
    }

    console.log(`✅ [Jumpseller] Sincronización completada:`, {
      totalProcessed,
      totalImported,
      pagesProcessed: params.page - 1
    });
    
    return {
      success: true,
      imported: totalImported,
      orders_synced: totalImported,
      total_processed: totalProcessed,
      message: `${totalImported} de ${totalProcessed} pedidos sincronizados exitosamente`
    };

  } catch (error) {
    console.error('❌ [Jumpseller] Error general en sincronización:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw error;
  }
}


 static async processOrder(jumpsellerOrder, channel) {
  try {
    // ✅ VALIDACIONES MEJORADAS
    if (!jumpsellerOrder) {
      throw new Error('Pedido es null o undefined');
    }

    if (!jumpsellerOrder.id) {
      throw new Error(`Pedido no tiene ID. Campos disponibles: ${Object.keys(jumpsellerOrder).join(', ')}`);
    }

    const orderId = jumpsellerOrder.id.toString();
    
    console.log(`🔍 [Jumpseller] Procesando pedido ID: ${orderId}`);

    // Verificar si el pedido ya existe
    const existingOrder = await Order.findOne({
      external_order_id: orderId,
      channel_id: channel._id
    });

    if (existingOrder) {
      console.log(`📝 [Jumpseller] Pedido ${orderId} ya existe, verificando actualizaciones...`);
      return await this.updateExistingOrder(existingOrder, jumpsellerOrder);
    }

    console.log(`🆕 [Jumpseller] Creando nuevo pedido ${orderId}...`);
    return await this.createNewOrder(jumpsellerOrder, channel);

  } catch (error) {
    console.error(`❌ [Jumpseller] Error en processOrder:`, {
      orderId: jumpsellerOrder?.id || 'UNKNOWN',
      error: error.message,
      orderKeys: jumpsellerOrder ? Object.keys(jumpsellerOrder) : 'NULL_ORDER'
    });
    throw error;
  }
}

static async createNewOrder(jumpsellerOrder, channel) {
  try {
    console.log(`🆕 [Jumpseller] Creando pedido ${jumpsellerOrder.id} con datos:`, {
      id: jumpsellerOrder.id,
      status: jumpsellerOrder.status,
      total: jumpsellerOrder.total,
      customerEmail: jumpsellerOrder.customer?.email,
      productsCount: jumpsellerOrder.products?.length || 0
    });

    const status = this.mapJumpsellerStatus(jumpsellerOrder.status);
    
    // Procesar dirección de envío con validaciones
    const shippingAddress = jumpsellerOrder.shipping_address || {};
    
    // Crear items del pedido con validaciones
    const items = (jumpsellerOrder.products || []).map((product, index) => {
      if (!product) {
        console.warn(`⚠️ [Jumpseller] Producto ${index} es null/undefined`);
        return null;
      }
      
      return {
        product_id: product.id?.toString() || '',
        name: product.name || `Producto ${index + 1}`,
        sku: product.sku || '',
        quantity: parseInt(product.pivot?.quantity) || 1,
        price: parseFloat(product.pivot?.price) || 0,
        variant_title: product.pivot?.variant_name || null
      };
    }).filter(item => item !== null); // Filtrar items null

    // Calcular totales con validaciones
    const subtotal = parseFloat(jumpsellerOrder.subtotal) || 0;
    const shipping_cost = parseFloat(jumpsellerOrder.shipping) || 0;
    const tax_amount = parseFloat(jumpsellerOrder.tax) || 0;
    const total_amount = parseFloat(jumpsellerOrder.total) || subtotal + shipping_cost + tax_amount;

    // Validar customer
    const customer = jumpsellerOrder.customer || {};

    const newOrder = new Order({
      company_id: channel.company_id,
      channel_id: channel._id,
      external_order_id: jumpsellerOrder.id.toString(),
      order_number: jumpsellerOrder.token || jumpsellerOrder.id.toString(),
      
      // Información del cliente con validaciones
      customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente Sin Nombre',
      customer_email: customer.email || '',
      customer_phone: customer.phone || shippingAddress.phone || '',
      
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
      order_date: jumpsellerOrder.created_at ? new Date(jumpsellerOrder.created_at) : new Date(),
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
    console.error(`❌ [Jumpseller] Error creando pedido ${jumpsellerOrder.id}:`, {
      error: error.message,
      stack: error.stack,
      orderData: {
        id: jumpsellerOrder.id,
        status: jumpsellerOrder.status,
        customer: !!jumpsellerOrder.customer,
        products: jumpsellerOrder.products?.length || 0
      }
    });
    throw error;
  }
}

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