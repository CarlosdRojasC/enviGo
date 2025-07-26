// backend/src/controllers/manifest.controller.js

const Manifest = require('../models/Manifest');
const Order = require('../models/Order');
const Company = require('../models/Company');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

class ManifestController {
  
  // ==================== CREAR MANIFIESTO ====================
  async create(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { orderIds } = req.body;
      
      // Validación inicial
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ 
          error: 'Se requiere un array de IDs de pedidos válidos.',
          received: orderIds 
        });
      }

      console.log(`📋 Creando manifiesto para ${orderIds.length} pedidos`);
      console.log(`👤 Usuario: ${req.user.email}, Rol: ${req.user.role}, Empresa: ${req.user.company_id}`);

      // Validar que los IDs son ObjectIds válidos
      const validObjectIds = orderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validObjectIds.length !== orderIds.length) {
        return res.status(400).json({ 
          error: 'Algunos IDs de pedidos no son válidos',
          invalid_ids: orderIds.filter(id => !mongoose.Types.ObjectId.isValid(id))
        });
      }

      // Construir filtros según rol del usuario
      let filters = { '_id': { $in: validObjectIds } };
      
      if (req.user.role !== 'admin') {
        if (!req.user.company_id) {
          await session.abortTransaction();
          return res.status(403).json({ 
            error: 'Usuario no asociado a ninguna empresa',
            user_role: req.user.role 
          });
        }
        filters.company_id = req.user.company_id;
        console.log(`🏢 Filtrando órdenes por empresa: ${req.user.company_id}`);
      }

      // Obtener órdenes que cumplen los filtros
      const orders = await Order.find(filters).session(session).lean();
      
      console.log(`📊 Órdenes encontradas: ${orders.length} de ${orderIds.length} solicitadas`);

      if (orders.length === 0) {
        await session.abortTransaction();
        return res.status(404).json({ 
          error: 'No se encontraron pedidos válidos para el manifiesto',
          details: {
            requested: orderIds.length,
            found: 0,
            filters_applied: filters
          }
        });
      }

      // Validar que las órdenes no estén ya en un manifiesto activo
      const ordersWithManifest = orders.filter(order => 
        order.manifest_id && order.status === 'ready_for_pickup'
      );
      if (ordersWithManifest.length > 0) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Algunas órdenes ya están asignadas a un manifiesto activo',
          orders_with_manifest: ordersWithManifest.map(o => ({
            id: o._id,
            order_number: o.order_number,
            manifest_id: o.manifest_id,
            status: o.status
          }))
        });
      }

      // Determinar empresa del manifiesto
      const companyId = req.user.company_id || orders[0]?.company_id;
      if (!companyId) {
        await session.abortTransaction();
        return res.status(400).json({ error: 'No se pudo determinar la empresa del manifiesto' });
      }

      // Obtener datos de la empresa
      const company = await Company.findById(companyId).session(session).lean();
      if (!company) {
        await session.abortTransaction();
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      // Generar número de manifiesto único
      const manifestNumber = await Manifest.generateManifestNumber(companyId);

      // Calcular datos del manifiesto
      const totalPackages = orders.reduce((sum, order) => sum + (order.load1Packages || 1), 0);
      const communes = [...new Set(orders.map(o => o.shipping_commune).filter(Boolean))];

      // Crear snapshot de datos para preservar información histórica
      const manifestData = {
        company: {
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email
        },
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

      // Crear documento de manifiesto
      const manifest = new Manifest({
        manifest_number: manifestNumber,
        company_id: companyId,
        order_ids: orders.map(o => o._id),
        total_orders: orders.length,
        total_packages: totalPackages,
        communes,
        generated_by: req.user._id,
        manifest_data: manifestData
      });

      // Guardar manifiesto
      await manifest.save({ session });

      // Actualizar estado de las órdenes
      const updateResult = await Order.updateMany(
        { _id: { $in: orders.map(o => o._id) } },
        { 
          $set: { 
            status: 'ready_for_pickup',
            manifest_id: manifest._id,
            updated_at: new Date()
          }
        },
        { session }
      );

      console.log(`📦 Órdenes actualizadas: ${updateResult.modifiedCount} de ${orders.length}`);

      // Confirmar transacción
      await session.commitTransaction();

      console.log(`✅ Manifiesto ${manifestNumber} creado exitosamente`);

      // Notificar via WebSocket si está disponible
      if (global.wsService) {
        global.wsService.notifyManifestCreated({
          manifest_id: manifest._id,
          manifest_number: manifestNumber,
          company_id: companyId,
          total_orders: orders.length
        });
      }

      // Respuesta exitosa (compatible con tu frontend)
      res.status(201).json({
        message: 'Manifiesto creado exitosamente',
        manifest: {
          id: manifest._id,
          manifest_number: manifestNumber,
          total_orders: orders.length,
          total_packages: totalPackages,
          communes,
          status: manifest.status,
          company_name: company.name
        },
        manifest_data: manifestData
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error creando manifiesto:', error);
      
      // Manejo específico de errores
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: 'Error de validación',
          details: Object.values(error.errors).map(e => e.message)
        });
      }
      
      if (error.code === 11000) {
        return res.status(409).json({ 
          error: 'El número de manifiesto ya existe',
          details: error.keyValue
        });
      }
      
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      session.endSession();
    }
  }

  // ==================== LISTAR MANIFIESTOS ====================
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

      // Construir filtros
      let filters = {};

      // Filtros por rol (tu lógica actual)
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

      // Paginación
      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 100); // Max 100 por página
      
      // Consulta paralela para manifiestos y total
      const [manifests, total] = await Promise.all([
        Manifest.find(filters)
          .populate('company_id', 'name address')
          .populate('generated_by', 'full_name email')
          .sort({ generated_at: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Manifest.countDocuments(filters)
      ]);

      console.log(`📋 Manifiestos encontrados: ${manifests.length}, Total: ${total}`);

      res.json({
        manifests,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          has_next: skip + limitNum < total,
          has_prev: page > 1
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo manifiestos:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== OBTENER MANIFIESTO POR ID ====================
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de manifiesto inválido' });
      }

      // Construir filtros según rol (tu lógica actual)
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

      console.log(`📋 Manifiesto encontrado: ${manifest.manifest_number}`);

      res.json(manifest);

    } catch (error) {
      console.error('❌ Error obteniendo manifiesto:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== ACTUALIZAR ESTADO ====================
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, pickup_info } = req.body;

      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de manifiesto inválido' });
      }

      // Validar estado
      const validStatuses = ['generated', 'printed', 'picked_up', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Estado inválido',
          valid_statuses: validStatuses
        });
      }

      // Construir filtros según rol (tu lógica actual)
      let filters = { _id: id };
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      }

      const updateData = { status };
      
      // Agregar información específica según el estado
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

      console.log(`📋 Estado actualizado: ${manifest.manifest_number} → ${status}`);

      // Notificar via WebSocket si está disponible
      if (global.wsService) {
        global.wsService.notifyManifestStatusUpdated({
          manifest_id: manifest._id,
          manifest_number: manifest.manifest_number,
          new_status: status,
          company_id: manifest.company_id
        });
      }

      res.json({
        message: 'Estado actualizado exitosamente',
        manifest: {
          id: manifest._id,
          manifest_number: manifest.manifest_number,
          status: manifest.status,
          picked_up_at: manifest.picked_up_at
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== GENERAR PDF ====================
  async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const manifest = await this.getManifestForGeneration(id, req.user);
      if (!manifest) {
        return res.status(404).json({ error: 'Manifiesto no encontrado' });
      }

      const pdfBuffer = await this.createPDFBuffer(manifest);
      
      // Configurar headers para descarga
      const filename = `manifest_${manifest.manifest_number}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({ 
        error: 'Error generando PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  async getManifestForGeneration(id, user) {
    try {
      // Usar tu lógica de filtros actual
      let filters = { _id: id };
      if (user.role !== 'admin') {
        filters.company_id = user.company_id;
      }

      return await Manifest.findOne(filters)
        .populate('company_id', 'name address phone email')
        .populate('order_ids', 'order_number customer_name shipping_commune shipping_address customer_phone load1Packages')
        .lean();
    } catch (error) {
      console.error('❌ Error obteniendo manifiesto para generación:', error);
      return null;
    }
  }

  async createPDFBuffer(manifest) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header estilo enviGo
        doc.fontSize(20).text('MANIFIESTO DE RETIRO', { align: 'center' });
        doc.fontSize(16).text('enviGo Logistics', { align: 'center' });
        doc.moveDown();

        // Información de empresa
        doc.fontSize(14).text(`Empresa: ${manifest.company_id.name}`);
        doc.text(`Dirección: ${manifest.company_id.address || 'No especificada'}`);
        doc.text(`Teléfono: ${manifest.company_id.phone || 'No especificado'}`);
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
        
        // Línea separadora
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Filas de datos
        manifest.order_ids.forEach((order, i) => {
          const y = tableTop + 25 + (i * itemHeight);
          doc.text(order.order_number || '', 50, y);
          doc.text(order.customer_name || '', 150, y, { width: 140 });
          doc.text(order.shipping_commune || '', 300, y);
          doc.text((order.load1Packages || 1).toString(), 450, y);
        });

        // Sección de firmas
        const signatureY = doc.y + 50;
        doc.text('Entregado por:', 50, signatureY);
        doc.text('Nombre: ____________________', 50, signatureY + 20);
        doc.text('RUT: ____________________', 50, signatureY + 40);
        doc.text('Firma: ____________________', 50, signatureY + 60);
        
        doc.text('Recibido por:', 300, signatureY);
        doc.text('Nombre: ____________________', 300, signatureY + 20);
        doc.text('RUT: ____________________', 300, signatureY + 40);
        doc.text('Firma: ____________________', 300, signatureY + 60);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new ManifestController();