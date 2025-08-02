// backend/src/services/websocket.service.js - PRODUCCIÓN COMPLETA
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const EventEmitter = require('events');

class WebSocketService extends EventEmitter {
  constructor(server) {
    super();
    
    // Configuración para producción
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 6,
          memLevel: 8
        },
        threshold: 1024,
        concurrencyLimit: 10
      },
      maxPayload: 32 * 1024, // 32KB
      backlog: 200,
      clientTracking: true
    });

    // Almacenamiento optimizado
    this.connections = {
      all: new Map(),           // connectionId -> { ws, user, metadata }
      byUser: new Map(),        // userId -> Set<connectionId>
      byRole: new Map(),        // role -> Set<connectionId>
      byCompany: new Map(),     // companyId -> Set<connectionId>
      byDriver: new Map(),      // driverId -> connectionId
      admins: new Set(),        // Set<connectionId>
      online: new Set()         // connectionIds activos
    };

    // Sistema de rooms/canales
    this.rooms = new Map();           // roomName -> Set<connectionId>
    this.roomPermissions = new Map(); // roomName -> { requiredRole, companyId }

    // Rate limiting y throttling
    this.rateLimits = new Map();      // userId -> { count, resetTime }
    this.throttling = new Map();      // userId -> { lastMessage, messageCount }
    
    // Cola de mensajes para reconexión
    this.messageQueue = new Map();    // userId -> Array<{ type, data, timestamp }>
    this.queueConfig = {
      maxSize: 100,
      ttl: 5 * 60 * 1000 // 5 minutos
    };

    // 🔧 FIX: Inicializar intervals (ESTO FALTABA!)
    this.intervals = {
      heartbeat: null,
      cleanup: null,
      stats: null
    };

    // Métricas avanzadas
    this.metrics = {
      connections: {
        total: 0,
        current: 0,
        peak: 0,
        byRole: new Map(),
        byCompany: new Map()
      },
      messages: {
        sent: 0,
        received: 0,
        queued: 0,
        failed: 0,
        rate: 0
      },
      performance: {
        avgLatency: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        issues: []
      },
      startTime: new Date()
    };

    // Configuración de producción
    this.config = {
      heartbeat: {
        interval: 30000,
        timeout: 10000,
        maxMissed: 3
      },
      rateLimit: {
        messagesPerMinute: 120,
        burstLimit: 20,
        penaltyDuration: 60000
      },
      cleanup: {
        interval: 2 * 60 * 1000,  // 2 minutos
        deadConnectionThreshold: 5 * 60 * 1000 // 5 minutos
      },
      security: {
        maxConnectionsPerUser: 5,
        maxConnectionsPerIP: 20,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
      }
    };

    // 🔧 FIX: Inicializar estructuras para notificaciones inteligentes
    this.pendingNotifications = new Map();
    this.notificationRates = new Map();

    // Inicializar
    this.setupEventHandlers();
    this.startHeartbeat();
    this.startCleanupRoutines();
    this.startMetricsCollection();

    console.log('🚀 WebSocket Service iniciado para PRODUCCIÓN');
    console.log(`📊 Config: heartbeat=${this.config.heartbeat.interval}ms, rate=${this.config.rateLimit.messagesPerMinute}/min`);
  }
  // Verificación avanzada para producción
  verifyClient(info) {
    try {
      const clientIP = this.getClientIP(info.req);
      const origin = info.origin;

      // Verificar origen
      if (this.config.security.allowedOrigins[0] !== '*') {
        if (!origin || !this.config.security.allowedOrigins.includes(origin)) {
          console.warn(`❌ WS: Origen no permitido: ${origin} desde IP: ${clientIP}`);
          return false;
        }
      }

      // Verificar límite de conexiones globales
      if (this.connections.online.size >= (process.env.MAX_WS_CONNECTIONS || 2000)) {
        console.warn(`❌ WS: Límite global alcanzado: ${this.connections.online.size}`);
        return false;
      }

      // Verificar límite por IP
      const ipConnections = this.getConnectionsByIP(clientIP);
      if (ipConnections >= this.config.security.maxConnectionsPerIP) {
        console.warn(`❌ WS: Límite por IP alcanzado: ${clientIP} (${ipConnections})`);
        return false;
      }

      // Extraer y verificar token
      const parsedUrl = url.parse(info.req.url, true);
      const token = parsedUrl.query.token;

      if (!token) {
        console.warn(`❌ WS: Sin token desde IP: ${clientIP}`);
        return false;
      }

      // Verificar JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validaciones del usuario
      if (!decoded.userId || !decoded.email || !decoded.role) {
        console.warn(`❌ WS: Token inválido desde IP: ${clientIP}`);
        return false;
      }

      // Verificar estado del usuario
      if (decoded.status && ['blocked', 'inactive', 'suspended'].includes(decoded.status)) {
        console.warn(`❌ WS: Usuario ${decoded.email} está ${decoded.status}`);
        return false;
      }

      // Verificar múltiples conexiones por usuario
      const userConnections = this.connections.byUser.get(decoded.userId)?.size || 0;
      if (userConnections >= this.config.security.maxConnectionsPerUser) {
        console.warn(`❌ WS: Usuario ${decoded.email} excede límite de conexiones: ${userConnections}`);
        return false;
      }

      // Adjuntar datos del usuario
      info.req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName || decoded.name,
        companyId: decoded.companyId || decoded.company_id,
        driverId: decoded.driverId || decoded.driver_id,
        permissions: decoded.permissions || [],
        tokenIssuedAt: decoded.iat,
        clientIP
      };

      console.log(`✅ WS: Cliente verificado - ${decoded.email} (${decoded.role}) desde ${clientIP}`);
      return true;

    } catch (error) {
      const clientIP = this.getClientIP(info.req);
      
      if (error.name === 'TokenExpiredError') {
        console.warn(`❌ WS: Token expirado desde IP: ${clientIP}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.warn(`❌ WS: Token malformado desde IP: ${clientIP}`);
      } else {
        console.warn(`❌ WS: Error verificando desde IP ${clientIP}:`, error.message);
      }
      
      return false;
    }
  }

  // Configuración de eventos principal
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      const connectionId = this.generateConnectionId();
      
      // Configurar WebSocket
      ws.connectionId = connectionId;
      ws.user = user;
      ws.isAlive = true;
      ws.connectedAt = new Date();
      ws.lastActivity = new Date();
      ws.messageCount = 0;
      ws.missedHeartbeats = 0;
      ws.subscribedRooms = new Set();
      
      // Metadata de conexión
      ws.metadata = {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: user.clientIP,
        sessionId: this.generateSessionId(),
        connectionAttempt: (this.connections.byUser.get(user.userId)?.size || 0) + 1
      };

      // Almacenar conexión
      this.addConnection(connectionId, ws, user);
      
      // Logs de producción
      console.log(`🔗 [${connectionId}] Conectado: ${user.email} (${user.role}) - Total: ${this.connections.online.size}`);

      // Event handlers
      ws.on('message', (data) => this.handleMessage(connectionId, data));
      ws.on('close', (code, reason) => this.handleDisconnect(connectionId, code, reason));
      ws.on('error', (error) => this.handleError(connectionId, error));
      ws.on('pong', () => this.handlePong(connectionId));

      // Enviar bienvenida
      this.sendToConnection(connectionId, 'connection_established', {
        connectionId,
        sessionId: ws.metadata.sessionId,
        user: {
          name: user.fullName,
          role: user.role,
          permissions: this.getUserPermissions(user.role)
        },
        server: {
          version: process.env.APP_VERSION || '1.0.0',
          time: new Date(),
          environment: process.env.NODE_ENV
        },
        config: {
          heartbeatInterval: this.config.heartbeat.interval,
          messageRateLimit: this.config.rateLimit.messagesPerMinute
        }
      });

      // Procesar cola de mensajes si existe
      this.processMessageQueue(user.userId);

      // Actualizar métricas
      this.updateConnectionMetrics('connect', user);

      // Emitir evento
      this.emit('user_connected', { connectionId, user });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WS Server Error:', error);
      this.metrics.health.status = 'error';
      this.metrics.health.issues.push({
        type: 'server_error',
        message: error.message,
        timestamp: new Date()
      });
    });

    this.wss.on('listening', () => {
      console.log('👂 WebSocket Server listening...');
    });
  }

  // Agregar conexión al sistema
  addConnection(connectionId, ws, user) {
    // Almacenar en mapa principal
    this.connections.all.set(connectionId, { ws, user, metadata: ws.metadata });
    this.connections.online.add(connectionId);

    // Por usuario
    if (!this.connections.byUser.has(user.userId)) {
      this.connections.byUser.set(user.userId, new Set());
    }
    this.connections.byUser.get(user.userId).add(connectionId);

    // Por rol
    if (!this.connections.byRole.has(user.role)) {
      this.connections.byRole.set(user.role, new Set());
    }
    this.connections.byRole.get(user.role).add(connectionId);

    // Por empresa
    if (user.companyId) {
      if (!this.connections.byCompany.has(user.companyId)) {
        this.connections.byCompany.set(user.companyId, new Set());
      }
      this.connections.byCompany.get(user.companyId).add(connectionId);
    }

    // Admins
    if (user.role === 'admin') {
      this.connections.admins.add(connectionId);
    }

    // Conductores
    if (user.driverId) {
      this.connections.byDriver.set(user.driverId, connectionId);
    }
  }

  // Remover conexión del sistema
  removeConnection(connectionId) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return;

    const { user } = connection;

    // Remover de todos los mapas
    this.connections.all.delete(connectionId);
    this.connections.online.delete(connectionId);

    // Por usuario
    const userConnections = this.connections.byUser.get(user.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.connections.byUser.delete(user.userId);
      }
    }

    // Por rol
    const roleConnections = this.connections.byRole.get(user.role);
    if (roleConnections) {
      roleConnections.delete(connectionId);
      if (roleConnections.size === 0) {
        this.connections.byRole.delete(user.role);
      }
    }

    // Por empresa
    if (user.companyId) {
      const companyConnections = this.connections.byCompany.get(user.companyId);
      if (companyConnections) {
        companyConnections.delete(connectionId);
        if (companyConnections.size === 0) {
          this.connections.byCompany.delete(user.companyId);
        }
      }
    }

    // Admins y conductores
    this.connections.admins.delete(connectionId);
    if (user.driverId) {
      this.connections.byDriver.delete(user.driverId);
    }

    // Limpiar rooms
    this.rooms.forEach((connections, roomName) => {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.rooms.delete(roomName);
        this.roomPermissions.delete(roomName);
      }
    });
  }

  // Obtener IP del cliente
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  // Contar conexiones por IP
  getConnectionsByIP(ip) {
    let count = 0;
    this.connections.all.forEach(({ user }) => {
      if (user.clientIP === ip) count++;
    });
    return count;
  }

  // Generar IDs únicos
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Obtener permisos por rol
  getUserPermissions(role) {
    const permissions = {
      admin: [
        'manage_companies',
        'manage_users',
        'view_all_orders',
        'system_settings',
        'view_analytics',
        'send_notifications',
        'manage_drivers'
      ],
      company_owner: [
        'manage_company_users',
        'view_company_orders',
        'company_settings',
        'view_company_analytics',
        'send_company_notifications',
        'manage_company_drivers'
      ],
      company_employee: [
        'view_orders',
        'create_orders',
        'edit_orders',
        'view_reports',
        'update_order_status'
      ],
      driver: [
        'view_assigned_orders',
        'update_delivery_status',
        'upload_proof',
        'update_location'
      ]
    };

    return permissions[role] || [];
  }
  // Manejo avanzado de mensajes
  handleMessage(connectionId, data) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return;

    const { ws, user } = connection;
    
    try {
      // Verificar rate limiting
      if (!this.checkRateLimit(user.userId)) {
        this.sendRateLimitWarning(connectionId);
        return;
      }

      // Parsear mensaje
      let message;
      try {
        message = JSON.parse(data);
      } catch (parseError) {
        console.warn(`⚠️ [${connectionId}] Mensaje malformado:`, parseError.message);
        this.sendToConnection(connectionId, 'error', {
          code: 'INVALID_JSON',
          message: 'Formato de mensaje inválido'
        });
        return;
      }

      // Validar estructura del mensaje
      if (!message.type) {
        this.sendToConnection(connectionId, 'error', {
          code: 'MISSING_TYPE',
          message: 'Tipo de mensaje requerido'
        });
        return;
      }

      // Actualizar actividad
      ws.lastActivity = new Date();
      ws.messageCount++;
      this.metrics.messages.received++;

      // Log solo mensajes importantes o errores
      if (['error', 'admin_action', 'system', 'auth'].includes(message.type)) {
        console.log(`📨 [${connectionId}] ${user.email}: ${message.type}`);
      }

      // Procesar mensaje según tipo
      this.processMessage(connectionId, message);

    } catch (error) {
      console.error(`❌ [${connectionId}] Error procesando mensaje:`, error);
      this.sendToConnection(connectionId, 'error', {
        code: 'PROCESSING_ERROR',
        message: 'Error interno procesando mensaje',
        messageId: message?.id || null
      });
    }
  }

  // Procesador de mensajes por tipo
  processMessage(connectionId, message) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return;

    const { user } = connection;
    const { type, data = {}, id: messageId } = message;

    switch (type) {
      case 'ping':
        this.sendToConnection(connectionId, 'pong', {
          messageId,
          serverTime: new Date(),
          latency: this.calculateLatency(connectionId)
        });
        break;

      case 'subscribe_room':
        this.subscribeToRoom(connectionId, data.room, data.permissions);
        break;

      case 'unsubscribe_room':
        this.unsubscribeFromRoom(connectionId, data.room);
        break;

      case 'get_stats':
        if (this.hasPermission(user, 'view_analytics')) {
          this.sendToConnection(connectionId, 'stats', this.getStatsForUser(user));
        } else {
          this.sendUnauthorized(connectionId, messageId);
        }
        break;

      case 'get_health':
        if (this.hasPermission(user, 'system_settings')) {
          this.sendToConnection(connectionId, 'health', this.getHealthStatus());
        } else {
          this.sendUnauthorized(connectionId, messageId);
        }
        break;

      case 'send_notification':
        if (this.hasPermission(user, 'send_notifications')) {
          this.handleSendNotification(connectionId, data);
        } else {
          this.sendUnauthorized(connectionId, messageId);
        }
        break;

      case 'update_location':
        if (user.role === 'driver') {
          this.handleDriverLocationUpdate(connectionId, data);
        } else {
          this.sendUnauthorized(connectionId, messageId);
        }
        break;

      case 'bulk_action':
        if (this.hasPermission(user, 'manage_companies')) {
          this.handleBulkAction(connectionId, data);
        } else {
          this.sendUnauthorized(connectionId, messageId);
        }
        break;

      case 'get_connection_info':
        this.sendToConnection(connectionId, 'connection_info', {
          connectionId,
          connectedAt: connection.ws.connectedAt,
          messageCount: connection.ws.messageCount,
          subscribedRooms: Array.from(connection.ws.subscribedRooms),
          rateLimitStatus: this.getRateLimitStatus(user.userId)
        });
        break;

      default:
        console.warn(`⚠️ [${connectionId}] Tipo de mensaje no reconocido: ${type}`);
        this.sendToConnection(connectionId, 'error', {
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Tipo de mensaje '${type}' no reconocido`,
          messageId
        });
    }
  }

  // Rate limiting avanzado
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId) || {
      count: 0,
      resetTime: now + 60000,
      penalty: false,
      penaltyUntil: 0
    };

    // Verificar si está penalizado
    if (userLimit.penalty && now < userLimit.penaltyUntil) {
      return false;
    }

    // Reset del contador si pasó el tiempo
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + 60000;
      userLimit.penalty = false;
    }

    userLimit.count++;

    // Verificar límite normal
    if (userLimit.count > this.config.rateLimit.messagesPerMinute) {
      // Aplicar penalización
      userLimit.penalty = true;
      userLimit.penaltyUntil = now + this.config.rateLimit.penaltyDuration;
      
      console.warn(`⚠️ Rate limit excedido para usuario ${userId}: ${userLimit.count}/${this.config.rateLimit.messagesPerMinute}`);
      return false;
    }

    // Verificar burst limit
    const burstWindow = this.throttling.get(userId) || {
      messages: [],
      lastCleanup: now
    };

    // Limpiar mensajes antiguos (últimos 10 segundos)
    const tenSecondsAgo = now - 10000;
    burstWindow.messages = burstWindow.messages.filter(time => time > tenSecondsAgo);

    if (burstWindow.messages.length >= this.config.rateLimit.burstLimit) {
      console.warn(`⚠️ Burst limit excedido para usuario ${userId}: ${burstWindow.messages.length}/${this.config.rateLimit.burstLimit}`);
      return false;
    }

    // Registrar mensaje
    burstWindow.messages.push(now);
    this.throttling.set(userId, burstWindow);
    this.rateLimits.set(userId, userLimit);

    return true;
  }

  // Enviar advertencia de rate limit
  sendRateLimitWarning(connectionId) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return;

    const userId = connection.user.userId;
    const userLimit = this.rateLimits.get(userId);

    this.sendToConnection(connectionId, 'rate_limit_exceeded', {
      message: 'Límite de mensajes excedido',
      limit: this.config.rateLimit.messagesPerMinute,
      current: userLimit?.count || 0,
      resetIn: userLimit ? userLimit.resetTime - Date.now() : 0,
      penalized: userLimit?.penalty || false,
      penaltyEndsIn: userLimit?.penalty ? userLimit.penaltyUntil - Date.now() : 0
    });
  }

  // Verificar permisos
  hasPermission(user, permission) {
    const userPermissions = this.getUserPermissions(user.role);
    return userPermissions.includes(permission);
  }

  // Enviar respuesta no autorizada
  sendUnauthorized(connectionId, messageId) {
    this.sendToConnection(connectionId, 'unauthorized', {
      message: 'No tienes permisos para esta acción',
      messageId,
      timestamp: new Date()
    });
  }

  // Obtener estado de rate limit
  getRateLimitStatus(userId) {
    const userLimit = this.rateLimits.get(userId);
    const now = Date.now();

    if (!userLimit) {
      return {
        messagesUsed: 0,
        messagesRemaining: this.config.rateLimit.messagesPerMinute,
        resetIn: 60000,
        penalized: false
      };
    }

    return {
      messagesUsed: userLimit.count,
      messagesRemaining: Math.max(0, this.config.rateLimit.messagesPerMinute - userLimit.count),
      resetIn: Math.max(0, userLimit.resetTime - now),
      penalized: userLimit.penalty,
      penaltyEndsIn: userLimit.penalty ? Math.max(0, userLimit.penaltyUntil - now) : 0
    };
  }

  // Calcular latencia
  calculateLatency(connectionId) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return 0;

    // Implementación básica - podrías mejorarlo con ping/pong timestamps
    return Math.floor(Math.random() * 50) + 10; // Simulado entre 10-60ms
  }

  // Manejar actualización de ubicación del conductor
  handleDriverLocationUpdate(connectionId, data) {
    const connection = this.connections.all.get(connectionId);
    if (!connection || connection.user.role !== 'driver') return;

    const { latitude, longitude, accuracy, timestamp } = data;

    // Validar datos de ubicación
    if (!latitude || !longitude || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      this.sendToConnection(connectionId, 'error', {
        code: 'INVALID_LOCATION',
        message: 'Coordenadas de ubicación inválidas'
      });
      return;
    }

    const locationData = {
      driverId: connection.user.driverId,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: parseFloat(accuracy) || 0,
        timestamp: timestamp || new Date()
      },
      updatedBy: connection.user.userId
    };

    // Notificar a administradores y empresas relevantes
    this.broadcastDriverLocation(locationData);

    this.sendToConnection(connectionId, 'location_updated', {
      message: 'Ubicación actualizada correctamente',
      timestamp: new Date()
    });
  }

  // Manejar acciones en lote
  handleBulkAction(connectionId, data) {
    const { action, targets, parameters } = data;

    if (!action || !targets || !Array.isArray(targets)) {
      this.sendToConnection(connectionId, 'error', {
        code: 'INVALID_BULK_ACTION',
        message: 'Acción en lote inválida'
      });
      return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    switch (action) {
      case 'broadcast_notification':
        targets.forEach(target => {
          try {
            if (target.type === 'company' && target.id) {
              const sent = this.sendToCompany(target.id, 'notification', parameters.notification);
              if (sent > 0) {
                results.success++;
              } else {
                results.failed++;
                results.errors.push(`No se pudo enviar a empresa ${target.id}`);
              }
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Error en ${target.id}: ${error.message}`);
          }
        });
        break;

      case 'disconnect_users':
        targets.forEach(userId => {
          try {
            const disconnected = this.disconnectUser(userId, 'Admin action');
            if (disconnected > 0) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`Usuario ${userId} no encontrado`);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Error desconectando ${userId}: ${error.message}`);
          }
        });
        break;

      default:
        this.sendToConnection(connectionId, 'error', {
          code: 'UNKNOWN_BULK_ACTION',
          message: `Acción '${action}' no reconocida`
        });
        return;
    }

    this.sendToConnection(connectionId, 'bulk_action_result', {
      action,
      results,
      timestamp: new Date()
    });
  }

  // Desconectar usuario específico
  disconnectUser(userId, reason = 'Server action') {
    const userConnections = this.connections.byUser.get(userId);
    if (!userConnections) return 0;

    let disconnected = 0;
    userConnections.forEach(connectionId => {
      const connection = this.connections.all.get(connectionId);
      if (connection) {
        this.sendToConnection(connectionId, 'forced_disconnect', {
          reason,
          timestamp: new Date()
        });
        
        setTimeout(() => {
          connection.ws.close(1008, reason);
          disconnected++;
        }, 1000);
      }
    });

    return disconnected;
  }
// ==================== SISTEMA DE NOTIFICACIONES AVANZADO ====================

  // Notificación de cambio de estado de orden
  notifyOrderStatusChange(order, newStatus, oldStatus = null, additionalData = {}) {
    try {
      const notificationData = {
        id: this.generateMessageId(),
        type: 'order_status_changed',
        priority: this.getOrderPriority(newStatus),
        category: 'order_update',
        timestamp: new Date(),
        
        // Datos de la orden
        order: {
          id: order._id,
          number: order.order_number,
          customerName: order.customer_name,
          companyId: order.company_id,
          status: {
            old: oldStatus,
            new: newStatus
          }
        },
        
        // Detalles del evento
        event: {
          type: newStatus,
          message: this.getStatusMessage(newStatus, order),
          description: this.getStatusDescription(newStatus, order),
          actionRequired: this.requiresAction(newStatus)
        },
        
        // URLs y enlaces
        links: {
          order: `${process.env.FRONTEND_URL}/orders/${order._id}`,
          tracking: order.tracking_url || this.buildTrackingUrl(order),
          company: order.company_id ? `${process.env.FRONTEND_URL}/companies/${order.company_id}` : null
        },
        
        // Datos adicionales
        metadata: {
          deliveryAddress: order.delivery_address?.address,
          customerPhone: order.customer_phone,
          estimatedDelivery: order.estimated_delivery_time,
          totalAmount: order.total_amount,
          driverInfo: order.driver_info,
          ...additionalData
        }
      };

      const results = {
        company: 0,
        admins: 0,
        driver: 0,
        failed: 0,
        total: 0
      };

      // Notificar a la empresa
      if (order.company_id) {
        const companySent = this.sendToCompany(order.company_id, 'order_status_changed', notificationData);
        results.company = companySent;
        results.total += companySent;
      }

      // Notificar a administradores
      const adminsSent = this.sendToAdmins('order_status_changed', notificationData);
      results.admins = adminsSent;
      results.total += adminsSent;

      // Notificar al conductor si aplica
      if (order.driver_id && ['driver_assigned', 'picked_up', 'delivered'].includes(newStatus)) {
        const driverSent = this.sendToDriver(order.driver_id, 'order_assignment', {
          ...notificationData,
          driverSpecific: true,
          actionItems: this.getDriverActionItems(newStatus, order)
        });
        results.driver = driverSent;
        results.total += driverSent;
      }

      // Emitir evento interno
      this.emit('order_notification_sent', {
        order: order._id,
        status: newStatus,
        results,
        timestamp: new Date()
      });

      // Log solo para eventos importantes o fallos
      if (results.failed > 0 || ['delivered', 'failed', 'cancelled'].includes(newStatus)) {
        console.log(`📦 [${order.order_number}] ${oldStatus} → ${newStatus}: enviado a ${results.total} conexiones`);
      }

      return results;

    } catch (error) {
      console.error(`❌ Error notificando orden ${order.order_number}:`, error);
      return { company: 0, admins: 0, driver: 0, failed: 1, total: 0 };
    }
  }

  // Notificación de nueva orden
  notifyNewOrder(order) {
    try {
      const notificationData = {
        id: this.generateMessageId(),
        type: 'new_order',
        priority: 'high',
        category: 'new_order',
        timestamp: new Date(),
        urgency: this.calculateOrderUrgency(order),
        
        order: {
          id: order._id,
          number: order.order_number,
          customerName: order.customer_name,
          companyId: order.company_id,
          channel: order.channel_name,
          value: order.total_amount
        },
        
        event: {
          message: `Nueva orden #${order.order_number} recibida`,
          description: `Orden desde ${order.channel_name} por valor de ${this.formatCurrency(order.total_amount)}`,
          actionRequired: true,
          suggestedActions: ['assign_driver', 'confirm_order', 'contact_customer']
        },
        
        links: {
          order: `${process.env.FRONTEND_URL}/orders/${order._id}`,
          assign: `${process.env.FRONTEND_URL}/orders/${order._id}/assign`,
          company: `${process.env.FRONTEND_URL}/companies/${order.company_id}`
        },
        
        metadata: {
          deliveryAddress: order.delivery_address?.address,
          customerPhone: order.customer_phone,
          requestedDeliveryDate: order.requested_delivery_date,
          paymentMethod: order.payment_method,
          specialInstructions: order.notes,
          estimatedValue: order.total_amount
        }
      };

      const results = { company: 0, admins: 0, failed: 0, total: 0 };

      // Notificar empresa
      if (order.company_id) {
        const companySent = this.sendToCompany(order.company_id, 'new_order', notificationData);
        results.company = companySent;
        results.total += companySent;

        // Crear sala temporal para esta orden
        this.createOrderRoom(order._id, order.company_id);
      }

      // Notificar admins
      const adminsSent = this.sendToAdmins('new_order', notificationData);
      results.admins = adminsSent;
      results.total += adminsSent;

      // Emitir evento interno
      this.emit('new_order_notification_sent', {
        order: order._id,
        results,
        timestamp: new Date()
      });

      console.log(`🆕 [${order.order_number}] Nueva orden notificada: ${results.total} conexiones`);
      return results;

    } catch (error) {
      console.error(`❌ Error notificando nueva orden ${order.order_number}:`, error);
      return { company: 0, admins: 0, failed: 1, total: 0 };
    }
  }

  // Notificación por lotes optimizada
  notifyBatchOrders(orders, eventType = 'batch_update') {
    try {
      const batchId = this.generateMessageId();
      const companiesAffected = [...new Set(orders.map(o => o.company_id?.toString()).filter(Boolean))];
      
      const batchSummary = {
        id: batchId,
        type: 'batch_notification',
        eventType,
        timestamp: new Date(),
        count: orders.length,
        companiesAffected: companiesAffected.length,
        summary: this.createOrderBatchSummary(orders),
        
        metadata: {
          totalValue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
          channels: [...new Set(orders.map(o => o.channel_name).filter(Boolean))],
          statusDistribution: this.getStatusDistribution(orders),
          timeRange: this.getOrderTimeRange(orders)
        }
      };

      let totalSent = 0;

      // Enviar a cada empresa afectada
      companiesAffected.forEach(companyId => {
        const companyOrders = orders.filter(o => o.company_id?.toString() === companyId);
        const companyBatch = {
          ...batchSummary,
          companySpecific: true,
          orders: companyOrders.map(order => ({
            id: order._id,
            number: order.order_number,
            status: order.status,
            customer: order.customer_name,
            value: order.total_amount
          }))
        };

        const sent = this.sendToCompany(companyId, 'batch_update', companyBatch);
        totalSent += sent;
      });

      // Enviar resumen a admins
      const adminBatch = {
        ...batchSummary,
        adminView: true,
        detailedBreakdown: this.createDetailedBreakdown(orders, companiesAffected)
      };

      const adminsSent = this.sendToAdmins('batch_update', adminBatch);
      totalSent += adminsSent;

      console.log(`📦 Lote de ${orders.length} órdenes notificado a ${totalSent} conexiones`);
      return { totalSent, companiesAffected: companiesAffected.length, batchId };

    } catch (error) {
      console.error('❌ Error en notificación por lotes:', error);
      return { totalSent: 0, companiesAffected: 0, batchId: null, error: error.message };
    }
  }

  // Notificación de ubicación del conductor
  broadcastDriverLocation(locationData) {
    try {
      const { driverId, location, orderId } = locationData;
      
      const notificationData = {
        id: this.generateMessageId(),
        type: 'driver_location_update',
        timestamp: new Date(),
        
        driver: {
          id: driverId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp
          }
        },
        
        order: orderId ? { id: orderId } : null,
        
        metadata: {
          speed: location.speed || null,
          bearing: location.bearing || null,
          altitude: location.altitude || null
        }
      };

      let totalSent = 0;

      // Si hay una orden específica, notificar a la empresa de esa orden
      if (orderId) {
        // Aquí necesitarías buscar la orden para obtener la empresa
        // Por simplicidad, asumo que tienes acceso al modelo Order
        this.getOrderCompany(orderId).then(companyId => {
          if (companyId) {
            const sent = this.sendToCompany(companyId, 'driver_location', notificationData);
            totalSent += sent;
          }
        }).catch(err => {
          console.error('Error obteniendo empresa de la orden:', err);
        });
      }

      // Notificar a admins
      const adminsSent = this.sendToAdmins('driver_location', notificationData);
      totalSent += adminsSent;

      // Notificar al conductor para confirmar
      const driverSent = this.sendToDriver(driverId, 'location_confirmed', {
        message: 'Ubicación actualizada',
        timestamp: new Date(),
        location: location
      });

      return totalSent + driverSent;

    } catch (error) {
      console.error('❌ Error broadcasting ubicación del conductor:', error);
      return 0;
    }
  }

  // Notificación del sistema
  sendSystemNotification(title, message, options = {}) {
    const {
      type = 'info',
      priority = 'normal',
      target = 'all',
      targetIds = [],
      actionUrl = null,
      expiresAt = null,
      persistent = false
    } = options;

    const notificationData = {
      id: this.generateMessageId(),
      type: 'system_notification',
      priority,
      category: 'system',
      timestamp: new Date(),
      expiresAt,
      persistent,
      
      content: {
        title,
        message,
        type, // info, warning, error, success
        actionUrl,
        actionText: options.actionText || 'Ver detalles'
      },
      
      metadata: {
        source: 'system',
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0'
      }
    };

    let totalSent = 0;

    switch (target) {
      case 'all':
        totalSent = this.broadcast('system_notification', notificationData);
        break;
        
      case 'admins':
        totalSent = this.sendToAdmins('system_notification', notificationData);
        break;
        
      case 'companies':
        if (targetIds.length > 0) {
          targetIds.forEach(companyId => {
            totalSent += this.sendToCompany(companyId, 'system_notification', notificationData);
          });
        } else {
          // Todas las empresas
          this.connections.byCompany.forEach((connections, companyId) => {
            totalSent += this.sendToCompany(companyId, 'system_notification', notificationData);
          });
        }
        break;
        
      case 'users':
        if (targetIds.length > 0) {
          targetIds.forEach(userId => {
            totalSent += this.sendToUser(userId, 'system_notification', notificationData);
          });
        }
        break;
        
      case 'role':
        if (targetIds.length > 0) {
          targetIds.forEach(role => {
            totalSent += this.sendToRole(role, 'system_notification', notificationData);
          });
        }
        break;
    }

    console.log(`🔔 Notificación del sistema "${title}" enviada a ${totalSent} conexiones`);
    
    this.emit('system_notification_sent', {
      title,
      target,
      totalSent,
      timestamp: new Date()
    });

    return totalSent;
  }

  // ==================== MÉTODOS DE ENVÍO OPTIMIZADOS ====================

  // Enviar a conexión específica con retry
  sendToConnection(connectionId, type, data, options = {}) {
    const { retry = true, maxRetries = 2, timeout = 5000 } = options;
    
    const connection = this.connections.all.get(connectionId);
    if (!connection) return false;

    const { ws } = connection;
    
    if (ws.readyState !== WebSocket.OPEN) {
      if (retry) {
        this.queueMessage(connection.user.userId, { type, data });
      }
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data,
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      ws.send(message);
      this.metrics.messages.sent++;
      return true;

    } catch (error) {
      console.error(`❌ Error enviando a [${connectionId}]:`, error);
      
      if (retry && maxRetries > 0) {
        setTimeout(() => {
          this.sendToConnection(connectionId, type, data, { 
            retry: false, 
            maxRetries: maxRetries - 1 
          });
        }, 1000);
      }
      
      return false;
    }
  }

  // Enviar a usuario (todas sus conexiones)
  sendToUser(userId, type, data) {
    const userConnections = this.connections.byUser.get(userId);
    if (!userConnections) return 0;

    let sent = 0;
    userConnections.forEach(connectionId => {
      if (this.sendToConnection(connectionId, type, data)) {
        sent++;
      }
    });

    return sent;
  }

  // Enviar a empresa
  sendToCompany(companyId, type, data) {
    const companyConnections = this.connections.byCompany.get(companyId);
    if (!companyConnections) return 0;

    let sent = 0;
    companyConnections.forEach(connectionId => {
      if (this.sendToConnection(connectionId, type, data)) {
        sent++;
      }
    });

    return sent;
  }

  // Enviar a administradores
  sendToAdmins(type, data) {
    let sent = 0;
    this.connections.admins.forEach(connectionId => {
      if (this.sendToConnection(connectionId, type, data)) {
        sent++;
      }
    });

    return sent;
  }

  // Enviar a conductor
  sendToDriver(driverId, type, data) {
    const driverConnectionId = this.connections.byDriver.get(driverId);
    if (!driverConnectionId) return 0;

    return this.sendToConnection(driverConnectionId, type, data) ? 1 : 0;
  }

  // Enviar por rol
  sendToRole(role, type, data) {
    const roleConnections = this.connections.byRole.get(role);
    if (!roleConnections) return 0;

    let sent = 0;
    roleConnections.forEach(connectionId => {
      if (this.sendToConnection(connectionId, type, data)) {
        sent++;
      }
    });

    return sent;
  }

  // Broadcast a todas las conexiones
  broadcast(type, data, excludeConnectionIds = []) {
    let sent = 0;
    const excludeSet = new Set(excludeConnectionIds);

    this.connections.online.forEach(connectionId => {
      if (!excludeSet.has(connectionId)) {
        if (this.sendToConnection(connectionId, type, data)) {
          sent++;
        }
      }
    });

    return sent;
  }
  // ==================== SISTEMA DE ROOMS/SALAS ====================

  // Suscribirse a una sala
  subscribeToRoom(connectionId, roomName, permissions = {}) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return false;

    const { user, ws } = connection;

    // Verificar permisos para la sala
    if (!this.canJoinRoom(user, roomName, permissions)) {
      this.sendToConnection(connectionId, 'room_access_denied', {
        room: roomName,
        reason: 'Permisos insuficientes'
      });
      return false;
    }

    // Verificar límite de salas por usuario
    if (ws.subscribedRooms.size >= this.config.security.maxRoomsPerUser) {
      this.sendToConnection(connectionId, 'room_limit_exceeded', {
        room: roomName,
        current: ws.subscribedRooms.size,
        max: this.config.security.maxRoomsPerUser
      });
      return false;
    }

    // Crear sala si no existe
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
      this.roomPermissions.set(roomName, {
        created: new Date(),
        createdBy: user.userId,
        type: this.getRoomType(roomName),
        requiredRole: permissions.requiredRole || null,
        companyId: permissions.companyId || null
      });
    }

    // Agregar a la sala
    this.rooms.get(roomName).add(connectionId);
    ws.subscribedRooms.add(roomName);

    // Notificar éxito
    this.sendToConnection(connectionId, 'room_joined', {
      room: roomName,
      memberCount: this.rooms.get(roomName).size,
      permissions: this.roomPermissions.get(roomName),
      timestamp: new Date()
    });

    // Notificar a otros miembros de la sala
    this.broadcastToRoom(roomName, 'room_member_joined', {
      user: {
        name: user.fullName,
        role: user.role
      },
      memberCount: this.rooms.get(roomName).size
    }, [connectionId]);

    console.log(`📺 [${connectionId}] ${user.email} se unió a sala: ${roomName}`);
    return true;
  }

  // Desuscribirse de una sala
  unsubscribeFromRoom(connectionId, roomName) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return false;

    const { user, ws } = connection;
    const room = this.rooms.get(roomName);
    
    if (!room || !room.has(connectionId)) {
      this.sendToConnection(connectionId, 'room_not_subscribed', {
        room: roomName
      });
      return false;
    }

    // Remover de la sala
    room.delete(connectionId);
    ws.subscribedRooms.delete(roomName);

    // Si la sala queda vacía, eliminarla
    if (room.size === 0) {
      this.rooms.delete(roomName);
      this.roomPermissions.delete(roomName);
    } else {
      // Notificar a otros miembros
      this.broadcastToRoom(roomName, 'room_member_left', {
        user: {
          name: user.fullName,
          role: user.role
        },
        memberCount: room.size
      });
    }

    this.sendToConnection(connectionId, 'room_left', {
      room: roomName,
      timestamp: new Date()
    });

    console.log(`📺 [${connectionId}] ${user.email} salió de sala: ${roomName}`);
    return true;
  }

  // Broadcast a una sala específica
  broadcastToRoom(roomName, type, data, excludeConnectionIds = []) {
    const room = this.rooms.get(roomName);
    if (!room) return 0;

    const excludeSet = new Set(excludeConnectionIds);
    let sent = 0;

    room.forEach(connectionId => {
      if (!excludeSet.has(connectionId)) {
        if (this.sendToConnection(connectionId, type, data)) {
          sent++;
        }
      }
    });

    return sent;
  }

  // Crear sala para una orden específica
  createOrderRoom(orderId, companyId) {
    const roomName = `order_${orderId}`;
    
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
      this.roomPermissions.set(roomName, {
        created: new Date(),
        type: 'order',
        companyId: companyId,
        requiredRole: null,
        autoCleanup: true,
        ttl: 24 * 60 * 60 * 1000 // 24 horas
      });

      console.log(`📺 Sala creada para orden: ${roomName}`);
    }

    return roomName;
  }

  // Verificar si un usuario puede unirse a una sala
  canJoinRoom(user, roomName, permissions = {}) {
    const roomPerms = this.roomPermissions.get(roomName);
    
    // Si no hay permisos específicos, permitir
    if (!roomPerms) return true;

    // Admins pueden unirse a cualquier sala
    if (user.role === 'admin') return true;

    // Verificar rol requerido
    if (roomPerms.requiredRole && user.role !== roomPerms.requiredRole) {
      return false;
    }

    // Verificar empresa
    if (roomPerms.companyId && user.companyId !== roomPerms.companyId) {
      return false;
    }

    return true;
  }

  // Obtener tipo de sala basado en el nombre
  getRoomType(roomName) {
    if (roomName.startsWith('order_')) return 'order';
    if (roomName.startsWith('company_')) return 'company';
    if (roomName.startsWith('driver_')) return 'driver';
    if (roomName.startsWith('admin_')) return 'admin';
    return 'general';
  }

  // ==================== COLA DE MENSAJES ====================

  // Encolar mensaje para usuario desconectado
  queueMessage(userId, message) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }

    const queue = this.messageQueue.get(userId);
    
    // Verificar límite de cola
    if (queue.length >= this.queueConfig.maxSize) {
      queue.shift(); // Remover el más antiguo
    }

    queue.push({
      ...message,
      queuedAt: new Date(),
      expiresAt: new Date(Date.now() + this.queueConfig.ttl)
    });

    this.metrics.messages.queued++;
  }

  // Procesar cola de mensajes al reconectar
  processMessageQueue(userId) {
    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    const now = new Date();
    const validMessages = queue.filter(msg => new Date(msg.expiresAt) > now);

    if (validMessages.length > 0) {
      console.log(`📬 Procesando ${validMessages.length} mensajes en cola para usuario ${userId}`);
      
      validMessages.forEach(message => {
        this.sendToUser(userId, message.type, {
          ...message.data,
          fromQueue: true,
          queuedAt: message.queuedAt
        });
      });
    }

    // Limpiar cola
    this.messageQueue.delete(userId);
    this.metrics.messages.queued -= queue.length;
  }

  // ==================== MÉTODOS AUXILIARES ====================

  // Obtener prioridad de evento de orden
  getOrderPriority(status) {
    const priorities = {
      'failed': 'urgent',
      'cancelled': 'high',
      'delivered': 'high',
      'driver_assigned': 'medium',
      'picked_up': 'medium',
      'confirmed': 'low',
      'pending': 'low'
    };
    return priorities[status] || 'low';
  }

  // Obtener mensaje de estado
  getStatusMessage(status, order) {
    const messages = {
      pending: `Orden #${order.order_number} está pendiente de confirmación`,
      confirmed: `Orden #${order.order_number} confirmada`,
      driver_assigned: `Conductor asignado a orden #${order.order_number}`,
      picked_up: `Orden #${order.order_number} recogida y en camino`,
      delivered: `Orden #${order.order_number} entregada exitosamente`,
      failed: `Fallo en la entrega de orden #${order.order_number}`,
      cancelled: `Orden #${order.order_number} cancelada`
    };
    return messages[status] || `Orden #${order.order_number} actualizada`;
  }

  // Obtener descripción detallada del estado
  getStatusDescription(status, order) {
    const descriptions = {
      pending: 'La orden está esperando confirmación del negocio',
      confirmed: 'La orden ha sido confirmada y está lista para asignación',
      driver_assigned: 'Un conductor ha sido asignado y está en camino a recoger',
      picked_up: 'El conductor recogió el pedido y se dirige al destino',
      delivered: 'El pedido fue entregado exitosamente al cliente',
      failed: 'No se pudo completar la entrega del pedido',
      cancelled: 'La orden fue cancelada'
    };
    return descriptions[status] || 'Estado de la orden actualizado';
  }

  // Verificar si el estado requiere acción
  requiresAction(status) {
    return ['pending', 'failed', 'driver_assigned'].includes(status);
  }

  // Obtener acciones sugeridas para el conductor
  getDriverActionItems(status, order) {
    const actions = {
      driver_assigned: [
        'Navegar al punto de recogida',
        'Contactar al negocio si es necesario',
        'Confirmar recogida cuando esté listo'
      ],
      picked_up: [
        'Navegar al destino',
        'Contactar al cliente si es necesario',
        'Tomar foto de prueba de entrega'
      ],
      delivered: [
        'Subir prueba de entrega',
        'Confirmar entrega completada',
        'Calificar experiencia (opcional)'
      ]
    };
    return actions[status] || [];
  }

  // Calcular urgencia de la orden
  calculateOrderUrgency(order) {
    let urgency = 'normal';
    
    // Verificar fecha de entrega
    if (order.requested_delivery_date) {
      const deliveryDate = new Date(order.requested_delivery_date);
      const now = new Date();
      const hoursUntilDelivery = (deliveryDate - now) / (1000 * 60 * 60);
      
      if (hoursUntilDelivery < 2) {
        urgency = 'urgent';
      } else if (hoursUntilDelivery < 4) {
        urgency = 'high';
      }
    }
    
    // Verificar valor de la orden
    if (order.total_amount > 100000) { // Más de $100,000
      urgency = urgency === 'normal' ? 'high' : urgency;
    }
    
    return urgency;
  }

  // Formatear moneda
  formatCurrency(amount) {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  }

  // Crear resumen de lote de órdenes
  createOrderBatchSummary(orders) {
    return {
      total: orders.length,
      byStatus: this.groupBy(orders, 'status'),
      byChannel: this.groupBy(orders, 'channel_name'),
      byCompany: this.groupBy(orders, 'company_id'),
      totalValue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      avgValue: orders.length > 0 ? 
        orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length : 0
    };
  }

  // Obtener distribución de estados
  getStatusDistribution(orders) {
    const distribution = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    return distribution;
  }

  // Obtener rango de tiempo de las órdenes
  getOrderTimeRange(orders) {
    if (orders.length === 0) return null;

    const dates = orders
      .map(order => new Date(order.created_at || order.createdAt))
      .filter(date => !isNaN(date));

    if (dates.length === 0) return null;

    return {
      earliest: new Date(Math.min(...dates)),
      latest: new Date(Math.max(...dates)),
      span: Math.max(...dates) - Math.min(...dates)
    };
  }

  // Crear desglose detallado para admins
  createDetailedBreakdown(orders, companiesAffected) {
    return {
      companiesAffected,
      ordersByCompany: companiesAffected.map(companyId => {
        const companyOrders = orders.filter(o => o.company_id?.toString() === companyId);
        return {
          companyId,
          count: companyOrders.length,
          totalValue: companyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
          statuses: this.getStatusDistribution(companyOrders)
        };
      }),
      channelBreakdown: this.groupBy(orders, 'channel_name'),
      valueRanges: this.categorizeOrdersByValue(orders)
    };
  }

  // Categorizar órdenes por valor
  categorizeOrdersByValue(orders) {
    const ranges = {
      'low': { min: 0, max: 25000, count: 0, total: 0 },
      'medium': { min: 25001, max: 75000, count: 0, total: 0 },
      'high': { min: 75001, max: 200000, count: 0, total: 0 },
      'premium': { min: 200001, max: Infinity, count: 0, total: 0 }
    };

    orders.forEach(order => {
      const value = order.total_amount || 0;
      
      for (const [rangeName, range] of Object.entries(ranges)) {
        if (value >= range.min && value <= range.max) {
          range.count++;
          range.total += value;
          break;
        }
      }
    });

    return ranges;
  }

  // Obtener empresa de una orden (método helper)
  async getOrderCompany(orderId) {
    try {
      // Aquí necesitarías importar tu modelo de Order
      const Order = require('../models/order.model');
      const order = await Order.findById(orderId).select('company_id');
      return order?.company_id?.toString() || null;
    } catch (error) {
      console.error('Error obteniendo empresa de orden:', error);
      return null;
    }
  }

  // Construir URL de tracking
  buildTrackingUrl(order) {
    const baseUrl = process.env.FRONTEND_URL || 'https://envigo.cl';
    return `${baseUrl}/tracking/${order.order_number}`;
  }

  // Agrupar elementos por campo
  groupBy(array, field) {
    return array.reduce((groups, item) => {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  // ==================== HEARTBEAT Y MANTENIMIENTO ====================

  // Iniciar heartbeat
  startHeartbeat() {
    this.intervals.heartbeat = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          console.log(`💔 Conexión sin vida detectada: [${ws.connectionId}] ${ws.user?.email}`);
          this.handleDeadConnection(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
        ws.missedHeartbeats = (ws.missedHeartbeats || 0) + 1;

        // Si ha perdido muchos heartbeats, cerrar conexión
        if (ws.missedHeartbeats >= this.config.heartbeat.maxMissed) {
          console.warn(`⚠️ Demasiados heartbeats perdidos: [${ws.connectionId}] ${ws.user?.email}`);
          ws.close(1008, 'Too many missed heartbeats');
        }
      });

      // Actualizar métricas de conexiones activas
      this.updateConnectionMetrics();
      
    }, this.config.heartbeat.interval);
  }

  // Manejar pong
  handlePong(connectionId) {
    const connection = this.connections.all.get(connectionId);
    if (connection) {
      connection.ws.isAlive = true;
      connection.ws.missedHeartbeats = 0;
      connection.ws.lastActivity = new Date();
    }
  }

  // Manejar conexión muerta
  handleDeadConnection(ws) {
    this.metrics.health.issues.push({
      type: 'dead_connection',
      connectionId: ws.connectionId,
      user: ws.user?.email,
      timestamp: new Date()
    });
  }

  // Iniciar rutinas de limpieza
  startCleanupRoutines() {
    this.intervals.cleanup = setInterval(() => {
      this.cleanupDeadConnections();
      this.cleanupExpiredData();
      this.cleanupEmptyRooms();
    }, this.config.cleanup.interval);
  }

  // Limpiar conexiones muertas
  cleanupDeadConnections() {
    let cleaned = 0;
    const now = Date.now();

    this.connections.all.forEach((connection, connectionId) => {
      const { ws } = connection;
      
      // Verificar si la conexión está muerta
      if (ws.readyState !== WebSocket.OPEN ||
          (now - ws.lastActivity.getTime()) > this.config.cleanup.deadConnectionThreshold) {
        
        this.removeConnection(connectionId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Limpiadas ${cleaned} conexiones muertas`);
    }
  }

  // Limpiar datos expirados
  cleanupExpiredData() {
    const now = Date.now();
    let cleaned = 0;

    // Limpiar rate limits expirados
    this.rateLimits.forEach((limit, userId) => {
      if (limit.resetTime < now && !limit.penalty) {
        this.rateLimits.delete(userId);
        cleaned++;
      }
    });

    // Limpiar throttling data
    this.throttling.forEach((data, userId) => {
      data.messages = data.messages.filter(time => (now - time) < 60000);
      if (data.messages.length === 0) {
        this.throttling.delete(userId);
      }
    });

    // Limpiar colas de mensajes expiradas
    this.messageQueue.forEach((queue, userId) => {
      const validMessages = queue.filter(msg => new Date(msg.expiresAt) > now);
      if (validMessages.length !== queue.length) {
        if (validMessages.length === 0) {
          this.messageQueue.delete(userId);
        } else {
          this.messageQueue.set(userId, validMessages);
        }
        cleaned += (queue.length - validMessages.length);
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Limpiados ${cleaned} elementos de datos expirados`);
    }
  }

  // Limpiar salas vacías
  cleanupEmptyRooms() {
    let cleaned = 0;
    const now = new Date();

    this.rooms.forEach((connections, roomName) => {
      if (connections.size === 0) {
        const roomPerms = this.roomPermissions.get(roomName);
        
        // Eliminar sala si está vacía y es auto-cleanup
        if (roomPerms?.autoCleanup) {
          const roomAge = now - roomPerms.created;
          if (roomAge > (roomPerms.ttl || 24 * 60 * 60 * 1000)) {
            this.rooms.delete(roomName);
            this.roomPermissions.delete(roomName);
            cleaned++;
          }
        }
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Limpiadas ${cleaned} salas vacías`);
    }
  }

  // ==================== MANEJO DE DESCONEXIONES ====================

  // Manejar desconexión
  handleDisconnect(connectionId, code, reason) {
    const connection = this.connections.all.get(connectionId);
    if (!connection) return;

    const { user, ws } = connection;
    const duration = Date.now() - ws.connectedAt.getTime();
    const wasClean = code === 1000;

    // Actualizar estadísticas
    if (wasClean) {
      this.metrics.connections.disconnections.clean++;
    } else {
      this.metrics.connections.disconnections.unexpected++;
    }

    // Log detallado
    console.log(`🔌 [${connectionId}] Desconectado: ${user.email} (${this.formatDuration(duration)}) - Código: ${code}${reason ? `, Razón: ${reason}` : ''}`);

    // Remover de todas las estructuras
    this.removeConnection(connectionId);

    // Actualizar métricas
    this.updateConnectionMetrics('disconnect', user);

    // Emitir evento
    this.emit('user_disconnected', {
      connectionId,
      user,
      duration,
      wasClean,
      code,
      reason,
      timestamp: new Date()
    });
  }

  // Manejar errores de conexión
  handleError(connectionId, error) {
    const connection = this.connections.all.get(connectionId);
    
    console.error(`❌ [${connectionId}] Error de conexión${connection?.user?.email ? ` (${connection.user.email})` : ''}:`, error.message);

    this.metrics.health.issues.push({
      type: 'connection_error',
      connectionId,
      user: connection?.user?.email,
      error: error.message,
      timestamp: new Date()
    });

    this.metrics.messages.failed++;
  }

  // ==================== MÉTRICAS Y MONITOREO ====================

  // Iniciar recolección de métricas
  startStatsCollection() {
    this.intervals.stats = setInterval(() => {
      this.updatePerformanceMetrics();
      this.updateHealthStatus();
    }, 30000); // Cada 30 segundos
  }

  // Actualizar métricas de conexión
  updateConnectionMetrics(action = null, user = null) {
    this.metrics.connections.current = this.connections.online.size;
    
    if (this.metrics.connections.current > this.metrics.connections.peak) {
      this.metrics.connections.peak = this.metrics.connections.current;
    }

    if (action === 'connect' && user) {
      this.metrics.connections.total++;
      
      const roleCount = this.metrics.connections.byRole.get(user.role) || 0;
      this.metrics.connections.byRole.set(user.role, roleCount + 1);
      
      if (user.companyId) {
        const companyCount = this.metrics.connections.byCompany.get(user.companyId) || 0;
        this.metrics.connections.byCompany.set(user.companyId, companyCount + 1);
      }
    }
  }

  // Actualizar métricas de rendimiento
  updatePerformanceMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.performance.memoryUsage = memUsage.heapUsed;
    
    // Calcular tasa de mensajes
    const uptime = (Date.now() - this.metrics.startTime.getTime()) / 1000;
    this.metrics.messages.rate = uptime > 0 ? this.metrics.messages.sent / uptime : 0;
  }

  // Actualizar estado de salud
  updateHealthStatus() {
    const issues = [];
    
    // Verificar conexiones
    const deadConnections = this.wss.clients.size - this.connections.online.size;
    if (deadConnections > this.connections.online.size * 0.1) {
      issues.push(`Muchas conexiones muertas: ${deadConnections}`);
    }

    // Verificar memoria
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > memUsage.heapTotal * 0.8) {
      issues.push('Uso alto de memoria');
    }

    // Verificar tasa de errores
    const errorRate = this.metrics.messages.sent > 0 ? 
      (this.metrics.messages.failed / this.metrics.messages.sent) * 100 : 0;
    
    if (errorRate > 5) {
      issues.push(`Tasa de errores alta: ${errorRate.toFixed(2)}%`);
    }

    this.metrics.health = {
      status: issues.length === 0 ? 'healthy' : (issues.length > 2 ? 'critical' : 'warning'),
      lastCheck: new Date(),
      issues: issues.slice(-10) // Mantener solo los últimos 10
    };
  }

  // Formatear duración
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // ==================== MÉTODOS PÚBLICOS PARA API ====================

  // Obtener estadísticas completas
  getFullStats() {
    return {
      ...this.metrics,
      rooms: {
        total: this.rooms.size,
        breakdown: Array.from(this.rooms.entries()).map(([name, connections]) => ({
          name,
          members: connections.size,
          type: this.getRoomType(name)
        }))
      },
      queues: {
        totalQueued: Array.from(this.messageQueue.values())
          .reduce((sum, queue) => sum + queue.length, 0),
        userQueues: this.messageQueue.size
      },
      uptime: Date.now() - this.metrics.startTime.getTime()
    };
  }

  // Obtener estadísticas filtradas para usuario
  getStatsForUser(user) {
    const baseStats = {
      connections: {
        current: this.metrics.connections.current,
        yourConnections: this.connections.byUser.get(user.userId)?.size || 0
      },
      messages: {
        rate: this.metrics.messages.rate.toFixed(2)
      },
      uptime: Date.now() - this.metrics.startTime.getTime()
    };

    // Admins ven todo
    if (user.role === 'admin') {
      return this.getFullStats();
    }

    // Company owners ven stats de su empresa
    if (user.role === 'company_owner' && user.companyId) {
      baseStats.company = {
        connections: this.connections.byCompany.get(user.companyId)?.size || 0
      };
    }

    return baseStats;
  }

  // Obtener estado de salud
  getHealthStatus() {
    return {
      ...this.metrics.health,
      details: {
        connections: this.connections.online.size,
        memory: process.memoryUsage(),
        uptime: Date.now() - this.metrics.startTime.getTime(),
        rooms: this.rooms.size,
        queues: this.messageQueue.size
      }
    };
  }

  // Shutdown graceful
  async shutdown() {
    console.log('🛑 Iniciando shutdown de WebSocket Service...');

    // Limpiar intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    // Notificar a clientes
    this.broadcast('server_shutdown', {
      message: 'Servidor reiniciando, reconectar en 10 segundos',
      reconnectDelay: 10000,
      timestamp: new Date()
    });

    // Esperar un poco para que se envíen los mensajes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cerrar todas las conexiones
    this.wss.clients.forEach(ws => {
      ws.close(1001, 'Server shutdown');
    });

    // Cerrar servidor
    await new Promise((resolve) => {
      this.wss.close(resolve);
    });

    console.log('✅ WebSocket Service cerrado correctamente');
  }
}

module.exports = WebSocketService;


