<template>
  <div class="driver-payments">
    <!-- HEADER -->
    <div class="page-header">
      <div class="header-content">
        <h1>💰 Pagos a Conductores EnviGo</h1>
        <p v-if="authStore.user.role === 'admin'">Sistema global de pagos a conductores</p>
        <p v-else>Entregas de conductores para tu empresa</p>
      </div>
      <div class="header-actions">
        <button 
          v-if="authStore.user.role === 'admin'"
          @click="exportToExcel" 
          class="btn-export" 
          :disabled="loading"
        >
          📊 Exportar Excel
        </button>
        <button @click="refreshData" class="btn-refresh" :disabled="loading">
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- FILTROS -->
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
      
      <div class="status-filter">
        <label>Estado:</label>
        <select v-model="paymentStatus" @change="fetchDriverPayments">
          <option value="pending">Pendientes</option>
          <option value="paid">Pagados</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <!-- Filtro por empresa (solo para admins) -->
      <div class="company-filter" v-if="authStore.user.role === 'admin'">
        <label>Empresa:</label>
        <select v-model="selectedCompany" @change="fetchDriverPayments">
          <option value="">Todas las empresas</option>
          <option v-for="company in companies" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
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

    <!-- RESUMEN GENERAL -->
    <div class="summary-section" v-if="!loading && stats">
      <div class="summary-card">
        <h3>📊 {{ authStore.user.role === 'admin' ? 'Resumen Global EnviGo' : 'Resumen de tu Empresa' }}</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Total Conductores:</span>
            <span class="stat-value">{{ stats.unique_drivers }}</span>
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
            <span class="stat-label">Pendiente Pagar:</span>
            <span class="stat-value pending">${{ formatCurrency(stats.pending_amount) }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Ya Pagado:</span>
            <span class="stat-value paid">${{ formatCurrency(stats.paid_amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando datos de conductores...</p>
    </div>

    <!-- LISTA DE CONDUCTORES -->
    <div v-else-if="filteredDrivers.length > 0" class="drivers-list">
      <div 
        v-for="driver in filteredDrivers" 
        :key="driver.driver_id"
        class="driver-section"
      >
        <div class="driver-header">
          <div class="driver-info">
            <h3>🚗 {{ driver.driver_name }}</h3>
            <div class="driver-details">
              <span class="driver-email">📧 {{ driver.driver_email }}</span>
              <span 
                v-if="authStore.user.role === 'admin' && driver.companies_count" 
                class="companies-served"
              >
                🏢 {{ driver.companies_count }} empresa{{ driver.companies_count !== 1 ? 's' : '' }}
              </span>
            </div>
            <div class="driver-stats">
              <span class="orders-count">{{ driver.total_deliveries }} entregas</span>
              <span class="total-payment" :class="{ 'pending': paymentStatus === 'pending' }">
                ${{ formatCurrency(paymentStatus === 'pending' ? driver.pending_amount : driver.total_amount) }}
              </span>
            </div>
          </div>
          <div class="driver-actions">
            <button 
              v-if="authStore.user.role === 'admin' && paymentStatus === 'pending' && driver.pending_amount > 0"
              @click="payAllToDriver(driver.driver_id, driver.driver_name)"
              class="btn-pay-all"
              :disabled="payingDriver === driver.driver_id"
            >
              💸 Pagar Todo (${{ formatCurrency(driver.pending_amount) }})
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
          <!-- Empresas Servidas (solo para admins) -->
          <div 
            class="companies-breakdown" 
            v-if="authStore.user.role === 'admin' && driver.companies_served?.length > 0"
          >
            <h4>🏢 Empresas Servidas:</h4>
            <div class="companies-tags">
              <span 
                v-for="company in driver.companies_served" 
                :key="company"
                class="company-tag"
              >
                {{ company }}
              </span>
            </div>
          </div>

          <!-- Tabla de Entregas -->
          <div class="orders-table">
            <div class="table-header">
              <div class="col">N° Pedido</div>
              <div class="col">Cliente</div>
              <div class="col" v-if="authStore.user.role === 'admin'">Empresa</div>
              <div class="col">Dirección</div>
              <div class="col">Fecha Entrega</div>
              <div class="col">Monto</div>
              <div class="col">Estado</div>
              <div v-if="authStore.user.role === 'admin' && paymentStatus === 'pending'" class="col">Acción</div>
            </div>
            
            <div 
              v-for="delivery in getDriverDeliveries(driver.driver_id)" 
              :key="delivery.id"
              class="table-row"
            >
              <div class="col order-number">{{ delivery.order_number }}</div>
              <div class="col customer">{{ delivery.customer_name }}</div>
              <div class="col company" v-if="authStore.user.role === 'admin'">
                {{ delivery.company?.name || 'Sin empresa' }}
              </div>
              <div class="col address" :title="delivery.delivery_address">
                {{ truncateText(delivery.delivery_address, 30) }}
              </div>
              <div class="col date">{{ formatDate(delivery.delivered_at) }}</div>
              <div class="col amount">${{ formatCurrency(delivery.payment_amount) }}</div>
              <div class="col status">
                <span :class="['status-badge', delivery.payment_status]">
                  {{ delivery.payment_status === 'paid' ? 'Pagado' : 'Pendiente' }}
                </span>
              </div>
              <div 
                v-if="authStore.user.role === 'admin' && paymentStatus === 'pending' && delivery.payment_status === 'pending'" 
                class="col action"
              >
                <button 
                  @click="markAsPaid([delivery.id])"
                  class="btn-pay-single"
                  :disabled="payingDeliveries.includes(delivery.id)"
                >
                  ✅ Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ESTADO VACÍO -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">🚛</div>
      <h3>No hay entregas {{ paymentStatus === 'pending' ? 'pendientes' : paymentStatus === 'paid' ? 'pagadas' : '' }}</h3>
      <p>No se encontraron entregas de conductores en el período seleccionado.</p>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../store/auth'
import { driverPaymentsService } from '../services/driverPayments.service'

const toast = useToast()
const authStore = useAuthStore()

// ==================== ESTADO ====================
const loading = ref(false)
const payingDriver = ref(null)
const payingDeliveries = ref([])
const drivers = ref([])
const deliveries = ref([])
const stats = ref(null)
const companies = ref([])
const expandedDrivers = ref(new Set())
const searchDriver = ref('')

// ==================== FILTROS ====================
const today = new Date()
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

const dateTo = ref(today.toISOString().split('T')[0])
const dateFrom = ref(thirtyDaysAgo.toISOString().split('T')[0])
const paymentStatus = ref('pending')
const selectedCompany = ref('')

// ==================== COMPUTED ====================
const filteredDrivers = computed(() => {
  if (!searchDriver.value) return drivers.value
  
  const search = searchDriver.value.toLowerCase()
  return drivers.value.filter(driver => 
    driver.driver_name.toLowerCase().includes(search) ||
    driver.driver_email.toLowerCase().includes(search)
  )
})

// ==================== MÉTODOS PRINCIPALES ====================
async function fetchDriverPayments() {
  loading.value = true
  try {
    console.log('📦 Cargando entregas de conductores...')
    
    const params = {
      date_from: dateFrom.value,
      date_to: dateTo.value,
      payment_status: paymentStatus.value
    }

    // Si hay filtro de empresa seleccionado, agregarlo
    if (selectedCompany.value) {
      params.company_id = selectedCompany.value
    }

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
    deliveries.value = data.deliveries || []
    stats.value = data.stats || null
    
    console.log('✅ Entregas cargadas:', data)
    
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
      // Aquí deberías cargar las empresas desde tu API
      // const { data } = await companiesService.getAll()
      // companies.value = data
      console.log('📋 Cargando lista de empresas para filtro...')
      
      // Mientras tanto, array vacío
      companies.value = []
    } catch (error) {
      console.error('❌ Error cargando empresas:', error)
    }
  }
}

// ==================== MÉTODOS DE PAGO ====================
async function markAsPaid(deliveryIds) {
  try {
    // Solo los admins pueden marcar como pagado
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden marcar pagos')
      return
    }
    
    payingDeliveries.value.push(...deliveryIds)
    
    await driverPaymentsService.markDeliveriesAsPaid(deliveryIds, 'Pago manual desde panel')
    
    toast.success(`${deliveryIds.length} entrega(s) marcada(s) como pagada(s)`)
    
    // Recargar datos
    await fetchDriverPayments()
    
  } catch (error) {
    console.error('❌ Error marcando como pagado:', error)
    toast.error('Error al marcar entregas como pagadas')
  } finally {
    payingDeliveries.value = payingDeliveries.value.filter(id => !deliveryIds.includes(id))
  }
}

async function payAllToDriver(driverId, driverName) {
  try {
    payingDriver.value = driverId
    
    // Solo los admins pueden pagar conductores
    if (authStore.user.role !== 'admin') {
      toast.error('Solo los administradores pueden pagar conductores')
      return
    }
    
    // Confirmar acción
    if (!confirm(`¿Estás seguro de pagar todas las entregas pendientes de ${driverName}?`)) {
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
function getDriverDeliveries(driverId) {
  return deliveries.value.filter(delivery => delivery.driver_id === driverId)
}

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
  return new Intl.NumberFormat('es-CL').format(amount)
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-CL')
}

function truncateText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  loadCompanies()
  fetchDriverPayments()
})
</script>
<style scoped>
.driver-payments {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ==================== HEADER ==================== */
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
  font-size: 14px;
}

.btn-export {
  background: #10b981;
  color: white;
}

.btn-export:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-refresh {
  background: #3b82f6;
  color: white;
}

.btn-refresh:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-export:disabled, .btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ==================== FILTROS ==================== */
.filters-section {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  align-items: end;
}

.date-filters, .status-filter, .company-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-filters label, .status-filter label, .company-filter label {
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.date-filters input, .status-filter select, .company-filter select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  min-width: 140px;
}

.date-filters input:focus, .status-filter select:focus, .company-filter select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ==================== RESUMEN ==================== */
.summary-section {
  margin-bottom: 32px;
}

.summary-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.summary-card h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
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
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

.stat-label {
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.stat-value.pending {
  color: #dc2626;
}

.stat-value.paid {
  color: #059669;
}

/* ==================== LOADING ==================== */
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

/* ==================== LISTA DE CONDUCTORES ==================== */
.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.driver-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.driver-section:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

.driver-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.driver-email {
  color: #6b7280;
  font-size: 14px;
}

.companies-served {
  color: #7c3aed;
  font-size: 14px;
  font-weight: 500;
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

.total-payment.pending {
  color: #dc2626;
}

.driver-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-pay-all {
  background: #059669;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-pay-all:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-1px);
}

.btn-pay-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.toggle-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* ==================== DETALLES DE CONDUCTOR ==================== */
.driver-orders {
  padding: 24px;
  background: #fafbfc;
}

.companies-breakdown {
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.companies-breakdown h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
}

.companies-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.company-tag {
  background: #ede9fe;
  color: #7c3aed;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* ==================== TABLA DE ENTREGAS ==================== */
.orders-table {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1fr 2fr 1fr 1fr 1fr 0.8fr;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1fr 2fr 1fr 1fr 1fr 0.8fr;
  border-bottom: 1px solid #f3f4f6;
}

/* Ajustar columnas cuando no es admin */
.table-header:not(.admin-view) {
  grid-template-columns: 1.5fr 1.5fr 2fr 1fr 1fr 1fr 0.8fr;
}

.table-row:not(.admin-view) {
  grid-template-columns: 1.5fr 1.5fr 2fr 1fr 1fr 1fr 0.8fr;
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
  font-size: 14px;
  border-right: 1px solid #f3f4f6;
}

.col:last-child {
  border-right: none;
}

.table-header .col {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.order-number {
  color: #3b82f6;
  font-weight: 500;
}

.customer, .company {
  color: #4b5563;
}

.address {
  color: #6b7280;
  font-size: 13px;
}

.date {
  color: #6b7280;
  font-size: 13px;
}

.amount {
  color: #059669;
  font-weight: 600;
  justify-content: flex-end;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background: #fef2f2;
  color: #991b1b;
}

.btn-pay-single {
  background: #059669;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-pay-single:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-1px);
}

.btn-pay-single:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ==================== ESTADO VACÍO ==================== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  color: #374151;
  margin-bottom: 8px;
  font-size: 20px;
}

.empty-state p {
  color: #6b7280;
  font-size: 16px;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1200px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }
  
  .col {
    border-right: none;
    border-bottom: 1px solid #f3f4f6;
    justify-content: space-between;
    padding: 12px 16px;
  }
  
  .table-header .col {
    display: none;
  }
  
  .table-row .col::before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 8px;
    color: #6b7280;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .table-row .col:nth-child(1)::before { content: "N° Pedido: "; }
  .table-row .col:nth-child(2)::before { content: "Cliente: "; }
  .table-row .col:nth-child(3)::before { content: "Empresa: "; }
  .table-row .col:nth-child(4)::before { content: "Dirección: "; }
  .table-row .col:nth-child(5)::before { content: "Fecha: "; }
  .table-row .col:nth-child(6)::before { content: "Monto: "; }
  .table-row .col:nth-child(7)::before { content: "Estado: "; }
  .table-row .col:nth-child(8)::before { content: "Acción: "; }
  
  .driver-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .driver-actions {
    justify-content: center;
  }
  
  .driver-details {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 768px) {
  .driver-payments {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .filters-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .date-filters {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .search-box {
    min-width: unset;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .stat {
    padding: 12px;
  }
  
  .driver-stats {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .driver-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-pay-all, .toggle-btn {
    width: 100%;
    text-align: center;
  }
  
  .companies-tags {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .driver-payments {
    padding: 12px;
  }
  
  .page-header h1 {
    font-size: 24px;
  }
  
  .btn-export, .btn-refresh {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .summary-card {
    padding: 16px;
  }
  
  .driver-section {
    margin: 0 -4px;
  }
  
  .driver-header {
    padding: 16px;
  }
  
  .driver-orders {
    padding: 16px;
  }
  
  .companies-breakdown {
    padding: 12px;
  }
  
  .col {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .table-row .col::before {
    font-size: 11px;
  }
}

/* ==================== ANIMACIONES ==================== */
.driver-section {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat {
  transition: all 0.2s ease;
}

.stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* ==================== ESTADOS DE LOADING ==================== */
.btn-pay-all:disabled,
.btn-pay-single:disabled {
  position: relative;
}

.btn-pay-all:disabled::after,
.btn-pay-single:disabled::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ==================== SCROLL PERSONALIZADO ==================== */
.driver-orders::-webkit-scrollbar {
  width: 6px;
}

.driver-orders::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.driver-orders::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.driver-orders::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ==================== TOOLTIPS ==================== */
[title] {
  position: relative;
  cursor: help;
}

/* ==================== PRINT STYLES ==================== */
@media print {
  .header-actions,
  .filters-section,
  .btn-pay-all,
  .btn-pay-single,
  .toggle-btn {
    display: none !important;
  }
  
  .driver-section {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }
  
  .driver-orders {
    display: block !important;
  }
  
  .col {
    border: 1px solid #000;
  }
}
</style>