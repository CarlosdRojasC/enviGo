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

async prepareTemplateData(order, webhookData) {
  // Obtener datos de la empresa
  await order.populate('company_id');
  
  // Intentar obtener tracking URL de Shipday
  let trackingUrl = order.shipday_tracking_url || `${process.env.FRONTEND_URL}/tracking/${order.order_number}`;
  
  // Si tenemos ID de Shipday, construir URL directa
  if (webhookData.order?.id) {
    trackingUrl = `https://app.shipday.com/track/${webhookData.order.id}`;
  }
  
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
    
    tracking_url: trackingUrl,  // ✅ Ahora usa tracking de Shipday
    
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