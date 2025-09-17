const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Order = require('../models/Order');
const User = require('../models/User');

// Middleware de autenticación simple para repartidores
function authenticateDriver(req, res, next) {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== process.env.DRIVER_SCANNER_TOKEN) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  
  next();
}

// 📋 Obtener lista de clientes activos
router.get('/clients', authenticateDriver, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = { is_active: true };
    
    // Búsqueda por nombre si se proporciona
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const clients = await Company.find(query)
      .select('_id name email phone address')
      .sort({ name: 1 })
      .limit(50);
    
    res.json({
      success: true,
      clients: clients.map(client => ({
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address
      }))
    });
    
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error obteniendo lista de clientes' });
  }
});

// 📱 Iniciar sesión de escaneo
router.post('/start-session', authenticateDriver, async (req, res) => {
  try {
    const { client_id, driver_name } = req.body;
    
    if (!client_id || !driver_name) {
      return res.status(400).json({ 
        error: 'ID del cliente y nombre del repartidor son requeridos' 
      });
    }
    
    // Verificar que el cliente existe
    const client = await Company.findById(client_id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // Crear ID de sesión único
    const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Guardar sesión en memoria o Redis (por simplicidad, en memoria)
    const sessionData = {
      id: sessionId,
      client_id: client_id,
      client_name: client.name,
      driver_name: driver_name,
      scanned_labels: [],
      created_at: new Date(),
      status: 'active'
    };
    
    // Almacenar sesión (usar Redis en producción)
    global.scanSessions = global.scanSessions || {};
    global.scanSessions[sessionId] = sessionData;
    
    console.log(`📱 Sesión iniciada: ${sessionId} - Cliente: ${client.name} - Repartidor: ${driver_name}`);
    
    res.json({
      success: true,
      session: {
        id: sessionId,
        client: {
          id: client._id,
          name: client.name
        },
        driver_name: driver_name,
        scanned_count: 0
      }
    });
    
  } catch (error) {
    console.error('Error iniciando sesión:', error);
    res.status(500).json({ error: 'Error iniciando sesión de escaneo' });
  }
});

// 🔍 Procesar código escaneado
router.post('/scan-label', authenticateDriver, async (req, res) => {
  try {
    const { session_id, barcode_value } = req.body;
    
    if (!session_id || !barcode_value) {
      return res.status(400).json({ 
        error: 'ID de sesión y código de barras son requeridos' 
      });
    }
    
    // Obtener sesión
    global.scanSessions = global.scanSessions || {};
    const session = global.scanSessions[session_id];
    
    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Sesión no válida o expirada' });
    }
    
    // Validar código de MercadoLibre
    const mlInfo = extractMLInfoFromBarcode(barcode_value.trim());
    
    if (!mlInfo.isValid) {
      return res.status(400).json({ 
        error: 'Código no es de MercadoLibre válido',
        details: mlInfo.error
      });
    }
    
    // Verificar duplicados en la sesión
    const isDuplicate = session.scanned_labels.some(label => 
      label.barcode_value === barcode_value.trim()
    );
    
    if (isDuplicate) {
      return res.status(400).json({ 
        error: 'Este código ya fue escaneado en esta sesión' 
      });
    }
    
    // Verificar si ya existe en la base de datos
    const existingOrder = await Order.findOne({ 
      $or: [
        { ml_order_id: mlInfo.orderId },
        { ml_tracking_number: mlInfo.trackingNumber },
        { ml_barcode_scanned: barcode_value.trim() }
      ]
    });
    
    if (existingOrder) {
      return res.status(400).json({ 
        error: 'Este código ya existe en el sistema',
        existing_order: existingOrder.order_number
      });
    }
    
    // Agregar a la sesión
    const scannedLabel = {
      id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      barcode_value: barcode_value.trim(),
      ml_info: mlInfo,
      scanned_at: new Date()
    };
    
    session.scanned_labels.push(scannedLabel);
    
    console.log(`✅ Código escaneado: ${barcode_value} - Sesión: ${session_id}`);
    
    res.json({
      success: true,
      label: scannedLabel,
      session: {
        id: session_id,
        scanned_count: session.scanned_labels.length,
        labels: session.scanned_labels
      }
    });
    
  } catch (error) {
    console.error('Error procesando escaneo:', error);
    res.status(500).json({ error: 'Error procesando código escaneado' });
  }
});

// 🗑️ Eliminar código escaneado
router.delete('/remove-scan/:session_id/:label_id', authenticateDriver, async (req, res) => {
  try {
    const { session_id, label_id } = req.params;
    
    global.scanSessions = global.scanSessions || {};
    const session = global.scanSessions[session_id];
    
    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Sesión no válida' });
    }
    
    // Encontrar y eliminar el label
    const labelIndex = session.scanned_labels.findIndex(label => label.id === label_id);
    
    if (labelIndex === -1) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }
    
    const removedLabel = session.scanned_labels.splice(labelIndex, 1)[0];
    
    console.log(`🗑️ Código eliminado: ${removedLabel.barcode_value} - Sesión: ${session_id}`);
    
    res.json({
      success: true,
      removed_label: removedLabel,
      session: {
        id: session_id,
        scanned_count: session.scanned_labels.length,
        labels: session.scanned_labels
      }
    });
    
  } catch (error) {
    console.error('Error eliminando código:', error);
    res.status(500).json({ error: 'Error eliminando código' });
  }
});

// ✅ Finalizar sesión y crear pedidos
router.post('/finalize-session', authenticateDriver, async (req, res) => {
  try {
    const { session_id } = req.body;
    
    global.scanSessions = global.scanSessions || {};
    const session = global.scanSessions[session_id];
    
    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Sesión no válida' });
    }
    
    if (session.scanned_labels.length === 0) {
      return res.status(400).json({ error: 'No hay códigos escaneados para procesar' });
    }
    
    session.status = 'processing';
    
    const results = {
      total_scanned: session.scanned_labels.length,
      created_orders: [],
      errors: []
    };
    
    // Crear pedidos uno por uno
    for (const label of session.scanned_labels) {
      try {
        const order = await createOrderFromMLLabel(label, session);
        results.created_orders.push({
          order_number: order.order_number,
          order_id: order._id,
          barcode: label.barcode_value
        });
        
      } catch (orderError) {
        console.error(`Error creando pedido para ${label.barcode_value}:`, orderError);
        results.errors.push({
          barcode: label.barcode_value,
          error: orderError.message
        });
      }
    }
    
    // Marcar sesión como completada
    session.status = 'completed';
    session.completed_at = new Date();
    session.results = results;
    
    console.log(`🎉 Sesión finalizada: ${session_id} - ${results.created_orders.length} pedidos creados`);
    
    res.json({
      success: true,
      results: {
        total_scanned: results.total_scanned,
        created_count: results.created_orders.length,
        error_count: results.errors.length,
        created_orders: results.created_orders,
        errors: results.errors,
        client_name: session.client_name,
        driver_name: session.driver_name
      }
    });
    
  } catch (error) {
    console.error('Error finalizando sesión:', error);
    res.status(500).json({ error: 'Error finalizando sesión' });
  }
});

// 📊 Obtener estado de sesión
router.get('/session/:session_id', authenticateDriver, async (req, res) => {
  try {
    const { session_id } = req.params;
    
    global.scanSessions = global.scanSessions || {};
    const session = global.scanSessions[session_id];
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        client_name: session.client_name,
        driver_name: session.driver_name,
        status: session.status,
        scanned_count: session.scanned_labels.length,
        labels: session.scanned_labels,
        created_at: session.created_at,
        completed_at: session.completed_at,
        results: session.results
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    res.status(500).json({ error: 'Error obteniendo estado de sesión' });
  }
});

// ==================== FUNCIONES AUXILIARES ====================

// Extraer información del código de barras ML
function extractMLInfoFromBarcode(barcodeValue) {
  try {
    // Patrón 1: ML seguido de números
    const mlOrderPattern = /^ML(\d+)[-_]?(\d+)?[-_]?(\d+)?$/i;
    const mlMatch = barcodeValue.match(mlOrderPattern);
    
    if (mlMatch) {
      return {
        isValid: true,
        type: 'ml_order',
        orderId: mlMatch[1],
        fullCode: barcodeValue
      };
    }

    // Patrón 2: Número puro de 10-20 dígitos
    const numberPattern = /^\d{10,20}$/;
    if (numberPattern.test(barcodeValue)) {
      return {
        isValid: true,
        type: 'tracking_number',
        trackingNumber: barcodeValue,
        fullCode: barcodeValue
      };
    }

    // Patrón 3: Código alfanumérico
    const alphanumericPattern = /^[A-Z0-9]{8,25}$/i;
    if (alphanumericPattern.test(barcodeValue)) {
      return {
        isValid: true,
        type: 'tracking_code',
        trackingCode: barcodeValue,
        fullCode: barcodeValue
      };
    }

    return {
      isValid: false,
      error: 'Formato no reconocido como MercadoLibre'
    };

  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

// Crear pedido desde label escaneado
async function createOrderFromMLLabel(label, session) {
  const mlInfo = label.ml_info;
  
  // Generar número de orden único
  const orderNumber = `ML${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  const orderData = {
    company_id: session.client_id,
    order_number: orderNumber,
    platform: 'mercadolibre',
    status: 'pending_info',
    
    // Información de MercadoLibre
    ml_order_id: mlInfo.orderId || null,
    ml_tracking_number: mlInfo.trackingNumber || null,
    ml_tracking_code: mlInfo.trackingCode || null,
    ml_barcode_scanned: label.barcode_value,
    
    // Información del escaneo
    source: 'driver_scanner',
    scanned_by: session.driver_name,
    scanned_at: label.scanned_at,
    session_id: session.id,
    
    // Campos por defecto (se completarán después)
    customer_name: 'Cliente MercadoLibre',
    shipping_address: 'Dirección por completar',
    shipping_commune: 'Comuna por completar',
    total_amount: 0,
    
    // Metadatos
    needs_completion: true,
    created_at: new Date()
  };
  
  const order = new Order(orderData);
  await order.save();
  
  return order;
}

module.exports = router;