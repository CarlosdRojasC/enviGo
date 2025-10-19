// backend/src/services/routeOptimizer/optimizer.service.js
const axios = require('axios');

class OptimizerService {
  constructor() {
    this.baseUrl = 'https://router.project-osrm.org';
  }

  async optimizeRoute(start, orders, end) {
    const coords = [
      [start.longitude, start.latitude],
      ...orders.map(o => [o.lng, o.lat]),
      [end.longitude, end.latitude]
    ];

    try {
      const url = `${this.baseUrl}/trip/v1/driving/${coords.map(c => c.join(',')).join(';')}?source=first&destination=last&roundtrip=false&overview=full&annotations=distance,duration`;
      const { data } = await axios.get(url);

      if (!data.trips || !data.trips.length) throw new Error('No se pudo optimizar ruta');

      const trip = data.trips[0];
      return {
        orderSequence: data.waypoints.slice(1, -1).map(w => w.waypoint_index - 1),
        totalDistance: trip.distance,
        totalDuration: trip.duration,
        polyline: trip.geometry
      };
    } catch (err) {
      console.error('❌ Error OSRM:', err.message);
      throw err;
    }
  }
}

module.exports = OptimizerService;
