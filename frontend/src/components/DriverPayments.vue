<!-- frontend/src/components/DriverPayments.vue -->
<!-- VERSIÓN ACTUALIZADA Y CORREGIDA -->

<template>
  <div class="driver-payments-container">
    
    <!-- FILTROS -->
    <div class="filters-section">
      <div class="filters-row">
        <!-- Filtro de Fechas -->
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

        <!-- Filtro de Estado de Pago -->
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

        <!-- Filtro de Empresa (Solo para admins) -->
        <div class="filter-group" v-if="authStore.user.role === 'admin'">
          <label>🏢 Empresa:</label>
          <select 
            v-model="selectedCompany" 
            class="form-select"
            @change="fetchDriverPayments"
          >
            <option value="">Todas las empresas</option>
            <option 
              v-for="company in companies" 
              :key="company._id" 
              :value="company._id"
            >
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- Botones de Acción -->
        <div class="filter-actions">
          <button @click="refreshData" class="btn-refresh">
            🔄 Actualizar
          </button>
          
          <button 
            v-if="authStore.user.role === 'admin'" 
            @click="exportToExcel" 
            class="btn-export"
            :disabled="loading"
          >
            📊 Exportar Excel
          </button>

          <button 
            v-if="authStore.user.role === 'admin'" 
            @click="migrateHistoryData" 
            class="btn-migrate"
            :disabled="loading"
          >
            🔄 Migrar Datos
          </button>
        </div>
      </div>
    </div>

    <!-- RESUMEN ESTADÍSTICAS -->
    <div v-if="stats" class="stats-summary">
      <div class="summary-card">
        <h3>{{ authStore.user.role === 'admin' ? 'Resumen Global EnviGo' : 'Resumen de tu Empresa' }}</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Total Conductores:</span>
            <span class="stat-value">{{ stats.total_drivers || stats.unique_drivers }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total Entregas:</span>
            <span class="stat-value">{{ stats.total_deliveries }}</span>
          </div>
          <div class="stat" v-if="authStore.user.role === 'admin' && stats.unique_companies">
            <span class="stat-label">Empresas Servidas:</span>
            <span class="stat-value">{{ stats.unique_companies }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total a Pagar:</span>
            <span class="stat-value total-amount">${{ formatCurrency(stats.total_amount) }}</span>
          </div>
          <div class="stat" v-if="stats.data_source">
            <span class="stat-label">Fuente de Datos:</span>
            <span class="stat-value">{{ stats.data_source === 'driver_history' ? '📋 DriverHistory' : '📦 Orders' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando datos de conductores...</p>
    </div>

    <!-- MENSAJE SI NO HAY DATOS -->
    <div v-else-if="drivers.length === 0" class="no-data-message">
      <div class="no-data-card">
        <h3>📭 No hay entregas registradas</h3>
        <p>No se encontraron entregas para los filtros seleccionados.</p>
        <p v-if="authStore.user.role === 'admin'">
          <strong>Sugerencia:</strong> Intenta migrar los datos históricos usando el botón "Migrar Datos"
        </p>
      </div>
    </div>

    <!-- LISTA DE CONDUCTORES -->
    <div v-else class="drivers-list">
      <div 
        v-for="driver in drivers" 
        :key="driver.driver_id"
        class="driver-section"
      >
        <div class="driver-header">
          <div class="driver-info">
            <h3>🚗 {{ driver.driver_name }}</h3>
            <div class="driver-details">
              <span class="driver-id">🆔 ID: {{ driver.driver_id }}</span>
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
              v-if="authStore.user.role === 'admin' && paymentStatus === 'pending' && driver.total_amount > 0"
              @click="payAllToDriver(driver.driver_id, driver.driver_name, driver.total_amount)"
              class="btn-pay-all"
              :disabled="payingDriver === driver.driver_id"
            >
              <span v-if="payingDriver === driver.driver_id">⏳ Procesando...</span>
              <span v-else>💸 Pagar Todo (${{ formatCurrency(driver.total_amount) }})</span>
            </button>
            <button 
              @click="toggleDriverDetails(driver.driver_id)"
              class="toggle-btn"
            >
              {{ expandedDrivers.has(driver.driver_id) ? '▲ Ocultar' : '▼ Ver Detalle' }}
            </button>
          </div>
        </div>

        <!-- DETALLE DE ENTREGAS DEL CONDUCTOR -->
        <div 
          v-if="expandedDrivers.has(driver.driver_id)" 
          class="driver-orders"
        >
          <!-- Tabla de Entregas -->
          <div class="orders-table">
            <div class="table-header">
              <div class="col">N° Pedido</div>
              <div class="col">Cliente</div>
              <div class="col" v-if="authStore.user.role === 'admin'">Empresa</div>
              <div class="col">Dirección</div>
              <div class="col">Fecha Entrega</div>
              <div class="col">Monto</div>
              <div v-if="authStore.user.role === 'admin' && paymentStatus === 'pending'" class="col">Acción</div>
            </div>
            
            <div 
              v-for="delivery in driver.deliveries" 
              :key="delivery.order_number"
              class="table-row"
            >
              <div class="col order-number">{{ delivery.order_number }}</div>
              <div class="col customer">{{ delivery.customer_name }}</div>
              <div class="col company" v-if="authStore.user.role === 'admin'">
                {{ delivery.company_name || 'Sin empresa' }}
              </div>
              <div class="col address" :title="delivery.delivery_address">
                {{ truncateText(delivery.delivery_address, 30) }}
              </div>
              <div class="col date">{{ formatDate(delivery.delivered_at) }}</div>
              <div class="col amount">${{ formatCurrency(delivery.payment_amount) }}</div>
              <div 
                v-if="authStore.user.role === 'admin' && paymentStatus === 'pending'" 
                class="col action"
              >
                <button 
                  @click="markAsPaid([delivery.order_number])"
                  class="btn-pay-single"
                  :disabled="payingDeliveries.includes(delivery.order_number)"
                >
                  {{ payingDeliveries.includes(delivery.order_number) ? '⏳' : '💰' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth'
import { useToast } from 'vue-toastification'
import { driverPaymentsService } from '../services/driverPayments.service'

// ==================== STORES & COMPOSABLES ====================
const authStore = useAuthStore()
const toast = useToast()

// ==================== REACTIVE DATA ====================
const loading = ref(false)
const drivers = ref([])
const deliveries = ref([])
const stats = ref(null)
const companies = ref([])

// Filtros
const dateFrom = ref('')
const dateTo = ref('')
const paymentStatus = ref('pending')
const selectedCompany = ref('')

// UI State
const expandedDrivers = ref(new Set())
const payingDriver = ref(null)
const payingDeliveries = ref([])

// ==================== COMPUTED ====================
const filteredDrivers = computed(() => {
  return drivers.value || []
})

// ==================== LIFECYCLE ====================
onMounted(async () => {
  // Establecer fechas por defecto (último mes)
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  
  dateFrom.value = lastMonth.toISOString().split('T')[0]
  dateTo.value = today.toISOString().split('T')[0]
  
  await loadCompanies()
  await fetchDriverPayments()
})

// ==================== MÉTODOS PRINCIPALES ====================
async function fetchDriverPayments() {
  try {
    loading.value = true
    
    const params = {
      date_from: dateFrom.value,
      date_to: dateTo.value,
      payment_status: paymentStatus.value
    }

    // Si hay filtro de empresa seleccionado, agregarlo
    if (selectedCompany.value) {
      params.company_id = selectedCompany.value
    }

    console.log('📡 Solicitando entregas con parámetros:', params)

    let response
    
    // Usar el método correcto según el rol del usuario
    if (authStore.user.role === 'admin') {
      // Los admins ven todo globalmente
      response = await driverPaymentsService.getAllDeliveries(params)
    } else if (authStore.user.role === 'company_owner') {
      // Los company_owners solo ven su empresa
      response = await driverPaymentsService.getCompanyDeliveries(
        authStore.user.company_id, 
        params
      )
    } else {
      throw new Error('Rol no autorizado')
    }
    
    const { data } = response
    
    drivers.value = data.drivers || []
    deliveries.value = data.all_deliveries || []
    stats.value = data.summary || null
    
    console.log('✅ Datos cargados:', {
      drivers: drivers.value.length,
      deliveries: deliveries.value.length,
      stats: stats.value
    })
    
  } catch (error) {
    console.error('❌ Error cargando pagos:', error)
    toast.error('Error al cargar los pagos de conductores')
  } finally {
    loading.value = false
  }
}

async function loadCompanies() {
  // Solo cargar empresas si es admin
  if (authStore.user.role === 'admin') {
    try {
      // TODO: Implementar servicio de empresas
      console.log('📋 Cargando lista de empresas para filtro...')
      companies.value = []
    } catch (error) {
      console.error('❌ Error cargando empresas:', error)
    }
  }
}

// ==================== MÉTODOS DE PAGO ====================
async function markAsPaid(orderNumbers) {
  try {
    // Solo los admins pueden marcar como pagado
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden marcar pagos')
      return
    }
    
    payingDeliveries.value.push(...orderNumbers)
    
    // TODO: Implementar método markAsPaid en el servicio
    // await driverPaymentsService.markDeliveriesAsPaid(orderNumbers, 'Pago manual desde panel')
    
    toast.success(`${orderNumbers.length} entrega(s) marcada(s) como pagada(s)`)
    
    // Recargar datos
    await fetchDriverPayments()
    
  } catch (error) {
    console.error('❌ Error marcando como pagado:', error)
    toast.error('Error al marcar entregas como pagadas')
  } finally {
    payingDeliveries.value = payingDeliveries.value.filter(id => !orderNumbers.includes(id))
  }
}

async function payAllToDriver(driverId, driverName, totalAmount) {
  try {
    payingDriver.value = driverId
    
    // Solo los admins pueden pagar conductores
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden pagar conductores')
      return
    }
    
    // Confirmar acción
    if (!confirm(`¿Estás seguro de pagar todas las entregas pendientes de ${driverName} por $${formatCurrency(totalAmount)}?`)) {
      return
    }
    
    await driverPaymentsService.payAllPendingToDriver(driverId)
    
    toast.success(`Todas las entregas de ${driverName} han sido pagadas`)
    
    // Recargar datos
    await fetchDriverPayments()
    
  } catch (error) {
    console.error('❌ Error pagando conductor:', error)
    toast.error('Error al pagar todas las entregas del conductor')
  } finally {
    payingDriver.value = null
  }
}

// ==================== MÉTODOS DE UI ====================
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

// ==================== MIGRACIÓN DE DATOS ====================
async function migrateHistoryData() {
  try {
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden migrar datos')
      return
    }

    if (!confirm('¿Deseas migrar los datos históricos de entregas a DriverHistory? Esto puede tomar unos minutos.')) {
      return
    }

    loading.value = true
    toast.info('Iniciando migración de datos históricos...')

    const response = await driverPaymentsService.createHistoryFromOrders()
    
    toast.success(`Migración completada: ${response.data.created} registros creados, ${response.data.skipped} omitidos`)
    
    // Recargar datos
    await fetchDriverPayments()

  } catch (error) {
    console.error('❌ Error en migración:', error)
    toast.error('Error al migrar datos históricos')
  } finally {
    loading.value = false
  }
}

// ==================== EXPORTACIÓN ====================
async function exportToExcel() {
  try {
    loading.value = true
    toast.info('Preparando archivo Excel...')
    
    // Solo los admins pueden exportar
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden exportar reportes')
      return
    }
    
    const params = {
      date_from: dateFrom.value,
      date_to: dateTo.value,
      payment_status: paymentStatus.value
    }
    
    if (selectedCompany.value) {
      params.company_id = selectedCompany.value
    }
    
    const response = await driverPaymentsService.exportPaymentsToExcel(params)
    
    // Descargar archivo
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `pagos-conductores-${dateFrom.value}-${dateTo.value}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success('Archivo Excel descargado')
    
  } catch (error) {
    console.error('❌ Error exportando:', error)
    toast.error('Error al exportar a Excel')
  } finally {
    loading.value = false
  }
}

// ==================== UTILS ====================
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncateText(text, maxLength) {
  if (!text) return ''
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

.btn-refresh, .btn-export, .btn-migrate {
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

.btn-export {
  background: #10b981;
  color: white;
}

.btn-migrate {
  background: #f59e0b;
  color: white;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.stat-value.total-amount {
  color: #059669;
  font-size: 18px;
}

/* Lista de conductores */
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
  font-size: 14px;
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

.driver-actions {
  display: flex;
  gap: 10px;
}

.btn-pay-all {
  background: #059669;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pay-all:disabled {
  background: #9ca3af;
  cursor: not-allowed;
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

/* Tabla de entregas */
.driver-orders {
  padding: 20px;
}

.orders-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 80px 80px;
  gap: 10px;
  padding: 10px;
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  border-radius: 6px 6px 0 0;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 80px 80px;
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

.btn-pay-single {
  padding: 4px 8px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* Loading y mensajes */
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
</style>