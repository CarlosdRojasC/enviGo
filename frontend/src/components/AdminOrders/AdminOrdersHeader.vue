<template>
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <!-- Header Principal -->
    <div class="px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Pedidos Globales
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestión centralizada de todos los pedidos del sistema
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Botón Crear Pedido -->
          <button
            @click="$emit('create-order')"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span class="material-icons text-base">add</span>
            <span>Crear Pedido</span>
          </button>

          <!-- Botón Subida Masiva -->
          <button
            @click="$emit('bulk-upload')"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span class="material-icons text-base">file_upload</span>
            <span>Subida Masiva</span>
          </button>

          <!-- Botón Exportar -->
          <button
            @click="$emit('export')"
            :disabled="isExporting"
            class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span v-if="!isExporting" class="material-icons text-base">file_download</span>
            <span v-else class="material-icons text-base animate-spin">refresh</span>
            <span>{{ isExporting ? 'Exportando...' : 'Exportar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Cards de Estadísticas -->
    <div class="px-6 pb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total Pedidos -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <span class="material-icons text-blue-600 dark:text-blue-400 text-2xl">
                inventory_2
              </span>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.total || 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total Pedidos
              </p>
            </div>
          </div>
        </div>

        <!-- Pendientes -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <span class="material-icons text-yellow-600 dark:text-yellow-400 text-2xl">
                pending_actions
              </span>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.pending || 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Pendientes
              </p>
            </div>
          </div>
        </div>

        <!-- Listos -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <span class="material-icons text-purple-600 dark:text-purple-400 text-2xl">
                list_alt
              </span>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.ready || 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Listos
              </p>
            </div>
          </div>
        </div>

        <!-- En Tránsito -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <span class="material-icons text-blue-600 dark:text-blue-400 text-2xl">
                local_shipping
              </span>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.in_transit || 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                En Tránsito
              </p>
            </div>
          </div>
        </div>

        <!-- Entregados -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <span class="material-icons text-green-600 dark:text-green-400 text-2xl">
                check_circle
              </span>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.delivered || 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Entregados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Métricas Adicionales -->
    <div class="px-6 pb-6">
      <div class="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black rounded-xl p-4 shadow-lg">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="flex items-center gap-3 text-white">
            <span class="material-icons text-green-400">attach_money</span>
            <div>
              <p class="text-xs text-gray-300">Valor Total</p>
              <p class="text-lg font-bold">
                ${{ formatNumber(additionalStats?.total_value || 0) }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 text-white">
            <span class="material-icons text-blue-400">trending_up</span>
            <div>
              <p class="text-xs text-gray-300">Promedio por Pedido</p>
              <p class="text-lg font-bold">
                ${{ formatNumber(additionalStats?.avg_value || 0) }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 text-white">
            <span class="material-icons text-purple-400">schedule</span>
            <div>
              <p class="text-xs text-gray-300">Tasa de Entrega</p>
              <p class="text-lg font-bold">
                {{ additionalStats?.delivery_rate || 0 }}%
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 text-white">
            <span class="material-icons text-yellow-400">storage</span>
            <div>
              <p class="text-xs text-gray-300">En Shipday</p>
              <p class="text-lg font-bold">
                {{ additionalStats?.in_shipday || 0 }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      total: 0,
      pending: 0,
      ready: 0,
      in_transit: 0,
      delivered: 0
    })
  },
  additionalStats: {
    type: Object,
    default: () => ({
      total_value: 0,
      avg_value: 0,
      delivery_rate: 0,
      in_shipday: 0
    })
  },
  isExporting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['create-order', 'bulk-upload', 'export', 'quick-action'])

function formatNumber(value) {
  return new Intl.NumberFormat('es-CL').format(value || 0)
}
</script>

<style scoped>
.material-icons {
  font-size: 1.25rem;
}
</style>