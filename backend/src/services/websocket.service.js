// backend/src/services/websocket.service.js
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
    this.roomSubscriptions = new Map();
    
    // Métricas
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
      
      ws.user = user;
      ws.isAlive = true;
      ws.subscribedRooms = new Set();
      
      this.connections.set(ws, user);
      this.categorizeClient(ws, user);
      this.updateStats(user.role, 'connect');
      
      ws.on('message', this.handleMessage.bind(this, ws));
      ws.on('close', this.handleDisconnect.bind(this, ws));
      ws.on('pong', () => { ws.isAlive = true; });
      
      this.sendToClient(ws, 'connected', {
        user: { name: user.name, role: user.role },
        server_time: new Date()
      });
    });
  }

  categorizeClient(ws, user) {
    if (user.role === ROLES.ADMIN) {
      this.adminClients.add(ws);
    } else if (user.company_id) {
      const companyId = user.company_id.toString();
      if (!this.companyClients.has(companyId)) {
        this.companyClients.set(companyId, new Set());
      }
      this.companyClients.get(companyId).add(ws);
    }
    
    if (user.role === 'driver' && (user.driver_id || user.id)) {
      const dId = (user.driver_id || user.id).toString();
      this.driverClients.set(dId, ws);
    }
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      this.stats.totalMessages++;
      
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, 'pong', { timestamp: new Date() });
          break;
          
        // ✅ NUEVO: Manejar ubicación del conductor
        case 'update_location':
          this.handleLocationUpdate(ws, message.data);
          break;

        case 'subscribe_to_room':
          this.subscribeToRoom(ws, message.data.room);
          break;
          
        case 'unsubscribe_from_room':
          this.unsubscribeFromRoom(ws, message.data.room);
          break;
          
        default:
          // console.log(`⚠️ Tipo de mensaje no reconocido: ${message.type}`);
          break;
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
    }
  }

  // ✅ LÓGICA DE TRACKING
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

    // 1. Enviar a los Admins Generales
    this.notifyAdmins('driver_location_update', payload);

    // 2. Enviar a la Empresa del conductor
    if (user.company_id) {
      this.notifyCompany(user.company_id.toString(), 'driver_location_update', payload);
    }
  }

  handleDisconnect(ws) {
    const user = ws.user;
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
    
    const dId = (user.driver_id || user.id)?.toString();
    if (dId) {
      this.driverClients.delete(dId);
    }
    
    ws.subscribedRooms?.forEach(room => {
      this.unsubscribeFromRoom(ws, room);
    });
    
    this.updateStats(user.role, 'disconnect');
  }

  // ==================== MÉTODOS DE ENVÍO ====================

  sendToClient(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data, timestamp: new Date() }));
      return true;
    }
    return false;
  }

  notifyAdmins(type, data) {
    let sent = 0;
    this.adminClients.forEach(ws => {
      if (this.sendToClient(ws, type, data)) sent++;
    });
    return sent;
  }

  notifyCompany(companyId, type, data) {
    const clients = this.companyClients.get(companyId);
    if (!clients) return 0;
    
    let sent = 0;
    clients.forEach(ws => {
      if (this.sendToClient(ws, type, data)) sent++;
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

  notifyOrderUpdate(order, eventType) {
    const notificationData = {
      order_id: order._id,
      order_number: order.order_number,
      status: order.status,
      eventType
    };
    this.notifyCompany(order.company_id.toString(), 'order_status_changed', notificationData);
    this.notifyAdmins('order_status_changed', notificationData);
  }

  // ==================== SALAS ====================

  subscribeToRoom(ws, room) {
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room).add(ws);
    ws.subscribedRooms.add(room);
  }

  unsubscribeFromRoom(ws, room) {
    const roomClients = this.roomSubscriptions.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) this.roomSubscriptions.delete(room);
    }
    ws.subscribedRooms?.delete(room);
  }

  // ==================== UTILIDADES ====================

  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  updateStats(role, action) {
    if (action === 'connect') this.stats.totalConnections++;
    // stats lógica básica...
  }

  getSystemStats() {
    return {
      ...this.stats,
      currentConnections: this.connections.size
    };
  }
}

module.exports = WebSocketService;