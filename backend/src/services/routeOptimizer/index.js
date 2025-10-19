// backend/src/services/routeOptimizer/index.js
const GeoService = require('./geo.service');
const OptimizerService = require('./optimizer.service');
const RouteService = require('./route.service');

class RouteOptimizerService {
  constructor() {
    this.geo = new GeoService();
    this.optimizer = new OptimizerService();
    this.route = new RouteService();
  }

  async optimizeRoute(config) {
    const { orderIds, driverId, companyId, startLocation, endLocation, createdBy } = config;
    const orders = await this.geo.validateOrderCoordinates(orderIds);

    if (!orders.length) throw new Error('No hay órdenes válidas con coordenadas');

    const mappedOrders = orders.map(o => ({
      order: o,
      lat: o.location.latitude,
      lng: o.location.longitude
    }));

    const optimized = await this.optimizer.optimizeRoute(startLocation, mappedOrders, endLocation);

    const sequence = optimized.orderSequence.map(i => mappedOrders[i]);

    const routePlan = await this.route.createRoutePlan({
      company: companyId,
      driver: driverId,
      createdBy,
      startLocation,
      endLocation,
      orders: sequence.map((o, i) => ({
        order: o.order._id,
        sequenceNumber: i + 1,
        deliveryStatus: 'pending'
      })),
      optimization: {
        algorithm: 'osrm',
        totalDistance: optimized.totalDistance,
        totalDuration: optimized.totalDuration,
        overview_polyline: optimized.polyline
      },
      status: 'assigned',
      assignedAt: new Date()
    });

    return routePlan;
  }
}

module.exports = new RouteOptimizerService();
