<template>
  <div class="p-6 bg-gray-50 min-h-screen">
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
                  👁️ Ver Mapa
                </button>
                </td>
            </tr>
          </tbody>
        </table>
        </div>
    </div>

    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      @click.self="showRouteMap = false"
    >
      <div class="bg-white rounded-xl w-full max-w-6xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="flex justify-between items-center border-b p-4 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span class="text-xl">🗺️</span> Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
            <span class="text-sm font-normal text-gray-500 ml-2">({{ activeRoute?.driver?.name || 'Sin asignar' }})</span>
          </h3>
          <button @click="showRouteMap = false" class="text-gray-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-gray-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="relative p-4 flex-grow overflow-hidden">
          <div id="routeMapContainer" class="w-full h-full rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400">
             <span v-if="!mapInstance">Inicializando mapa...</span>
          </div>
        </div>
         <div class="p-3 bg-gray-50 border-t text-sm text-gray-600 text-center">
          Distancia: {{ formatDistance(activeRoute?.optimization?.totalDistance) }} | Duración estimada: {{ formatDuration(activeRoute?.optimization?.totalDuration) }}
        </div>
      </div>
    </div>

    <div v-if="showRouteOptimizerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="showRouteOptimizerModal = false">
        </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { apiService } from "../services/api";
// ✅ Importa las funciones correctas del loader
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// State
const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizerModal = ref(false);

// Configura el API Loader UNA SOLA VEZ
setOptions({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  libraries: ["maps", "geometry", "marker"], // Carga las librerías necesarias
});

// Computed Stats
const statCards = computed(() => {
    // ... (sin cambios)
});

// Methods
const loadRoutes = async () => {
  loading.value = true;
  mapInstance.value = null; 
  try {
    const response = await apiService.routes.getAll(); 
    routes.value = response.data?.data?.routes || response.data?.routes || response.data || [];
    console.log("📦 Rutas cargadas:", routes.value.length);
  } catch (err) {
    console.error("❌ Error cargando rutas:", err);
    routes.value = []; 
  } finally {
    loading.value = false;
  }
};

const refreshRoutes = () => loadRoutes();

/**
 * 🗺️ Función para mostrar la ruta en el mapa (CORREGIDA para Polilínea)
 */
const viewRoute = async (route) => {
  activeRoute.value = route;
  showRouteMap.value = true;
  mapInstance.value = null;
  await nextTick(); 

  console.log("🗺️ Mostrando ruta pre-calculada:", route._id);
  const mapContainer = document.getElementById("routeMapContainer");
   if (!mapContainer) {
    console.error("❌ No se encontró el div '#routeMapContainer'");
    return;
  }
  mapContainer.innerHTML = 'Cargando mapa...'; 

  // Verificar polilínea
  const polylineString = route.optimization?.overview_polyline;
  if (!polylineString) {
    console.warn("⚠️ Esta ruta no tiene una polilínea guardada.");
    mapContainer.innerHTML = '⚠️ No hay datos de mapa para esta ruta.';
    return; 
  }

  try {
    // ✅ Usa importLibrary para cargar las clases de Google Maps
    const { Map } = await importLibrary("maps");
    const { Polyline } = await importLibrary("maps"); // Polyline está en 'maps'
    const { LatLngBounds } = await importLibrary("core"); // LatLngBounds está en 'core'
    const { encoding } = await importLibrary("geometry"); 
    const { AdvancedMarkerElement } = await importLibrary("marker"); 

    console.log("✅ Google Maps API y librerías cargadas");

    // Inicializar mapa
    const map = new Map(mapContainer, {
      center: { lat: route.startLocation.latitude, lng: route.startLocation.longitude },
      zoom: 12,
      mapId: "ENVIGO_ROUTE_MAP" 
    });
    mapInstance.value = map;
    
    const bounds = new LatLngBounds(); 

    // 1. Dibujar Polilínea del Backend
    const decodedPath = encoding.decodePath(polylineString);
    const routePolyline = new Polyline({ // Usa la clase Polyline cargada
        path: decodedPath,
        geodesic: true,
        strokeColor: "#1E88E5",
        strokeOpacity: 0.9,
        strokeWeight: 5,
    });
    routePolyline.setMap(map);
    decodedPath.forEach(point => bounds.extend(point)); 
    console.log("✅ Polilínea dibujada");

    // 2. Marcador de Inicio
    const startPos = { lat: route.startLocation.latitude, lng: route.startLocation.longitude };
    new AdvancedMarkerElement({ map, position: startPos, title: "Inicio: Bodega" });
    bounds.extend(startPos);

    // 3. Marcadores de Órdenes
    (route.orders || []).forEach((orderItem, index) => {
      if (orderItem.order?.location?.latitude && orderItem.order?.location?.longitude) {
        const position = {
          lat: orderItem.order.location.latitude,
          lng: orderItem.order.location.longitude,
        };
        new AdvancedMarkerElement({
          map,
          position,
          title: `Parada ${index + 1}: ${orderItem.order.customer_name || 'Cliente'} #${orderItem.order.order_number || ''}`,
          content: buildMarkerContent(index + 1), 
        });
        bounds.extend(position);
      } else {
         console.warn(`⚠️ Orden ${orderItem.order?._id} sin coordenadas válidas.`);
      }
    });
    console.log(`✅ ${route.orders?.length || 0} marcadores de parada añadidos`);

    // 4. Marcador de Fin
    const endPos = { lat: route.endLocation.latitude, lng: route.endLocation.longitude };
    new AdvancedMarkerElement({ map, position: endPos, title: "Fin: Casa Conductor" });
    bounds.extend(endPos);

    // 5. Ajustar Zoom
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 60); 
        // Esperar a que el mapa esté inactivo después de fitBounds
        google.maps.event.addListenerOnce(map, 'idle', () => {
             if (map.getZoom() > 16) map.setZoom(16); // Limitar zoom máximo
        });
    }

    console.log("✅ Mapa renderizado con polilínea y marcadores del backend.");

  } catch (err) {
    console.error("💥 Error al inicializar el mapa o dibujar la ruta:", err);
    mapContainer.innerHTML = `❌ Error al cargar el mapa: ${err.message}`;
  }
};

// Helper para crear contenido de marcador (sin cambios)
const buildMarkerContent = (label) => {
    // ... (igual que antes)
};

// Funciones de formato (sin cambios)
const formatDistance = (meters) => {
    // ... (igual que antes)
};

const formatDuration = (seconds) => {
    // ... (igual que antes)
};

// Lifecycle Hook
onMounted(() => {
  console.log("🧠 Iniciando componente RouteManager...");
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
     console.error("🚫 FATAL: VITE_GOOGLE_MAPS_API_KEY no definida!");
     alert("Error: Falta la clave de Google Maps API en el frontend.");
  }
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