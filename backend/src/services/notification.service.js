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
    const content = `
      <h2>Hola ${companyName},</h2>
      
      <p>Te informamos que se ha generado una nueva factura por los servicios prestados. A continuación, encontrarás los detalles:</p>
      
      <div class="invoice-details" style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <h3>Resumen de la Factura</h3>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Número de Factura:</strong> <span>${invoiceData.number}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Período de Servicio:</strong> <span>${invoiceData.period}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Fecha de Emisión:</strong> <span>${invoiceData.issue_date}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0;"><strong>Fecha de Vencimiento:</strong> <span>${invoiceData.due_date}</span></div>
         <div style="background: #eef2ff; padding: 15px; text-align: right; border-radius: 8px; margin-top: 20px;">
            <strong style="font-size: 20px; color: #3730a3;">Monto Total: ${invoiceData.total_amount}</strong>
          </div>
      </div>
      
      <p>Puedes descargar una copia de tu factura en formato PDF haciendo clic en el siguiente botón:</p>
      
      <div style="text-align: center;">
          <a href="${invoiceData.download_url}" class="button">Descargar Factura PDF</a>
      </div>
      
      <p>Si tienes alguna pregunta sobre esta factura, no dudes en ponerte en contacto con nuestro equipo de soporte.</p>
    `;

    const mailOptions = {
      from: `"enviGo Facturación" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: `Nueva Factura #${invoiceData.number} de enviGo`,
      html: this.getBaseTemplate(content, `Factura ${invoiceData.number}`)
    };

    return this.sendMail(mailOptions);
  }
}

module.exports = new NotificationService();