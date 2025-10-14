// backend/src/routes/contact.routes.js
const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contact - Enviar formulario de contacto
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, company, phone, monthlyOrders } = req.body;

    // Validaciones básicas
    if (!name || !email || !company || !phone || !monthlyOrders) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    console.log('📧 Nuevo contacto recibido:', { name, email, company, phone, monthlyOrders });

    // Email para el equipo de enviGo
    const adminEmail = await resend.emails.send({
      from: 'enviGo <no-reply@envigo.cl>', // Cambiar por tu dominio verificado
      to: [process.env.CONTACT_EMAIL || 'contacto@envigo.cl'],
      subject: `🚀 Nuevo Lead - ${company}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #84cc16 0%, #22c55e 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Nuevo Contacto desde Landing</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">📋 Información del Lead</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280; width: 40%;">Nombre:</td>
                <td style="padding: 12px 0; color: #1f2937; font-weight: 500;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Email:</td>
                <td style="padding: 12px 0;">
                  <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${email}</a>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Empresa:</td>
                <td style="padding: 12px 0; color: #1f2937; font-weight: 500;">${company}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Teléfono:</td>
                <td style="padding: 12px 0;">
                  <a href="tel:${phone}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Pedidos/mes:</td>
                <td style="padding: 12px 0; color: #1f2937; font-weight: 500;">${monthlyOrders}</td>
              </tr>
            </table>

            <div style="margin-top: 30px; padding: 20px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px;">
              <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">⚡ Acción Requerida</p>
              <p style="margin: 8px 0 0 0; color: #1e3a8a;">Contactar al cliente en las próximas 24 horas</p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
              <a href="mailto:${email}" style="display: inline-block; padding: 12px 30px; background: #84cc16; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Responder al Lead
              </a>
            </div>
          </div>

          <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; font-weight: 500;">enviGo - Logística de Última Milla</p>
            <p style="margin: 8px 0 0 0;">Este email fue generado automáticamente desde la landing page</p>
          </div>
        </div>
      `
    });

    // Email de confirmación para el cliente
    const clientEmail = await resend.emails.send({
      from: 'enviGo <no-reply@envigo.cl>', // Cambiar por tu dominio verificado
      to: [email],
      subject: '✅ Hemos recibido tu solicitud - enviGo',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #84cc16 0%, #22c55e 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu interés!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 0;">
              Hola <strong>${name}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
              Hemos recibido tu solicitud de información sobre nuestros servicios de logística same-day.
            </p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #bbf7d0;">
              <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px;">📦 Resumen de tu solicitud:</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 6px 0; color: #166534; font-weight: 600;">Empresa:</td>
                  <td style="padding: 6px 0; color: #166534;"><strong>${company}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #166534; font-weight: 600;">Volumen mensual:</td>
                  <td style="padding: 6px 0; color: #166534;"><strong>${monthlyOrders} pedidos</strong></td>
                </tr>
              </table>
            </div>

            <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
              Nuestro equipo comercial se pondrá en contacto contigo en las próximas <strong>24 horas</strong> para:
            </p>

            <ul style="color: #1f2937; line-height: 1.8; padding-left: 25px;">
              <li style="margin: 8px 0;">Entender mejor tus necesidades logísticas</li>
              <li style="margin: 8px 0;">Explicarte cómo funciona enviGo</li>
              <li style="margin: 8px 0;">Ofrecerte una propuesta personalizada</li>
            </ul>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${process.env.FRONTEND_ENVIGO || 'https://www.envigo.cl'}" style="display: inline-block; padding: 15px 35px; background: #84cc16; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
                Visitar enviGo
              </a>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 12px 0;">
                Mientras tanto, si tienes alguna pregunta urgente, no dudes en contactarnos:
              </p>
              <p style="font-size: 14px; color: #1f2937; margin: 0; line-height: 1.8;">
                📧 <a href="mailto:contacto@envigo.cl" style="color: #3b82f6; text-decoration: none; font-weight: 500;">contacto@envigo.cl</a><br>
                📞 <a href="tel:+56986147420" style="color: #3b82f6; text-decoration: none; font-weight: 500;">+56 9 8614 7420</a>
              </p>
            </div>
          </div>

          <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; font-weight: 500;">enviGo - Logística de Última Milla</p>
            <p style="margin: 8px 0 0 0;">Santiago, Chile</p>
          </div>
        </div>
      `
    });

    console.log('✅ Emails enviados correctamente via Resend');
    console.log('📧 Admin email ID:', adminEmail.data?.id);
    console.log('📧 Client email ID:', clientEmail.data?.id);

    res.status(200).json({
      success: true,
      message: 'Solicitud enviada exitosamente',
      emailIds: {
        admin: adminEmail.data?.id,
        client: clientEmail.data?.id
      }
    });

  } catch (error) {
    console.error('❌ Error procesando contacto:', error);
    
    // Error específico de Resend
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servicio de emails'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud. Por favor intenta nuevamente.'
    });
  }
});

module.exports = router;