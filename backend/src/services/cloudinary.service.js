const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  /**
   * Subir imagen a Cloudinary
   * @param {string} base64Data - Imagen en formato base64 (data:image/jpeg;base64,...)
   * @param {string} orderId - ID de la orden
   * @param {string} type - Tipo de prueba: 'photo' o 'signature'
   * @returns {Promise<Object>} Información de la imagen subida
   */
  static async uploadProofImage(base64Data, orderId, type = 'photo') {
    try {
      console.log(`📤 Subiendo ${type} a Cloudinary para orden ${orderId}`);
      
      // Validar que base64Data existe
      if (!base64Data) {
        throw new Error('No se proporcionó imagen en base64');
      }

      // Validar formato base64
      if (!base64Data.startsWith('data:image')) {
        throw new Error('Formato de imagen inválido. Debe ser base64 con data URI');
      }

      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: `envigo/proof-of-delivery/${type}s`,
        public_id: `order_${orderId}_${type}_${Date.now()}`,
        resource_type: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
          { quality: 'auto:good' }, // Optimizar calidad automáticamente
          { fetch_format: 'auto' } // Formato óptimo (webp si es posible)
        ],
        // Metadatos
        context: {
          order_id: orderId,
          type: type,
          upload_date: new Date().toISOString()
        }
      });

      console.log(`✅ ${type} subida exitosamente:`, {
        url: result.secure_url,
        public_id: result.public_id,
        size: `${Math.round(result.bytes / 1024)}KB`
      });
      
      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at
      };
      
    } catch (error) {
      console.error(`❌ Error subiendo ${type} a Cloudinary:`, {
        message: error.message,
        orderId,
        type
      });
      
      // Proporcionar mensajes de error específicos
      if (error.message.includes('Invalid image')) {
        throw new Error('Imagen inválida o corrupta');
      } else if (error.message.includes('File size too large')) {
        throw new Error('La imagen es demasiado grande. Máximo 10MB');
      } else if (error.http_code === 401) {
        throw new Error('Error de autenticación con Cloudinary. Verifica las credenciales');
      } else {
        throw new Error(`Error al subir imagen: ${error.message}`);
      }
    }
  }

  /**
   * Eliminar imagen de Cloudinary
   * @param {string} publicId - Public ID de la imagen en Cloudinary
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteImage(publicId) {
    try {
      console.log(`🗑️ Eliminando imagen de Cloudinary: ${publicId}`);
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`✅ Imagen eliminada exitosamente: ${publicId}`);
      } else {
        console.warn(`⚠️ No se pudo eliminar la imagen: ${publicId}`, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error eliminando imagen de Cloudinary:', {
        publicId,
        error: error.message
      });
      throw new Error(`Error al eliminar imagen: ${error.message}`);
    }
  }

  /**
   * Obtener información de una imagen
   * @param {string} publicId - Public ID de la imagen
   * @returns {Promise<Object>} Información de la imagen
   */
  static async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo info de imagen:', error);
      throw new Error(`Error al obtener información: ${error.message}`);
    }
  }

  /**
   * Generar URL firmada temporal (para mayor seguridad)
   * @param {string} publicId - Public ID de la imagen
   * @param {number} expiresIn - Segundos hasta expiración (default: 1 hora)
   * @returns {string} URL firmada
   */
  static getSignedUrl(publicId, expiresIn = 3600) {
    try {
      const timestamp = Math.round(Date.now() / 1000) + expiresIn;
      
      return cloudinary.url(publicId, {
        sign_url: true,
        secure: true,
        type: 'authenticated',
        expires_at: timestamp
      });
    } catch (error) {
      console.error('❌ Error generando URL firmada:', error);
      throw new Error(`Error al generar URL: ${error.message}`);
    }
  }

  /**
   * Validar configuración de Cloudinary
   * @returns {boolean} true si está configurado correctamente
   */
  static validateConfig() {
    const config = cloudinary.config();
    
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error('❌ Cloudinary no está configurado correctamente');
      console.error('Verifica las variables de entorno:');
      console.error('- CLOUDINARY_CLOUD_NAME');
      console.error('- CLOUDINARY_API_KEY');
      console.error('- CLOUDINARY_API_SECRET');
      return false;
    }

    console.log('✅ Cloudinary configurado correctamente:', {
      cloud_name: config.cloud_name,
      api_key: config.api_key ? '***' + config.api_key.slice(-4) : 'NO SET'
    });
    
    return true;
  }
}

// Validar configuración al iniciar
CloudinaryService.validateConfig();

module.exports = CloudinaryService;