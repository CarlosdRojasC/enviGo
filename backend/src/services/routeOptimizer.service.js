// /app/src/services/routeOptimizer.service.js
const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");
const { Client } = require("@googlemaps/google-maps-services-js");

const geoService = new GeoService();
const googleMapsClient = new Client({});

// ====== Constantes de configuración ======
const GOOGLE_DIRECTIONS_BATCH_POINTS = 25; // puntos por request (origen + (hasta 23 waypoints) + destino)
const GOOGLE_MAX_WAYPOINTS = GOOGLE_DIRECTIONS_BATCH_POINTS - 2;
const DIRECTIONS_TIMEOUT_MS = Number(process.env.DIRECTIONS_TIMEOUT_MS || 30000);
const MAX_RETRIES = Number(process.env.DIRECTIONS_MAX_RETRIES || 5);
const BASE_BACKOFF_MS = Number(process.env.DIRECTIONS_BASE_BACKOFF_MS || 500);

// ====== Utilidades ======
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (n) => Math.floor(n * (0.75 + Math.random() * 0.5));

const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);

const getCoords = (point) => {
  if (
    point &&
    point.location &&
    typeof point.location.latitude !== "undefined" &&
    typeof point.location.longitude !== "undefined"
  ) {
    return { lat: Number(point.location.latitude), lng: Number(point.location.longitude) };
  } else if (
    point &&
    typeof point.latitude !== "undefined" &&
    typeof point.longitude !== "undefined"
  ) {
    return { lat: Number(point.latitude), lng: Number(point.longitude) };
  }
  console.error("🚨 Punto de ruta con estructura de coordenadas inválida:", point);
  throw new Error("Punto de ruta inválido encontrado.");
};

const validateCoords = (c) => !!(c && isNumber(c.lat) && isNumber(c.lng));

const decodePolyline = (str) => {
  let index = 0, lat = 0, lng = 0, points = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
};

const encodePolyline = (points) => {
  let lastLat = 0, lastLng = 0, result = "";
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    let dLat = lat - lastLat;
    let dLng = lng - lastLng;
    [dLat, dLng].forEach((coord) => {
      let v = coord < 0 ? ~(coord << 1) : (coord << 1);
      while (v >= 0x20) {
        result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      result += String.fromCharCode(v + 63);
    });
    lastLat = lat;
    lastLng = lng;
  }
  return result;
};

async function callDirectionsWithRetry(params, labelsForLog) {
  let attempt = 0;
  while (true) {
    try {
      const res = await googleMapsClient.directions({
        params,
        timeout: DIRECTIONS_TIMEOUT_MS,
      });

      const payload = res?.data;
      const gStatus = payload?.status;
      const gMessage = payload?.error_message;

      if (gStatus && gStatus !== "OK") {
        const retriableStatuses = new Set([
          "OVER_QUERY_LIMIT",
          "UNKNOWN_ERROR",
          "RESOURCE_EXHAUSTED",
          "INTERNAL_ERROR",
        ]);
        if (retriableStatuses.has(gStatus) && attempt < MAX_RETRIES) {
          attempt++;
          const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
          console.warn(`⏳ Google status=${gStatus} (reintento ${attempt}/${MAX_RETRIES} en ${wait}ms)`);
          await sleep(wait);
          continue;
        }
        throw new Error(gMessage || gStatus);
      }
      return res;
    } catch (e) {
      const statusCode = e?.response?.status;
      const code = e?.code;
      const retriableHttp = statusCode && [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
      const retriableCode = code && ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(code);
      const payload = e?.response?.data;
      if ((retriableHttp || retriableCode) && attempt < MAX_RETRIES) {
        attempt++;
        const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
        console.warn(`⏳ Reintentando Directions (intento ${attempt}/${MAX_RETRIES}) en ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      console.error("❌ Error Directions:", e?.message, payload || "");
      throw e;
    }
  }
}

function buildPreferences(preferences = {}) {
  const avoidList = [];
  if (preferences.avoidTolls) avoidList.push("tolls");
  if (preferences.avoidHighways) avoidList.push("highways");
  if (preferences.avoidFerries) avoidList.push("ferries");
  if (preferences.avoidIndoor) avoidList.push("indoor");
  const params = {};
  if (avoidList.length) params.avoid = avoidList;
  if (preferences.language) params.language = preferences.language;
  if (preferences.region) params.region = preferences.region;
  return params;
}

exports.optimizeRoute = async (config) => {
  const { startLocation, endLocation, orderIds, driverId, companyId, createdBy, preferences = {} } = config;

  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("Falta GOOGLE_MAPS_API_KEY");
  if (!process.env.PYTHON_OPTIMIZER_URL) throw new Error("Falta PYTHON_OPTIMIZER_URL");

  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (!orders?.length) throw new Error("No hay pedidos válidos para optimizar.");
  console.log(`✅ ${orders.length} órdenes validadas.`);

  const locations = [
    getCoords(startLocation),
    ...orders.map(getCoords),
    getCoords(endLocation),
  ];

  locations.forEach((c, i) => {
    if (!validateCoords(c)) throw new Error(`Coordenadas inválidas en índice ${i}`);
  });

  let optimizedIndices;
  try {
    console.log(`🐍 Llamando a Python OR-Tools en ${process.env.PYTHON_OPTIMIZER_URL}`);
    const pythonResponse = await axios.post(process.env.PYTHON_OPTIMIZER_URL, { locations, preferences }, { timeout: 45000 });
    optimizedIndices = pythonResponse?.data?.route;
    if (!Array.isArray(optimizedIndices) || optimizedIndices.length === 0) {
      console.error("🔎 Respuesta Python:", pythonResponse?.data);
      throw new Error("Python no devolvió una ruta válida.");
    }
  } catch (error) {
    console.error("❌ Error en Python:", error?.message, error?.response?.data || "");
    throw new Error("El microservicio de optimización (Python) falló.");
  }

  const originalStops = [startLocation, ...orders, endLocation];
  const optimizedStops = optimizedIndices.map((i) => originalStops[i]);
  const orderedOrders = optimizedStops.slice(1, -1);

  console.log("🗺️ Iniciando llamadas en lote a Google Directions...");
  let totalDistance = 0;
  let totalDuration = 0;
  const polylineSegments = [];
  const fullPathPoints = [];
  const prefParams = buildPreferences(preferences);

  for (let i = 0; i < optimizedStops.length - 1; i += (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)) {
    const batch = optimizedStops.slice(i, i + GOOGLE_DIRECTIONS_BATCH_POINTS);
    if (batch.length < 2) continue;

    const origin = getCoords(batch[0]);
    const destination = getCoords(batch[batch.length - 1]);
    const waypoints = batch.slice(1, -1).map(getCoords);
    const directionsParams = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: waypoints.map((wp) => `${wp.lat},${wp.lng}`),
      travelMode: "DRIVING",
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...prefParams,
    };

    console.log(`➡️ Lote ${i / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1) + 1}:`, JSON.stringify({ ...directionsParams, key: "***" }, null, 2));
    let directionsResult;
    try {
      directionsResult = await callDirectionsWithRetry(directionsParams, `Lote ${i}`);
    } catch (e) {
      throw new Error(`Fallo en Directions API: ${e.message || "sin respuesta"}`);
    }

    const routes = directionsResult?.data?.routes || [];
    if (!routes.length) throw new Error("Google Directions no devolvió rutas.");
    const route = routes[0];
    for (const leg of route.legs || []) {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    }

    const polyline = route?.overview_polyline?.points;
    if (polyline) {
      polylineSegments.push(polyline);
      const pts = decodePolyline(polyline);
      if (fullPathPoints.length && JSON.stringify(fullPathPoints.at(-1)) === JSON.stringify(pts[0])) {
        fullPathPoints.push(...pts.slice(1));
      } else {
        fullPathPoints.push(...pts);
      }
    }
  }

  console.log(`✅ Lotes completados. Distancia: ${totalDistance}m, Duración: ${totalDuration}s`);
  const overviewPolyline = fullPathPoints.length ? encodePolyline(fullPathPoints) : undefined;

  const routePlan = new RoutePlan({
    company: companyId,
    driver: driverId,
    createdBy,
    startLocation,
    endLocation,
    orders: orderedOrders.map((order, index) => ({
      order: order._id,
      sequenceNumber: index + 1,
      deliveryStatus: "pending",
    })),
    optimization: {
      algorithm: "python_or-tools+google_directions",
      totalDistance,
      totalDuration,
      overview_polyline: overviewPolyline,
      overview_polyline_segments: polylineSegments,
      batches: Math.ceil((optimizedStops.length - 1) / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)),
    },
    status: "draft",
  });

  await routePlan.save();
  await routePlan.populate("driver orders.order");
  console.log("✅ Ruta híbrida optimizada y guardada en BD.");
  return routePlan;
};
