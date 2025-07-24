<!-- frontend/src/views/DriverPayments.vue -->
<template>
  <div class="driver-payments">
    <div class="page-header">
      <div class="header-content">
        <h1>💰 Pagos a Conductores</h1>
        <p>Pedidos entregados y montos a pagar</p>
      </div>
      <div class="header-actions">
        <button @click="exportToExcel" class="btn-export" :disabled="loading">
          📊 Exportar Excel
        </button>
        <button @click="refreshData" class="btn-refresh" :disabled="loading">
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="date-filters">
        <label>Desde:</label>
        <input 
          v-model="dateFrom" 
          type="date" 
          @change="fetchDriverPayments"
        />
        
        <label>Hasta:</label>
        <input 
          v-model="dateTo" 
          type="date" 
          @change="fetchDriverPayments"
        />
      </div>
      
      <div class="search-box">
        <input 
          v-model="searchDriver" 
          type="text" 
          placeholder="🔍 Buscar conductor..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Resumen General -->
    <div class="summary-section" v-if="!loading && Object.keys(driverPayments).length > 0">
      <div class="summary-card">
        <h3>📊 Resumen General</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Total Conductores:</span>
            <span class="stat-value">{{ Object.keys(filteredDriverPayments).length }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total Pedidos:</span>
            <span class="stat-value">{{ totalOrders }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total a Pagar:</span>
            <span class="stat-value total-amount">${{ formatCurrency(totalToPay) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando pagos de conductores...</p>
    </div>

    <!-- Lista de Conductores y sus Entregas -->
    <div v-else-if="Object.keys(filteredDriverPayments).length > 0" class="drivers-list">
      <div 
        v-for="(driverData, driverName) in filteredDriverPayments" 
        :key="driverName"
        class="driver-section"
      >
        <div class="driver-header">
          <div class="driver-info">
            <h3>🚗 {{ driverName }}</h3>
            <div class="driver-stats">
              <span class="orders-count">{{ driverData.orders.length }} pedidos</span>
              <span class="total-payment">${{ formatCurrency(driverData.total) }}</span>
            </div>
          </div>
          <button 
            @click="toggleDriverDetails(driverName)"
            class="toggle-btn"
          >
            {{ expandedDrivers.has(driverName) ? '▲ Ocultar' : '▼ Ver Detalle' }}
          </button>
        </div>

        <!-- Detalle de Pedidos del Conductor -->
        <div 
          v-if="expandedDrivers.has(driverName)" 
          class="driver-orders"
        >
          <div class="orders-table">
            <div class="table-header">
              <div class="col">N° Pedido</div>
              <div class="col">Comuna</div>
              <div class="col">Fecha Entrega</div>
              <div class="col">Monto</div>
            </div>
            
            <div 
              v-for="order in driverData.orders" 
              :key="order._id"
              class="table-row"
            >
              <div class="col order-number">{{ order.order_number }}</div>
              <div class="col commune">{{ order.shipping_commune || 'Sin comuna' }}</div>
              <div class="col date">{{ formatDate(order.delivery_date) }}</div>
              <div class="col amount">$1.700</div>
            </div>
          </div>
          
          <div class="driver-total">
            <strong>Total {{ driverName }}: ${{ formatCurrency(driverData.total) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>No hay pedidos entregados</h3>
      <p>No se encontraron pedidos entregados por conductores en el período seleccionado.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

const toast = useToast()

// ==================== ESTADO ====================
const loading = ref(false)
const driverPayments = ref({})
const expandedDrivers = ref(new Set())
const searchDriver = ref('')

// Filtros de fecha (últimos 30 días por defecto)
const today = new Date()
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

const dateTo = ref(today.toISOString().split('T')[0])
const dateFrom = ref(thirtyDaysAgo.toISOString().split('T')[0])

// ==================== COMPUTED ====================
const filteredDriverPayments = computed(() => {
  if (!searchDriver.value) return driverPayments.value
  
  const search = searchDriver.value.toLowerCase()
  const filtered = {}
  
  Object.keys(driverPayments.value).forEach(driverName => {
    if (driverName.toLowerCase().includes(search)) {
      filtered[driverName] = driverPayments.value[driverName]
    }
  })
  
  return filtered
})

const totalOrders = computed(() => {
  return Object.values(filteredDriverPayments.value)
    .reduce((total, driver) => total + driver.orders.length, 0)
})

const totalToPay = computed(() => {
  return Object.values(filteredDriverPayments.value)
    .reduce((total, driver) => total + driver.total, 0)
})

// ==================== MÉTODOS ====================
async function fetchDriverPayments() {
  loading.value = true
  try {
    console.log('📦 Cargando pagos de conductores...')
    
    // Llamar al endpoint que vamos a crear
    const { data } = await apiService.drivers.getDeliveredOrders({
      date_from: dateFrom.value,
      date_to: dateTo.value
    })
    
    // Procesar los datos para agrupar por conductor
    processDriverPayments(data.orders || [])
    
  } catch (error) {
    console.error('❌ Error cargando pagos:', error)
    toast.error('Error al cargar los pagos de conductores')
  } finally {
    loading.value = false
  }
}

function processDriverPayments(orders) {
  const grouped = {}
  
  orders.forEach(order => {
    // Usar el nombre del conductor o un identificador
    const driverName = order.driver_info?.name || 
                      order.shipday_driver_id || 
                      'Conductor Desconocido'
    
    if (!grouped[driverName]) {
      grouped[driverName] = {
        orders: [],
        total: 0
      }
    }
    
    grouped[driverName].orders.push(order)
    grouped[driverName].total += 1700 // $1.700 fijo por entrega
  })
  
  driverPayments.value = grouped
}

function toggleDriverDetails(driverName) {
  if (expandedDrivers.value.has(driverName)) {
    expandedDrivers.value.delete(driverName)
  } else {
    expandedDrivers.value.add(driverName)
  }
}

function refreshData() {
  fetchDriverPayments()
}

async function exportToExcel() {
  try {
    loading.value = true
    toast.info('Preparando archivo Excel...')
    
    // Crear datos para Excel
    const excelData = []
    
    Object.keys(filteredDriverPayments.value).forEach(driverName => {
      const driverData = filteredDriverPayments.value[driverName]
      
      driverData.orders.forEach(order => {
        excelData.push({
          'Conductor': driverName,
          'N° Pedido': order.order_number,
          'Comuna': order.shipping_commune || 'Sin comuna',
          'Fecha Entrega': formatDate(order.delivery_date),
          'Monto': 1700,
          'Cliente': order.customer_name,
          'Dirección': order.shipping_address
        })
      })
    })
    
    // Llamar al servicio de exportación
    const response = await apiService.exports.exportToExcel({
      data: excelData,
      filename: `pagos-conductores-${dateFrom.value}-${dateTo.value}`
    })
    
    // Descargar archivo
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `pagos-conductores-${dateFrom.value}-${dateTo.value}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    
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
  return new Intl.NumberFormat('es-CL').format(amount)
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-CL')
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  fetchDriverPayments()
})
</script>

<style scoped>
.driver-payments {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-content p {
  color: #6b7280;
  margin: 4px 0 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-export, .btn-refresh {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: #10b981;
  color: white;
}

.btn-export:hover {
  background: #059669;
}

.btn-refresh {
  background: #3b82f6;
  color: white;
}

.btn-refresh:hover {
  background: #2563eb;
}

/* Filtros */
.filters-section {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-filters label {
  font-weight: 500;
  color: #374151;
}

.date-filters input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.search-box {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
}

/* Resumen */
.summary-section {
  margin-bottom: 32px;
}

.summary-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-label {
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
}

.total-amount {
  color: #059669;
  font-size: 18px;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Lista de Conductores */
.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.driver-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.driver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.driver-info h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 18px;
}

.driver-stats {
  display: flex;
  gap: 16px;
}

.orders-count {
  color: #6b7280;
  font-size: 14px;
}

.total-payment {
  color: #059669;
  font-weight: 600;
  font-size: 16px;
}

.toggle-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-btn:hover {
  background: #2563eb;
}

/* Tabla de Pedidos */
.driver-orders {
  padding: 24px;
}

.orders-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr;
  border-bottom: 1px solid #f3f4f6;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f9fafb;
}

.col {
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.table-header .col {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.order-number {
  color: #3b82f6;
  font-weight: 500;
}

.commune {
  color: #6b7280;
}

.date {
  color: #4b5563;
  font-size: 14px;
}

.amount {
  color: #059669;
  font-weight: 600;
}

.driver-total {
  text-align: right;
  padding: 16px 0;
  font-size: 16px;
  color: #059669;
}

/* Estado Vacío */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  color: #374151;
  margin-bottom: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }
  
  .col {
    border-bottom: 1px solid #f3f4f6;
  }
  
  .table-header .col {
    display: none;
  }
  
  .table-row .col:before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 8px;
  }
}
</style>