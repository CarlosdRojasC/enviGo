<template>
  <div class="driver-payments">
    <div class="header">
      <h2>Gestión de Pagos a Conductores</h2>
      <div class="filters">
        <select v-model="selectedMonth" @change="loadPaymentReport">
          <option v-for="month in months" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
        <select v-model="selectedYear" @change="loadPaymentReport">
          <option v-for="year in years" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>
    </div>

    <!-- Resumen del período -->
    <div class="summary-cards" v-if="reportData">
      <div class="card">
        <h3>Total Conductores</h3>
        <span class="amount">{{ reportData.summary.total_drivers }}</span>
      </div>
      <div class="card">
        <h3>Total Entregas</h3>
        <span class="amount">{{ reportData.summary.total_deliveries }}</span>
      </div>
      <div class="card total-amount">
        <h3>Total a Pagar</h3>
        <span class="amount">${{ formatCurrency(reportData.summary.total_amount) }}</span>
      </div>
    </div>

    <!-- Lista de conductores -->
    <div class="drivers-list" v-if="reportData?.drivers">
      <div class="drivers-header">
        <h3>Conductores - {{ reportData.period }}</h3>
        <button 
          @click="payAllDrivers" 
          :disabled="isProcessing || reportData.drivers.length === 0"
          class="btn-pay-all"
        >
          {{ isProcessing ? 'Procesando...' : 'Pagar a Todos' }}
        </button>
      </div>

      <div class="table-container">
        <table class="drivers-table">
          <thead>
            <tr>
              <th>Conductor</th>
              <th>Email</th>
              <th>Entregas</th>
              <th>Monto Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="driver in reportData.drivers" :key="driver._id">
              <td class="driver-name">{{ driver.driver_name }}</td>
              <td class="driver-email">{{ driver.driver_email }}</td>
              <td class="deliveries-count">{{ driver.total_deliveries }}</td>
              <td class="amount">${{ formatCurrency(driver.total_amount) }}</td>
              <td class="actions">
                <button 
                  @click="payDriver(driver._id, driver.driver_name, driver.total_amount)"
                  :disabled="isProcessing"
                  class="btn-pay"
                >
                  Pagar
                </button>
                <button 
                  @click="viewDriverDetails(driver._id)"
                  class="btn-details"
                >
                  Ver Detalles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="loading" class="loading">
      <p>Cargando datos...</p>
    </div>

    <!-- Sin datos -->
    <div v-if="!loading && (!reportData?.drivers || reportData.drivers.length === 0)" class="no-data">
      <p>No hay conductores con pagos pendientes para este período.</p>
    </div>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal" @click.stop>
        <h3>Confirmar Pago</h3>
        <p>¿Estás seguro de pagar <strong>${{ formatCurrency(confirmData.amount) }}</strong> a <strong>{{ confirmData.driverName }}</strong>?</p>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">Cancelar</button>
          <button @click="confirmPayment" class="btn-confirm">Confirmar Pago</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'

export default {
  name: 'DriverPayments',
  setup() {
    const authStore = useAuthStore()
    const loading = ref(false)
    const isProcessing = ref(false)
    const reportData = ref(null)
    const showConfirmModal = ref(false)
    const confirmData = ref({})

    // Filtros de fecha
    const currentDate = new Date()
    const selectedMonth = ref(currentDate.getMonth() + 1)
    const selectedYear = ref(currentDate.getFullYear())

    const months = ref([
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ])

    const years = computed(() => {
      const currentYear = new Date().getFullYear()
      return Array.from({ length: 3 }, (_, i) => currentYear - i)
    })

    // Métodos
    const loadPaymentReport = async () => {
      loading.value = true
      try {
        const response = await apiService.driverHistory.getMonthlyReport(`/driver-history/company/${authStore.user.company_id}/monthly-report`, {
          params: {
            year: selectedYear.value,
            month: selectedMonth.value
          }
        })
        reportData.value = response.data.data
      } catch (error) {
        console.error('Error cargando reporte:', error)
        // Aquí podrías mostrar una notificación de error
      } finally {
        loading.value = false
      }
    }

    const payDriver = (driverId, driverName, amount) => {
      confirmData.value = {
        driverId,
        driverName,
        amount
      }
      showConfirmModal.value = true
    }

    const confirmPayment = async () => {
      isProcessing.value = true
      try {
        await apiService.driverHistory.payDriver(`/driver-history/driver/${confirmData.value.driverId}/pay-all`, {
          companyId: authStore.user.company_id
        })
        
        // Recargar datos
        await loadPaymentReport()
        
        // Mostrar mensaje de éxito
        alert(`Pago realizado exitosamente a ${confirmData.value.driverName}`)
        
      } catch (error) {
        console.error('Error procesando pago:', error)
        alert('Error al procesar el pago')
      } finally {
        isProcessing.value = false
        showConfirmModal.value = false
      }
    }

    const payAllDrivers = async () => {
      if (!confirm(`¿Pagar ${formatCurrency(reportData.value.summary.total_amount)} a todos los conductores?`)) {
        return
      }

      isProcessing.value = true
      try {
        // Pagar a cada conductor individualmente
        for (const driver of reportData.value.drivers) {
          await apiService.driverHistory.payDriver(`/driver-history/driver/${driver._id}/pay-all`, {
            companyId: authStore.user.company_id
          })
        }
        
        await loadPaymentReport()
        alert('Pagos realizados exitosamente a todos los conductores')
        
      } catch (error) {
        console.error('Error pagando a todos:', error)
        alert('Error al procesar los pagos')
      } finally {
        isProcessing.value = false
      }
    }

    const viewDriverDetails = (driverId) => {
      // Navegar a vista detallada del conductor
      // router.push(`/driver-history/${driverId}`)
      console.log('Ver detalles del conductor:', driverId)
    }

    const closeConfirmModal = () => {
      showConfirmModal.value = false
      confirmData.value = {}
    }

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-CL').format(amount)
    }

    onMounted(() => {
      loadPaymentReport()
    })

    return {
      loading,
      isProcessing,
      reportData,
      selectedMonth,
      selectedYear,
      months,
      years,
      showConfirmModal,
      confirmData,
      loadPaymentReport,
      payDriver,
      confirmPayment,
      payAllDrivers,
      viewDriverDetails,
      closeConfirmModal,
      formatCurrency
    }
  }
}
</script>

<style scoped>
.driver-payments {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.filters {
  display: flex;
  gap: 10px;
}

.filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.card h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.card .amount {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.total-amount .amount {
  color: #28a745;
}

.drivers-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.drivers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.btn-pay-all {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-pay-all:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.table-container {
  overflow-x: auto;
}

.drivers-table {
  width: 100%;
  border-collapse: collapse;
}

.drivers-table th,
.drivers-table td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.drivers-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
}

.amount {
  font-weight: 600;
  color: #28a745;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-pay {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-details {
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.loading, .no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.modal p {
  margin: 0 0 20px 0;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-confirm {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>