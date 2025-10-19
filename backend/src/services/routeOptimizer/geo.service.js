// backend/src/services/routeOptimizer/geo.service.js
const axios = require('axios');
const Order = require('../../models/Order');

class GeoService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  async validateOrderCoordinates(orderIds) {
    const uniqueIds = [...new Set(orderIds.map(String))];
    const orders = await Order.find({ _id: { $in: uniqueIds } });
    const valid = orders.filter(o => this.hasValidCoordinates(o));
    const invalid = orders.filter(o => !this.hasValidCoordinates(o));

    for (const order of invalid) await this.geocodeOrder(order);
    const updated = await Order.find({ _id: { $in: uniqueIds } });
    return updated.filter(o => this.hasValidCoordinates(o));
  }

  hasValidCoordinates(order) {
    const loc = order.location;
    return (
      loc?.latitude &&
      loc?.longitude &&
      loc.latitude >= -90 &&
      loc.latitude <= 90 &&
      loc.longitude >= -180 &&
      loc.longitude <= 180
    );
  }

  async geocodeOrder(order) {
    if (!order.shipping_address) return false;
    const address = `${order.shipping_address}, ${order.shipping_commune || ''}, Chile`;

    try {
      const { data } = await axios.get(this.baseUrl, {
        params: {
          address,
          key: this.googleApiKey,
          region: 'cl',
          components: 'country:CL',
        },
      });

      if (data.status !== 'OK' || !data.results.length) return false;

      const { lat, lng } = data.results[0].geometry.location;
      order.location = { latitude: lat, longitude: lng };
      await order.save();
      return true;
    } catch (err) {
      console.error(`❌ Error geocodificando ${order._id}:`, err.message);
      return false;
    }
  }
}

module.exports = GeoService;
