<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
          🛣️ Gestión de Rutas
        </h1>
        <p class="text-gray-600 mt-1">
          Optimiza y administra las rutas de entrega de tus conductores
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showRouteOptimizer = true"
          class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          ✨ Optimizar Nueva Ruta
        </button>
        <button
          @click="refreshRoutes"
          class="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          :disabled="loading"
        >
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
      >
        <div class="flex items-center gap-4">
          <div class="text-3xl">{{ card.icon }}</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ card.value }}</h3>
            <p class="text-gray-600">{{ card.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-900">Lista de Rutas</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conductor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distancia</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-12 text-center">⏳ Cargando...</td>
            </tr>
            <tr v-else-if="routes.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">🛣️ No hay rutas registradas</td>
            </tr>
            <tr v-for="route in routes" :key="route._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium">#{{ route._id.slice(-6).toUpperCase() }}</td>
              <td class="px-6 py-4">{{ route.driver?.name || "Sin asignar" }}</td>
              <td class="px-6 py-4">{{ route.orders?.length || 0 }}</td>
              <td class="px-6 py-4">{{ formatDistance(route.optimization?.totalDistance) }}</td>
              <td class="px-6 py-4">{{ formatDuration(route.optimization?.totalDuration) }}</td>
              <td class="px-6 py-4">
                <button @click="viewRoute(route)" class="text-blue-600 hover:text-blue-800">👁️ Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 🗺️ Mapa Modal -->
    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl w-full max-w-6xl shadow-xl overflow-hidden">
        <div class="flex justify-between items-center border-b p-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
          </h3>
          <button @click="showRouteMap = false" class="text-gray-600 hover:text-gray-900">✖</button>
        </div>
        <div class="relative p-4">
          <div id="routeMap" class="w-full h-[550px] rounded-lg border"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { apiService } from "../services/api";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizer = ref(false);

const statCards = computed(() => [
  { icon: "🛣️", label: "Rutas Totales", value: routes.value.length },
  { icon: "✅", label: "Completadas", value: routes.value.filter(r => r.status === 'completed').length },
  { icon: "🚀", label: "En Progreso", value: routes.value.filter(r => r.status === 'in_progress').length },
  { icon: "📊", label: "Tasa Éxito", value: `${Math.round((routes.value.filter(r => r.status === 'completed').length / (routes.value.length || 1)) * 100)}%` }
]);

const loadRoutes = async () => {
  loading.value = true;
  try {
    const response = await apiService.routes.getAll();
    routes.value = response.data.data.routes || [];
  } catch (err) {
    console.error("Error cargando rutas:", err);
  } finally {
    loading.value = false;
  }
};

// Mostrar ruta en Google Maps
const viewRoute = async (route) => {
  activeRoute.value = route;
  showRouteMap.value = true;
  await nextTick();

  // Configurar Google Maps API
  setOptions({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: "weekly",
  });

  const { Map } = await importLibrary("maps");
  const { DirectionsService, DirectionsRenderer } = await importLibrary("routes");

  const mapEl = document.getElementById("routeMap");
  if (!mapEl) return;

  const map = new Map(mapEl, {
    center: {
      lat: route.startLocation.latitude || -33.45,
      lng: route.startLocation.longitude || -70.65,
    },
    zoom: 12,
  });
  mapInstance.value = map;

  const directionsService = new DirectionsService();
  const directionsRenderer = new DirectionsRenderer({
    map,
    polylineOptions: { strokeColor: "#1E88E5", strokeWeight: 5 },
  });

  // Construir los puntos
  const start = {
    lat: route.startLocation.latitude,
    lng: route.startLocation.longitude,
  };
  const end = {
    lat: route.endLocation.latitude,
    lng: route.endLocation.longitude,
  };
  const waypoints = (route.orders || [])
    .filter(o => o.order?.location)
    .map(o => ({
      location: {
        lat: o.order.location.latitude,
        lng: o.order.location.longitude,
      },
      stopover: true,
    }));

  const request = {
    origin: start,
    destination: end,
    waypoints,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false,
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
    } else {
      console.error("Error al renderizar la ruta:", status);
    }
  });
};

const formatDistance = (m) => (!m ? "-" : `${(m / 1000).toFixed(1)} km`);
const formatDuration = (s) => (!s ? "-" : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const refreshRoutes = () => loadRoutes();

onMounted(() => {
  loadRoutes();
});
</script>

<style scoped>
#routeMap {
  width: 100%;
  height: 550px;
  border-radius: 10px;
}
</style>
