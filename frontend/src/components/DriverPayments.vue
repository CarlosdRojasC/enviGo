<template>
  <div class="driver-payments-container">
    
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        
        <div class="flex flex-wrap gap-4 flex-1">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Desde</label>
            <input v-model="dateFrom" type="date" class="form-input" @change="fetchData" />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Hasta</label>
            <input v-model="dateTo" type="date" class="form-input" @change="fetchData" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Estado</label>
            <select v-model="paymentStatus" class="form-select min-w-[150px]" @change="fetchData">
              <option value="pending">⏳ Pendientes</option>
              <option value="paid">✅ Pagados</option>
              <option value="all">📋 Todos</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="fetchData" class="btn btn-secondary">
            🔄 Refrescar
          </button>
          <button @click="runTest" class="btn btn-outline">
            🧪 Test
          </button>
          <button @click="migrateData" class="btn btn-warning">
            📥 Traer Pedidos
          </button>
        </div>
      </div>
    </div>

    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="kpi-card">
        <div class="kpi-label">Total a Pagar</div>
        <div class="kpi-value text-emerald-600">${{ formatCurrency(summary.total_amount) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Entregas</div>
        <div class="kpi-value text-blue-600">{{ summary.total_deliveries }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Conductores</div>
        <div class="kpi-value text-purple-600">{{ summary.unique_drivers }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Periodo</div>
        <div class="kpi-value text-gray-600 text-sm mt-1">
          {{ formatDateShort(dateFrom) }} - {{ formatDateShort(dateTo) }}
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <div v-else-if="groupedDrivers.length === 0" class="bg-white p-10 rounded-xl text-center border border-dashed border-gray-300">
      <div class="text-4xl mb-3">📭</div>
      <h3 class="text-lg font-medium text-gray-900">No hay pagos pendientes</h3>
      <p class="text-gray-500">No se encontraron entregas en este rango de fechas.</p>
      <button @click="migrateData" class="mt-4 text-blue-600 font-medium hover:underline">
        ¿Intentar importar desde órdenes recientes?
      </button>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="driver in groupedDrivers" 
        :key="driver.id"
        class="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:shadow-md"
      >
        <div 
          class="p-4 flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          @click="toggleDriver(driver.id)"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {{ getInitials(driver.name) }}
            </div>
            <div>
              <h3 class="font-bold text-gray-900">{{ driver.name }}</h3>
              <p class="text-xs text-gray-500">{{ driver.email }}</p>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="text-right hidden sm:block">
              <p class="text-xs text-gray-500">Entregas</p>
              <p class="font-bold">{{ driver.deliveries.length }}</p>
            </div>
            <div class="text-right min-w-[100px]">
              <p class="text-xs text-gray-500">Total</p>
              <p class="font-bold text-lg text-emerald-600">${{ formatCurrency(driver.totalAmount) }}</p>
            </div>
            <div class="transform transition-transform duration-200" :class="{ 'rotate-180': expandedDrivers.has(driver.id) }">
              ▼
            </div>
          </div>
        </div>

        <div v-if="expandedDrivers.has(driver.id)" class="border-t border-gray-200 p-4 animate-fade-in">
          
          <div class="flex flex-wrap justify-between items-center mb-4 bg-blue-50 p-3 rounded-lg gap-3" v-if="paymentStatus === 'pending'">
            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                :checked="areAllSelected(driver)" 
                @change="toggleSelectAllDriver(driver)"
                class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span class="text-sm font-medium text-blue-800">Seleccionar todo</span>
            </div>
            
            <div class="flex gap-2">
              <button 
                @click="paySelected(driver)"
                :disabled="getSelectedCount(driver) === 0 || processing"
                class="btn btn-primary text-sm shadow-sm"
              >
                {{ processing ? 'Procesando...' : `Pagar (${getSelectedCount(driver)}) Seleccionados` }}
              </button>
              
              <button 
                 @click="payAllToDriver(driver.id, driver.name, driver.totalAmount)"
                 class="btn btn-emerald text-sm shadow-sm"
                 :disabled="processing"
              >
                💸 Pagar Todo
              </button>
            </div>
          </div>

          <div class="overflow-x-auto border border-gray-200 rounded-lg">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th v-if="paymentStatus === 'pending'" class="px-4 py-3 w-10"></th>
                  <th class="px-4 py-3">Pedido</th>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Dirección</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3 text-right">Monto</th>
                  <th class="px-4 py-3 text-center">Estado</th>
                  <th v-if="paymentStatus === 'pending'" class="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr 
                  v-for="delivery in driver.deliveries" 
                  :key="delivery._id"
                  class="hover:bg-gray-50 transition-colors"
                  :class="{ 'bg-blue-50/30': selectedDeliveries[delivery._id] }"
                >
                  <td v-if="paymentStatus === 'pending'" class="px-4 py-3">
                    <input 
                      type="checkbox" 
                      v-model="selectedDeliveries[delivery._id]"
                      class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td class="px-4 py-3 font-medium text-gray-900">
                    {{ delivery.order_number }}
                  </td>
                  <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {{ formatDateTime(delivery.delivered_at) }}
                  </td>
                  <td class="px-4 py-3 text-gray-600 truncate max-w-[200px]" :title="delivery.delivery_address">
                    {{ delivery.delivery_address }}
                  </td>
                  <td class="px-4 py-3 text-gray-600">
                    {{ delivery.customer_name }}
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-emerald-600">
                    ${{ formatCurrency(delivery.payment_amount) }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span 
                      class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="delivery.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
                    >
                      {{ delivery.payment_status === 'paid' ? 'Pagado' : 'Pendiente' }}
                    </span>
                  </td>
                  <td v-if="paymentStatus === 'pending'" class="px-4 py-3 text-center">
                    <button 
                      @click="markAsPaid([delivery._id], driver.name)"
                      class="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded transition-colors"
                    >
                      Pagar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="migrationResult" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="migrationResult = null">
      <div class="bg-white p-6 rounded-xl shadow-xl max-w-md w-full m-4" @click.stop>
        <h3 class="text-lg font-bold text-emerald-600 mb-4 flex items-center gap-2">
          ✅ Migración Completada
        </h3>
        <div class="space-y-2 mb-6 text-gray-600">
          <p class="flex justify-between"><span>Registros creados:</span> <strong class="text-gray-900">{{ migrationResult.created }}</strong></p>
          <p class="flex justify-between"><span>Registros omitidos:</span> <strong class="text-gray-900">{{ migrationResult.skipped }}</strong></p>
          <p class="flex justify-between"><span>Total procesado:</span> <strong class="text-gray-900">{{ migrationResult.total_processed }}</strong></p>
        </div>
        <button @click="migrationResult = null" class="w-full btn btn-primary">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { driverPaymentsService } from '../services/driverPayments.service'

const toast = useToast()

// Estado
const loading = ref(false)
const processing = ref(false)
const loadingMessage = ref('')
const rawDeliveries = ref([]) // Datos crudos del backend
const summary = ref({ total_amount: 0, total_deliveries: 0, unique_drivers: 0 })
const expandedDrivers = ref(new Set())
const selectedDeliveries = ref({}) // { "delivery_id": true/false }

// Filtros
const dateFrom = ref('')
const dateTo = ref('')
const paymentStatus = ref('pending')

// Resultados temporales
const testResults = ref(null)
const migrationResult = ref(null)

// ==========================================
// ⚡ COMPUTED: AGRUPACIÓN DE DATOS INTELIGENTE
// ==========================================
const groupedDrivers = computed(() => {
  if (!rawDeliveries.value || rawDeliveries.value.length === 0) return []

  const groups = {}

  rawDeliveries.value.forEach(record => {
    const driverId = record.driver_id || 'unknown'
    
    if (!groups[driverId]) {
      groups[driverId] = {
        id: driverId,
        name: record.driver_name || 'Conductor Desconocido',
        email: record.driver_email || '',
        totalAmount: 0,
        deliveries: []
      }
    }

    groups[driverId].deliveries.push(record)
    
    // Solo sumar al total si no está pagado (o si estamos viendo historial)
    if (paymentStatus.value === 'pending' && record.payment_status === 'pending') {
        groups[driverId].totalAmount += (record.payment_amount || 0)
    } else if (paymentStatus.value !== 'pending') {
        groups[driverId].totalAmount += (record.payment_amount || 0)
    }
  })

  return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount)
})

// ==========================================
// 🔄 CARGA DE DATOS
// ==========================================
onMounted(() => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  
  dateFrom.value = firstDay.toISOString().split('T')[0]
  dateTo.value = today.toISOString().split('T')[0]
  
  fetchData()
})

async function fetchData() {
  loading.value = true
  loadingMessage.value = 'Cargando entregas...'
  selectedDeliveries.value = {} // Limpiar selección al recargar
  
  try {
    const response = await driverPaymentsService.getAllDeliveries({
      date_from: dateFrom.value,
      date_to: dateTo.value,
      payment_status: paymentStatus.value
    })

    const responseData = response.data

    // Normalizar datos: Extraer lista plana de entregas
    if (responseData.data && Array.isArray(responseData.data.drivers)) {
      // Si viene agrupado, lo aplanamos para usar nuestra lógica
      rawDeliveries.value = responseData.data.drivers.flatMap(d => d.deliveries.map(del => ({
        ...del,
        driver_id: d.driver_id,
        driver_name: d.driver_name,
        driver_email: d.driver_email
      })))
    } else if (Array.isArray(responseData.deliveries)) {
      rawDeliveries.value = responseData.deliveries
    } else {
      rawDeliveries.value = []
    }

    // Recalcular resumen
    summary.value = {
      total_amount: rawDeliveries.value.reduce((sum, d) => sum + (d.payment_amount || 0), 0),
      total_deliveries: rawDeliveries.value.length,
      unique_drivers: new Set(rawDeliveries.value.map(d => d.driver_id)).size
    }

  } catch (error) {
    console.error('Error fetching payments:', error)
    toast.error('Error al cargar datos')
  } finally {
    loading.value = false
  }
}

// ==========================================
// 💾 ACCIONES
// ==========================================
async function migrateData() {
  if(!confirm("¿Importar entregas recientes desde las Órdenes?")) return
  
  loading.value = true
  try {
    const res = await driverPaymentsService.createHistoryFromOrders()
    migrationResult.value = res.data.data || { created: 0, skipped: 0, total_processed: 0 }
    toast.success(res.data.message)
    await fetchData()
  } catch (error) {
    toast.error('Error en migración')
  } finally {
    loading.value = false
  }
}

async function runTest() {
  try {
    const res = await driverPaymentsService.testDriverSystem()
    console.log('Test Result:', res.data)
    toast.info('Test ejecutado. Revisa la consola para detalles técnicos.')
  } catch (e) {
    toast.error('Error en test')
  }
}

async function paySelected(driver) {
  const idsToPay = driver.deliveries
    .filter(d => selectedDeliveries.value[d._id])
    .map(d => d._id)

  if (idsToPay.length === 0) return

  if (!confirm(`¿Pagar ${idsToPay.length} entregas a ${driver.name}?`)) return

  processing.value = true
  try {
    await driverPaymentsService.markDeliveriesAsPaid(idsToPay, 'Pago manual panel')
    toast.success('Pagos registrados exitosamente')
    await fetchData()
  } catch (error) {
    toast.error('Error al procesar el pago')
  } finally {
    processing.value = false
  }
}

async function markAsPaid(orderIds, driverName) {
  if (!confirm(`¿Marcar como pagado?`)) return
  
  try {
    await driverPaymentsService.markDeliveriesAsPaid(orderIds, `Pago individual - ${driverName}`)
    toast.success('Entrega pagada')
    await fetchData()
  } catch (error) {
    toast.error('Error al pagar')
  }
}

async function payAllToDriver(driverId, driverName, totalAmount) {
  if (!confirm(`¿Pagar TODO ($${formatCurrency(totalAmount)}) a ${driverName}?`)) return

  processing.value = true
  try {
    await driverPaymentsService.payAllPendingToDriver(driverId)
    toast.success(`Pagado todo a ${driverName}`)
    await fetchData()
  } catch (error) {
    toast.error('Error al pagar conductor')
  } finally {
    processing.value = false
  }
}

// ==========================================
// 💅 UI HELPERS
// ==========================================
function toggleDriver(id) {
  if (expandedDrivers.value.has(id)) {
    expandedDrivers.value.delete(id)
  } else {
    expandedDrivers.value.add(id)
  }
}

function toggleSelectAllDriver(driver) {
  const allSelected = areAllSelected(driver)
  driver.deliveries.forEach(d => {
    selectedDeliveries.value[d._id] = !allSelected
  })
}

function areAllSelected(driver) {
  return driver.deliveries.length > 0 && 
         driver.deliveries.every(d => selectedDeliveries.value[d._id])
}

function getSelectedCount(driver) {
  return driver.deliveries.filter(d => selectedDeliveries.value[d._id]).length
}

function getInitials(name) {
  return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'
}

function formatCurrency(val) {
  return new Intl.NumberFormat('es-CL').format(val)
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.form-input, .form-select {
  @apply border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center active:scale-95;
}
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed; }
.btn-secondary { @apply bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200; }
.btn-outline { @apply border border-gray-300 text-gray-600 hover:bg-gray-50; }
.btn-warning { @apply bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200; }
.btn-emerald { @apply bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300; }

.kpi-card {
  @apply bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow;
}
.kpi-label { @apply text-xs font-bold text-gray-500 uppercase tracking-wider; }
.kpi-value { @apply text-2xl font-bold mt-1; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>