const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");

const GOOGLE_ROUTE_OPTIMIZATION_URL =
  "https://fleetengine.googleapis.com/v1/optimizeTours";

const geoService = new GeoService();

/**
 * Optimiza una ruta utilizando Google Route Optimization API (Fleet Routing)
 * Permite hasta 1000 paradas por vehículo
 */
exports.optimizeRoute = async (config) => {
  const {
    startLocation,
    endLocation,
    orderIds,
    driverId,
    companyId,
    createdBy,
  } = config;

  if (!startLocation || !endLocation || !orderIds?.length) {
    throw new Error("Faltan datos para optimizar la ruta.");
  }

  // 🧭 Obtener pedidos con coordenadas válidas
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (orders.length === 0) {
    throw new Error("No hay pedidos válidos para optimizar la ruta.");
  }

  // 🚗 Definir vehículo
  const vehicle = {
    name: "vehicle_1",
    startWaypoint: {
      location: {
        latLng: {
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
        },
      },
    },
    endWaypoint: {
      location: {
        latLng: {
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
        },
      },
    },
    travelMode: "DRIVE",
  };

  // 📦 Crear los “shipments” (entregas)
  const shipments = orders.map((order, index) => ({
    name: `order_${index + 1}`,
    deliveries: [
      {
        arrivalWaypoint: {
          location: {
            latLng: {
              latitude: order.location.latitude,
              longitude: order.location.longitude,
            },
          },
        },
        duration: { seconds: 120 },
      },
    ],
  }));

  // 🧩 Cuerpo del request a Fleet Routing API
  const body = {
    model: {
      shipments,
      vehicles: [vehicle],
      globalStartTime: "2025-10-19T08:00:00Z",
      globalEndTime: "2025-10-19T20:00:00Z",
      durationDistanceMatrices: [
        {
          vehicleTravelMode: "DRIVE",
          costPerKm: 1.0,
          costPerHour: 10.0,
        },
      ],
    },
    solvingMode: "OPTIMIZE",
  };

  // ✅ Validar JSON antes de enviar
  try {
    JSON.parse(JSON.stringify(body));
  } catch (e) {
    console.error("🚨 JSON inválido antes de enviar:", e.message);
    throw new Error("Payload JSON inválido antes de llamar a la API de Google.");
  }

  console.log("🛣️ Llamando a Google Route Optimization API...");

  try {
    const response = await axios.post(GOOGLE_ROUTE_OPTIMIZATION_URL, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const solution = response.data.optimizeToursResponse;
    if (!solution || !solution.routes || solution.routes.length === 0) {
      throw new Error("No se recibió una solución de optimización válida.");
    }

    const route = solution.routes[0];

    // 🔢 Ordenar pedidos según la respuesta optimizada
    const orderedDeliveries =
      route.vehicleJourneys?.[0]?.events
        ?.filter((e) => e.shipmentName)
        ?.map((e, idx) => ({
          order:
            orders.find((o, i) => `order_${i + 1}` === e.shipmentName)?._id ||
            null,
          sequenceNumber: idx + 1,
          deliveryStatus: "pending",
        })) || [];

    // 🗺️ Guardar en BD
    const routePlan = new RoutePlan({
      company: companyId,
      driver: driverId,
      createdBy,
      startLocation,
      endLocation,
      orders: orderedDeliveries,
      optimization: {
        totalDistance: route.totalTravelDistanceMeters || 0,
        totalDuration: route.totalTravelDuration || 0,
        overview_polyline: route.polyline?.encodedPolyline || null,
      },
      status: "draft",
    });

    await routePlan.save();
    await routePlan.populate("driver orders.order");

    console.log("✅ Ruta optimizada correctamente con Route Optimization API.");
    return routePlan;
  } catch (error) {
    console.error("❌ Error en optimización con Route Optimization API:");
    console.error("🧾 Status:", error.response?.status);
    console.error(
      "📡 Mensaje:",
      error.response?.data?.error?.message || error.message
    );
    console.error(
      "📋 Detalles:",
      JSON.stringify(error.response?.data?.error?.details || {}, null, 2)
    );
    throw new Error("Error optimizando la ruta con Google Route Optimization API.");
  }
};
