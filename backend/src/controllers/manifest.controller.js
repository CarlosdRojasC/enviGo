// backend/src/controllers/manifest.controller.js

const Manifest = require('../models/Manifest');
const Order = require('../models/Order');
const Company = require('../models/Company');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

// ==================== MÉTODOS AUXILIARES (FUERA DE LA CLASE) ====================

/**
 * Obtener manifiesto para generación de PDF
 */
async function getManifestForGeneration(id, user) {
  try {
    console.log('🔍 Buscando manifiesto para PDF:', id);
    
    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ ID inválido:', id);
      return null;
    }

    // Usar lógica de filtros según rol
    let filters = { _id: id };
    if (user.role !== 'admin') {
      filters.company_id = user.company_id;
      console.log('🏢 Filtrando por empresa para PDF:', user.company_id);
    }

    const manifest = await Manifest.findOne(filters)
      .populate('company_id', 'name address phone email')
      .populate('order_ids', 'order_number customer_name shipping_commune shipping_address customer_phone load1Packages')
      .lean();

    if (manifest) {
      console.log('✅ Manifiesto encontrado para PDF:', manifest.manifest_number);
      console.log('📊 Pedidos en manifiesto:', manifest.order_ids?.length || 0);
    } else {
      console.log('❌ Manifiesto no encontrado con filtros:', filters);
    }

    return manifest;
  } catch (error) {
    console.error('❌ Error obteniendo manifiesto para generación:', error);
    return null;
  }
}

/**
 * Crear buffer del PDF
 */
async function createPDFBuffer(manifest) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Iniciando creación de PDF...');
      
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => {
        console.log('✅ PDF creado exitosamente');
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header estilo enviGo
      doc.fontSize(20).text('MANIFIESTO DE RETIRO', { align: 'center' });
      doc.fontSize(16).text('enviGo Logistics', { align: 'center' });
      doc.moveDown(2);

      // Información de empresa y manifiesto
      doc.fontSize(14);
      doc.text(`Empresa: ${manifest.company_id?.name || 'No especificada'}`, { align: 'left' });
      doc.text(`Dirección: ${manifest.company_id?.address || 'No especificada'}`);
      if (manifest.company_id?.phone) {
        doc.text(`Teléfono: ${manifest.company_id.phone}`);
      }
      doc.moveDown();
      
      doc.text(`Manifiesto N°: ${manifest.manifest_number}`);
      doc.text(`Fecha de generación: ${new Date(manifest.generated_at).toLocaleDateString('es-CL')}`);
      doc.text(`Total de pedidos: ${manifest.total_orders}`);
      doc.text(`Total de bultos: ${manifest.total_packages || manifest.total_orders}`);
      doc.moveDown(2);

      // Verificar si hay pedidos
      if (!manifest.order_ids || manifest.order_ids.length === 0) {
        doc.fontSize(12).text('No hay pedidos en este manifiesto', { align: 'center' });
        doc.end();
        return;
      }

      // Tabla de pedidos
      const tableTop = doc.y;
      const itemHeight = 25;
      const pageHeight = doc.page.height - doc.page.margins.bottom;
      
      // Headers de la tabla
      doc.fontSize(12);
      doc.text('N° Pedido', 50, tableTop, { width: 100 });
      doc.text('Cliente', 150, tableTop, { width: 150 });
      doc.text('Comuna', 300, tableTop, { width: 100 });
      doc.text('Dirección', 400, tableTop, { width: 100 });
      doc.text('Bultos', 500, tableTop, { width: 50 });
      
      // Línea separadora
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();

      // Filas de datos
      let currentY = tableTop + 25;
      
      manifest.order_ids.forEach((order, i) => {
        // Verificar si necesitamos una nueva página
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = 50;
          
          // Repetir headers en nueva página
          doc.fontSize(12);
          doc.text('N° Pedido', 50, currentY, { width: 100 });
          doc.text('Cliente', 150, currentY, { width: 150 });
          doc.text('Comuna', 300, currentY, { width: 100 });
          doc.text('Dirección', 400, currentY, { width: 100 });
          doc.text('Bultos', 500, currentY, { width: 50 });
          
          doc.moveTo(50, currentY + 15)
             .lineTo(550, currentY + 15)
             .stroke();
          
          currentY += 25;
        }

        // Datos del pedido
        doc.fontSize(10);
        doc.text(order.order_number || 'N/A', 50, currentY, { width: 100 });
        doc.text(order.customer_name || 'N/A', 150, currentY, { width: 150 });
        doc.text(order.shipping_commune || 'N/A', 300, currentY, { width: 100 });
        
        // Dirección truncada si es muy larga
        const address = order.shipping_address || 'N/A';
        const truncatedAddress = address.length > 30 ? address.substring(0, 30) + '...' : address;
        doc.text(truncatedAddress, 400, currentY, { width: 100 });
        
        doc.text((order.load1Packages || 1).toString(), 500, currentY, { width: 50 });
        
        currentY += itemHeight;
      });

      // Sección de firmas (en nueva página si es necesario)
      if (currentY > pageHeight - 150) {
        doc.addPage();
        currentY = 100;
      } else {
        currentY += 50;
      }

      doc.fontSize(12);
      doc.text('FIRMAS', 50, currentY, { align: 'center', width: 500 });
      currentY += 30;

      // Firmas lado a lado
      doc.text('ENTREGADO POR:', 50, currentY);
      doc.text('RECIBIDO POR:', 300, currentY);
      currentY += 30;

      doc.text('Nombre: ________________________', 50, currentY);
      doc.text('Nombre: ________________________', 300, currentY);
      currentY += 25;

      doc.text('RUT: ____________________________', 50, currentY);
      doc.text('RUT: ____________________________', 300, currentY);
      currentY += 25;

      doc.text('Firma: ___________________________', 50, currentY);
      doc.text('Firma: ___________________________', 300, currentY);
      currentY += 25;

      doc.text('Fecha: ___________________________', 50, currentY);
      doc.text('Hora: ____________________________', 300, currentY);

      console.log('📄 Finalizando documento PDF...');
      doc.end();

    } catch (error) {
      console.error('❌ Error creando PDF:', error);
      reject(error);
    }
  });
}

// ==================== CLASE CONTROLADOR ====================

class ManifestController {
  

  async groupOrdersForPickup(req, res) {
    // El 'user' y 'company_id' vienen del authMiddleware que ya tienes
    const { orderIds } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere una lista de IDs de órdenes.' });
    }

    try {
      // 1. Obtener los datos de la empresa para la dirección de retiro
      const company = await Company.findById(companyId).lean();
      if (!company || !company.address) {
        return res.status(404).json({ message: 'Empresa o dirección de la empresa no encontrada.' });
      }

      // 2. Obtener los detalles de las órdenes para el snapshot
      const ordersForSnapshot = await Order.find({ _id: { $in: orderIds } }).lean();
      
      let totalPackages = 0;
      const communes = new Set();
      const orderSnapshots = ordersForSnapshot.map(order => {
        totalPackages += order.load1Packages || 1; // Suma los paquetes de cada orden
        communes.add(order.shipping_address.commune); // Agrega la comuna a un set para evitar duplicados
        return { // Crea el snapshot reducido para el manifiesto
          _id: order._id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          shipping_commune: order.shipping_address.commune,
          shipping_address: order.shipping_address.full_address,
          customer_phone: order.customer_phone,
          load1Packages: order.load1Packages || 1,
          notes: order.notes,
        };
      });

      // 3. Generar el número de manifiesto usando tu método estático
      const manifestNumber = await Manifest.generateManifestNumber(companyId);

      // 4. Crear la nueva instancia del Manifiesto con los campos actualizados
      const newManifest = new Manifest({
        manifest_number: manifestNumber,
        company_id: companyId,
        pickup_address: company.address, // <-- Usando el nuevo campo
        orders: orderIds, // <-- Renombrado de 'order_ids'
        total_orders: orderIds.length,
        total_packages: totalPackages,
        communes: Array.from(communes),
        status: 'pending_pickup', // <-- Usando el nuevo estado
        generated_by: userId,
        manifest_data: { // Tu excelente snapshot de datos
          company: {
            name: company.name,
            address: company.address.full_address,
            phone: company.phone,
            email: company.email,
          },
          orders: orderSnapshots,
          generation_date: new Date(),
          generated_by: req.user.full_name,
        }
      });

      await newManifest.save();

      // 5. Actualizar las órdenes para vincularlas al nuevo manifiesto
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { manifest_id: newManifest._id, status: 'ready_for_pickup' } }
      );

      console.log(`✅ Punto de Recolección Creado: ${manifestNumber}`);
      res.status(201).json({ 
        message: 'Punto de recolección creado exitosamente.', 
        manifest: newManifest 
      });

    } catch (error) {
      console.error('❌ Error agrupando órdenes para recolección:', error);
      res.status(500).json({ message: 'Error interno del servidor al crear el punto de recolección.' });
    }
  }

  // ==================== CREAR MANIFIESTO ====================
  async create(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    let transactionCommitted = false;
    
    try {
      const { orderIds } = req.body;
      
      // ✅ DEBUGGING: Verificar req.user completo
      console.log('🔍 DEBUG: req.user completo:', JSON.stringify(req.user, null, 2));
      console.log('🔍 DEBUG: req.user._id:', req.user._id);
      console.log('🔍 DEBUG: req.user.id:', req.user.id);
      console.log('🔍 DEBUG: req.user.userId:', req.user.userId);
      console.log('🔍 DEBUG: req.user.user_id:', req.user.user_id);
      
      // Validación inicial
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: 'Se requiere un array de IDs de pedidos válidos.',
          received: orderIds 
        });
      }

      console.log(`📋 Creando manifiesto para ${orderIds.length} pedidos`);
      console.log(`👤 Usuario: ${req.user.email}, Rol: ${req.user.role}, Empresa: ${req.user.company_id}`);

      // ✅ FIX: Determinar userId de múltiples formas posibles
      const userId = req.user._id || req.user.id || req.user.userId || req.user.user_id;
      
      if (!userId) {
        console.error('❌ No se encontró ID de usuario en req.user:', req.user);
        await session.abortTransaction();
        return res.status(400).json({ 
          error: 'No se pudo identificar al usuario. Token JWT inválido.',
          debug_user: req.user
        });
      }
      
      console.log('✅ Usuario ID encontrado:', userId);

      // Validar que los IDs son ObjectIds válidos
      const validObjectIds = orderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validObjectIds.length !== orderIds.length) {
        await session.abortTransaction();
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

      // ✅ FIX: Crear documento de manifiesto con generated_by correcto
      const manifest = new Manifest({
        manifest_number: manifestNumber,
        company_id: companyId,
        pickup_address: company.address,
        order_ids: orders.map(o => o._id),
        total_orders: orders.length,
        total_packages: totalPackages,
        communes,
        status: 'pending_pickup',
        generated_by: new mongoose.Types.ObjectId(userId),
        manifest_data: manifestData,
      });

      console.log('🔍 DEBUG: Datos del manifiesto antes de guardar:', {
        manifest_number: manifest.manifest_number,
        company_id: manifest.company_id,
        generated_by: manifest.generated_by,
        total_orders: manifest.total_orders
      });

      // Guardar manifiesto
      await manifest.save({ session });

      console.log('✅ Manifiesto guardado en base de datos');

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

      // ✅ FIX: Confirmar transacción y marcar como committed
      await session.commitTransaction();
      transactionCommitted = true;
      
      console.log(`✅ Manifiesto ${manifestNumber} creado exitosamente`);

      // TODO: Notificar via WebSocket cuando esté implementado
      // if (global.wsService && global.wsService.notifyManifestCreated) {
      //   global.wsService.notifyManifestCreated({
      //     manifest_id: manifest._id,
      //     manifest_number: manifestNumber,
      //     company_id: companyId,
      //     total_orders: orders.length
      //   });
      // }

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
      // ✅ FIX: Solo hacer abort si la transacción NO fue committed
      if (!transactionCommitted) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error('❌ Error haciendo abort de transacción:', abortError.message);
        }
      }
      
      console.error('❌ Error creando manifiesto:', error);
      
      // Manejo específico de errores
      if (error.name === 'ValidationError') {
        console.error('❌ Validation Error details:', error.errors);
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

      let filters = {};

      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      } else if (company_id) {
        filters.company_id = company_id;
      }

      if (status) filters.status = status;
      
      if (date_from || date_to) {
        filters.generated_at = {};
        if (date_from) filters.generated_at.$gte = new Date(date_from);
        if (date_to) filters.generated_at.$lte = new Date(date_to);
      }

      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 100);
      
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

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de manifiesto inválido' });
      }

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

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de manifiesto inválido' });
      }

      const validStatuses = ['generated', 'printed', 'picked_up', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Estado inválido',
          valid_statuses: validStatuses
        });
      }

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

      console.log(`📋 Estado actualizado: ${manifest.manifest_number} → ${status}`);

      // TODO: Notificar via WebSocket cuando esté implementado
      // if (global.wsService && global.wsService.notifyManifestStatusUpdated) {
      //   global.wsService.notifyManifestStatusUpdated({
      //     manifest_id: manifest._id,
      //     manifest_number: manifest.manifest_number,
      //     new_status: status,
      //     company_id: manifest.company_id
      //   });
      // }

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

  // ==================== GENERAR PDF (FIXED) ====================
  async generatePDF(req, res) {
    try {
      const { id } = req.params;

      console.log('📄 Generando PDF para manifiesto:', id);
      console.log('👤 Usuario solicitante:', req.user.email, req.user.role);

      // ✅ FIX: Usar función externa en lugar de this.getManifestForGeneration
      const manifest = await getManifestForGeneration(id, req.user);
      
      if (!manifest) {
        console.log('❌ Manifiesto no encontrado para PDF');
        return res.status(404).json({ error: 'Manifiesto no encontrado' });
      }

      console.log('✅ Manifiesto encontrado, generando PDF:', manifest.manifest_number);

      // ✅ FIX: Usar función externa en lugar de this.createPDFBuffer
      const pdfBuffer = await createPDFBuffer(manifest);
      
      // Configurar headers para descarga
      const filename = `manifest_${manifest.manifest_number}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log('✅ PDF generado y enviado exitosamente');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({ 
        error: 'Error generando PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ManifestController();