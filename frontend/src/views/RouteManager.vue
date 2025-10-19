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
          @click="showRouteOptimizerModal = true"
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

    <!-- Routes Table -->
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
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span class="ml-2">Cargando rutas...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="routes.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="text-center">
                  <div class="text-5xl mb-3">🛣️</div>
                  <h3 class="text-lg font-medium text-gray-800 mb-1">No hay rutas registradas</h3>
                  <p class="text-gray-500 mb-4">Crea tu primera ruta optimizada.</p>
                  <button
                    @click="showRouteOptimizerModal = true"
                    class="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Optimizar Ruta
                  </button>
                </div>
              </td>
            </tr>

            <tr v-for="route in routes" :key="route._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-800">#{{ route._id.slice(-6).toUpperCase() }}</td>
              <td class="px-6 py-4 text-gray-700">{{ route.driver?.name || "Sin asignar" }}</td>
              <td class="px-6 py-4 text-gray-700">{{ route.orders?.length || 0 }}</td>
              <td class="px-6 py-4 text-gray-700">{{ formatDistance(route.optimization?.totalDistance) }}</td>
              <td class="px-6 py-4 text-gray-700">{{ formatDuration(route.optimization?.totalDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button @click="viewRoute(route)" class="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                  👁️ Ver Ruta
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Route Map Modal -->
    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      @click.self="showRouteMap = false"
    >
      <div class="bg-white rounded-xl w-full max-w-7xl shadow-xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <!-- MAP -->
        <div class="flex-1 relative">
          <div id="routeMapContainer" class="w-full h-[70vh] md:h-full"></div>
          <div v-if="!mapInstance" class="absolute inset-0 flex items-center justify-center text-gray-400 bg-white bg-opacity-70">
            Inicializando mapa...
          </div>
        </div>

        <!-- SIDEBAR -->
        <div class="w-full md:w-80 bg-gray-50 border-l p-4 overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span class="text-xl">🗺️</span> Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
            </h3>
            <button @click="showRouteMap = false" class="text-gray-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-gray-200">
              ✖
            </button>
          </div>
          <div class="text-sm text-gray-600 mb-3">
            Conductor: <span class="font-medium">{{ activeRoute?.driver?.name || 'Sin asignar' }}</span>
          </div>

          <h4 class="text-sm font-semibold text-gray-700 mb-2">Paradas:</h4>
          <ol class="space-y-2">
            <li
              v-for="(stop, idx) in activeRoute?.orders"
              :key="stop._id"
              class="flex items-start gap-3 bg-white p-2 rounded-md shadow-sm hover:bg-blue-50 transition"
            >
              <span class="w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-sm"
                :style="{ backgroundColor: getMarkerColor(stop.deliveryStatus) }">
                {{ idx + 1 }}
              </span>
              <div>
                <p class="font-medium text-gray-800">
                  {{ stop.order?.customer_name || 'Cliente' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ stop.order?.address || 'Sin dirección' }}
                </p>
              </div>
            </li>
          </ol>

          <div class="mt-4 text-sm text-gray-600 border-t pt-3">
            Distancia total: <b>{{ formatDistance(activeRoute?.optimization?.totalDistance) }}</b><br />
            Duración estimada: <b>{{ formatDuration(activeRoute?.optimization?.totalDuration) }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Optimizer Modal Placeholder -->
    <div
      v-if="showRouteOptimizerModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showRouteOptimizerModal = false"
    >
      <div class="bg-white rounded-xl p-8 shadow-xl max-w-lg w-full text-center">
        <h2 class="text-2xl font-bold mb-2">✨ Optimizar Nueva Ruta</h2>
        <p class="text-gray-600 mb-4">Próximamente podrás configurar la optimización de rutas desde aquí.</p>
        <button @click="showRouteOptimizerModal = false" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { apiService } from "../services/api";

// Estado
const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizerModal = ref(false);

// 🔑 Cargar Google Maps dinámicamente
const getGoogleMapsApiKey = () => {
  return (
    window.env?.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
  );
};

const loadGoogleMaps = async () => {
  if (typeof window.google !== "undefined" && window.google.maps) {
    return window.google.maps;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.error("🚫 No se encontró Google Maps API Key");
    alert("⚠️ Falta configurar Google Maps API Key en el frontend");
    throw new Error("Missing Google Maps API key");
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps API cargada correctamente");
      resolve(window.google.maps);
    };
    script.onerror = (e) => {
      console.error("❌ Error al cargar Google Maps:", e);
      reject(e);
    };
    document.head.appendChild(script);
  });
};

// Estadísticas
const statCards = computed(() => {
  const total = routes.value.length;
  const completed = routes.value.filter(r => r.status === 'completed').length;
  const inProgress = routes.value.filter(r => r.status === 'in_progress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return [
    { icon: "🛣️", label: "Rutas Totales", value: total },
    { icon: "✅", label: "Completadas", value: completed },
    { icon: "🚀", label: "En Progreso", value: inProgress },
    { icon: "📊", label: "Tasa Éxito", value: `${completionRate}%` },
  ];
});

// Cargar rutas
const loadRoutes = async () => {
  loading.value = true;
  try {
    const res = await apiService.routes.getAll();
    routes.value = res.data?.data?.routes || res.data?.routes || res.data || [];
  } catch (err) {
    console.error("❌ Error cargando rutas:", err);
  } finally {
    loading.value = false;
  }
};

const refreshRoutes = () => loadRoutes();

// Ver ruta en mapa
const viewRoute = async (route) => {
  activeRoute.value = route;
  showRouteMap.value = true;
  await nextTick();

  const mapContainer = document.getElementById("routeMapContainer");
  if (!mapContainer) return;

  const polylineString = route.optimization?.overview_polyline;
  if (!polylineString) {
    mapContainer.innerHTML = "⚠️ No hay datos de mapa para esta ruta.";
    return;
  }

  try {
    const maps = await loadGoogleMaps();
    const { geometry } = maps;

    const map = new maps.Map(mapContainer, {
      center: { lat: route.startLocation.latitude, lng: route.startLocation.longitude },
      zoom: 12,
    });
    mapInstance.value = map;

    const bounds = new maps.LatLngBounds();
    const decodedPath = geometry.encoding.decodePath(polylineString);

    const routePolyline = new maps.Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: "#1E88E5",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    routePolyline.setMap(map);
    decodedPath.forEach(p => bounds.extend(p));

    const startPos = { lat: route.startLocation.latitude, lng: route.startLocation.longitude };
    new maps.marker.AdvancedMarkerElement({ map, position: startPos, title: "Inicio: Bodega" });
    bounds.extend(startPos);

    route.orders.forEach((o, idx) => {
      if (o.order?.location?.latitude && o.order?.location?.longitude) {
        const pos = {
          lat: o.order.location.latitude,
          lng: o.order.location.longitude,
        };
        new maps.marker.AdvancedMarkerElement({
          map,
          position: pos,
          title: `Parada ${idx + 1}`,
          content: buildMarkerContent(idx + 1, getMarkerColor(o.deliveryStatus)),
        });
        bounds.extend(pos);
      }
    });

    const endPos = { lat: route.endLocation.latitude, lng: route.endLocation.longitude };
    new maps.marker.AdvancedMarkerElement({ map, position: endPos, title: "Fin: Casa Conductor" });
    bounds.extend(endPos);

    map.fitBounds(bounds, 60);
  } catch (err) {
    console.error("💥 Error al dibujar mapa:", err);
    mapContainer.innerHTML = "❌ Error al cargar mapa.";
  }
};

// Helper: color por estado
const getMarkerColor = (status) => {
  switch (status) {
    case "completed": return "#16A34A";
    case "in_progress": return "#F59E0B";
    default: return "#1E88E5";
  }
};

// Marcadores personalizados
const buildMarkerContent = (label, color = "#1E88E5") => {
  const el = document.createElement("div");
  el.style.width = "28px";
  el.style.height = "28px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#fff";
  el.style.border = `2px solid ${color}`;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontWeight = "bold";
  el.style.color = color;
  el.textContent = label.toString();
  return el;
};

// Formatos
const formatDistance = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
const formatDuration = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

// Lifecycle
onMounted(() => {
  loadRoutes();
});
</script>

<style scoped>
#routeMapContainer {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}
</style>
