// backend/src/controllers/manifest.controller.js

const Manifest = require('../models/Manifest');
const Order = require('../models/Order');
const Company = require('../models/Company');
const PDFDocument = require('pdfkit'); // npm install pdfkit
const ExcelJS = require('exceljs'); // npm install exceljs
const fs = require('fs').promises;
const path = require('path');

class ManifestController {
  
  // Crear y guardar manifiesto
  async create(req, res) {
    try {
      const { orderIds } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
      }

      console.log(`📋 Creando manifiesto para ${orderIds.length} pedidos`);

      // Filtros según rol
      let filters = { '_id': { $in: orderIds } };
      if (req.user.role !== 'admin') {
        if (!req.user.company_id) {
          return res.status(403).json({ error: 'Usuario no asociado a ninguna empresa' });
        }
        filters.company_id = req.user.company_id;
      }

      // Obtener pedidos y empresa
      const orders = await Order.find(filters).lean();
      const companyId = req.user.company_id || orders[0]?.company_id;
      const company = await Company.findById(companyId).lean();

      if (orders.length === 0) {
        return res.status(404).json({ error: 'No se encontraron pedidos para el manifiesto' });
      }

      // Generar número de manifiesto
      const manifestNumber = await Manifest.generateManifestNumber(companyId);

      // Calcular datos del manifiesto
      const totalPackages = orders.reduce((sum, order) => sum + (order.load1Packages || 1), 0);
      const communes = [...new Set(orders.map(o => o.shipping_commune).filter(Boolean))];

      // Crear snapshot de datos
      const manifestData = {
        company,
        orders: orders.map(order => ({
          _id: order._id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          shipping_commune: order.shipping_commune,
          shipping_address: order.shipping_address,
          customer_phone: order.customer_phone,
          load1Packages: order.load1Packages || 1,
          notes: order.notes
        })),
        generation_date: new Date(),
        generated_by: req.user.email
      };

      // Crear manifiesto en BD
      const manifest = new Manifest({
        manifest_number: manifestNumber,
        company_id: companyId,
        order_ids: orderIds,
        total_orders: orders.length,
        total_packages: totalPackages,
        communes,
        generated_by: req.user._id,
        manifest_data: manifestData
      });

      await manifest.save();

      // Actualizar estado de pedidos
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { 
          $set: { 
            status: 'ready_for_pickup',
            manifest_id: manifest._id,
            updated_at: new Date()
          }
        }
      );

      console.log(`✅ Manifiesto ${manifestNumber} creado exitosamente`);

      res.status(201).json({
        message: 'Manifiesto creado exitosamente',
        manifest: {
          id: manifest._id,
          manifest_number: manifestNumber,
          total_orders: orders.length,
          total_packages: totalPackages,
          communes,
          status: manifest.status
        },
        manifest_data: manifestData
      });

    } catch (error) {
      console.error('❌ Error creando manifiesto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Listar manifiestos
  async getAll(req, res) {
    try {
      const { 
        company_id, 
        status, 
        date_from, 
        date_to, 
        page = 1, 
        limit = 50 
      } = req.query;

      let filters = {};

      // Filtros por rol
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      } else if (company_id) {
        filters.company_id = company_id;
      }

      // Filtros adicionales
      if (status) filters.status = status;
      
      if (date_from || date_to) {
        filters.generated_at = {};
        if (date_from) filters.generated_at.$gte = new Date(date_from);
        if (date_to) filters.generated_at.$lte = new Date(date_to);
      }

      const skip = (page - 1) * limit;
      
      const [manifests, total] = await Promise.all([
        Manifest.find(filters)
          .populate('company_id', 'name address')
          .populate('generated_by', 'full_name email')
          .sort({ generated_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Manifest.countDocuments(filters)
      ]);

      res.json({
        manifests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo manifiestos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener manifiesto específico
  async getById(req, res) {
    try {
      const { id } = req.params;

      let filters = { _id: id };
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      }

      const manifest = await Manifest.findOne(filters)
        .populate('company_id', 'name address phone email')
        .populate('generated_by', 'full_name email')
        .populate('order_ids', 'order_number customer_name shipping_commune shipping_address customer_phone load1Packages status')
        .lean();

      if (!manifest) {
        return res.status(404).json({ error: 'Manifiesto no encontrado' });
      }

      res.json(manifest);

    } catch (error) {
      console.error('❌ Error obteniendo manifiesto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Generar PDF del manifiesto
  async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const manifest = await this.getManifestForGeneration(id, req.user);
      if (!manifest) {
        return res.status(404).json({ error: 'Manifiesto no encontrado' });
      }

      const pdfBuffer = await this.createPDFBuffer(manifest);
      
      // Guardar archivo
      const filename = `manifest_${manifest.manifest_number}.pdf`;
      const filepath = await this.saveFile(pdfBuffer, filename, 'pdf');
      
      // Actualizar manifiesto con info del archivo
      await Manifest.findByIdAndUpdate(id, {
        $push: {
          files: {
            type: 'pdf',
            filename,
            file_path: filepath,
            file_size: pdfBuffer.length
          }
        }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({ error: 'Error generando PDF' });
    }
  }

  // Actualizar estado del manifiesto
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, pickup_info } = req.body;

      let filters = { _id: id };
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      }

      const updateData = { status };
      
      if (status === 'picked_up') {
        updateData.picked_up_at = new Date();
        if (pickup_info) {
          updateData.pickup_info = pickup_info;
        }
      }

      const manifest = await Manifest.findOneAndUpdate(
        filters,
        updateData,
        { new: true }
      );

      if (!manifest) {
        return res.status(404).json({ error: 'Manifiesto no encontrado' });
      }

      res.json({
        message: 'Estado actualizado exitosamente',
        manifest
      });

    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Métodos auxiliares
  async getManifestForGeneration(id, user) {
    let filters = { _id: id };
    if (user.role !== 'admin') {
      filters.company_id = user.company_id;
    }

    return await Manifest.findOne(filters)
      .populate('company_id')
      .populate('order_ids')
      .lean();
  }

  async createPDFBuffer(manifest) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('MANIFIESTO DE RETIRO', { align: 'center' });
        doc.fontSize(16).text('enviGo Logistics', { align: 'center' });
        doc.moveDown();

        // Información de empresa
        doc.fontSize(14).text(`Empresa: ${manifest.company_id.name}`);
        doc.text(`Dirección: ${manifest.company_id.address || 'No especificada'}`);
        doc.text(`Manifiesto: ${manifest.manifest_number}`);
        doc.text(`Fecha: ${new Date(manifest.generated_at).toLocaleDateString('es-CL')}`);
        doc.text(`Total Pedidos: ${manifest.total_orders}`);
        doc.moveDown();

        // Tabla de pedidos
        const tableTop = doc.y;
        const itemHeight = 20;
        
        // Headers
        doc.fontSize(12).text('N° Pedido', 50, tableTop);
        doc.text('Cliente', 150, tableTop);
        doc.text('Comuna', 300, tableTop);
        doc.text('Bultos', 450, tableTop);
        
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Filas
        manifest.order_ids.forEach((order, i) => {
          const y = tableTop + 25 + (i * itemHeight);
          doc.text(order.order_number || '', 50, y);
          doc.text(order.customer_name || '', 150, y, { width: 140 });
          doc.text(order.shipping_commune || '', 300, y);
          doc.text((order.load1Packages || 1).toString(), 450, y);
        });

        // Firmas
        const signatureY = doc.y + 50;
        doc.text('Nombre: ____________________', 50, signatureY);
        doc.text('RUT: ____________________', 250, signatureY);
        doc.text('Firma: ____________________', 450, signatureY);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async saveFile(buffer, filename, type) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'manifests');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);
    
    return filepath;
  }
}

module.exports = new ManifestController();