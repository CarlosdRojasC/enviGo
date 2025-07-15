// backend/src/services/websocket.service.js - VERSIÓN AVANZADA
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

class WebSocketService {
  constructor(server) {
    // Crear servidor WebSocket con autenticación
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    // Almacenar conexiones por categorías
    this.connections = new Map(); // ws -> userInfo
    this.adminClients = new Set(); // Solo administradores
    this.companyClients = new Map(); // companyId -> Set([ws1, ws2, ...])
    
    this.setupEventHandlers();
    console.log('🔗 WebSocket Server avanzado iniciado en /ws');
  }

  // Verificar autenticación del cliente
  verifyClient(info) {
    const url = new URL(info.req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.warn('❌ WS: Conexión rechazada - sin token');
      return false;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      console.log(`🔐 WS: Token válido para ${decoded.email} (${decoded.role})`);
      return true;
    } catch (error) {
      console.warn('❌ WS: Token inválido:', error.message);
      return false;
    }
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      console.log(`🔗 Nueva conexión WS: ${user.email} (${user.role}) - Empresa: ${user.company_id || 'N/A'}`);
      
      // Configurar cliente
      ws.user = user;
      ws.isAlive = true;
      
      // Almacenar conexión general
      this.connections.set(ws, user);
      
      // Categorizar por rol y empresa
      if (user.role === ROLES.ADMIN) {
        this.adminClients.add(ws);
        console.log(`👑 Admin conectado: ${user.email}`);
      } else if (user.company_id) {
        const companyId = user.company_id.toString();
        if (!this.companyClients.has(companyId)) {
          this.companyClients.set(companyId, new Set());
        }
        this.companyClients.get(companyId).add(ws);
        console.log(`🏢 Usuario de empresa conectado: ${user.email} -> Empresa ${companyId}`);
      }
      
      // Event handlers del cliente
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(ws, message);
        } catch (error) {
          // Si no es JSON, tratarlo como mensaje simple
          console.log(`📨 Mensaje simple de ${user.email}:`, data.toString());
          this.sendToClient(ws, 'echo', {
            message: 'Servidor recibió: ' + data.toString()
          });
        }
      });
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('close', () => {
        this.removeConnection(ws);
        console.log(`🔌 Conexión cerrada: ${user.email}`);
      });
      
      ws.on('error', (error) => {
        console.error(`❌ WS Error para ${user.email}:`, error);
        this.removeConnection(ws);
      });
      
      // Enviar mensaje de bienvenida personalizado
      this.sendToClient(ws, 'connection_established', {
        message: `¡Bienvenido ${user.email}! Conectado al sistema de notificaciones enviGo`,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          company_id: user.company_id
        },
        server_time: new Date().toLocaleString('es-CL'),
        permissions: this.getUserPermissions(user)
      });
    });
    
    // Heartbeat para mantener conexiones vivas
    this.startHeartbeat();
  }

handleClientMessage(ws, message) {
  const { type, data } = message;
  const user = ws.user;
  
  // Silenciar pings para evitar spam en consola
  if (type !== 'ping') {
    console.log(`📥 Mensaje de ${user.email}: ${type}`);
  }
  
  switch (type) {
    case 'ping':
      this.sendToClient(ws, 'pong', { timestamp: Date.now() });
      // NO hacer console.log para pings
      break;
      
    case 'get_my_permissions':
      this.sendToClient(ws, 'permissions', this.getUserPermissions(user));
      break;
      
    case 'subscribe_to_company':
      // Solo admins pueden suscribirse a empresas específicas
      if (user.role === ROLES.ADMIN && data.companyId) {
        ws.subscribedCompanies = ws.subscribedCompanies || new Set();
        ws.subscribedCompanies.add(data.companyId);
        this.sendToClient(ws, 'subscription_confirmed', {
          message: `Suscrito a notificaciones de empresa ${data.companyId}`
        });
      }
      break;
      
    case 'simulate_notification':
      // Para testing - solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        this.broadcast('order_status_changed', {
          ...data,
          simulated: true,
          timestamp: new Date().toISOString()
        });
      }
      break;
      
    case 'get_connection_stats':
      // Permitir que los clientes soliciten estadísticas
      this.sendToClient(ws, 'connection_stats', this.getStats());
      break;
      
    default:
      console.warn(`⚠️ WS: Tipo de mensaje desconocido: ${type}`);
      this.sendToClient(ws, 'error', {
        message: `Tipo de mensaje desconocido: ${type}`
      });
  }
}

  removeConnection(ws) {
    const user = ws.user;
    this.connections.delete(ws);
    
    if (user.role === ROLES.ADMIN) {
      this.adminClients.delete(ws);
    } else if (user.company_id) {
      const companyClients = this.companyClients.get(user.company_id.toString());
      if (companyClients) {
        companyClients.delete(ws);
        if (companyClients.size === 0) {
          this.companyClients.delete(user.company_id.toString());
        }
      }
    }
  }

  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log(`💀 Eliminando conexión muerta: ${ws.user?.email}`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Cada 30 segundos
  }

  getUserPermissions(user) {
    const permissions = {
      canViewAllOrders: user.role === ROLES.ADMIN,
      canViewCompanyOrders: user.role !== ROLES.ADMIN && !!user.company_id,
      canAssignDrivers: user.role === ROLES.ADMIN,
      canManageCompanies: user.role === ROLES.ADMIN,
      role: user.role,
      company_id: user.company_id
    };
    return permissions;
  }

  // ==================== MÉTODOS DE NOTIFICACIÓN ====================

  sendToClient(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    return false;
  }

  // Notificar solo a administradores
  notifyAdmins(type, data) {
    let sentCount = 0;
    const message = JSON.stringify({
      type,
      data: { ...data, target: 'admins' },
      timestamp: new Date().toISOString()
    });
    
    this.adminClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
    
    console.log(`👑 Notificación enviada a ${sentCount} administradores: ${type}`);
    return sentCount;
  }

  // Notificar solo a una empresa específica
  notifyCompany(companyId, type, data) {
    const companyClients = this.companyClients.get(companyId.toString());
    if (!companyClients || companyClients.size === 0) {
      console.log(`⚠️ No hay usuarios conectados para empresa ${companyId}`);
      return 0;
    }
    
    let sentCount = 0;
    const message = JSON.stringify({
      type,
      data: { ...data, target: 'company', company_id: companyId },
      timestamp: new Date().toISOString()
    });
    
    companyClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
    
    console.log(`🏢 Notificación enviada a ${sentCount} usuarios de empresa ${companyId}: ${type}`);
    return sentCount;
  }

  // Notificar sobre cambios en una orden específica
  notifyOrderUpdate(order, eventType = 'order_updated') {
    const companyId = order.company_id._id || order.company_id;
    const companyName = order.company_id?.name || 'Empresa';
    
    const orderData = {
      order_id: order._id,
      order_number: order.order_number,
      status: order.status,
      customer_name: order.customer_name,
      shipping_commune: order.shipping_commune,
      company_id: companyId,
      company_name: companyName,
      updated_at: order.updated_at,
      eventType,
      tracking_url: order.shipday_tracking_url,
      driver_name: order.driver_info?.name
    };

    // Determinar mensaje y prioridad según el evento
    let notificationData = {};
    switch (eventType) {
      case 'driver_assigned':
        notificationData = {
          message: `👨‍💼 Conductor asignado a pedido #${order.order_number}`,
          icon: '👨‍💼',
          priority: 'medium',
          type: 'driver_assigned'
        };
        break;
      case 'picked_up':
        notificationData = {
          message: `🚚 Pedido #${order.order_number} recogido y en camino`,
          icon: '🚚',
          priority: 'medium',
          type: 'picked_up'
        };
        break;
      case 'delivered':
        notificationData = {
          message: `✅ Pedido #${order.order_number} entregado exitosamente`,
          icon: '✅',
          priority: 'high',
          type: 'delivered'
        };
        break;
      case 'proof_uploaded':
        notificationData = {
          message: `📸 Prueba de entrega disponible para pedido #${order.order_number}`,
          icon: '📸',
          priority: 'medium',
          type: 'proof_uploaded'
        };
        break;
      default:
        notificationData = {
          message: `📦 Pedido #${order.order_number} actualizado`,
          icon: '📦',
          priority: 'low',
          type: 'status_updated'
        };
    }

    // Notificar a la empresa (mensaje personalizado para ellos)
    const companyMessage = {
      ...orderData,
      ...notificationData,
      message: notificationData.message,
      for_company: true
    };
    this.notifyCompany(companyId, 'order_status_changed', companyMessage);

    // Notificar a administradores (mensaje con contexto de empresa)
    const adminMessage = {
      ...orderData,
      ...notificationData,
      message: `${notificationData.message} (${companyName})`,
      for_admin: true
    };
    this.notifyAdmins('order_status_changed', adminMessage);

    return {
      company_notifications: this.companyClients.get(companyId.toString())?.size || 0,
      admin_notifications: this.adminClients.size
    };
  }

  // Notificar nueva orden (solo a admins)
  notifyNewOrder(order) {
    const companyName = order.company_id?.name || 'Empresa';
    
    this.notifyAdmins('new_order', {
      order_id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      company_name: companyName,
      company_id: order.company_id._id || order.company_id,
      message: `🆕 Nueva orden #${order.order_number} de ${companyName}`,
      icon: '🆕',
      priority: 'high'
    });
  }

  // Obtener estadísticas detalladas
  getStats() {
    const companyStats = {};
    this.companyClients.forEach((clients, companyId) => {
      companyStats[companyId] = clients.size;
    });

    return {
      total_connections: this.connections.size,
      admin_connections: this.adminClients.size,
      company_connections: this.connections.size - this.adminClients.size,
      companies_connected: this.companyClients.size,
      company_breakdown: companyStats,
      timestamp: new Date().toISOString()
    };
  }

  // Broadcast general (para testing)
  broadcast(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    let sentCount = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`📢 Broadcast enviado a ${sentCount} clientes: ${type}`);
    return sentCount;
  }
}

module.exports = WebSocketService;