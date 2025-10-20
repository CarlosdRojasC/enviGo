<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <h1 class="text-xl font-bold mb-3">🚛 Mi Ruta Activa</h1>

    <div v-if="loading" class="text-gray-600">Cargando ruta...</div>
    <div v-else-if="!route">
      <p class="text-gray-600">No tienes rutas asignadas.</p>
    </div>

    <div v-else>
      <!-- MAPA -->
      <div id="driverMap" class="w-full h-72 rounded-lg shadow mb-4"></div>

      <!-- LISTA DE PEDIDOS -->
      <div
        v-for="order in route.orders"
        :key="order._id"
        class="bg-white p-4 rounded-lg shadow mb-3"
      >
        <h3 class="font-semibold text-lg">
          {{ order.order?.customer_name || 'Cliente desconocido' }}
        </h3>
        <p class="text-sm text-gray-500">
          {{ order.order?.shipping_address || 'Sin dirección disponible' }}
        </p>

        <div class="flex gap-2 mt-3">
          <button
            @click="markDelivered(order)"
            class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Entregar
          </button>
          <button
            @click="viewProof(order.order._id)"
            class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Prueba
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import axios from 'axios'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

const router = useRouter()
const auth = useAuthStore()
const route = ref(null)
const loading = ref(true)

const loadActiveRoute = async () => {
  try {
    const { data } = await axios.get('/api/routes/driver/active', {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    route.value = data.data
  } catch (err) {
    console.error('❌ Error al cargar ruta:', err)
    route.value = null
  } finally {
    loading.value = false
  }
}

const drawMap = async () => {
  if (!route.value?.startLocation) return
  setOptions({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: 'weekly',
    libraries: ['maps', 'geometry', 'marker'],
  })

  const { Map } = await importLibrary('maps')
  const { encoding } = await importLibrary('geometry')

  const map = new Map(document.getElementById('driverMap'), {
    center: {
      lat: route.value.startLocation.latitude,
      lng: route.value.startLocation.longitude,
    },
    zoom: 12,
  })

  if (route.value.optimization?.overview_polyline) {
    const path = encoding.decodePath(route.value.optimization.overview_polyline)
    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map,
    })
  }
}

const markDelivered = async (order) => {
  try {
    await axios.patch(
      `/api/routes/${route.value._id}/orders/${order.order._id}/status`,
      { status: 'delivered' },
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      }
    )
    await loadActiveRoute()
    await drawMap()
  } catch (err) {
    console.error('❌ Error al marcar entrega:', err)
  }
}

const viewProof = (id) => router.push(`/driver/proof/${id}`)

onMounted(async () => {
  await loadActiveRoute()
  await drawMap()
})
</script>
