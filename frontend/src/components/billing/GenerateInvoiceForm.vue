<template>
  <div class="generate-invoice-form">
    <form @submit.prevent="generateInvoice">
      <div class="form-section">
        <h3 class="section-title">1. Definir Período de Facturación</h3>
        <div class="criteria-grid">
          <div class="form-group">
            <label for="company">Empresa</label>
            <select id="company" v-model="selectedCompanyId" required @change="clearOrderPreview">
              <option value="" disabled>Selecciona una empresa...</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">
                {{ company.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="period_start">Fecha de Inicio</label>
            <input id="period_start" v-model="periodStart" type="date" required @change="clearOrderPreview" />
          </div>
          <div class="form-group">
            <label for="period_end">Fecha de Fin</label>
            <input id="period_end" v-model="periodEnd" type="date" required @change="clearOrderPreview" />
          </div>
          <div class="form-group action-group">
            <button type="button" @click="fetchUnbilledOrders" :disabled="!isFormValid || loadingOrders" class="btn-primary">
              <span v-if="loadingOrders">Buscando...</span>
              <span v-else>🔍 Vista Previa de Pedidos</span>
            </button>
          </div>
        </div>
      </div>

      <div class="form-section" v-if="ordersFetched">
        <h3 class="section-title">2. Seleccionar Pedidos a Incluir</h3>
        <div v-if="loadingOrders" class="loading-state">Cargando pedidos...</div>
        <div v-else-if="unbilledOrders.length === 0" class="empty-state">
          No se encontraron pedidos entregados y sin facturar para este período.
        </div>
        <div v-else class="orders-table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th class="checkbox-col">
                  <input type="checkbox" @change="toggleSelectAll" :checked="allOrdersSelected" />
                </th>
                <th>N° Pedido</th>
                <th>Cliente</th>
                <th>Fecha Entrega</th>
                <th class="amount-col">Costo Envío</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in unbilledOrders" :key="order._id">
                <td class="checkbox-col">
                  <input type="checkbox" :value="order._id" v-model="selectedOrderIds" />
                </td>
                <td>{{ order.order_number }}</td>
                <td>{{ order.customer_name }}</td>
                <td>{{ formatDate(order.delivery_date) }}</td>
                <td class="amount-col">${{ formatCurrency(order.shipping_cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="form-section summary-section" v-if="selectedOrderIds.length > 0">
        <h3 class="section-title">3. Resumen de Factura</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Pedidos Seleccionados</span>
            <span class="summary-value">{{ selectedOrderIds.length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">${{ formatCurrency(invoiceTotals.subtotal) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">IVA (19%)</span>
            <span class="summary-value">${{ formatCurrency(invoiceTotals.tax) }}</span>
          </div>
          <div class="summary-item total">
            <span class="summary-label">Total Factura</span>
            <span class="summary-value">${{ formatCurrency(invoiceTotals.total) }}</span>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" @click="$emit('close')" class="btn-secondary">Cancelar</button>
        <button type="submit" :disabled="selectedOrderIds.length === 0 || generating" class="btn-primary">
          <span v-if="generating">Generando...</span>
          <span v-else>✅ Generar Factura</span>
        </button>
      </div>
    </form>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { apiService } from '../../services/api';

const props = defineProps({
  companies: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close', 'generated']);
const toast = useToast();

// --- ESTADO ---
const selectedCompanyId = ref('');
const periodStart = ref('');
const periodEnd = ref('');

const loadingOrders = ref(false);
const generating = ref(false);
const ordersFetched = ref(false); // Para saber si ya se hizo la primera búsqueda

const unbilledOrders = ref([]);
const selectedOrderIds = ref([]);

// --- COMPUTED PROPERTIES ---
const isFormValid = computed(() => selectedCompanyId.value && periodStart.value && periodEnd.value);

const allOrdersSelected = computed(() => 
  unbilledOrders.value.length > 0 && selectedOrderIds.value.length === unbilledOrders.value.length
);

const invoiceTotals = computed(() => {
  const selected = unbilledOrders.value.filter(order => selectedOrderIds.value.includes(order._id));
  const subtotal = selected.reduce((sum, order) => sum + (order.shipping_cost || 0), 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;
  return { subtotal, tax, total };
});

// --- MÉTODOS ---
function clearOrderPreview() {
  ordersFetched.value = false;
  unbilledOrders.value = [];
  selectedOrderIds.value = [];
}

async function fetchUnbilledOrders() {
  if (!isFormValid.value) {
    toast.warning('Por favor, selecciona una empresa y un rango de fechas.');
    return;
  }
  
  loadingOrders.value = true;
  ordersFetched.value = true;
  try {
    const params = {
      company_id: selectedCompanyId.value,
      status: 'delivered', // Solo facturar pedidos entregados
      billed: false,       // Solo los que no han sido facturados
      date_from: periodStart.value,
      date_to: periodEnd.value,
      limit: 500 // Un límite alto para traer todos los pedidos del período
    };
    const { data } = await apiService.orders.getAll(params);
    unbilledOrders.value = data.orders || [];
    if (unbilledOrders.value.length === 0) {
      toast.info('No se encontraron pedidos pendientes de facturación en este período.');
    }
  } catch (error) {
    console.error("Error fetching unbilled orders:", error);
    toast.error("No se pudieron cargar los pedidos para facturar.");
  } finally {
    loadingOrders.value = false;
  }
}

async function generateInvoice() {
  if (selectedOrderIds.value.length === 0) {
    toast.error("Debes seleccionar al menos un pedido para facturar.");
    return;
  }
  
  generating.value = true;
  try {
    const payload = {
      company_id: selectedCompanyId.value,
      period_start: periodStart.value,
      period_end: periodEnd.value,
      order_ids: selectedOrderIds.value
    };
    await apiService.billing.generateInvoice(payload);
    toast.success('¡Factura generada exitosamente!');
    emit('generated');
  } catch (error) {
    console.error("Error generating invoice:", error);
    toast.error(error.message || "No se pudo generar la factura.");
  } finally {
    generating.value = false;
  }
}

function toggleSelectAll(event) {
  if (event.target.checked) {
    selectedOrderIds.value = unbilledOrders.value.map(order => order._id);
  } else {
    selectedOrderIds.value = [];
  }
}

// --- FUNCIONES DE FORMATO ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL');
}
</script>
<style scoped>
.generate-invoice-form {
  padding: 8px;
}

.form-section {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.criteria-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.form-group.action-group {
  justify-content: flex-end;
}

.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  background-color: #4f46e5;
  color: white;
  transition: background-color 0.2s;
}
.btn-primary:hover:not(:disabled) {
  background-color: #4338ca;
}
.btn-primary:disabled {
  background-color: #a5b4fc;
  cursor: not-allowed;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 32px;
  color: #6b7280;
  font-style: italic;
  background-color: #f3f4f6;
  border-radius: 8px;
}

.orders-table-wrapper {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th, .orders-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
}

.orders-table th {
  background-color: #f9fafb;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.checkbox-col {
  width: 50px;
  text-align: center;
}
.amount-col {
  text-align: right;
  font-weight: 500;
}

.summary-section {
  background-color: #f0fdf4;
  border-color: #a7f3d0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
}
.summary-label {
  color: #374151;
}
.summary-value {
  font-weight: 600;
  color: #1f2937;
}

.summary-item.total {
  grid-column: 1 / -1;
  background-color: #d1fae5;
  border-radius: 8px;
  margin-top: 8px;
  padding: 12px;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
}
</style>