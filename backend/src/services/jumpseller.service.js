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
    console.log(`🆕 [Jumpseller] === DEBUGGING PEDIDO ${jumpsellerOrder.id} ===`);
    console.log(`🔍 [Jumpseller] Estructura del pedido completa:`, {
      mainKeys: Object.keys(jumpsellerOrder),
      customerExists: !!jumpsellerOrder.customer,
      shippingAddressExists: !!jumpsellerOrder.shipping_address,
      billingAddressExists: !!jumpsellerOrder.billing_address,
      customerKeys: jumpsellerOrder.customer ? Object.keys(jumpsellerOrder.customer) : 'NO_CUSTOMER',
      shippingKeys: jumpsellerOrder.shipping_address ? Object.keys(jumpsellerOrder.shipping_address) : 'NO_SHIPPING',
      billingKeys: jumpsellerOrder.billing_address ? Object.keys(jumpsellerOrder.billing_address) : 'NO_BILLING'
    });

    const status = this.mapJumpsellerStatus(jumpsellerOrder.status);
    const paymentStatus = this.mapPaymentStatus(
      jumpsellerOrder.payment_method_type, 
      jumpsellerOrder.status
    );
    const paymentMethod = this.mapPaymentMethod(jumpsellerOrder.payment_method_name);

    // ✅ PROCESAMIENTO CORRECTO DE DIRECCIÓN (ya funcionando)
    const shippingAddress = jumpsellerOrder.shipping_address || {};
    let formattedAddress = '';
    
    if (typeof shippingAddress === 'string') {
      formattedAddress = shippingAddress;
    } else if (typeof shippingAddress === 'object' && shippingAddress !== null) {
      const parts = [];
      if (shippingAddress.address) parts.push(shippingAddress.address);
      if (shippingAddress.address_2) parts.push(shippingAddress.address_2);
      if (shippingAddress.city) parts.push(shippingAddress.city);
      if (shippingAddress.state) parts.push(shippingAddress.state);
      if (shippingAddress.country) parts.push(shippingAddress.country);
      
      formattedAddress = parts.join(', ') || 'Dirección no especificada';
    } else {
      formattedAddress = 'Dirección no especificada';
    }
    
    // ✅ OBTENER DATOS DE TODAS LAS FUENTES POSIBLES
    const customer = jumpsellerOrder.customer || {};
    const shippingAddr = jumpsellerOrder.shipping_address || {};
    const billingAddr = jumpsellerOrder.billing_address || {};
    
    console.log(`🔍 [Jumpseller] Datos disponibles para nombre:`, {
      'customer.first_name': customer.first_name,
      'customer.last_name': customer.last_name,
      'customer.name': customer.name,
      'customer.email': customer.email,
      'shipping_address.name': shippingAddr.name,           // ✅ SEGÚN DOCUMENTACIÓN
      'shipping_address.surname': shippingAddr.surname,     // ✅ SEGÚN DOCUMENTACIÓN
      'billing_address.name': billingAddr.name,             // ✅ SEGÚN DOCUMENTACIÓN  
      'billing_address.surname': billingAddr.surname        // ✅ SEGÚN DOCUMENTACIÓN
    });
    
    // ✅ BUSCAR NOMBRE SEGÚN ESTRUCTURA REAL DE JUMPSELLER
    let customerName = '';
    
    // Opción 1: Shipping address (MÁS COMÚN - según documentación)
    if (shippingAddr.name || shippingAddr.surname) {
      const firstName = shippingAddr.name || '';
      const lastName = shippingAddr.surname || '';
      customerName = `${firstName} ${lastName}`.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en shipping_address: "${customerName}"`);
    }
    
    // Opción 2: Billing address (si no hay en shipping)
    if (!customerName && (billingAddr.name || billingAddr.surname)) {
      const firstName = billingAddr.name || '';
      const lastName = billingAddr.surname || '';
      customerName = `${firstName} ${lastName}`.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en billing_address: "${customerName}"`);
    }
    
    // Opción 3: Customer object - first_name/last_name (formato tradicional)
    if (!customerName && (customer.first_name || customer.last_name)) {
      customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en customer (first/last): "${customerName}"`);
    }
    
    // Opción 4: Customer object - campo 'name' directo
    if (!customerName && customer.name) {
      customerName = customer.name.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en customer.name: "${customerName}"`);
    }
    
    // Opción 5: Customer object - full_name
    if (!customerName && customer.full_name) {
      customerName = customer.full_name.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en customer.full_name: "${customerName}"`);
    }
    
    // Opción 6: Buscar en shipping_address otros campos posibles
    if (!customerName && shippingAddr.full_name) {
      customerName = shippingAddr.full_name.trim();
      console.log(`✅ [Jumpseller] Nombre encontrado en shipping_address.full_name: "${customerName}"`);
    }
    
    // Opción 7: Email como fallback (antes de "Sin Nombre")
    if (!customerName && customer.email) {
      customerName = customer.email.split('@')[0];
      console.log(`✅ [Jumpseller] Usando email como nombre: "${customerName}"`);
    }
    
    // Fallback final
    if (!customerName) {
      customerName = 'Cliente Sin Nombre';
      console.log(`⚠️ [Jumpseller] No se encontró nombre, usando fallback: "${customerName}"`);
    }
    
    console.log(`✅ [Jumpseller] Nombre final del cliente: "${customerName}"`);
    
    // ✅ PROCESAMIENTO MEJORADO DE EMAIL Y TELÉFONO
    let customerEmail = '';
    let customerPhone = '';
    
    // Email: intentar múltiples fuentes
    customerEmail = customer.email || 
                   shippingAddr.email ||
                   billingAddr.email ||
                   customer.billing_email || 
                   customer.shipping_email || 
                   '';
    
    // Teléfono: intentar múltiples fuentes  
    customerPhone = customer.phone || 
                   shippingAddr.phone ||
                   billingAddr.phone ||
                   customer.billing_phone || 
                   customer.shipping_phone || 
                   customer.mobile || 
                   '';
    
    console.log(`📞 [Jumpseller] Contacto del cliente:`, {
      email: customerEmail,
      phone: customerPhone
    });
    
    // Procesar items (sin cambios)
    const items = (jumpsellerOrder.products || []).map((product, index) => {
      if (!product) return null;
      
      return {
        product_id: product.id?.toString() || '',
        name: product.name || `Producto ${index + 1}`,
        sku: product.sku || '',
        quantity: parseInt(product.pivot?.quantity) || 1,
        price: parseFloat(product.pivot?.price) || 0,
        variant_title: product.pivot?.variant_name || null
      };
    }).filter(item => item !== null);

    // Calcular totales (sin cambios)
    const subtotal = parseFloat(jumpsellerOrder.subtotal) || 0;
    const shipping_cost = parseFloat(jumpsellerOrder.shipping) || 0;
    const tax_amount = parseFloat(jumpsellerOrder.tax) || 0;
    const total_amount = parseFloat(jumpsellerOrder.total) || subtotal + shipping_cost + tax_amount;

    // ✅ CREAR OBJETO CON DATOS CORREGIDOS
    const orderData = {
      company_id: channel.company_id,
      channel_id: channel._id,
      external_order_id: jumpsellerOrder.id.toString(),
      order_number: jumpsellerOrder.token || jumpsellerOrder.id.toString(),
      
      // ✅ CLIENTE CON DATOS CORREGIDOS
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      
      // Dirección (ya funcionando)
      shipping_address: String(formattedAddress),
      shipping_city: String(shippingAddr.city || ''),
      shipping_state: String(shippingAddr.state || shippingAddr.region || ''),
      shipping_zip: String(shippingAddr.zip || shippingAddr.postal_code || shippingAddr.postal || ''),
      shipping_commune: String(shippingAddr.city || shippingAddr.commune || ''),
      
      // Totales
      total_amount: total_amount,
      shipping_cost: shipping_cost,
      tax_amount: tax_amount,
      
      // Items
      items_count: items.length,
      
      // ✅ ESTADOS MEJORADOS
      status: status,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      
      // Fechas
      order_date: jumpsellerOrder.created_at ? new Date(jumpsellerOrder.created_at) : new Date(),
      
      // ✅ INFORMACIÓN ADICIONAL
      notes: String(jumpsellerOrder.additional_information || jumpsellerOrder.notes || ''),
      payment_information: String(jumpsellerOrder.payment_information || ''),
      
      // Raw data para debugging
      raw_data: {
        original_customer: customer,
        original_shipping_address: shippingAddr,
        original_billing_address: billingAddr,
        original_order: {
          id: jumpsellerOrder.id,
          status: jumpsellerOrder.status,
          total: jumpsellerOrder.total,
          payment_method_name: jumpsellerOrder.payment_method_name,
          payment_method_type: jumpsellerOrder.payment_method_type
        },
        processed_at: new Date()
      },
      
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log(`💾 [Jumpseller] Datos finales del pedido:`, {
      external_order_id: orderData.external_order_id,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      shipping_address: orderData.shipping_address.substring(0, 50) + '...',
      total_amount: orderData.total_amount,
      items_count: orderData.items_count,
      status: orderData.status,
      payment_status: orderData.payment_status,
      payment_method: orderData.payment_method
    });

    // Crear y guardar el pedido
    const newOrder = new Order(orderData);
    await newOrder.save();
    
    console.log(`✅ [Jumpseller] Pedido ${jumpsellerOrder.id} creado exitosamente con cliente: "${customerName}"`);
    return true;

  } catch (error) {
    console.error(`❌ [Jumpseller] Error creando pedido ${jumpsellerOrder.id}:`, {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
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
  // Estados válidos en tu modelo Order:
  // ['pending', 'ready_for_pickup', 'out_for_delivery', 'warehouse_received', 'invoiced', 'shipped', 'delivered', 'cancelled', 'facturado']
  
  const statusMap = {
    // Estados de Jumpseller → Estados de tu modelo
    'Pending Payment': 'pending',           // ✅ Estado real de Jumpseller
    'Paid': 'ready_for_pickup',            // ✅ Cambio: usar ready_for_pickup en lugar de confirmed
    'Processing': 'ready_for_pickup',       // ✅ Cambio: usar ready_for_pickup
    'Shipped': 'shipped',                   // ✅ Mantener
    'Delivered': 'delivered',               // ✅ Mantener
    'Cancelled': 'cancelled',               // ✅ Mantener
    'Canceled': 'cancelled',                // Variante en inglés US
    'Refunded': 'cancelled',                // ✅ Mantener
    'Completed': 'delivered',               // ✅ Mantener
    
    // Estados adicionales en minúsculas
    'pending': 'pending',
    'pending payment': 'pending',
    'paid': 'ready_for_pickup',             // ✅ Cambio
    'processing': 'ready_for_pickup',       // ✅ Cambio
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'refunded': 'cancelled',
    'completed': 'delivered',
    
    // Estados específicos de fulfillment que podrían aparecer
    'ready_to_ship': 'ready_for_pickup',
    'in_transit': 'shipped',
    'out_for_delivery': 'out_for_delivery',
    'fulfilled': 'delivered'
  };

  // Normalizar el estado de entrada
  const normalizedStatus = jumpsellerStatus?.toString().trim() || 'pending';
  
  // Buscar mapeo exacto primero
  let mappedStatus = statusMap[normalizedStatus];
  
  // Si no hay mapeo exacto, buscar por coincidencia en minúsculas
  if (!mappedStatus) {
    const lowerStatus = normalizedStatus.toLowerCase();
    mappedStatus = statusMap[lowerStatus];
  }
  
  // Fallback final
  if (!mappedStatus) {
    mappedStatus = 'pending';
  }
  
  console.log(`🔄 [Jumpseller] Mapeo de estado: "${jumpsellerStatus}" → "${mappedStatus}"`);
  
  return mappedStatus;
}
  
static mapPaymentStatus(paymentMethodType, orderStatus) {
  // Estados de pago simples
  const paymentStatusMap = {
    'pending': 'pending',
    'paid': 'paid',
    'partially_paid': 'partially_paid',
    'refunded': 'refunded',
    'cancelled': 'cancelled'
  };
  
  // Si el pedido está pagado según el estado general
  if (orderStatus === 'Paid' || orderStatus === 'paid' || orderStatus === 'Processing' || orderStatus === 'processing') {
    return 'paid';
  }
  
  // Si el pedido está cancelado o reembolsado
  if (orderStatus === 'Cancelled' || orderStatus === 'Canceled' || orderStatus === 'Refunded' || 
      orderStatus === 'cancelled' || orderStatus === 'canceled' || orderStatus === 'refunded') {
    return 'cancelled';
  }
  
  // Para métodos de pago automáticos, considerar como pagado si no está cancelado
  if (paymentMethodType === 'gateway' || paymentMethodType === 'credit_card' || 
      paymentMethodType === 'paypal' || paymentMethodType === 'webpay') {
    return 'paid';
  }
  
  // Por defecto, pendiente
  return 'pending';
}
static mapPaymentMethod(paymentMethodName) {
  if (!paymentMethodName) return 'credit_card';
  
  const methodName = paymentMethodName.toLowerCase().trim();
  
  const methodMap = {
    // Métodos en efectivo
    'cash collection': 'cash',
    'efectivo': 'cash',
    'cash': 'cash',
    'contra entrega': 'cash',
    
    // Métodos chilenos
    'webpay': 'webpay',
    'webpay plus': 'webpay',
    'transbank': 'webpay',
    'khipu': 'khipu',
    
    // Métodos internacionales
    'paypal': 'paypal',
    'mercado pago': 'mercadopago',
    'mercadopago': 'mercadopago',
    
    // Transferencias
    'transferencia': 'bank_transfer',
    'bank transfer': 'bank_transfer',
    'wire transfer': 'bank_transfer',
    
    // Tarjetas (fallback)
    'tarjeta': 'credit_card',
    'credit card': 'credit_card',
    'visa': 'credit_card',
    'mastercard': 'credit_card',
    'debit': 'debit_card',
    'debit card': 'debit_card'
  };
  
  // Buscar coincidencias exactas primero
  if (methodMap[methodName]) {
    return methodMap[methodName];
  }
  
  // Buscar coincidencias parciales
  for (const [key, value] of Object.entries(methodMap)) {
    if (methodName.includes(key) || key.includes(methodName)) {
      return value;
    }
  }
  
  console.log(`⚠️ [Jumpseller] Método de pago no reconocido: "${paymentMethodName}", usando credit_card`);
  return 'credit_card'; // Fallback
}
static validateOrderStatus(status) {
  const validStatuses = [
    'pending', 'ready_for_pickup', 'out_for_delivery', 'warehouse_received', 
    'invoiced', 'shipped', 'delivered', 'cancelled', 'facturado'
  ];
  
  if (!validStatuses.includes(status)) {
    console.error(`❌ [Jumpseller] Estado inválido: "${status}". Estados válidos:`, validStatuses);
    return 'pending'; // Fallback seguro
  }
  
  return status;
}
}

module.exports = JumpsellerService;