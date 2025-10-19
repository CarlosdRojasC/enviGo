// backend/src/services/routeOptimizer/route.service.js
const RoutePlan = require('../../models/RoutePlan');
const Order = require('../../models/Order');

class RouteService {
  async createRoutePlan(config) {
    const route = new RoutePlan(config);
    await route.save();
    await route.populate(['driver', 'company', 'orders.order']);
    return route;
  }

  async updateDeliveryStatus(routeId, orderId, status) {
    const route = await RoutePlan.findById(routeId);
    const item = route.orders.find(o => o.order.toString() === orderId);
    if (!item) throw new Error('Orden no encontrada en ruta');
    item.deliveryStatus = status;
    await route.save();
    await Order.findByIdAndUpdate(orderId, { status });
    return route;
  }
}

module.exports = RouteService;
