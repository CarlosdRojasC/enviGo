// backend/src/services/websocket.service.js - VERSIÓN MEJORADA
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    // Almacenamiento avanzado de conexiones
    this.connections = new Map();
    this.adminClients = new Set();
    this.companyClients = new Map();
    this.driverClients = new Map();
    this.roomSubscriptions = new Map(); // Para salas específicas
    
    // Métricas y estadísticas
    this.stats = {
      totalConnections: 0,
      totalMessages: 0,
      connectionsByRole: new Map(),
      startTime: new Date()
    };
    
    this.setupEventHandlers();
    this.startHeartbeat();
    console.log('🔗 WebSocket Service Avanzado iniciado');
  }

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
      return true;
    } catch (error) {
      console.warn('❌ WS: Token inválido:', error.message);
      return false;
    }
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      console.log(`🔗 Nueva conexión: ${user.email} (${user.role})`);
      
      // Configurar cliente
      ws.user = user;
      ws.isAlive = true;
      ws.subscribedRooms = new Set();
      ws.connectionTime = new Date();
      
      // Almacenar conexión
      this.connections.set(ws, user);
      this.categorizeClient(ws, user);
      this.updateStats(user.role, 'connect');
      
      // Event handlers del cliente
      ws.on('message', this.handleMessage.bind(this, ws));
      ws.on('close', this.handleDisconnect.bind(this, ws));
      ws.on('pong', () => { ws.isAlive = true; });
      
      // Enviar bienvenida
      this.sendToClient(ws, 'connected', {
        user: { name: user.name, role: user.role },
        server_time: new Date(),
        permissions: this.getUserPermissions(user)
      });
    });
  }

  categorizeClient(ws, user) {
    // Categorizar por rol
    if (user.role === ROLES.ADMIN) {
      this.adminClients.add(ws);
    } else if (user.company_id) {
      const companyId = user.company_id.toString();
      if (!this.companyClients.has(companyId)) {
        this.companyClients.set(companyId, new Set());
      }
      this.companyClients.get(companyId).add(ws);
    }
    
    // Si es conductor
    if (user.role === 'driver' && user.driver_id) {
      this.driverClients.set(user.driver_id.toString(), ws);
    }
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Mensaje recibido de ${ws.user.email}:`, message.type);
      
      this.stats.totalMessages++;
      
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, 'pong', { timestamp: new Date() });
          break;
          
        case 'update_location':
          this.handleLocationUpdate(ws, message.data);
          break;

        case 'subscribe_to_room':
          this.subscribeToRoom(ws, message.data.room);
          break;
          
        case 'unsubscribe_from_room':
          this.unsubscribeFromRoom(ws, message.data.room);
          break;
          
        case 'get_stats':
          if (ws.user.role === ROLES.ADMIN) {
            this.sendToClient(ws, 'stats', this.getSystemStats());
          }
          break;
          
        case 'broadcast_to_company':
          if (ws.user.role === ROLES.ADMIN) {
            this.broadcastToCompany(message.data.companyId, message.data.event, message.data.payload);
          }
          break;
          
        default:
          console.log(`⚠️ Tipo de mensaje no reconocido: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
    }
  }

handleLocationUpdate(ws, data) {
    const { latitude, longitude, heading, speed } = data;
    const user = ws.user;

    // Solo procesar si es conductor
    if (user.role !== 'driver') return;

    const payload = {
      driver_id: user.driver_id || user.id,
      driver_name: user.name || user.full_name || 'Conductor',
      location: { latitude, longitude, heading, speed },
      timestamp: new Date()
    };

    // 1. Enviar SIEMPRE a los Admins Generales (Tú)
    this.notifyAdmins('driver_location_update', payload);

    // 2. Enviar al Dueño de la Empresa (si el conductor pertenece a una)
    if (user.company_id) {
      this.notifyCompany(user.company_id.toString(), 'driver_location_update', payload);
    }
  }

  handleDisconnect(ws) {
    const user = ws.user;
    console.log(`🔌 Desconexión: ${user.email}`);
    
    // Limpiar de todas las categorías
    this.connections.delete(ws);
    this.adminClients.delete(ws);
    
    if (user.company_id) {
      const companyClients = this.companyClients.get(user.company_id.toString());
      if (companyClients) {
        companyClients.delete(ws);
        if (companyClients.size === 0) {
          this.companyClients.delete(user.company_id.toString());
        }
      }
    }
    
    if (user.driver_id) {
      this.driverClients.delete(user.driver_id.toString());
    }
    
    // Limpiar suscripciones a salas
    ws.subscribedRooms?.forEach(room => {
      this.unsubscribeFromRoom(ws, room);
    });
    
    this.updateStats(user.role, 'disconnect');
  }

  // ==================== NOTIFICACIONES AVANZADAS ====================

  notifyOrderUpdate(order, eventType) {
    const notificationData = {
      order_id: order._id,
      order_number: order.order_number,
      status: order.status,
      customer_name: order.customer_name,
      company_id: order.company_id,
      eventType,
      timestamp: new Date(),
      message: this.getEventMessage(order, eventType),
      tracking_url: order.shipday_tracking_url,
      driver_info: order.driver_info
    };

    // Enviar a la empresa específica
    const sentToCompany = this.notifyCompany(order.company_id.toString(), 'order_status_changed', notificationData);
    
    // Enviar a admins
    const sentToAdmins = this.notifyAdmins('order_status_changed', notificationData);
    
    // Enviar a conductor específico si aplica
    let sentToDriver = 0;
    if (order.shipday_driver_id && this.driverClients.has(order.shipday_driver_id)) {
      this.notifyDriver(order.shipday_driver_id, 'order_assigned', notificationData);
      sentToDriver = 1;
    }

    console.log(`📡 Notificación enviada: ${sentToCompany} empresa, ${sentToAdmins} admins, ${sentToDriver} conductor`);
    return sentToCompany + sentToAdmins + sentToDriver;
  }

  notifyNewOrder(order) {
    const notificationData = {
      order_id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      company_id: order.company_id,
      channel: order.channel_name,
      total_amount: order.total_amount,
      timestamp: new Date(),
      message: `Nueva orden #${order.order_number} desde ${order.channel_name}`
    };

    const sentToCompany = this.notifyCompany(order.company_id.toString(), 'new_order', notificationData);
    const sentToAdmins = this.notifyAdmins('new_order', notificationData);

    console.log(`🆕 Nueva orden notificada: ${sentToCompany} empresa, ${sentToAdmins} admins`);
    return sentToCompany + sentToAdmins;
  }

  // ==================== MÉTODOS DE ENVÍO ====================

  sendToClient(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data, timestamp: new Date() }));
      return true;
    }
    return false;
  }

  broadcast(type, data) {
    let sent = 0;
    this.connections.forEach((user, ws) => {
      if (this.sendToClient(ws, type, data)) {
        sent++;
      }
    });
    return sent;
  }

  notifyCompany(companyId, type, data) {
    const clients = this.companyClients.get(companyId);
    if (!clients) return 0;
    
    let sent = 0;
    clients.forEach(ws => {
      if (this.sendToClient(ws, type, data)) {
        sent++;
      }
    });
    return sent;
  }

  notifyAdmins(type, data) {
    let sent = 0;
    this.adminClients.forEach(ws => {
      if (this.sendToClient(ws, type, data)) {
        sent++;
      }
    });
    return sent;
  }

  notifyDriver(driverId, type, data) {
    const driverWs = this.driverClients.get(driverId);
    if (driverWs) {
      return this.sendToClient(driverWs, type, data) ? 1 : 0;
    }
    return 0;
  }

  // ==================== SALAS Y SUSCRIPCIONES ====================

  subscribeToRoom(ws, room) {
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    
    this.roomSubscriptions.get(room).add(ws);
    ws.subscribedRooms.add(room);
    
    this.sendToClient(ws, 'subscribed', { room, timestamp: new Date() });
    console.log(`📺 ${ws.user.email} suscrito a sala: ${room}`);
  }

  unsubscribeFromRoom(ws, room) {
    const roomClients = this.roomSubscriptions.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }
    
    ws.subscribedRooms?.delete(room);
    this.sendToClient(ws, 'unsubscribed', { room, timestamp: new Date() });
  }

  broadcastToRoom(room, type, data) {
    const clients = this.roomSubscriptions.get(room);
    if (!clients) return 0;
    
    let sent = 0;
    clients.forEach(ws => {
      if (this.sendToClient(ws, type, data)) {
        sent++;
      }
    });
    return sent;
  }

  // ==================== UTILIDADES ====================

  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          console.log(`💔 Conexión sin vida detectada: ${ws.user?.email}`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  getEventMessage(order, eventType) {
    const messages = {
      driver_assigned: `👨‍💼 Conductor asignado a pedido #${order.order_number}`,
      picked_up: `📦 Pedido #${order.order_number} recogido y en camino`,
      delivered: `✅ Pedido #${order.order_number} entregado exitosamente`,
      proof_uploaded: `📸 Prueba de entrega disponible para #${order.order_number}`,
      cancelled: `❌ Pedido #${order.order_number} cancelado`,
      ready_for_pickup: `🎯 Pedido #${order.order_number} listo para recoger`
    };
    
    return messages[eventType] || `📦 Pedido #${order.order_number} actualizado`;
  }

  getUserPermissions(user) {
    const permissions = {
      canViewOrders: true,
      canUpdateOrders: user.role !== 'viewer',
      canViewAllCompanies: user.role === ROLES.ADMIN,
      canManageDrivers: user.role === ROLES.ADMIN || user.role === 'company_owner',
      canViewAnalytics: true
    };
    
    return permissions;
  }

  updateStats(role, action) {
    if (action === 'connect') {
      this.stats.totalConnections++;
      const currentCount = this.stats.connectionsByRole.get(role) || 0;
      this.stats.connectionsByRole.set(role, currentCount + 1);
    } else if (action === 'disconnect') {
      const currentCount = this.stats.connectionsByRole.get(role) || 0;
      this.stats.connectionsByRole.set(role, Math.max(0, currentCount - 1));
    }
  }

  getSystemStats() {
    return {
      ...this.stats,
      currentConnections: this.connections.size,
      adminConnections: this.adminClients.size,
      companyConnections: this.companyClients.size,
      driverConnections: this.driverClients.size,
      activeRooms: this.roomSubscriptions.size,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }

  // Getters públicos
  get connectionCount() {
    return this.connections.size;
  }

  get isHealthy() {
    return this.wss.readyState === WebSocket.OPEN;
  }
}

module.exports = WebSocketService;