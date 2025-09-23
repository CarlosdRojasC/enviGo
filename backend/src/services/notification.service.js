const { Resend } = require('resend');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;

class NotificationService {
  constructor() {
    // Configurar Resend en lugar de Nodemailer
    // Asegúrate de poner RESEND_API_KEY en tus variables de entorno de Railway
    this.resend = new Resend(process.env.RESEND_API_KEY);

    // Cache para templates (esto no cambia)
    this.templateCache = new Map();
  }


  /**
 * Extraer ID de Shipday de la URL de tracking y construir URL personalizada
 */
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
    shipdayTrackingId = webhookData.order.id;
    console.log(`🔗 Usando order.id como ID: ${shipdayTrackingId}`);
  }
  
  // Si aún no hay ID, usar el que tienes guardado
  if (!shipdayTrackingId && order.shipday_order_id) {
    shipdayTrackingId = order.shipday_order_id;
    console.log(`🔗 Usando shipday_order_id guardado: ${shipdayTrackingId}`);
  }
  
  // Construir URL personalizada CON IDIOMA ESPAÑOL
  if (shipdayTrackingId) {
    return `https://www.ordertracking.io/enviGo/delivery/${shipdayTrackingId}&lang=es`;
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
      const { data, error } = await this.resend.emails.send({
        from: `"${templateData.company_name}" <contacto@envigo.cl>`,
        to: order.customer_email,
        subject: `🚚 Tu pedido está en camino - #${order.order_number}`,
        html: html
      });

       if (error) {
        // Si hay un error, lánzalo para que el catch lo capture
        throw error;
      }
      console.log(`✅ Email enviado a: ${order.customer_email}`);
      return data;

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
    const { data, error } = await this.resend.emails.send({
      from: `"${templateData.company_name}" <contacto@envigo.cl>`,
      to: order.customer_email,
      subject: `✅ Pedido entregado - #${order.order_number}`,
      html: html
    });

      if (error) {
        // Si hay un error, lánzalo para que el catch lo capture
        throw error;
      }
      console.log(`✅ Email enviado a: ${order.customer_email}`);
      return data;

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw error;
    }
}
/**
   * Enviar un email de resumen para múltiples pedidos marcados como listos
   */
  async sendBulkReadyForPickupEmail(orders, adminEmail) {
    try {
      const ordersCount = orders.length;
      if (ordersCount === 0) return; // No hacer nada si no hay pedidos

      console.log(`📧 Preparando notificación masiva para ${ordersCount} pedidos listos para retirar.`);

      // 1. Preparar los datos para la plantilla
      // No es necesario popular cada pedido aquí si los datos ya vienen
      const templateData = {
        orders: orders, // El array completo
        orders_count: ordersCount,
        frontend_url: process.env.FRONTEND_URL,
        formatted_date: new Date().toLocaleString('es-CL')
      };

      // 2. Cargar y compilar la plantilla masiva
      const template = await this.getTemplate('bulk-ready-for-pickup.hbs');
      const html = template(templateData);

      // 3. Configurar las opciones del correo
      const mailOptions = {
        from: `"Resúmenes enviGo" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `[RESUMEN] ${ordersCount} nuevos pedidos listos para retirar`,
        html: html
      };
      
      // 4. Enviar el correo único
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Notificación masiva enviada a: ${adminEmail}`);

    } catch (error) {
      console.error(`❌ Error enviando email de resumen masivo:`, error);
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
    email: webhookData.carrier.email || ''
  } : (order.driver_info || {
    name: 'Conductor',
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
async sendInvoiceEmail(email, companyName, invoiceData) {
  try {
    console.log(`📧 Enviando factura ${invoiceData.number} a ${companyName} (${email})`);

    // Preparar datos para el template de factura
    const templateData = {
      company_name: companyName,
      invoice_number: invoiceData.number,
      period: invoiceData.period,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date,
      total_amount: invoiceData.total_amount,
      total_orders: invoiceData.total_orders || 'N/A', // Agregar total_orders si está disponible
      download_url: invoiceData.download_url
    };

    // Cargar y compilar template de factura
    const template = await this.getTemplate('invoice-notification.hbs');
    const html = template(templateData);

    // Enviar email usando Resend
    const { data, error } = await this.resend.emails.send({
      from: `"enviGo Facturación" <contacto@envigo.cl>`,
      to: email,
      subject: `Nueva Pre-Factura #${invoiceData.number} de enviGo`,
      html: html
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Factura enviada exitosamente a: ${email}`);
    return data;

  } catch (error) {
    console.error('❌ Error enviando factura por email:', error);
    throw error;
  }
}

/**
 * Enviar notificación de solicitud de colecta al admin
 */
async sendCollectionRequestToAdmin(collectionData) {
  try {
    console.log(`📦 Enviando solicitud de colecta de ${collectionData.company_name}`);

    // Preparar datos para el template
    const templateData = {
      company_name: collectionData.company_name,
      company_address: collectionData.company_address,
      company_phone: collectionData.company_phone,
      contact_name: collectionData.contact_name,
      package_count: collectionData.package_count,
      notes: collectionData.notes,
      requested_at: new Date().toLocaleString('es-CL'),
      frontend_url: process.env.FRONTEND_URL
    };

    // Cargar y compilar template
    const template = await this.getTemplate('collection-request.hbs');
    const html = template(templateData);

    // Enviar email usando Resend
    const { data, error } = await this.resend.emails.send({
      from: `"enviGo Colectas" <contacto@envigo.cl>`,
      to: process.env.ADMIN_EMAIL || 'admin@envigo.cl',
      subject: `🚚 Nueva solicitud de colecta - ${collectionData.company_name}`,
      html: html
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Solicitud de colecta enviada a admin`);
    return data;

  } catch (error) {
    console.error('❌ Error enviando solicitud de colecta:', error);
    throw error;
  }
}
}

module.exports = new NotificationService();