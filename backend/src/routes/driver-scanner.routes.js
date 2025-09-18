// ==================== FIX PARA driver-scanner.routes.js ====================

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Order = require('../models/Order');
const User = require('../models/User');

// 🔧 FIX: Middleware de parsing explícito para estas rutas
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// 🔧 FIX: Middleware de autenticación mejorado con debugging
function authenticateDriver(req, res, next) {
  console.log('🔍 [DEBUG] authenticateDriver - req.query:', req.query);
  console.log('🔍 [DEBUG] authenticateDriver - req.body:', req.body);
  console.log('🔍 [DEBUG] authenticateDriver - req.headers:', req.headers);
  
  // 🔧 FIX: Verificar que req.query existe
  if (!req.query) {
    console.error('❌ req.query es undefined');
    req.query = {}; // Inicializar como objeto vacío
  }
  
  // Obtener token desde múltiples fuentes
  const tokenFromHeader = req.headers.authorization?.replace('Bearer ', '');
  const tokenFromQuery = req.query.token;
  const tokenFromBody = req.body?.token;
  
  const providedToken = tokenFromHeader || tokenFromQuery || tokenFromBody;
  
  console.log('🔍 [DEBUG] Tokens encontrados:', {
    header: tokenFromHeader ? 'SÍ' : 'NO',
    query: tokenFromQuery ? 'SÍ' : 'NO',
    body: tokenFromBody ? 'SÍ' : 'NO',
    final: providedToken ? 'SÍ' : 'NO'
  });
  
  // Token esperado desde variables de entorno
  const expectedToken = process.env.DRIVER_SCANNER_TOKEN;
  
  if (!expectedToken) {
    console.error('❌ DRIVER_SCANNER_TOKEN no está configurado en las variables de entorno');
    return res.status(500).json({ 
      error: 'Configuración del servidor incompleta' 
    });
  }
  
  if (!providedToken) {
    console.warn('⚠️ No se proporcionó token');
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      hint: 'Contacta al administrador para obtener acceso',
      debug: {
        query_received: req.query,
        body_received: req.body,
        method: req.method,
        url: req.url
      }
    });
  }
  
  if (providedToken !== expectedToken) {
    console.warn(`⚠️ Intento de acceso con token inválido: ${providedToken.substring(0, 8)}...`);
    return res.status(401).json({ 
      error: 'Token de acceso inválido' 
    });
  }
  
  console.log('✅ Token válido, acceso autorizado');
  // Token válido, continuar
  next();
}

// 🔐 Verificar si el token es válido
router.get('/verify-access', authenticateDriver, async (req, res) => {
  try {
    console.log('🔍 [DEBUG] verify-access endpoint alcanzado');
    
    // Token válido, devolver información del sistema
    res.json({
      valid: true,
      message: 'Acceso autorizado',
      system_info: {
        name: 'EnviGo Driver Scanner',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error verificando acceso:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      valid: false
    });
  }
});

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
    
    console.log(`📋 Enviando ${clients.length} clientes`);
    
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
    
    // Guardar sesión en memoria
    const sessionData = {
      id: sessionId,
      client_id: client_id,
      client_name: client.name,
      driver_name: driver_name,
      scanned_labels: [],
      created_at: new Date(),
      status: 'active'
    };
    
    // Almacenar sesión
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
        error: 'ID de sesión y valor del código de barras son requeridos' 
      });
    }
    
    global.scanSessions = global.scanSessions || {};
    const session = global.scanSessions[session_id];
    
    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Sesión no válida o expirada' });
    }
    
    // Verificar duplicados
    const isDuplicate = session.scanned_labels.some(label => 
      label.barcode_value === barcode_value
    );
    
    if (isDuplicate) {
      return res.status(400).json({ error: 'Código ya escaneado en esta sesión' });
    }
    
    // Agregar código a la sesión
    const labelData = {
      id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode_value: barcode_value,
      scanned_at: new Date(),
      driver_name: session.driver_name
    };
    
    session.scanned_labels.push(labelData);
    
    console.log(`🔍 Código escaneado: ${barcode_value} - Sesión: ${session_id}`);
    
    res.json({
      success: true,
      label: labelData,
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

// ✅ Finalizar sesión y crear pedidos simulados
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
      errors: [],
      created_count: 0,
      error_count: 0
    };
    
    // Simular creación de pedidos
    for (const label of session.scanned_labels) {
      try {
        // Simular pedido creado exitosamente
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        
        results.created_orders.push({
          order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          order_number: orderNumber,
          barcode: label.barcode_value,
          status: 'created'
        });
        
        results.created_count++;
        
      } catch (error) {
        results.errors.push({
          barcode: label.barcode_value,
          error: error.message
        });
        results.error_count++;
      }
    }
    
    session.status = 'completed';
    session.completed_at = new Date();
    session.results = results;
    
    console.log(`✅ Sesión finalizada: ${session_id} - ${results.created_count} pedidos creados, ${results.error_count} errores`);
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('Error finalizando sesión:', error);
    res.status(500).json({ error: 'Error finalizando sesión' });
  }
});

module.exports = router;