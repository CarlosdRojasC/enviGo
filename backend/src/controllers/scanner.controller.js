const Order = require('../models/Order')
const Company = require('../models/Company')
const sharp = require('sharp')
const jsQR = require('jsqr')

class ScannerController {

  /**
   * Obtener clientes disponibles (en tu caso, otras empresas)
   */
static async getClients(req, res) {
  try {
    console.log('Iniciando getClients para repartidores...');

    // La consulta correcta: Simplemente trae todas las empresas activas.
    // No se necesita req.user ni currentCompanyId.
    const clients = await Company.find({
      status: 'active'
    }).select('name email'); // Solo seleccionamos los campos necesarios

    console.log(`Se encontraron ${clients.length} clientes activos.`);

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('Error CATCH en getClients:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes'
    });
  }
}

  /**
   * Procesar código de barras ML
   */
  static async processMLBarcode(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió imagen'
        })
      }

      if (!req.body.client_id) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente requerido'
        })
      }

      // Procesar imagen
      const processedImage = await sharp(req.file.buffer)
        .resize(800, 600, { 
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .greyscale()
        .normalise()
        .toBuffer()

      // Extraer datos para detección QR
      const { data, info } = await sharp(processedImage).raw().toBuffer({ resolveWithObject: true })
      
      // Detectar código
      const codeData = jsQR(data, info.width, info.height)
      
      if (!codeData) {
        return res.json({
          success: false,
          message: 'No se pudo leer el código de barras'
        })
      }

      const barcode = codeData.data

      // Validar formato ML
      if (!this.isValidMLBarcode(barcode)) {
        return res.json({
          success: true,
          data: {
            barcode,
            status: 'invalid',
            message: 'Código no válido para MercadoLibre'
          }
        })
      }

      // Verificar duplicados
      const existingOrder = await Order.findOne({
        $or: [
          { tracking_number: barcode },
          { order_number: barcode },
          { 'ml_info.barcode': barcode }
        ]
      })

      if (existingOrder) {
        return res.json({
          success: true,
          data: {
            barcode,
            status: 'duplicate',
            order_id: existingOrder._id,
            message: 'Pedido ya existe en el sistema'
          }
        })
      }

      // Crear nuevo pedido
      const mlInfo = this.parseMLBarcode(barcode)
      
      const newOrder = new Order({
        order_number: `ML-${Date.now()}`,
        tracking_number: barcode,
        company_id: req.body.client_id,
        
        ml_info: {
          barcode,
          ml_id: mlInfo.mlId || null,
          tracking_code: mlInfo.trackingCode || barcode,
          parsed_data: mlInfo
        },

        customer_name: 'Cliente MercadoLibre',
        customer_email: '',
        customer_phone: '',
        customer_address: 'Por completar',
        
        status: 'pending',
        source: 'ml_scanner',
        
        created_via_scanner: true,
        scanner_timestamp: new Date(),
        needs_completion: true,
        
        products: [{
          name: 'Producto MercadoLibre',
          quantity: 1,
          price: 0,
          sku: mlInfo.sku || barcode
        }],
        
        total_amount: 0,
        payment_method: 'mercadopago'
      })

      await newOrder.save()

      res.json({
        success: true,
        data: {
          barcode,
          status: 'created',
          order_id: newOrder._id,
          message: 'Pedido creado exitosamente'
        }
      })

    } catch (error) {
      console.error('Error procesando código ML:', error)
      res.status(500).json({
        success: false,
        message: 'Error procesando código de barras'
      })
    }
  }

  /**
   * Finalizar sesión de escaneo
   */
  static async finalizeSession(req, res) {
    try {
      const { client_id, scanned_orders, session_summary } = req.body

      // Actualizar estadísticas de la empresa
      await Company.findByIdAndUpdate(client_id, {
        $inc: {
          'stats.ml_orders_scanned': session_summary.created || 0,
          'stats.total_orders': session_summary.created || 0
        }
      })

      res.json({
        success: true,
        message: 'Sesión finalizada exitosamente',
        summary: session_summary
      })

    } catch (error) {
      console.error('Error finalizando sesión:', error)
      res.status(500).json({
        success: false,
        message: 'Error finalizando sesión'
      })
    }
  }

  /**
   * Obtener estadísticas ML
   */
  static async getMLStats(req, res) {
    try {
      const companyId = req.query.companyId

      const stats = {
        total_scanned: await Order.countDocuments({ 
          company_id: companyId, 
          created_via_scanner: true 
        }),
        pending_completion: await Order.countDocuments({ 
          company_id: companyId, 
          needs_completion: true 
        }),
        today_scanned: await Order.countDocuments({
          company_id: companyId,
          created_via_scanner: true,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        })
      }

      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      console.error('Error obteniendo stats ML:', error)
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas'
      })
    }
  }

  /**
   * Validar código ML
   */
  static isValidMLBarcode(barcode) {
    const mlPatterns = [
      /^ML\d+/i,
      /^\d{12,}$/,
      /^[A-Z]{2}\d+/,
      /^MLM\d+/i,
      /^MLA\d+/i,
      /^MLB\d+/i,
      /^MLC\d+/i
    ]
    
    return mlPatterns.some(pattern => pattern.test(barcode))
  }

  /**
   * Parsear código ML
   */
  static parseMLBarcode(barcode) {
    const info = {
      original: barcode,
      mlId: null,
      trackingCode: barcode,
      country: null,
      sku: null
    }

    if (barcode.startsWith('MLM')) info.country = 'Mexico'
    else if (barcode.startsWith('MLA')) info.country = 'Argentina'
    else if (barcode.startsWith('MLB')) info.country = 'Brasil'
    else if (barcode.startsWith('MLC')) info.country = 'Chile'

    const numericMatch = barcode.match(/\d+/)
    if (numericMatch) {
      info.mlId = numericMatch[0]
      info.sku = `ML-${info.mlId}`
    }

    return info
  }
}

module.exports = ScannerController