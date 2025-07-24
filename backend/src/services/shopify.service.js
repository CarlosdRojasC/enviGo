const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const Company = require('../models/Company');
const mongoose = require('mongoose');
const ShipdayService = require('./shipday.service');

class ShopifyService {
  // Construir URL base de la API
  static getApiUrl(channel) {
    return `https://${channel.store_url.replace('https://', '').replace('http://', '')}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-01'}`;
  }
  
  // Construir headers de autenticación
  static getHeaders(channel) {
    return {
      'X-Shopify-Access-Token': channel.api_key || channel.api_secret,
      'Content-Type': 'application/json'
    };
  }

  // 🏘️ NUEVA FUNCIÓN: Normalizar nombre de comuna
  static normalizeCommune(commune) {
    if (!commune) return '';
    
    // Limpiar y normalizar
    let normalized = commune.trim();
    
    // Mapeo de variaciones comunes de nombres de comunas que manejas
    const communeMap = {
      // Macul
      'macul': 'Macul',
      
      // San Miguel
      'san miguel': 'San Miguel',
      'sanmiguel': 'San Miguel',
      
      // Santiago Centro
      'santiago centro': 'Santiago Centro',
      'santiago': 'Santiago Centro',
      'centro': 'Santiago Centro',
      'stgo centro': 'Santiago Centro',
      'stgo': 'Santiago Centro',
      
      // La Florida
      'la florida': 'La Florida',
      'florida': 'La Florida',
      'laflorida': 'La Florida',
      
      // Peñalolén
      'penalolen': 'Peñalolén',
      'peñalolen': 'Peñalolén',
      'penalolén': 'Peñalolén',
      'peñalolén': 'Peñalolén',
      
      // Las Condes
      'las condes': 'Las Condes',
      'las conde': 'Las Condes',
      'conde': 'Las Condes',
      'condes': 'Las Condes',
      
      // Vitacura
      'vitacura': 'Vitacura',
      'vita': 'Vitacura',
      
      // Quinta Normal
      'quinta normal': 'Quinta Normal',
      'quintanormal': 'Quinta Normal',
      '5ta normal': 'Quinta Normal',
      
      // Independencia
      'independencia': 'Independencia',
      'indep': 'Independencia',
      
      // Recoleta
      'recoleta': 'Recoleta',
      
      // Huechuraba
      'huechuraba': 'Huechuraba',
      
      // Quilicura
      'quilicura': 'Quilicura',
      
      // Estación Central
      'estacion central': 'Estación Central',
      'estación central': 'Estación Central',
      'estacioncentral': 'Estación Central',
      
      // Ñuñoa
      'nunoa': 'Ñuñoa',
      'ñunoa': 'Ñuñoa',
      'noa': 'Ñuñoa',
      
      // La Reina
      'la reina': 'La Reina',
      'reina': 'La Reina',
      'lareina': 'La Reina',
      
      // San Joaquín
      'san joaquin': 'San Joaquín',
      'sanjoaquin': 'San Joaquín',
      'san joaquín': 'San Joaquín',
      
      // Pedro Aguirre Cerda
      'pedro aguirre cerda': 'Pedro Aguirre Cerda',
      'pedroaguirrecerda': 'Pedro Aguirre Cerda',
      'pac': 'Pedro Aguirre Cerda',
      
      // Cerrillos
      'cerrillos': 'Cerrillos',
      
      // Renca
      'renca': 'Renca',
      
      // La Granja
      'la granja': 'La Granja',
      'granja': 'La Granja',
      'lagranja': 'La Granja',
      
      // La Cisterna
      'la cisterna': 'La Cisterna',
      'cisterna': 'La Cisterna',
      'lacisterna': 'La Cisterna',
      
      // San Ramón
      'san ramon': 'San Ramón',
      'sanramon': 'San Ramón',
      'san ramón': 'San Ramón',
      
      // Cerro Navia
      'cerro navia': 'Cerro Navia',
      'cerronavia': 'Cerro Navia'
    };
    
    const lowerNormalized = normalized.toLowerCase();
    return communeMap[lowerNormalized] || normalized;
  }

  static validateShippingAddress(shopifyOrder) {
  const errors = [];
  
  // Verificar que exista al menos una dirección
  if (!shopifyOrder.shipping_address && !shopifyOrder.billing_address) {
    errors.push('Pedido sin dirección de envío ni facturación');
    return { isValid: false, errors };
  }
  
  // Priorizar shipping_address, luego billing_address
  const address = shopifyOrder.shipping_address || shopifyOrder.billing_address;
  
  // Validar campos críticos de dirección
  if (!address.address1 || address.address1.trim().length < 10) {
    errors.push('Dirección muy corta o faltante (mínimo 10 caracteres)');
  }
  
  if (!address.city || address.city.trim().length < 3) {
    errors.push('Comuna/Ciudad faltante o inválida');
  }
  
  // Validar que sea de Chile (opcional pero recomendado)
  if (address.country && address.country.toLowerCase() !== 'chile' && address.country.toLowerCase() !== 'cl') {
    errors.push('Solo se procesan pedidos de Chile');
  }
  
  // Validar información del destinatario
  if (!address.first_name && !address.last_name && !address.name) {
    errors.push('Nombre del destinatario faltante');
  }
  
  if (!address.phone || address.phone.trim().length < 8) {
    errors.push('Teléfono del destinatario faltante o inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    address
  };
}

  // 🏘️ NUEVA FUNCIÓN: Validar si comuna está permitida
  static isCommuneAllowed(orderCommune, allowedCommunes) {
    if (!allowedCommunes || allowedCommunes.length === 0) {
      return true; // Si no hay restricciones, permitir todas
    }
    
    if (!orderCommune) {
      return false; // Si no hay comuna en el pedido, rechazar
    }
    
    const normalizedOrderCommune = this.normalizeCommune(orderCommune).toLowerCase();
    
    return allowedCommunes.some(allowedCommune => 
      this.normalizeCommune(allowedCommune).toLowerCase() === normalizedOrderCommune
    );
  }
  
  // Procesar webhook de Shopify
  static async processWebhook(channelId, webhookData) {
    try {
      console.log('🛍️ Procesando webhook de Shopify para canal:', channelId);
      
      // 1. Buscar información del canal
      const channel = await Channel.findById(channelId).populate('company_id');
      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }
      
      // 🏘️ NUEVA LÓGICA: Filtrar por comunas permitidas
      const allowedCommunes = channel.accepted_communes || [];
      const orderCommune = webhookData.shipping_address?.city || webhookData.billing_address?.city || '';
      
      if (!this.isCommuneAllowed(orderCommune, allowedCommunes)) {
        console.log(`🚫 Pedido #${webhookData.name} rechazado. Comuna "${orderCommune}" no está permitida para el canal "${channel.channel_name}".`);
        console.log(`📋 Comunas permitidas: ${allowedCommunes.join(', ')}`);
        return { success: true, message: 'Pedido rechazado por filtro de comuna' };
      }
      
      console.log(`✅ Pedido #${webhookData.name} aceptado. Comuna "${orderCommune}" está permitida.`);
      
      // 2. Crear el pedido en la base de datos
      const order = await this.createOrderFromWebhook(channel, webhookData);
      
      // 3. Opcional: Crear automáticamente en Shipday si está configurado
      if (channel.auto_create_shipday && order.status === 'processing') {
        try {
          await ShipdayService.createOrder(order._id);
          console.log('✅ Pedido creado automáticamente en Shipday');
        } catch (shipdayError) {
          console.error('⚠️ Error al crear pedido en Shipday:', shipdayError);
          // No detener el proceso por errores de Shipday
        }
      }
      
      return order;
    } catch (error) {
      console.error('❌ Error procesando webhook de Shopify:', error);
      throw error;
    }
  }
  
  // Crear pedido desde webhook
  static async createOrderFromWebhook(channel, shopifyOrder) {
  try {
    console.log(`🔍 Validando pedido ${shopifyOrder.name} antes de crear...`);
    
    // NUEVA VALIDACIÓN: Verificar dirección ANTES de procesar
    const addressValidation = this.validateShippingAddress(shopifyOrder);
    
    if (!addressValidation.isValid) {
      console.log(`🚫 Pedido ${shopifyOrder.name} RECHAZADO por dirección inválida:`);
      addressValidation.errors.forEach(error => console.log(`   - ${error}`));
      
      // Opcional: Registrar el rechazo para estadísticas
      await this.logRejectedOrder(shopifyOrder, channel._id, addressValidation.errors);
      
      return null; // No crear el pedido
    }
    
    // Verificar si el pedido ya existe
    const existingOrder = await Order.findOne({
      channel_id: channel._id,
      external_order_id: shopifyOrder.id.toString()
    });
    
    if (existingOrder) {
      console.log('🔄 Actualizando pedido existente:', shopifyOrder.name);
      return await this.updateExistingOrder(existingOrder, shopifyOrder);
    }
    
    console.log(`✅ Pedido ${shopifyOrder.name} pasó validación, creando...`);
    
    // Obtener información de la empresa para pricing
    const company = await Company.findById(channel.company_id);
    const fixedShippingCost = company?.price_per_order || 0;
    
    // Usar la dirección validada
    const validatedAddress = addressValidation.address;
    
    // Crear nuevo pedido
    const newOrder = new Order({
      company_id: channel.company_id,
      channel_id: channel._id,
      external_order_id: shopifyOrder.id.toString(),
      order_number: shopifyOrder.name,
      
      // Información del cliente (mejorada con datos de dirección validada)
      customer_name: this.getCustomerName(shopifyOrder, validatedAddress),
      customer_email: shopifyOrder.email || shopifyOrder.customer?.email || '',
      customer_phone: validatedAddress.phone || shopifyOrder.phone || shopifyOrder.customer?.phone || '',

      delivery_type: (shopifyOrder.shipping_lines && shopifyOrder.shipping_lines.length > 0) ? 'shipping' : 'pickup',

      // Dirección validada
      shipping_address: this.formatValidatedAddress(validatedAddress),
      shipping_commune: this.normalizeCommune(validatedAddress.city),
      shipping_state: validatedAddress.province || validatedAddress.province_code || 'Región Metropolitana',
      shipping_zip: validatedAddress.zip,
      
      // Información financiera
      total_amount: parseFloat(shopifyOrder.total_price) || 0,
      shipping_cost: fixedShippingCost,
      currency: shopifyOrder.currency,
      
      // Estado y fechas
      status: this.mapOrderStatus(shopifyOrder),
      order_date: new Date(shopifyOrder.created_at),
      
      // Items del pedido
      items: this.mapOrderItems(shopifyOrder.line_items),
      items_count: shopifyOrder.line_items?.length || 0,
      
      // Datos adicionales
      notes: shopifyOrder.note,
      raw_data: shopifyOrder,
      
      // Metadatos
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const savedOrder = await newOrder.save();
    console.log(`✅ Pedido creado: ${savedOrder.order_number} - Comuna: ${savedOrder.shipping_commune}`);
    
    return savedOrder;
    
  } catch (error) {
    console.error('❌ Error creando pedido desde webhook:', error);
    throw error;
  }
}
  static async notifyOrderEnRoute(channel, order, trackingUrl) {
  try {
    console.log(`🚗 Notificando a Shopify que repartidor va en camino para pedido #${order.order_number}`);
    
    const shopifyOrderId = order.external_order_id;
    
    // Crear fulfillment (esto notifica al cliente)
    const fulfillmentData = {
      tracking_number: order.order_number,
      tracking_company: 'enviGo',
      notify_customer: true, // ✅ Esto envía email al cliente
      tracking_urls: trackingUrl ? [trackingUrl] : []
    };
    
    const response = await axios.post(
      `${this.getApiUrl(channel)}/orders/${shopifyOrderId}/fulfillments.json`,
      { fulfillment: fulfillmentData },
      { headers: this.getHeaders(channel) }
    );
    
    console.log('✅ Shopify notificado: repartidor en camino');
    return { success: true, fulfillment_id: response.data.fulfillment.id };
    
  } catch (error) {
    console.error('❌ Error notificando Shopify:', error);
    
    if (error.response?.status === 422) {
      console.log('⚠️ Fulfillment ya existe - actualizando tracking');
      // Intentar actualizar fulfillment existente
      return await this.updateExistingFulfillment(channel, shopifyOrderId, trackingUrl);
    }
    
    throw error;
  }
}

// Función auxiliar para actualizar fulfillment existente
static async updateExistingFulfillment(channel, shopifyOrderId, trackingUrl) {
  try {
    // Obtener fulfillments existentes
    const response = await axios.get(
      `${this.getApiUrl(channel)}/orders/${shopifyOrderId}/fulfillments.json`,
      { headers: this.getHeaders(channel) }
    );
    
    const fulfillments = response.data.fulfillments;
    if (fulfillments.length > 0) {
      const fulfillmentId = fulfillments[0].id;
      
      // Actualizar el fulfillment con tracking
      await axios.put(
        `${this.getApiUrl(channel)}/orders/${shopifyOrderId}/fulfillments/${fulfillmentId}.json`,
        {
          fulfillment: {
            tracking_urls: trackingUrl ? [trackingUrl] : [],
            notify_customer: true
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      console.log('✅ Fulfillment existente actualizado con tracking');
      return { success: true };
    }
    
  } catch (error) {
    console.error('❌ Error actualizando fulfillment existente:', error);
    return { success: false };
  }
}
  
  // Actualizar pedido existente
  static async updateExistingOrder(existingOrder, shopifyOrder) {
    try {
      // Obtener información de la empresa para pricing
      const company = await Company.findById(existingOrder.company_id);
      const fixedShippingCost = company?.price_per_order || 0;
      
      const updates = {
        status: this.mapOrderStatus(shopifyOrder),
        total_amount: parseFloat(shopifyOrder.total_price) || 0,
        shipping_cost: fixedShippingCost,
        // 🏘️ NUEVA LÓGICA: Actualizar comuna
        shipping_commune: this.normalizeCommune(shopifyOrder.shipping_address?.city || shopifyOrder.billing_address?.city || ''),
        shipping_state: shopifyOrder.shipping_address?.province || shopifyOrder.billing_address?.province || 'Región Metropolitana',
        items: this.mapOrderItems(shopifyOrder.line_items),
        items_count: shopifyOrder.line_items?.length || 0,
        notes: shopifyOrder.note,
        raw_data: shopifyOrder,
        updated_at: new Date()
      };
      
      // Solo actualizar delivery_date si se marca como entregado
      if (updates.status === 'delivered' && !existingOrder.delivery_date) {
        updates.delivery_date = new Date();
      }
      
      const updatedOrder = await Order.findByIdAndUpdate(
        existingOrder._id,
        updates,
        { new: true }
      );
      
      console.log(`🔄 Pedido actualizado: ${updatedOrder.order_number} - Comuna: ${updatedOrder.shipping_commune}`);
      return updatedOrder;
    } catch (error) {
      console.error('❌ Error actualizando pedido:', error);
      throw error;
    }
  }
  
  // Sincronizar pedidos históricos
static async syncOrders(channel, dateFrom, dateTo) {
  try {
    console.log('🔄 Sincronizando pedidos de Shopify con validación de direcciones...');
    
    let ordersImported = 0;
    let ordersRejected = 0;
    let addressRejected = 0;
    let currentPage = 1;
    const limit = 50; // ✅ REDUCIR LÍMITE para evitar timeouts
    let hasMoreOrders = true;
    
    // Obtener comunas permitidas
    const allowedCommunes = channel.accepted_communes || [];
    console.log(`📋 Comunas permitidas: ${allowedCommunes.join(', ')}`);
    
    // ✅ VALIDAR Y CORREGIR FECHAS
    let correctedDateFrom = dateFrom;
    let correctedDateTo = dateTo;
    
    // Si dateFrom es futuro, corregir a fecha pasada
    if (correctedDateFrom && new Date(correctedDateFrom) > new Date()) {
      correctedDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 días atrás
      console.log(`⚠️ Fecha desde era futura, corregida a: ${correctedDateFrom}`);
    }
    
    // Si dateTo es futuro, corregir a ahora
    if (correctedDateTo && new Date(correctedDateTo) > new Date()) {
      correctedDateTo = new Date().toISOString();
      console.log(`⚠️ Fecha hasta era futura, corregida a: ${correctedDateTo}`);
    }
    
    while (hasMoreOrders) {
      try {
        console.log(`📄 Obteniendo página ${currentPage}...`);
        
        // ✅ CONSTRUIR PARÁMETROS CORRECTAMENTE
        const params = new URLSearchParams();
        if (correctedDateFrom) {
          params.append('created_at_min', correctedDateFrom);
        }
        if (correctedDateTo) {
          params.append('created_at_max', correctedDateTo);
        }
        params.append('status', 'any');
        params.append('limit', limit.toString());
        
        // ✅ NO USAR 'page' - Shopify lo maneja automáticamente con links
        
        console.log(`🔍 URL consultada: ${this.getApiUrl(channel)}/orders.json?${params}`);
        
        // ✅ AGREGAR TIMEOUT Y HEADERS MEJORADOS
        const response = await axios.get(
          `${this.getApiUrl(channel)}/orders.json?${params}`,
          { 
            headers: this.getHeaders(channel),
            timeout: 30000, // 30 segundos timeout
            validateStatus: function (status) {
              return status >= 200 && status < 500; // No lanzar error en 4xx
            }
          }
        );
        
        // ✅ MANEJAR ERRORES HTTP ESPECÍFICOS
        if (response.status === 400) {
          console.error('❌ Error 400 - Bad Request desde Shopify:', response.data);
          throw new Error(`Parámetros inválidos: ${JSON.stringify(response.data)}`);
        }
        
        if (response.status === 401) {
          console.error('❌ Error 401 - No autorizado');
          throw new Error('Token de acceso inválido o expirado');
        }
        
        if (response.status === 429) {
          console.log('⏳ Rate limit alcanzado, esperando 2 segundos...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue; // Reintentar la misma página
        }
        
        if (!response.data || !response.data.orders) {
          console.error('❌ Respuesta inválida de Shopify:', response.data);
          throw new Error('Respuesta inválida de la API');
        }
        
        const orders = response.data.orders;
        console.log(`📦 Obtenidos ${orders.length} pedidos en página ${currentPage}`);
        
        if (!orders || orders.length === 0) {
          console.log('✅ No hay más pedidos para procesar');
          hasMoreOrders = false;
          break;
        }
        
        // Procesar cada pedido con validación completa
        for (const shopifyOrder of orders) {
          try {
            // 1. VALIDAR DIRECCIÓN PRIMERO
            const addressValidation = this.validateShippingAddress(shopifyOrder);
            
            if (!addressValidation.isValid) {
              console.log(`🚫 Pedido ${shopifyOrder.name} rechazado por dirección: ${addressValidation.errors.join(', ')}`);
              addressRejected++;
              continue;
            }
            
            // 2. VALIDAR COMUNA (solo si la dirección es válida)
            const orderCommune = addressValidation.address.city;
            
            if (!this.isCommuneAllowed(orderCommune, allowedCommunes)) {
              console.log(`🚫 Pedido ${shopifyOrder.name} rechazado por comuna: "${orderCommune}" no permitida`);
              ordersRejected++;
              continue;
            }
            
            // 3. VERIFICAR SI YA EXISTE
            const existingOrder = await Order.findOne({
              channel_id: channel._id,
              external_order_id: shopifyOrder.id.toString()
            });
            
            if (existingOrder) {
              console.log(`⏭️ Pedido ${shopifyOrder.name} ya existe, omitiendo...`);
              continue;
            }
            
            // 4. CREAR PEDIDO (ya validado)
            await this.createOrderFromWebhook(channel, shopifyOrder);
            ordersImported++;
            console.log(`✅ Pedido ${shopifyOrder.name} importado - Comuna: ${orderCommune}`);
            
          } catch (orderError) {
            console.error(`❌ Error procesando pedido ${shopifyOrder.name}:`, orderError);
            ordersRejected++;
          }
        }
        
        // ✅ CONTROL DE PÁGINAS MEJORADO
        if (orders.length < limit) {
          // Si obtuvimos menos pedidos que el límite, no hay más páginas
          hasMoreOrders = false;
        } else {
          // Obtener el último pedido para usar su fecha como punto de partida
          const lastOrder = orders[orders.length - 1];
          correctedDateFrom = lastOrder.created_at;
          currentPage++;
        }
        
        // ✅ PAUSA OBLIGATORIA entre páginas para evitar rate limiting
        if (hasMoreOrders) {
          console.log('⏳ Esperando 1 segundo antes de la siguiente página...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (pageError) {
        console.error(`❌ Error obteniendo página ${currentPage}:`, pageError.message);
        
        // Si es un error de rate limiting, esperar más tiempo
        if (pageError.response?.status === 429) {
          console.log('⏳ Rate limit severo, esperando 5 segundos...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Reintentar la misma página
        }
        
        // Para otros errores, terminar la sincronización
        hasMoreOrders = false;
      }
    }
    
    console.log(`✅ Sincronización completada:`);
    console.log(`   📦 Pedidos importados: ${ordersImported}`);
    console.log(`   🚫 Rechazados por comuna: ${ordersRejected}`);
    console.log(`   ❌ Rechazados por dirección: ${addressRejected}`);
    console.log(`   📊 Total procesados: ${ordersImported + ordersRejected + addressRejected}`);
    
    return {
      imported: ordersImported,
      rejected: ordersRejected + addressRejected,
      addressRejected: addressRejected,
      communeRejected: ordersRejected,
      total: ordersImported + ordersRejected + addressRejected
    };
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error;
  }
}
  
  // Mapear items del pedido
  static mapOrderItems(lineItems) {
    if (!lineItems || lineItems.length === 0) return [];
    
    return lineItems.map(item => ({
      product_id: item.product_id?.toString(),
      sku: item.sku,
      name: item.name,
      variant: item.variant_title,
      quantity: item.quantity,
      unit_price: parseFloat(item.price) || 0,
      total_price: parseFloat(item.price) * item.quantity || 0,
      image_url: item.image_url
    }));
  }
  
  // Registrar webhooks
  static async registerWebhooks(channel) {
    try {
      console.log('🔗 Registrando webhooks de Shopify para canal:', channel.store_url);
      
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify/${channel._id}`;
      
      // Registrar webhook para nuevos pedidos
      await axios.post(
        `${this.getApiUrl(channel)}/webhooks.json`,
        {
          webhook: {
            topic: 'orders/create',
            address: webhookUrl,
            format: 'json'
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      // Registrar webhook para actualizaciones de pedidos
      await axios.post(
        `${this.getApiUrl(channel)}/webhooks.json`,
        {
          webhook: {
            topic: 'orders/updated',
            address: webhookUrl,
            format: 'json'
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      // Registrar webhook para pedidos cancelados
      await axios.post(
        `${this.getApiUrl(channel)}/webhooks.json`,
        {
          webhook: {
            topic: 'orders/cancelled',
            address: webhookUrl,
            format: 'json'
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      console.log('✅ Webhooks registrados exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error registrando webhook Shopify:', error);
      throw error;
    }
  }
  
  // Validar configuración del canal
  static async validateChannel(channel) {
    try {
      console.log('🔍 Validando configuración del canal Shopify...');
      
      // Probar conexión con la API
      const response = await axios.get(
        `${this.getApiUrl(channel)}/shop.json`,
        { headers: this.getHeaders(channel) }
      );
      
      const shop = response.data.shop;
      
      console.log('✅ Conexión exitosa con tienda:', shop.name);
      
      return {
        valid: true,
        shop_name: shop.name,
        shop_domain: shop.domain,
        shop_email: shop.email,
        plan: shop.plan_name,
        currency: shop.currency
      };
    } catch (error) {
      console.error('❌ Error validando canal:', error);
      
      let errorMessage = 'Error de conexión';
      if (error.response?.status === 401) {
        errorMessage = 'Token de acceso inválido';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permisos insuficientes';
      } else if (error.response?.status === 404) {
        errorMessage = 'Tienda no encontrada';
      }
      
      return {
        valid: false,
        error: errorMessage,
        details: error.response?.data || error.message
      };
    }
  }
  
  // Helpers
  static getCustomerName(order, validatedAddress = null) {
  // Prioridad: dirección validada -> customer -> shipping_address -> fallback
  if (validatedAddress && (validatedAddress.first_name || validatedAddress.last_name)) {
    return `${validatedAddress.first_name || ''} ${validatedAddress.last_name || ''}`.trim();
  }
  
  if (validatedAddress && validatedAddress.name) {
    return validatedAddress.name;
  }
  
  if (order.customer) {
    return `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim();
  }
  
  if (order.shipping_address) {
    return order.shipping_address.name || 'Cliente';
  }
  
  return 'Cliente';
}
  
  static getShippingAddress(order) {
    if (!order.shipping_address) return '';
    const addr = order.shipping_address;
    return `${addr.address1 || ''} ${addr.address2 || ''}`.trim();
  }
  
  static mapOrderStatus(shopifyOrder) {
    // Cancelado
    if (shopifyOrder.cancelled_at) return 'cancelled';
    
    // Entregado
    if (shopifyOrder.fulfillment_status === 'fulfilled') return 'delivered';
    
    // En proceso
    if (shopifyOrder.fulfillment_status === 'partial') return 'processing';
    if (shopifyOrder.fulfillment_status === 'unfulfilled' && shopifyOrder.financial_status === 'paid') return 'processing';
    
    // Enviado
    if (shopifyOrder.fulfillment_status === 'unfulfilled' && shopifyOrder.financial_status === 'paid') return 'shipped';
    
    // Pendiente por defecto
    return 'pending';
  }
}

module.exports = ShopifyService;