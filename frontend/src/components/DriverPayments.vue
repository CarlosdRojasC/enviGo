<!-- frontend/src/components/DriverPayments.vue -->
<!-- VERSIÓN MÍNIMA QUE FUNCIONA CON TUS RUTAS ACTUALES -->

<template>
  <div class="driver-payments-container">
    
    <!-- FILTROS BÁSICOS -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="filter-group">
          <label>📅 Desde:</label>
          <input 
            v-model="dateFrom" 
            type="date" 
            class="form-input"
            @change="fetchDriverPayments"
          />
        </div>
        
        <div class="filter-group">
          <label>📅 Hasta:</label>
          <input 
            v-model="dateTo" 
            type="date" 
            class="form-input"
            @change="fetchDriverPayments"
          />
        </div>

        <div class="filter-group">
          <label>💰 Estado:</label>
          <select 
            v-model="paymentStatus" 
            class="form-select"
            @change="fetchDriverPayments"
          >
            <option value="pending">⏳ Pendientes</option>
            <option value="paid">✅ Pagados</option>
            <option value="all">📋 Todos</option>
          </select>
        </div>

        <div class="filter-actions">
          <button @click="refreshData" class="btn-refresh">
            🔄 Actualizar
          </button>
          
          <button 
            @click="runTest" 
            class="btn-test"
            :disabled="loading"
          >
            🧪 Test Sistema
          </button>

          <button 
            @click="migrateData" 
            class="btn-migrate"
            :disabled="loading"
          >
            🔄 Migrar Datos
          </button>
        </div>
      </div>
    </div>

    <!-- RESULTADOS DEL TEST -->
    <div v-if="testResults" class="test-results">
      <div class="test-card">
        <h3>🧪 Resultados del Test</h3>
        <div class="test-stats">
          <div class="test-stat">
            <span>Total Pedidos:</span>
            <span>{{ testResults.debug_info?.total_orders }}</span>
          </div>
          <div class="test-stat">
            <span>Pedidos Entregados:</span>
            <span>{{ testResults.debug_info?.delivered_orders }}</span>
          </div>
          <div class="test-stat">
            <span>Con Conductor:</span>
            <span>{{ testResults.debug_info?.delivered_with_driver }}</span>
          </div>
          <div class="test-stat">
            <span>Conductores Únicos:</span>
            <span>{{ testResults.payment_report?.summary?.total_drivers }}</span>
          </div>
          <div class="test-stat">
            <span>Total a Pagar:</span>
            <span class="amount">${{ formatCurrency(testResults.payment_report?.summary?.total_amount || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RESUMEN ESTADÍSTICAS -->
    <div v-if="summary" class="stats-summary">
      <div class="summary-card">
        <h3>💰 Resumen de Pagos</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Conductores:</span>
            <span class="stat-value">{{ summary.unique_drivers }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Entregas:</span>
            <span class="stat-value">{{ summary.total_deliveries }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total:</span>
            <span class="stat-value amount">${{ formatCurrency(summary.total_amount) }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Fuente:</span>
            <span class="stat-value">{{ summary.data_source === 'driver_history' ? '📋 DriverHistory' : '📦 Orders' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- MENSAJE SI NO HAY DATOS -->
    <div v-else-if="drivers.length === 0 && !testResults" class="no-data-message">
      <div class="no-data-card">
        <h3>📭 No hay entregas registradas</h3>
        <p>No se encontraron entregas para los filtros seleccionados.</p>
        <p><strong>Sugerencia:</strong> Ejecuta primero el "Test Sistema" y luego "Migrar Datos"</p>
      </div>
    </div>

    <!-- LISTA DE CONDUCTORES -->
    <div v-else-if="drivers.length > 0" class="drivers-list">
      <div 
        v-for="driver in drivers" 
        :key="driver.driver_id"
        class="driver-section"
      >
        <div class="driver-header">
          <div class="driver-info">
            <h3>🚗 {{ driver.driver_name }}</h3>
            <div class="driver-details">
              <span class="driver-id">🆔 {{ driver.driver_id }}</span>
              <span class="driver-email">📧 {{ driver.driver_email }}</span>
            </div>
            <div class="driver-stats">
              <span class="orders-count">{{ driver.total_deliveries }} entregas</span>
              <span class="total-payment">
                ${{ formatCurrency(driver.total_amount) }}
              </span>
            </div>
          </div>
          <div class="driver-actions">
            <button 
              @click="toggleDriverDetails(driver.driver_id)"
              class="toggle-btn"
            >
              {{ expandedDrivers.has(driver.driver_id) ? '▲ Ocultar' : '▼ Ver Detalle' }}
            </button>
          </div>
        </div>

        <!-- DETALLE DE ENTREGAS -->
        <div 
          v-if="expandedDrivers.has(driver.driver_id)" 
          class="driver-orders"
        >
          <div class="orders-table">
            <div class="table-header">
              <div class="col">N° Pedido</div>
              <div class="col">Cliente</div>
              <div class="col">Empresa</div>
              <div class="col">Dirección</div>
              <div class="col">Fecha</div>
              <div class="col">Monto</div>
            </div>
            
            <div 
              v-for="delivery in driver.deliveries" 
              :key="delivery.order_number"
              class="table-row"
            >
              <div class="col order-number">{{ delivery.order_number }}</div>
              <div class="col customer">{{ delivery.customer_name }}</div>
              <div class="col company">{{ delivery.company_name || 'N/A' }}</div>
              <div class="col address" :title="delivery.delivery_address">
                {{ truncateText(delivery.delivery_address, 30) }}
              </div>
              <div class="col date">{{ formatDate(delivery.delivered_at) }}</div>
              <div class="col amount">${{ formatCurrency(delivery.payment_amount) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE MIGRACIÓN -->
    <div v-if="migrationResult" class="migration-modal" @click="migrationResult = null">
      <div class="migration-content" @click.stop>
        <h3>✅ Migración Completada</h3>
        <p><strong>{{ migrationResult.created }}</strong> registros creados</p>
        <p><strong>{{ migrationResult.skipped }}</strong> registros omitidos</p>
        <p><strong>{{ migrationResult.total_processed }}</strong> órdenes procesadas</p>
        <button @click="migrationResult = null" class="btn-close">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useToast } from 'vue-toastification'
import { api } from '../services/api'

// ==================== STORES & COMPOSABLES ====================
const authStore = useAuthStore()
const toast = useToast()

// ==================== REACTIVE DATA ====================
const loading = ref(false)
const loadingMessage = ref('Cargando datos...')
const drivers = ref([])
const summary = ref(null)
const testResults = ref(null)
const migrationResult = ref(null)

// Filtros
const dateFrom = ref('')
const dateTo = ref('')
const paymentStatus = ref('pending')

// UI State
const expandedDrivers = ref(new Set())

// ==================== LIFECYCLE ====================
onMounted(async () => {
  // Establecer fechas por defecto (último mes)
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  
  dateFrom.value = lastMonth.toISOString().split('T')[0]
  dateTo.value = today.toISOString().split('T')[0]
  
  // Cargar datos automáticamente
  await fetchDriverPayments()
})

// ==================== API CALLS ====================
async function runTest() {
  try {
    loading.value = true
    loadingMessage.value = 'Ejecutando test del sistema...'
    
    const response = await api.get('/driver-history/test', {
      params: {
        date_from: dateFrom.value,
        date_to: dateTo.value,
        payment_status: paymentStatus.value
      }
    })
    
    testResults.value = response.data
    toast.success('Test ejecutado correctamente')
    console.log('🧪 Resultados del test:', response.data)
    
  } catch (error) {
    console.error('❌ Error en test:', error)
    toast.error('Error ejecutando test: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

async function fetchDriverPayments() {
  try {
    loading.value = true
    loadingMessage.value = 'Cargando entregas de conductores...'
    
    const params = {
      date_from: dateFrom.value,
      date_to: dateTo.value,
      payment_status: paymentStatus.value
    }

    console.log('📡 Solicitando entregas con parámetros:', params)

    const response = await api.get('/driver-history/all-deliveries', { params })
    const { data } = response.data
    
    drivers.value = data.drivers || []
    summary.value = data.summary || null
    
    console.log('✅ Datos cargados:', {
      drivers: drivers.value.length,
      summary: summary.value
    })
    
    if (drivers.value.length === 0) {
      toast.info('No se encontraron entregas. Intenta ejecutar la migración de datos.')
    } else {
      toast.success(`Cargados ${drivers.value.length} conductores`)
    }
    
  } catch (error) {
    console.error('❌ Error cargando pagos:', error)
    toast.error('Error al cargar los pagos: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

async function migrateData() {
  try {
    if (!confirm('¿Deseas migrar los datos históricos? Esto creará registros en DriverHistory desde las órdenes entregadas.')) {
      return
    }

    loading.value = true
    loadingMessage.value = 'Migrando datos históricos...'

    const response = await api.post('/driver-history/create-from-orders')
    
    migrationResult.value = response.data.data
    toast.success(response.data.message)
    
    // Recargar datos después de la migración
    await fetchDriverPayments()

  } catch (error) {
    console.error('❌ Error en migración:', error)
    toast.error('Error en migración: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

// ==================== UI METHODS ====================
function toggleDriverDetails(driverId) {
  if (expandedDrivers.value.has(driverId)) {
    expandedDrivers.value.delete(driverId)
  } else {
    expandedDrivers.value.add(driverId)
  }
}

function refreshData() {
  fetchDriverPayments()
}

// ==================== UTILS ====================
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
</script>

<style scoped>
.driver-payments-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Filtros */
.filters-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.form-input, .form-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.btn-refresh, .btn-test, .btn-migrate {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #3b82f6;
  color: white;
}

.btn-test {
  background: #8b5cf6;
  color: white;
}

.btn-migrate {
  background: #f59e0b;
  color: white;
}

.btn-refresh:hover, .btn-test:hover, .btn-migrate:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Test Results */
.test-results {
  margin-bottom: 20px;
}

.test-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  padding: 20px;
  border-radius: 8px;
}

.test-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.test-stat {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.test-stat .amount {
  color: #059669;
  font-weight: 700;
}

/* Estadísticas */
.stats-summary {
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-label {
  font-weight: 600;
  color: #6b7280;
}

.stat-value {
  font-weight: 700;
  color: #111827;
}

.stat-value.amount {
  color: #059669;
  font-size: 16px;
}

/* Conductores */
.drivers-list {
  space-y: 20px;
}

.driver-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-bottom: 20px;
}

.driver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.driver-info h3 {
  margin: 0 0 8px 0;
  color: #111827;
  font-size: 18px;
}

.driver-details {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.driver-stats {
  display: flex;
  gap: 15px;
}

.orders-count {
  background: #dbeafe;
  color: #1e40af;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.total-payment {
  background: #d1fae5;
  color: #065f46;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
}

.toggle-btn {
  background: #6b7280;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

/* Tabla */
.driver-orders {
  padding: 20px;
}

.orders-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 80px;
  gap: 10px;
  padding: 10px;
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  border-radius: 6px 6px 0 0;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 80px;
  gap: 10px;
  padding: 12px 10px;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
}

.table-row:hover {
  background: #f9fafb;
}

.col {
  font-size: 14px;
  color: #374151;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
}

.amount {
  font-weight: 600;
  color: #059669;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* No data */
.no-data-message {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.no-data-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 500px;
}

.no-data-card h3 {
  color: #6b7280;
  margin-bottom: 15px;
}

.no-data-card p {
  color: #9ca3af;
  margin-bottom: 10px;
}

/* Migration Modal */
.migration-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.migration-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
}

.migration-content h3 {
  color: #059669;
  margin-bottom: 15px;
}

.btn-close {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 15px;
}
</style>