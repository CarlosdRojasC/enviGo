const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;

class NotificationService {
  constructor() {
    // Configurar Gmail
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Cache para templates
    this.templateCache = new Map();
  }


  /**
 * Extraer ID de Shipday de la URL de tracking y construir URL personalizada
 */
extractShipdayIdAndBuildUrl(webhookData, order) {
  let shipdayTrackingId = null;
  
  // Intentar extraer de trackingUrl del webhook
  if (webhookData.trackingUrl) {
    // trackingUrl: "https://dispatch.shipday.com/trackingPage/bHBueG54cHk=&lang=es"
    const match = webhookData.trackingUrl.match(/trackingPage\/([^&?]+)/);
    if (match) {
      shipdayTrackingId = match[1];
      console.log(`🔗 ID extraído de trackingUrl: ${shipdayTrackingId}`);
    }
  }
  
  // Si no se encontró, intentar desde el order.id del webhook
  if (!shipdayTrackingId && webhookData.order?.id) {
    // Usar el ID directo de la orden
    shipdayTrackingId = webhookData.order.id;
    console.log(`🔗 Usando order.id como ID: ${shipdayTrackingId}`);
  }
  
  // Si aún no hay ID, usar el que tienes guardado
  if (!shipdayTrackingId && order.shipday_order_id) {
    shipdayTrackingId = order.shipday_order_id;
    console.log(`🔗 Usando shipday_order_id guardado: ${shipdayTrackingId}`);
  }
  
  // Construir URL personalizada
  if (shipdayTrackingId) {
    return `https://www.ordertracking.io/enviGo/delivery/${shipdayTrackingId}`;
  }
  
  // Fallback a tu frontend
  console.warn('⚠️ No se pudo extraer ID de Shipday, usando fallback');
  return `${process.env.FRONTEND_URL}/tracking/${order.order_number}`;
}

  /**
   * Enviar email cuando el pedido esté en camino
   */
  async sendOutForDeliveryEmail(order, webhookData) {
    try {
      console.log(`📧 Enviando email "En Camino" para orden #${order.order_number}`);

      // Preparar datos para el template
      const templateData = await this.prepareTemplateData(order, webhookData);

      // Cargar y compilar template
      const template = await this.getTemplate('out-for-delivery.hbs');
      const html = template(templateData);

      // Configurar email
      const mailOptions = {
        from: `"${templateData.company_name}" <${process.env.EMAIL_FROM}>`,
        to: order.customer_email,
        subject: `🚚 Tu pedido está en camino - #${order.order_number}`,
        html: html
      };

      // Enviar email
      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a: ${order.customer_email}`);
      
      return result;

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw error;
    }
  }

  /**
 * Enviar email cuando el pedido sea entregado
 */
async sendDeliveredEmail(order, webhookData) {
  try {
    console.log(`📧 Enviando email "Entregado" para orden #${order.order_number}`);

    // Preparar datos para el template incluyendo pruebas de entrega
    const templateData = await this.prepareDeliveredTemplateData(order, webhookData);

    // Cargar y compilar template
    const template = await this.getTemplate('order-delivered.hbs');
    const html = template(templateData);

    // Configurar email
    const mailOptions = {
      from: `"${templateData.company_name}" <${process.env.EMAIL_FROM}>`,
      to: order.customer_email,
      subject: `✅ Pedido entregado - #${order.order_number}`,
      html: html
    };

    // Enviar email
    const result = await this.emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email "Entregado" enviado a: ${order.customer_email}`);
    
    return result;

  } catch (error) {
    console.error('❌ Error enviando email de entrega:', error);
    throw error;
  }
}

/**
 * Preparar datos específicos para email de entrega
 */
async prepareDeliveredTemplateData(order, webhookData) {
  // Obtener datos de la empresa
  await order.populate('company_id');
  
  // Procesar pruebas de entrega del webhook
  const deliveryPhotos = [];
  const signatures = [];
  
  // Extraer fotos (pods) del webhook
  if (webhookData.pods && Array.isArray(webhookData.pods)) {
    deliveryPhotos.push(...webhookData.pods.filter(url => url && typeof url === 'string'));
    console.log(`📸 Fotos encontradas en webhook: ${deliveryPhotos.length}`);
  }
  
  // Extraer firmas del webhook
  if (webhookData.signatures && Array.isArray(webhookData.signatures)) {
    signatures.push(...webhookData.signatures.filter(url => url && typeof url === 'string'));
    console.log(`✍️ Firmas encontradas en webhook: ${signatures.length}`);
  }

  // Ubicación de entrega
  const deliveryLocation = webhookData.delivery_details?.location || null;
  const trackingUrl = this.extractShipdayIdAndBuildUrl(webhookData, order);
  // Información del conductor del webhook
  const driverInfo = webhookData.carrier ? {
    name: webhookData.carrier.name || 'Conductor',
    phone: webhookData.carrier.phone || '',
    email: webhookData.carrier.email || ''
  } : (order.driver_info || {
    name: 'Conductor',
    phone: ''
  });

  return {
    customer_name: order.customer_name,
    order_number: order.order_number,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    
    driver: driverInfo,
    
    company_name: order.company_id?.name || 'Tu Tienda',
    company_phone: order.company_id?.phone || '',
    company_email: order.company_id?.email || '',
    company_website: order.company_id?.website || '',
    
    tracking_url: trackingUrl,
    
    // Pruebas de entrega
    has_proofs: deliveryPhotos.length > 0 || signatures.length > 0,
    delivery_photos: deliveryPhotos,
    signature_url: signatures[0] || null, // Primera firma
    delivery_location: deliveryLocation,
    
    formatted_date: new Date().toLocaleString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

async prepareTemplateData(order, webhookData) {
  // Obtener datos de la empresa
  await order.populate('company_id');
  
  // Usar tracking URL de Shipday del webhook
  const trackingUrl = this.extractShipdayIdAndBuildUrl(webhookData, order);
  
  return {
    customer_name: order.customer_name,
    order_number: order.order_number,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    
    driver: order.driver_info || {
      name: 'Tu conductor',
      phone: 'Se pondrá en contacto contigo'
    },
    
    company_name: order.company_id?.name || 'Tu Tienda',
    company_phone: order.company_id?.phone || '',
    company_email: order.company_id?.email || '',
    
    tracking_url: trackingUrl,  // ✅ Ahora usa el tracking real de Shipday
    
    formatted_date: new Date().toLocaleString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

  async getTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(__dirname, '../templates/email', templateName);
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const compiled = handlebars.compile(templateSource);
    
    this.templateCache.set(templateName, compiled);
    return compiled;
  }
}

module.exports = new NotificationService();