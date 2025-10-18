const axios = require('axios');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');

class RouteOptimizerService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Optimiza una ruta usando Google Directions API con waypoints
   * @param {Object} routeConfig - Configuración de la ruta
   * @returns {Object} - Ruta optimizada
   */
  async optimizeRoute(routeConfig) {
    try {
      const {
        startLocation,
        endLocation,
        orderIds,
        preferences = {},
        driverId,
        companyId,
        createdBy
      } = routeConfig;

      // 1. Obtener detalles de los pedidos
      const orders = await Order.find({
        _id: { $in: orderIds },
        company: companyId
      });

      if (orders.length === 0) {
        throw new Error('No se encontraron pedidos válidos');
      }

      // 2. Preparar waypoints para Google Directions API
      const waypoints = [];

for (const [index, order] of orders.entries()) {
  const baseAddress = order.shipping_address || order.customer_address || null;
  const commune = order.shipping_commune || '';
  const fullAddress = [baseAddress, commune, 'Chile'].filter(Boolean).join(', ');

  if (!baseAddress) {
    console.warn(`⚠️ Pedido sin dirección: ${order._id}`);
    continue;
  }

  try {
    const geocodeUrl = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(fullAddress)}&region=cl&key=${this.googleApiKey}`;
    const { data } = await axios.get(geocodeUrl);

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      waypoints.push({
        location: `${lat},${lng}`,
        orderId: order._id,
        address: fullAddress
      });
    } else {
      console.warn(`⚠️ No se pudo geocodificar la dirección: "${fullAddress}"`);
      // fallback coordenadas dummy
      waypoints.push({
        location: `${-33.45 + index * 0.001},${-70.65 + index * 0.001}`,
        orderId: order._id,
        address: fullAddress
      });
    }
  } catch (error) {
    console.error(`❌ Error geocodificando "${fullAddress}":`, error.message);
    // fallback dummy
    waypoints.push({
      location: `${-33.45 + index * 0.001},${-70.65 + index * 0.001}`,
      orderId: order._id,
      address: fullAddress
    });
  }
}

      // 3. Llamar a Google Routes API para optimización
      const optimizedRoute = await this.callGoogleRoutesAPI({
        origin: `${startLocation.latitude},${startLocation.longitude}`,
        destination: `${endLocation.latitude},${endLocation.longitude}`,
        waypoints: waypoints,
        preferences
      });

      // 4. Procesar respuesta y crear orden optimizado
      const optimizedOrders = this.processGoogleResponse(optimizedRoute, orders, waypoints);

      // 5. Crear RoutePlan en la base de datos
      const routePlan = new RoutePlan({
        company: companyId,
        driver: driverId,
        createdBy: createdBy,
        startLocation,
        endLocation,
        orders: optimizedOrders,
        optimization: {
          totalDistance: route.distanceMeters || 0,
          totalDuration: parseInt((route.duration || '0s').replace('s', '')),
          algorithm: 'google_routes_api_v2',
          optimizedAt: new Date(),
          googleRouteData: optimizedRoute
        },
        preferences,
        status: 'draft'
      });

      await routePlan.save();
      await routePlan.populate('orders.order driver');

      return {
        success: true,
        routePlan,
        summary: {
          totalOrders: optimizedOrders.length,
          totalDistance: Math.round((route.distanceMeters || 0) / 1000 * 100) / 100, // km
          totalDuration: Math.round(parseInt((route.duration || '0s').replace('s', '')) / 60), // minutos
          estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(parseInt((route.duration || '0s').replace('s', '')))
        }
      };

    } catch (error) {
      console.error('Error optimizando ruta:', error);
      throw new Error(`Error en optimización: ${error.message}`);
    }
  }

  /**
   * Llama a Google Routes API (nueva) con optimización de waypoints
   */
  async callGoogleRoutesAPI({ origin, destination, waypoints, preferences }) {
    try {
      // Construir el cuerpo de la petición para Routes API
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: parseFloat(origin.split(',')[0]),
              longitude: parseFloat(origin.split(',')[1])
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: parseFloat(destination.split(',')[0]),
              longitude: parseFloat(destination.split(',')[1])
            }
          }
        },
        intermediates: waypoints.map(wp => ({
          location: {
            latLng: {
              latitude: parseFloat(wp.location.split(',')[0]),
              longitude: parseFloat(wp.location.split(',')[1])
            }
          }
        })),
        travelMode: 'DRIVE',
        routingPreference: preferences.prioritizeTime ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: preferences.avoidTolls || false,
          avoidHighways: preferences.avoidHighways || false,
          avoidFerries: false
        },
        languageCode: 'es-CL',
        units: 'METRIC',
        optimizeWaypointOrder: true, // Clave para optimización
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.googleApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation'
      };

      const response = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        requestBody,
        { headers }
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No se pudo calcular la ruta optimizada');
      }

      return response.data;

    } catch (error) {
      if (error.response) {
        console.error('Google Routes API Error:', error.response.data);
        throw new Error(`Google Routes API Error: ${error.response.status} - ${error.response.data.error?.message || 'Error desconocido'}`);
      }
      throw error;
    }
  }

  /**
   * Procesa la respuesta de Google Routes API y crea el orden optimizado
   */
  processGoogleResponse(googleResponse, orders, originalWaypoints) {
    const route = googleResponse.routes[0];
    
    // En Routes API, el orden optimizado viene en optimizedIntermediateWaypointIndex
    const optimizedOrder = route.optimizedIntermediateWaypointIndex || [];
    
    const optimizedOrders = [];
    let cumulativeTime = 0;

    optimizedOrder.forEach((waypointIndex, sequenceIndex) => {
      const waypoint = originalWaypoints[waypointIndex];
      const order = orders.find(o => o._id.toString() === waypoint.orderId.toString());
      
      if (order) {
        // Calcular tiempo estimado de llegada usando los legs de la ruta
        const legIndex = sequenceIndex; // Leg index en la respuesta de Routes API
        if (route.legs && route.legs[legIndex]) {
          // Routes API usa 'duration' en formato como "1234s"
          const durationSeconds = parseInt(route.legs[legIndex].duration.replace('s', ''));
          cumulativeTime += durationSeconds;
        }

        const estimatedArrival = new Date(Date.now() + (cumulativeTime * 1000));

        optimizedOrders.push({
          order: order._id,
          sequenceNumber: sequenceIndex + 1,
          estimatedArrival,
          deliveryStatus: 'pending'
        });
      }
    });

    return optimizedOrders;
  }

  /**
   * Calcula tiempo estimado total de entrega
   */
  calculateEstimatedDeliveryTime(totalDurationSeconds) {
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Obtiene ruta activa de un conductor
   */
  async getActiveRouteForDriver(driverId) {
    try {
      const activeRoute = await RoutePlan.findActiveForDriver(driverId);
      return activeRoute;
    } catch (error) {
      console.error('Error obteniendo ruta activa:', error);
      throw new Error('Error al obtener ruta activa del conductor');
    }
  }

  /**
   * Actualiza el estado de entrega de un pedido
   */
  async updateDeliveryStatus(routePlanId, orderId, status, deliveryProof = null) {
    try {
      const routePlan = await RoutePlan.findById(routePlanId);
      
      if (!routePlan) {
        throw new Error('Plan de ruta no encontrado');
      }

      // Actualizar estado en RoutePlan
      await routePlan.updateOrderStatus(orderId, status, deliveryProof);

      // Actualizar estado en Order
      await Order.findByIdAndUpdate(orderId, {
        status: status === 'delivered' ? 'delivered' : 'in_transit',
        delivered_at: status === 'delivered' ? new Date() : undefined
      });

      return {
        success: true,
        routePlan: await RoutePlan.findById(routePlanId).populate('orders.order driver'),
        message: 'Estado actualizado correctamente'
      };

    } catch (error) {
      console.error('Error actualizando estado de entrega:', error);
      throw new Error(`Error actualizando entrega: ${error.message}`);
    }
  }

  /**
   * Asigna una ruta a un conductor
   */
  async assignRouteToDriver(routePlanId, driverId) {
    try {
      const routePlan = await RoutePlan.findByIdAndUpdate(
        routePlanId,
        {
          driver: driverId,
          status: 'assigned',
          assignedAt: new Date()
        },
        { new: true }
      ).populate('orders.order driver');

      // Actualizar pedidos a estado "assigned"
      const orderIds = routePlan.orders.map(o => o.order._id || o.order);
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { 
          status: 'assigned',
          assigned_driver: driverId,
          assigned_at: new Date()
        }
      );

      return {
        success: true,
        routePlan,
        message: 'Ruta asignada correctamente'
      };

    } catch (error) {
      console.error('Error asignando ruta:', error);
      throw new Error(`Error asignando ruta: ${error.message}`);
    }
  }

  /**
   * Inicia la ejecución de una ruta
   */
  async startRoute(routePlanId, driverId) {
    try {
      const routePlan = await RoutePlan.findOneAndUpdate(
        { _id: routePlanId, driver: driverId, status: 'assigned' },
        {
          status: 'in_progress',
          startedAt: new Date()
        },
        { new: true }
      ).populate('orders.order');

      if (!routePlan) {
        throw new Error('Ruta no encontrada o no asignada a este conductor');
      }

      // Actualizar pedidos a estado "in_transit"
      const orderIds = routePlan.orders.map(o => o.order._id || o.order);
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { status: 'in_transit' }
      );

      return {
        success: true,
        routePlan,
        message: 'Ruta iniciada correctamente'
      };

    } catch (error) {
      console.error('Error iniciando ruta:', error);
      throw new Error(`Error iniciando ruta: ${error.message}`);
    }
  }

  /**
   * Procesa actualizaciones offline y las sincroniza
   */
  async processOfflineUpdates(routePlanId, offlineUpdates) {
    try {
      const routePlan = await RoutePlan.findById(routePlanId);
      
      if (!routePlan) {
        throw new Error('Plan de ruta no encontrado');
      }

      const processedUpdates = [];

      for (const update of offlineUpdates) {
        try {
          switch (update.action) {
            case 'status_update':
              await this.updateDeliveryStatus(
                routePlanId,
                update.orderId,
                update.data.status,
                update.data.deliveryProof
              );
              processedUpdates.push({ ...update, processed: true });
              break;
            
            default:
              console.warn(`Acción offline desconocida: ${update.action}`);
              processedUpdates.push({ ...update, processed: false, error: 'Acción desconocida' });
          }
        } catch (error) {
          processedUpdates.push({ ...update, processed: false, error: error.message });
        }
      }

      // Limpiar actualizaciones pendientes procesadas exitosamente
      const successfulUpdates = processedUpdates.filter(u => u.processed);
      if (successfulUpdates.length > 0) {
        routePlan.offlineSync.lastSyncAt = new Date();
        routePlan.offlineSync.pendingUpdates = routePlan.offlineSync.pendingUpdates.filter(
          pending => !successfulUpdates.some(processed => 
            processed.timestamp.getTime() === pending.timestamp.getTime()
          )
        );
        await routePlan.save();
      }

      return {
        success: true,
        processedUpdates,
        message: `${successfulUpdates.length} actualizaciones sincronizadas correctamente`
      };

    } catch (error) {
      console.error('Error procesando actualizaciones offline:', error);
      throw new Error(`Error en sincronización offline: ${error.message}`);
    }
  }
}

module.exports = new RouteOptimizerService();