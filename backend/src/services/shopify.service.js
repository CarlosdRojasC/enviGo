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
      'X-Shopify-Access-Token': channel.api_secret,
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
      // Verificar si el pedido ya existe
      const existingOrder = await Order.findOne({
        channel_id: channel._id,
        external_order_id: shopifyOrder.id.toString()
      });
      
      if (existingOrder) {
        console.log('🔄 Actualizando pedido existente:', shopifyOrder.name);
        return await this.updateExistingOrder(existingOrder, shopifyOrder);
      }
      
      console.log('🆕 Creando nuevo pedido:', shopifyOrder.name);
      
      // Obtener información de la empresa para pricing
      const company = await Company.findById(channel.company_id);
      const fixedShippingCost = company?.price_per_order || 0;
      
      // Crear nuevo pedido
      const newOrder = new Order({
        company_id: channel.company_id,
        channel_id: channel._id,
        external_order_id: shopifyOrder.id.toString(),
        order_number: shopifyOrder.name,
        
        // Información del cliente
        customer_name: this.getCustomerName(shopifyOrder),
        customer_email: shopifyOrder.email,
        customer_phone: shopifyOrder.phone || shopifyOrder.shipping_address?.phone,
        
        // Dirección de envío
        shipping_address: this.getShippingAddress(shopifyOrder),
        // 🏘️ NUEVA LÓGICA: Mapear city a comuna chilena
        shipping_commune: this.normalizeCommune(shopifyOrder.shipping_address?.city || shopifyOrder.billing_address?.city || ''),
        shipping_state: shopifyOrder.shipping_address?.province || shopifyOrder.billing_address?.province || 'Región Metropolitana',
        shipping_zip: shopifyOrder.shipping_address?.zip || shopifyOrder.billing_address?.zip,
        
        // Información financiera
        total_amount: parseFloat(shopifyOrder.total_price) || 0,
        shipping_cost: fixedShippingCost, // Usar precio fijo de la empresa
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
      console.log(`✅ Pedido creado exitosamente: ${savedOrder.order_number} - Comuna: ${savedOrder.shipping_commune}`);
      
      return savedOrder;
    } catch (error) {
      console.error('❌ Error creando pedido desde webhook:', error);
      throw error;
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
      console.log('🔄 Sincronizando pedidos de Shopify...');
      
      let ordersImported = 0;
      let ordersRejected = 0;
      let page = 1;
      const limit = 250;
      let hasMoreOrders = true;
      
      // Obtener comunas permitidas
      const allowedCommunes = channel.accepted_communes || [];
      console.log(`📋 Comunas permitidas: ${allowedCommunes.join(', ')}`);
      
      while (hasMoreOrders) {
        try {
          // Construir parámetros de fecha
          const params = new URLSearchParams();
          if (dateFrom) params.append('created_at_min', dateFrom);
          if (dateTo) params.append('created_at_max', dateTo);
          params.append('status', 'any');
          params.append('limit', limit.toString());
          
          // Obtener pedidos de Shopify
          const response = await axios.get(
            `${this.getApiUrl(channel)}/orders.json?${params}`,
            { headers: this.getHeaders(channel) }
          );
          
          const orders = response.data.orders;
          
          if (!orders || orders.length === 0) {
            hasMoreOrders = false;
            break;
          }
          
          // Procesar cada pedido
          for (const shopifyOrder of orders) {
            try {
              // 🏘️ NUEVA LÓGICA: Filtrar por comunas durante sincronización
              const orderCommune = shopifyOrder.shipping_address?.city || shopifyOrder.billing_address?.city || '';
              
              if (!this.isCommuneAllowed(orderCommune, allowedCommunes)) {
                console.log(`🚫 Pedido #${shopifyOrder.name} rechazado durante sincronización. Comuna "${orderCommune}" no permitida.`);
                ordersRejected++;
                continue;
              }
              
              // Verificar si el pedido ya existe
              const existingOrder = await Order.findOne({
                channel_id: channel._id,
                external_order_id: shopifyOrder.id.toString()
              });
              
              if (!existingOrder) {
                await this.createOrderFromWebhook(channel, shopifyOrder);
                ordersImported++;
                console.log(`✅ Pedido #${shopifyOrder.name} importado - Comuna: ${orderCommune}`);
              } else {
                console.log(`⏭️ Pedido ${shopifyOrder.name} ya existe, omitiendo...`);
              }
            } catch (orderError) {
              console.error(`❌ Error importando pedido ${shopifyOrder.name}:`, orderError);
              // Continuar con el siguiente pedido
            }
          }
          
          // Si obtuvo menos pedidos que el límite, no hay más páginas
          if (orders.length < limit) {
            hasMoreOrders = false;
          }
          
          page++;
          
          // Pequeña pausa para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (pageError) {
          console.error(`❌ Error obteniendo página ${page}:`, pageError);
          hasMoreOrders = false;
        }
      }
      
      console.log(`✅ Sincronización completada.`);
      console.log(`   📊 Pedidos importados: ${ordersImported}`);
      console.log(`   🚫 Pedidos rechazados por filtro de comuna: ${ordersRejected}`);
      
      return {
        imported: ordersImported,
        rejected: ordersRejected,
        total: ordersImported + ordersRejected
      };
    } catch (error) {
      console.error('❌ Error sincronizando pedidos:', error);
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
  static getCustomerName(order) {
    if (order.customer) {
      return `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim();
    }
    if (order.shipping_address) {
      return order.shipping_address.name;
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