// backend/src/services/routeOptimizer/geo.service.js
const axios = require("axios");
const Order = require("../../models/Order");

class GeoService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
  }

  async validateOrderCoordinates(orderIds) {
    const uniqueIds = [...new Set(orderIds.map(String))];
    const orders = await Order.find({ _id: { $in: uniqueIds } });

    const valid = [];
    for (const order of orders) {
      if (this.hasValidCoordinates(order)) {
        valid.push(order);
      } else {
        const updated = await this.geocodeOrder(order);
        if (updated) valid.push(updated);
      }
    }

    return valid;
  }

  hasValidCoordinates(order) {
    const loc = order.location;
    return (
      loc &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number" &&
      !isNaN(loc.latitude) &&
      !isNaN(loc.longitude)
    );
  }

  async geocodeOrder(order) {
    if (!order.shipping_address) return false;
    const address = `${order.shipping_address}, ${order.shipping_commune || ""}, Chile`;

    try {
      const { data } = await axios.get(this.baseUrl, {
        params: {
          address,
          key: this.apiKey,
          region: "cl",
          components: "country:CL",
        },
      });

      if (data.status !== "OK" || !data.results.length) return false;
      const { lat, lng } = data.results[0].geometry.location;

      order.location = { latitude: lat, longitude: lng };
      await order.save();
      return order;
    } catch (err) {
      console.error(`❌ Error geocodificando pedido ${order._id}:`, err.message);
      return false;
    }
  }
}

module.exports = GeoService;
