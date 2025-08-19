<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Rutas de Recolección</h1>
      <button
        @click="fetchPendingPickups"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        🔄 Actualizar
      </button>
    </div>

    <!-- Tabla -->
    <div class="overflow-x-auto border rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-semibold">#</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Manifiesto</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Empresa</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Dirección retiro</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Órdenes</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Bultos</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Fecha</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="(m, idx) in manifests"
            :key="m._id"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-2 text-sm">{{ idx + 1 }}</td>
            <td class="px-4 py-2 font-mono text-sm">{{ m.manifest_number }}</td>
            <td class="px-4 py-2 text-sm">{{ m.company_id?.name || '—' }}</td>
            <td class="px-4 py-2 text-sm">
              <span v-if="m.pickup_address">
                {{ formatAddress(m.pickup_address) }}
              </span>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-2 text-sm">{{ m.total_orders }}</td>
            <td class="px-4 py-2 text-sm">{{ m.total_packages }}</td>
            <td class="px-4 py-2 text-sm">{{ formatDate(m.generated_at) }}</td>
            <td class="px-4 py-2 text-sm">
              <button
                @click="viewManifest(m)"
                class="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                Ver
              </button>
              <button
                @click="downloadPDF(m)"
                class="ml-2 px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                PDF
              </button>
            </td>
          </tr>

          <!-- No results -->
          <tr v-if="manifests.length === 0">
            <td
              colspan="8"
              class="px-4 py-6 text-center text-sm text-gray-500"
            >
              No hay manifiestos pendientes de recolección.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiService }  from '../services/api'
import { useToast } from 'vue-toastification';
const manifests = ref([])
const toast = useToast();

onMounted(() => {
  fetchPendingPickups()
})

async function fetchPendingPickups() {
  try {
    const { data } = await apiService.manifests.getAll({
      status: 'pending_pickup'
    })
    manifests.value = data.manifests || []
  } catch (error) {
    console.error('❌ Error obteniendo pending_pickup:', error)
    toast.error('Error al obtener los manifiestos pendientes')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('es-CL')
}

function formatAddress(addr) {
  if (!addr) return ''
  return [
    addr.street,
    addr.number,
    addr.commune,
    addr.city,
    addr.region
  ]
    .filter(Boolean)
    .join(', ')
}

function viewManifest(manifest) {
  toast.info(`Abrir detalle de manifiesto ${manifest.manifest_number}`)
  // Aquí puedes usar router.push a la vista detalle si la tienes
}

async function downloadPDF(manifest) {
  try {
    const { data } = await apiService.manifests.downloadPDF(manifest._id)
    const blob = new Blob([data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `manifest_${manifest.manifest_number}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('❌ Error descargando PDF:', error)
    toast.error('Error al descargar PDF del manifiesto')
  }
}
</script>
