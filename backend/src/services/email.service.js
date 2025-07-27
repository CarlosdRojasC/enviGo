const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Template base para emails
  getBaseTemplate(content, title = 'enviGo') {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #5a67d8; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
          .footer p { margin: 0; color: #6c757d; font-size: 14px; }
          .alert { padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; background: #fff3cd; color: #856404; }
          .success { border-left-color: #28a745; background: #d4edda; color: #155724; }
          .danger { border-left-color: #dc3545; background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚛 enviGo</h1>
            <p>Gestión Logística de Última Milla</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2025 enviGo. Todos los derechos reservados.</p>
            <p>Si tienes problemas, contacta a nuestro soporte: <a href="mailto:soporte@envigo.cl">soporte@envigo.cl</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email de bienvenida para nuevos usuarios
  async sendWelcomeEmail(email, fullName, tempPassword, companyName) {
    const content = `
      <h2>¡Bienvenido a enviGo, ${fullName}!</h2>
      
      <p>Tu cuenta ha sido creada exitosamente en <strong>${companyName}</strong>. Ahora puedes acceder a nuestra plataforma de gestión logística.</p>
      
      <div class="alert">
        <strong>Credenciales de acceso:</strong><br>
        <strong>Email:</strong> ${email}<br>
        <strong>Contraseña temporal:</strong> <code style="background: #f1f3f4; padding: 2px 4px; border-radius: 3px;">${tempPassword}</code>
      </div>
      
      <p><strong>⚠️ Importante:</strong> Por tu seguridad, deberás cambiar esta contraseña temporal en tu primer inicio de sesión.</p>
      
      <a href="${process.env.FRONTEND_URL}/login" class="button">Iniciar Sesión</a>
      
      <h3>¿Qué puedes hacer en enviGo?</h3>
      <ul>
        <li>📦 Gestionar pedidos y entregas</li>
        <li>🚛 Seguimiento en tiempo real</li>
        <li>📊 Reportes y estadísticas</li>
        <li>🔗 Integración con Shopify y WooCommerce</li>
      </ul>
      
      <p>Si tienes alguna duda, no dudes en contactarnos.</p>
    `;

    const mailOptions = {
      from: `"enviGo" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: `¡Bienvenido a enviGo - ${companyName}!`,
      html: this.getBaseTemplate(content, 'Bienvenido a enviGo')
    };

    return this.sendMail(mailOptions);
  }

  // Email para reset de contraseña
  async sendPasswordResetEmail(email, resetToken, fullName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const content = `
      <h2>Restablecer Contraseña</h2>
      
      <p>Hola ${fullName},</p>
      
      <p>Recibimos una solicitud para restablecer tu contraseña en enviGo.</p>
      
      <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
      
      <div class="alert danger">
        <strong>⏰ Este enlace expirará en 1 hora.</strong>
      </div>
      
      <p>Si no solicitaste este cambio, puedes ignorar este email de forma segura. Tu contraseña actual seguirá siendo válida.</p>
      
      <p><strong>Consejos de seguridad:</strong></p>
      <ul>
        <li>Nunca compartas tu contraseña con nadie</li>
        <li>Usa una contraseña única y fuerte</li>
        <li>Incluye mayúsculas, minúsculas, números y símbolos</li>
      </ul>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
      <p style="font-size: 14px; color: #6c757d;">
        Si tienes problemas con el botón, copia y pega este enlace en tu navegador:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
    `;

    const mailOptions = {
      from: `"enviGo Seguridad" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Restablecer tu contraseña de enviGo',
      html: this.getBaseTemplate(content, 'Restablecer Contraseña')
    };

    return this.sendMail(mailOptions);
  }

  // Email de confirmación de cambio de contraseña
  async sendPasswordChangedConfirmation(email, fullName, clientIP) {
    const content = `
      <h2>Contraseña Actualizada</h2>
      
      <p>Hola ${fullName},</p>
      
      <div class="alert success">
        <strong>✅ Tu contraseña ha sido cambiada exitosamente.</strong>
      </div>
      
      <p><strong>Detalles del cambio:</strong></p>
      <ul>
        <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</li>
        <li><strong>IP:</strong> ${clientIP}</li>
      </ul>
      
      <p>Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte.</p>
      
      <a href="mailto:soporte@envigo.cl" class="button" style="background: #dc3545;">Reportar Problema</a>
      
      <p><strong>Recomendaciones de seguridad:</strong></p>
      <ul>
        <li>Mantén tu contraseña segura y privada</li>
        <li>Cierra sesión en dispositivos compartidos</li>
        <li>Revisa regularmente la actividad de tu cuenta</li>
      </ul>
    `;

    const mailOptions = {
      from: `"enviGo Seguridad" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Contraseña actualizada - enviGo',
      html: this.getBaseTemplate(content, 'Contraseña Actualizada')
    };

    return this.sendMail(mailOptions);
  }

  // Email de notificación de login sospechoso
  async sendSuspiciousLoginAlert(email, fullName, clientIP, location) {
    const content = `
      <h2>Inicio de Sesión Detectado</h2>
      
      <p>Hola ${fullName},</p>
      
      <div class="alert danger">
        <strong>⚠️ Se detectó un nuevo inicio de sesión en tu cuenta.</strong>
      </div>
      
      <p><strong>Detalles del acceso:</strong></p>
      <ul>
        <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</li>
        <li><strong>IP:</strong> ${clientIP}</li>
        <li><strong>Ubicación:</strong> ${location || 'No disponible'}</li>
      </ul>
      
      <p>Si fuiste tú, puedes ignorar este mensaje. Si no reconoces esta actividad, recomendamos:</p>
      
      <ol>
        <li>Cambiar tu contraseña inmediatamente</li>
        <li>Revisar la actividad reciente de tu cuenta</li>
        <li>Contactar a nuestro equipo de soporte</li>
      </ol>
      
      <a href="${process.env.FRONTEND_URL}/reset-password" class="button" style="background: #dc3545;">Cambiar Contraseña</a>
      
      <a href="mailto:soporte@envigo.cl" class="button">Contactar Soporte</a>
    `;

    const mailOptions = {
      from: `"enviGo Seguridad" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: '🔒 Alerta de Seguridad - enviGo',
      html: this.getBaseTemplate(content, 'Alerta de Seguridad'),
      priority: 'high'
    };

    return this.sendMail(mailOptions);
  }

  // Email de bloqueo de cuenta
  async sendAccountLockedNotification(email, fullName, unlockTime) {
    const content = `
      <h2>Cuenta Temporalmente Bloqueada</h2>
      
      <p>Hola ${fullName},</p>
      
      <div class="alert danger">
        <strong>🔒 Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos de inicio de sesión.</strong>
      </div>
      
      <p><strong>Tu cuenta se desbloqueará automáticamente el:</strong><br>
      ${unlockTime.toLocaleString('es-CL')}</p>
      
      <p><strong>¿Qué puedes hacer?</strong></p>
      <ul>
        <li>Esperar a que se desbloquee automáticamente</li>
        <li>Contactar a tu administrador de empresa</li>
        <li>Si olvidaste tu contraseña, usar la opción de restablecimiento</li>
      </ul>
      
      <a href="${process.env.FRONTEND_URL}/reset-password" class="button">Restablecer Contraseña</a>
      
      <p>Si no intentaste acceder a tu cuenta, contacta inmediatamente a soporte.</p>
    `;

    const mailOptions = {
      from: `"enviGo Seguridad" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: '🔒 Cuenta Bloqueada - enviGo',
      html: this.getBaseTemplate(content, 'Cuenta Bloqueada')
    };

    return this.sendMail(mailOptions);
  }

  // Método genérico para enviar emails
  async sendMail(mailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado exitosamente a ${mailOptions.to}:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`Error enviando email a ${mailOptions.to}:`, error);
      throw error;
    }
  }

  // Verificar configuración del servicio
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en conexión SMTP:', error);
      return false;
    }
  }
}

module.exports = new EmailService();