if (!newOrder.value.shipping_commune) {
    alert("Por favor, ingrese la comuna.");
    return;
  }<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Pedidos Globales</h1>
      <div class="header-actions">
        <button @click="openCreateOrderModal" class="btn-action btn-secondary">
          + Crear Pedido Manual
        </button>
        <button @click="openBulkUploadModal" class="btn-action btn-secondary">
          ⬆️ Subida Masiva
        </button>
        <button @click="exportOrders" class="btn-action btn-primary" :disabled="isExporting">
          {{ isExporting ? 'Exportando...' : 'Exportar para OptiRoute' }}
        </button>
      </div>
    </div>
    
    <div class="filters-section">
      <div class="filters">
        <select v-model="filters.company_id" @change="fetchOrders">
          <option value="">Todas las Empresas</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
        <select v-model="filters.status" @change="fetchOrders">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="processing">Procesando</option>
          <option value="shipped">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <!-- Filtro por comuna -->
   <select v-model="filters.shipping_commune" @change="fetchOrders" class="filter-select">
      <option value="">Todas las Comunas</option>
      <option v-for="commune in availableCommunes" :key="commune" :value="commune">
        {{ commune }}
      </option>
    </select>
        <input type="date" v-model="filters.date_from" @change="fetchOrders" />
        <input type="date" v-model="filters.date_to" @change="fetchOrders" />
                  <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar por pedido, cliente, dirección o comuna..."
          class="search-input"
        />
      </div>
    </div>

    <!-- NUEVO: Sección de acciones masivas -->
    <div v-if="selectedOrders.length > 0" class="bulk-actions-section">
      <div class="bulk-actions-header">
        <span class="selection-count">{{ selectedOrders.length }} pedido(s) seleccionado(s)</span>
        <div class="bulk-actions">
          <button @click="openBulkAssignModal" class="btn-bulk-assign">
            🚚 Asignar {{ selectedOrders.length }} pedido(s) a conductor
          </button>
          <button @click="clearSelection" class="btn-clear-selection">
            ✕ Limpiar selección
          </button>
        </div>
      </div>
    </div>

    <div class="content-section">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <!-- NUEVO: Checkbox para seleccionar todos -->
              <th class="checkbox-column">
                <input 
                  type="checkbox" 
                  @change="toggleSelectAll"
                  :checked="selectAllChecked"
                  :indeterminate="selectAllIndeterminate"
                  class="checkbox-input"
                />
              </th>
              <th>Pedido</th>
              <th>Empresa</th>
              <th>Cliente</th>
              <th>Comuna</th>
              <th>Fechas (Creación / Entrega)</th>
              <th>Estado</th>
              <th>Costo de Envío</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingOrders">
              <td colspan="9" class="loading-row">Cargando pedidos...</td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="9" class="empty-row">No se encontraron pedidos.</td>
            </tr>
            <tr v-else v-for="order in orders" :key="order._id" :class="{ 'selected-row': selectedOrders.includes(order._id) }">
              <!-- NUEVO: Checkbox individual -->
              <td class="checkbox-column">
                <input 
                  type="checkbox"
                  :value="order._id"
                  v-model="selectedOrders"
                  :disabled="order.shipday_order_id"
                  class="checkbox-input"
                />
              </td>
              <td class="order-number">{{ order.order_number }}</td>
              <td>{{ order.company_id.name }}</td>
              <td>{{ order.customer_name }}</td>
              <!-- Columna de comuna -->
              <td class="commune-cell">
                <span class="commune-badge" :class="getCommuneClass(order.shipping_commune)">
                  {{ order.shipping_commune || 'Sin comuna' }}
                </span>
              </td>
              <td class="date-cell">
                <div class="date-creation">
                  <span class="date-label">Creado:</span> {{ formatDate(order.order_date, true) }}
                </div>
                <div v-if="order.delivery_date" class="date-delivery">
                  <span class="date-label">Entregado:</span> {{ formatDate(order.delivery_date, true) }}
                </div>
              </td>
              <td>
                <span class="status-badge" :class="order.status">
                  {{ getStatusName(order.status) }}
                </span>
              </td>
              <td>${{ formatCurrency(order.shipping_cost) }}</td>
              <td>
                <div class="action-buttons">
                  <button @click="openOrderDetailsModal(order)" class="btn-table-action view">Ver</button>
                  <button @click="openUpdateStatusModal(order)" class="btn-table-action edit">Estado</button>
                  <button 
                    @click="openAssignModal(order)" 
                    class="btn-table-action assign" 
                    :disabled="order.shipday_order_id"
                    title="Asignar a un conductor en Shipday">
                    Asignar
                  </button>
                  <button 
                    @click="debugOrder(order)" 
                    class="btn-table-action debug" 
                    title="Debug datos para Shipday">
                    🔍 Debug
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="page-btn">Anterior</button>
        <span>Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
        <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" class="page-btn">Siguiente</button>
      </div>
    </div>

    <!-- Modales existentes -->
    <Modal v-model="showUpdateStatusModal" title="Actualizar Estado del Pedido" width="500px">
      <UpdateOrderStatus v-if="selectedOrder" :order="selectedOrder" @close="showUpdateStatusModal = false" @status-updated="handleStatusUpdate" />
    </Modal>
    
    <Modal v-model="showOrderDetailsModal" :title="`Detalles del Pedido #${selectedOrder?.order_number}`" width="800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>
    
    <Modal v-model="showCreateOrderModal" title="Crear Nuevo Pedido Manual" width="800px">
      <form @submit.prevent="handleCreateOrder" class="order-form">
        <div class="form-grid">
          <div class="form-group full-width section-header"><h4>Información Principal</h4></div>
          <div class="form-group full-width">
            <label>Asignar a Empresa *</label>
            <select v-model="newOrder.company_id" required>
              <option disabled value="">Seleccione una empresa...</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">{{ company.name }}</option>
            </select>
          </div>
          <div class="form-group"><label>Nombre del Cliente *</label><input v-model="newOrder.customer_name" type="text" required /></div>
          <div class="form-group"><label>Email del Cliente</label><input v-model="newOrder.customer_email" type="email" /></div>
          <div class="form-group full-width"><label>Dirección de Envío *</label><input v-model="newOrder.shipping_address" type="text" required /></div>
          <div class="form-group"><label>Comuna *</label><input v-model="newOrder.shipping_commune" type="text" placeholder="ej: Las Condes, Providencia, Santiago" required /></div>
          <div class="form-group"><label>Región</label><input v-model="newOrder.shipping_state" type="text" placeholder="Región Metropolitana" /></div>
          
          <div class="form-group full-width section-header"><h4>Información Financiera</h4></div>
          <div class="form-group"><label>Monto Total *</label><input v-model.number="newOrder.total_amount" type="number" step="0.01" min="0" required placeholder="0.00" /></div>
          <div class="form-group"><label>Costo de Envío</label><input v-model.number="newOrder.shipping_cost" type="number" step="0.01" min="0" placeholder="0.00" /></div>
          
          <div class="form-group full-width section-header"><h4>Datos para Logística (OptiRoute)</h4></div>
          <div class="form-group"><label>Prioridad</label><select v-model="newOrder.priority"><option>Normal</option><option>Alta</option><option>Baja</option></select></div>
          <div class="form-group"><label>Tiempo de Servicio (minutos)</label><input v-model.number="newOrder.serviceTime" type="number" /></div>
          <div class="form-group"><label>Ventana Horaria (Inicio)</label><input v-model="newOrder.timeWindowStart" type="time" /></div>
          <div class="form-group"><label>Ventana Horaria (Fin)</label><input v-model="newOrder.timeWindowEnd" type="time" /></div>
          <div class="form-group"><label>N° de Paquetes</label><input v-model.number="newOrder.load1Packages" type="number" /></div>
          <div class="form-group"><label>Peso Total (Kg)</label><input v-model.number="newOrder.load2WeightKg" type="number" step="0.1" /></div>
        </div>
        <div class="modal-actions">
          <button type="button" @click="showCreateOrderModal = false" class="btn-cancel">Cancelar</button>
          <button type="submit" :disabled="isCreatingOrder" class="btn-save">{{ isCreatingOrder ? 'Creando...' : 'Guardar Pedido' }}</button>
        </div>
      </form>
    </Modal>
<Modal v-model="showBulkUploadModal" title="Subida Masiva de Pedidos" width="600px">
  <div class="bulk-upload-content">
     <div class="form-group">
        <label for="bulk-company-select">Asignar pedidos a la empresa:</label>
        <select id="bulk-company-select" v-model="bulkUploadCompanyId" required>
            <option disabled value="">-- Seleccione una empresa --</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
                {{ company.name }}
            </option>
        </select>
    </div>
    <p>Sube un archivo Excel para crear múltiples pedidos a la vez. Asegúrate de que el archivo siga la plantilla requerida.</p>
    <div class="template-download-section">
        <a href="#" @click.prevent="downloadTemplate" class="download-template-link">
            ⬇️ Descargar Plantilla de Ejemplo
        </a>
    </div>
    
    <div class="form-group">
      <label for="file-upload" class="file-upload-label">Seleccionar archivo Excel</label>
      <input id="file-upload" type="file" @change="handleFileSelect" accept=".xlsx, .xls" />
    </div>
    
    <div v-if="selectedFile" class="file-name">
      Archivo seleccionado: {{ selectedFile.name }}
    </div>
    
    <div v-if="uploadFeedback" class="upload-feedback" :class="uploadStatus">
      {{ uploadFeedback }}
    </div>

    <div class="modal-actions">
      <button @click="showBulkUploadModal = false" class="btn-cancel">Cerrar</button>
      
      <button @click="handleBulkUpload" 
              :disabled="!selectedFile || isUploading" 
              class="btn-save">
        {{ isUploading ? 'Subiendo...' : 'Iniciar Subida' }}
      </button>
    </div>
    </div>
</Modal>

    <!-- Modal de asignación individual (existente) -->
    <Modal v-model="showAssignModal" title="Asignar Conductor" width="500px">
      <div v-if="selectedOrder">
        <p>Asignando pedido <strong>#{{ selectedOrder.order_number }}</strong> a un conductor de Shipday.</p>
        
        <div class="debug-section">
          <button @click="debugDrivers" class="btn-debug" type="button">
            🔍 Debug Conductores
          </button>
        </div>
        
        <div v-if="loadingDrivers" class="loading-state">Cargando conductores...</div>
        
        <div v-else class="form-group">
          <label>Conductor Disponible</label>
          <select v-model="selectedDriverId">
            <option disabled value="">-- Selecciona un conductor --</option>
            <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
              {{ driver.name }} ({{ driver.email }}) - {{ driver.isActive ? 'Activo' : 'Inactivo' }}
            </option>
          </select>
          
          <div v-if="selectedDriverId" class="driver-info">
            <p><strong>Conductor seleccionado:</strong></p>
            <pre>{{ JSON.stringify(availableDrivers.find(d => d.id === selectedDriverId), null, 2) }}</pre>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showAssignModal = false" class="btn-cancel">Cancelar</button>
          <button @click="confirmAssignment" :disabled="!selectedDriverId || isAssigning" class="btn-save">
            {{ isAssigning ? 'Asignando...' : 'Confirmar Asignación' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- NUEVO: Modal de asignación masiva -->
    <Modal v-model="showBulkAssignModal" title="Asignación Masiva de Conductor" width="600px">
      <div class="bulk-assign-content">
        <div class="selection-summary">
          <h4>📋 Pedidos seleccionados ({{ selectedOrders.length }})</h4>
          <div class="selected-orders-list">
            <div v-for="orderId in selectedOrders" :key="orderId" class="selected-order-item">
              {{ getOrderById(orderId)?.order_number }} - {{ getOrderById(orderId)?.customer_name }}
            </div>
          </div>
        </div>

        <div class="driver-selection">
          <div v-if="loadingDrivers" class="loading-state">Cargando conductores...</div>
          
          <div v-else class="form-group">
            <label>Conductor para asignar a todos los pedidos</label>
            <select v-model="bulkSelectedDriverId">
              <option disabled value="">-- Selecciona un conductor --</option>
              <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
                {{ driver.name }} ({{ driver.email }}) - {{ driver.isActive ? 'Activo' : 'Inactivo' }}
              </option>
            </select>
          </div>

          <div v-if="bulkSelectedDriverId" class="bulk-driver-info">
            <p><strong>Se asignará:</strong> {{ availableDrivers.find(d => d.id === bulkSelectedDriverId)?.name }}</p>
          </div>
        </div>

        <!-- Progreso de asignación masiva -->
        <div v-if="isBulkAssigning" class="bulk-progress">
          <h4>Progreso de asignación:</h4>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: bulkProgressPercentage + '%' }"></div>
          </div>
          <p>{{ bulkAssignmentCompleted }} / {{ selectedOrders.length }} pedidos procesados</p>
          
          <div v-if="bulkAssignmentResults.length > 0" class="results-preview">
            <div v-for="result in bulkAssignmentResults.slice(-3)" :key="result.orderId" class="result-item">
              <span :class="result.success ? 'success-icon' : 'error-icon'">
                {{ result.success ? '✅' : '❌' }}
              </span>
              {{ result.orderNumber }}: {{ result.message }}
            </div>
          </div>
        </div>

        <!-- Resultados finales -->
        <div v-if="bulkAssignmentFinished" class="bulk-results">
          <h4>📊 Resultados de la asignación masiva:</h4>
          <div class="results-summary">
            <div class="result-stat success">
              <span class="stat-number">{{ bulkAssignmentResults.filter(r => r.success).length }}</span>
              <span class="stat-label">Exitosos</span>
            </div>
            <div class="result-stat error">
              <span class="stat-number">{{ bulkAssignmentResults.filter(r => !r.success).length }}</span>
              <span class="stat-label">Fallidos</span>
            </div>
          </div>

          <div v-if="bulkAssignmentResults.filter(r => !r.success).length > 0" class="error-details">
            <h5>❌ Pedidos que fallaron:</h5>
            <div v-for="result in bulkAssignmentResults.filter(r => !r.success)" :key="result.orderId" class="error-item">
              <strong>{{ result.orderNumber }}:</strong> {{ result.message }}
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeBulkAssignModal" class="btn-cancel">
            {{ isBulkAssigning ? 'Cerrar después de completar' : 'Cerrar' }}
          </button>
          <button 
            v-if="!isBulkAssigning && !bulkAssignmentFinished"
            @click="confirmBulkAssignment" 
            :disabled="!bulkSelectedDriverId" 
            class="btn-save">
            🚚 Asignar {{ selectedOrders.length }} pedidos
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiService } from '../services/api';
import { shipdayService } from '../services/shipday';
import Modal from '../components/Modal.vue';
import UpdateOrderStatus from '../components/UpdateOrderStatus.vue';
import OrderDetails from '../components/OrderDetails.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const orders = ref([]);
const companies = ref([]);
const pagination = ref({ page: 1, limit: 15, total: 0, totalPages: 1 });
const filters = ref({ company_id: '', status: '', shipping_commune: '', date_from: '', date_to: '', search: '' });
const loadingOrders = ref(true);
const isExporting = ref(false);
const selectedOrder = ref(null);
const showUpdateStatusModal = ref(false);
const showOrderDetailsModal = ref(false);
const showCreateOrderModal = ref(false);
const isCreatingOrder = ref(false);
const newOrder = ref({});
const bulkUploadCompanyId = ref('');
const showBulkUploadModal = ref(false);
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadFeedback = ref('');
const uploadStatus = ref('');

// Estados para asignación individual (existente)
const showAssignModal = ref(false);
const availableDrivers = ref([]);
const loadingDrivers = ref(false);
const selectedDriverId = ref('');
const isAssigning = ref(false);

// NUEVO: Estados para selección masiva y asignación masiva
const selectedOrders = ref([]);
const showBulkAssignModal = ref(false);
const bulkSelectedDriverId = ref('');
const isBulkAssigning = ref(false);
const bulkAssignmentCompleted = ref(0);
const bulkAssignmentResults = ref([]);
const bulkAssignmentFinished = ref(false);

// NUEVO: Estados para filtros y comunas
const availableCommunes = computed(() => {
  if (!orders.value || orders.value.length === 0) {
    return [];
  }
  // Usamos Set para obtener valores únicos automáticamente
  const communes = new Set(
    orders.value
      .map(order => order.shipping_commune)
      .filter(commune => !!commune) // Filtramos valores nulos o vacíos
  );
  return Array.from(communes).sort(); // Convertimos a array y ordenamos alfabéticamente
});


// NUEVO: Computed properties para selección masiva
const selectAllChecked = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  return selectableOrders.length > 0 && selectableOrders.every(order => selectedOrders.value.includes(order._id));
});

const selectAllIndeterminate = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  const selectedCount = selectableOrders.filter(order => selectedOrders.value.includes(order._id)).length;
  return selectedCount > 0 && selectedCount < selectableOrders.length;
});

const bulkProgressPercentage = computed(() => {
  if (selectedOrders.value.length === 0) return 0;
  return (bulkAssignmentCompleted.value / selectedOrders.value.length) * 100;
});

onMounted(() => {
  fetchCompanies();
  fetchOrders();
  fetchAvailableCommunes();
});

// Funciones existentes (sin cambios)
async function fetchCompanies() { 
  try { 
    const { data } = await apiService.companies.getAll(); 
    companies.value = data; 
  } catch (error) { 
    console.error("Error fetching companies:", error); 
  } 
}

async function fetchOrders() { 
  loadingOrders.value = true; 
  try { 
    const params = { page: pagination.value.page, limit: pagination.value.limit, ...filters.value }; 
    const { data } = await apiService.orders.getAll(params); 
    orders.value = data.orders; 
    pagination.value = data.pagination;
    // Limpiar selección si cambiamos de página o filtros
    selectedOrders.value = [];
  } catch (error) { 
    console.error('Error fetching orders:', error); 
  } finally { 
    loadingOrders.value = false; 
  } 
}

// Función mejorada para obtener comunas disponibles
async function fetchAvailableCommunes() {
  try {
    console.log('🏘️ Obteniendo comunas disponibles...');
    
    const params = {};
    
    // Si hay filtro de empresa, aplicarlo también para las comunas
    if (filters.value.company_id) {
      params.company_id = filters.value.company_id;
    }
    
    const { data } = await apiService.orders.getAvailableCommunes(params);
    availableCommunes.value = data.communes || [];
    
    console.log('✅ Comunas cargadas:', availableCommunes.value.length);
    
  } catch (error) {
    console.error('❌ Error fetching communes:', error);
    // Fallback: extraer comunas de las órdenes actuales
    if (orders.value.length > 0) {
      updateAvailableCommunes(orders.value);
    }
  }
}

// Función para actualizar la lista de comunas (fallback)
function updateAvailableCommunes(orders) {
  const communes = new Set();
  orders.forEach(order => {
    if (order.shipping_commune && order.shipping_commune.trim()) {
      communes.add(order.shipping_commune.trim());
    }
  });
  availableCommunes.value = [...communes].sort();
  console.log('📍 Comunas actualizadas desde órdenes locales:', availableCommunes.value.length);
}

async function exportOrders() { 
  isExporting.value = true; 
  try { 
    const response = await apiService.orders.exportForOptiRoute(filters.value); 
    const url = window.URL.createObjectURL(new Blob([response.data])); 
    const link = document.createElement('a'); 
    link.href = url; 
    link.setAttribute('download', `pedidos_optiroute_${Date.now()}.xlsx`); 
    document.body.appendChild(link); 
    link.click(); 
    link.remove(); 
    window.URL.revokeObjectURL(url); 
  } catch (error) { 
    alert('No se encontraron pedidos para exportar.'); 
  } finally { 
    isExporting.value = false; 
  } 
}

function openUpdateStatusModal(order) { selectedOrder.value = order; showUpdateStatusModal.value = true; }
function openOrderDetailsModal(order) { selectedOrder.value = order; showOrderDetailsModal.value = true; }

async function handleStatusUpdate({ orderId, newStatus }) { 
  try { 
    await apiService.orders.updateStatus(orderId, newStatus); 
    const index = orders.value.findIndex(o => o._id === orderId); 
    if (index !== -1) { 
      orders.value[index].status = newStatus; 
    } 
    showUpdateStatusModal.value = false; 
    alert('Estado actualizado con éxito.'); 
  } catch (error) { 
    alert(`Error al actualizar estado: ${error.message}`); 
  } 
}

let searchTimeout;
function debounceSearch() { 
  clearTimeout(searchTimeout); 
  searchTimeout = setTimeout(() => { 
    pagination.value.page = 1; 
    fetchOrders(); 
  }, 500); 
}

function goToPage(page) { 
  if (page >= 1 && page <= pagination.value.totalPages) { 
    pagination.value.page = page; 
    fetchOrders(); 
  } 
}

function openCreateOrderModal() { 
  newOrder.value = { 
    company_id: '', customer_name: '', customer_email: '', shipping_address: '',
    shipping_commune: '', shipping_state: 'Región Metropolitana', total_amount: 0, shipping_cost: 0, 
    priority: 'Normal', serviceTime: 5, timeWindowStart: '09:00', timeWindowEnd: '18:00', 
    load1Packages: 1, load2WeightKg: 1 
  }; 
  showCreateOrderModal.value = true; 
}

async function handleCreateOrder() { 
  if (!newOrder.value.company_id) { 
    alert("Por favor, seleccione una empresa."); 
    return; 
  }
  
  if (!newOrder.value.customer_name) {
    alert("Por favor, ingrese el nombre del cliente.");
    return;
  }
  
  if (!newOrder.value.shipping_address) {
    alert("Por favor, ingrese la dirección de envío.");
    return;
  }
  
  if (!newOrder.value.total_amount || newOrder.value.total_amount <= 0) {
    alert("Por favor, ingrese un monto total válido.");
    return;
  }
  
  const channelsResponse = await apiService.channels.getByCompany(newOrder.value.company_id); 
  if (!channelsResponse.data || channelsResponse.data.length === 0) { 
    alert("La empresa seleccionada no tiene canales. Configure uno primero."); 
    return; 
  } 
  isCreatingOrder.value = true; 
  try { 
    const orderData = { 
      ...newOrder.value, 
      channel_id: channelsResponse.data[0]._id, 
      order_number: `MANUAL-${Date.now()}`, 
      external_order_id: `manual-admin-${Date.now()}`,
      // Asegurar que los valores numéricos sean números
      total_amount: parseFloat(newOrder.value.total_amount) || 0,
      shipping_cost: parseFloat(newOrder.value.shipping_cost) || 0,
      serviceTime: parseInt(newOrder.value.serviceTime) || 5,
      load1Packages: parseInt(newOrder.value.load1Packages) || 1,
      load2WeightKg: parseFloat(newOrder.value.load2WeightKg) || 1
    }; 
    
    console.log('📦 Datos del pedido a crear:', orderData);
    
    await apiService.orders.create(orderData); 
    alert('Pedido manual creado con éxito.'); 
    showCreateOrderModal.value = false; 
    await fetchOrders(); 
  } catch (error) { 
    console.error('Error creando pedido:', error);
    alert(`No se pudo crear el pedido: ${error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || error.message}`); 
  } finally { 
    isCreatingOrder.value = false; 
  } 
}

function openBulkUploadModal() { 
  selectedFile.value = null; 
  uploadFeedback.value = ''; 
  uploadStatus.value = ''; 
  showBulkUploadModal.value = true; 
}

function handleFileSelect(event) { 
  selectedFile.value = event.target.files[0]; 
  uploadFeedback.value = ''; 
  uploadStatus.value = ''; 
}

async function handleBulkUpload() {

   if (!bulkUploadCompanyId.value) { // <--- Añade esta validación
    alert('Por favor, selecciona una empresa para la subida masiva.');
    return;
  }
  if (!selectedFile.value) {
    alert('Por favor, selecciona un archivo.');
    return;
  }
  if (!selectedFile.value) {
    alert('Por favor, selecciona un archivo.');
    return;
  }
  isUploading.value = true;
  uploadFeedback.value = 'Procesando archivo...';
  uploadStatus.value = 'processing';

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('company_id', bulkUploadCompanyId.value); // <--- Envía el ID de la empresa

  try {
    // Esta llamada a la API necesita ser creada
    const { data } = await apiService.orders.bulkUpload(formData);
    uploadFeedback.value = `Proceso completado: ${data.success} pedidos creados, ${data.failed} fallaron.`;
    uploadStatus.value = data.failed > 0 ? 'error' : 'success';
    if (data.success > 0) await fetchOrders(); // Recargar la tabla si hubo éxito
  } catch (error) {
    uploadFeedback.value = `Error: ${error.message}`;
    uploadStatus.value = 'error';
  } finally {
    isUploading.value = false;
  }
}

function formatCurrency(amount) { 
  if (amount === undefined || amount === null) return '0'; 
  return new Intl.NumberFormat('es-CL').format(amount); 
}

function formatDate(dateStr, withTime = false) { 
  if (!dateStr) return 'N/A'; 
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' }; 
  if (withTime) { 
    options.hour = '2-digit'; 
    options.minute = '2-digit'; 
  } 
  return new Date(dateStr).toLocaleString('es-CL', options); 
}

function getStatusName(status) { 
  const names = { 
    pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado', 
    delivered: 'Entregado', cancelled: 'Cancelado' 
  }; 
  return names[status] || status; 
}

// Función para obtener clase CSS de comuna
function getCommuneClass(commune) {
  if (!commune || commune === 'Sin comuna') return 'commune-empty';
  // Comunas importantes de Santiago y otras regiones
  const importantCommunes = [
    'Las Condes', 'Providencia', 'Santiago', 'Ñuñoa', 'La Reina', 'Vitacura',
    'Valparaíso', 'Viña del Mar', 'Concepción', 'La Serena', 'Antofagasta',
    'Temuco', 'Puerto Montt', 'Iquique', 'Arica'
  ];
  if (importantCommunes.some(important => commune.toLowerCase().includes(important.toLowerCase()))) {
    return 'commune-important';
  }
  return 'commune-filled';
}

// Funciones de asignación individual (existentes)
async function openAssignModal(order) {
  selectedOrder.value = order;
  selectedDriverId.value = '';
  showAssignModal.value = true;
  await fetchAvailableDrivers();
}

async function confirmAssignment() {
  if (!selectedDriverId.value) {
    alert("Por favor, selecciona un conductor.");
    return;
  }
  isAssigning.value = true;
  try {
    await apiService.orders.assignDriver(selectedOrder.value._id, selectedDriverId.value);
    alert('Pedido asignado exitosamente en Shipday.');
    showAssignModal.value = false;
    fetchOrders();
  } catch (error) {
    alert(`Error al asignar: ${error.response?.data?.error || error.message}`);
  } finally {
    isAssigning.value = false;
  }
}

async function debugOrder(order) {
  try {
    console.log('🔍 Iniciando debug para orden:', order._id);
    
    const response = await apiService.orders.debugShipday(order._id);
    
    console.log('✅ Debug Info completa:', response.data);
    
    const debugInfo = response.data.debug_info;
    const validations = debugInfo.validations;
    const companyData = debugInfo.company_data;
    const orderData = debugInfo.order_basics;
    
    alert(`
🔍 DEBUG ORDEN: ${orderData.order_number}

📊 DATOS BÁSICOS:
• Cliente: ${orderData.customer_name || 'NO DEFINIDO'}
• Dirección: ${orderData.shipping_address || 'NO DEFINIDA'}
• Total: ${orderData.total_amount || orderData.shipping_cost || 0}

🏢 DATOS EMPRESA:
• ID: ${companyData.company_id || 'NO DEFINIDO'}
• Nombre: ${companyData.company_name || 'NO DEFINIDO'}
• Teléfono: ${companyData.company_phone || 'NO DEFINIDO'}

✅ VALIDACIONES:
• Tiene empresa: ${validations.has_company ? '✅' : '❌'}
• Nombre empresa: ${validations.has_company_name ? '✅' : '❌'}
• Nombre no vacío: ${validations.company_name_not_empty ? '✅' : '❌'}
• Todo OK: ${validations.all_required_fields_ok ? '✅' : '❌'}

🚀 NOMBRE RESTAURANTE FINAL: 
"${validations.restaurant_name_final}"

Ver consola para detalles completos.
    `);
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    alert(`Error: ${error.response?.data?.error || error.message}`);
  }
}

async function debugDrivers() {
  try {
    console.log('🔍 Iniciando debug de conductores...');
    
    const response = await shipdayService.getDrivers();
    console.log('📋 Respuesta completa de getDrivers:', response);
    
    const drivers = response.data?.data || response.data || [];
    console.log('👥 Conductores procesados:', drivers);
    
    drivers.forEach((driver, index) => {
      console.log(`👨‍💼 Conductor ${index + 1}:`, {
        id: driver.id,
        carrierId: driver.carrierId,
        name: driver.name,
        email: driver.email,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift,
        status: driver.status
      });
    });
    
    const filtered = drivers.filter(driver => driver.isActive && !driver.isOnShift);
    console.log('🎯 Conductores filtrados (disponibles):', filtered);
    
    alert(`
🔍 DEBUG CONDUCTORES

📊 Total conductores: ${drivers.length}
✅ Activos: ${drivers.filter(d => d.isActive).length}
🚚 En turno: ${drivers.filter(d => d.isOnShift).length}
⭐ Disponibles: ${filtered.length}

Ver consola para detalles completos.
    `);
    
  } catch (error) {
    console.error('❌ Error en debug de conductores:', error);
    alert('Error obteniendo conductores: ' + error.message);
  }
}

async function fetchAvailableDrivers() {
  loadingDrivers.value = true;
  try {
    const response = await shipdayService.getDrivers();
    console.log('📋 Respuesta de conductores:', response);
    
    const allDrivers = response.data?.data || response.data || [];
    console.log('👥 Todos los conductores:', allDrivers);
    
    availableDrivers.value = allDrivers.filter(driver => driver.isActive);
    
    console.log('⭐ Conductores mostrados en select:', availableDrivers.value);
    
  } catch (error) {
    alert("Error al cargar los conductores desde Shipday.");
    console.error(error);
  } finally {
    loadingDrivers.value = false;
  }
}

// NUEVO: Funciones para selección masiva
function toggleSelectAll() {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  
  if (selectAllChecked.value) {
    // Deseleccionar todos
    selectedOrders.value = selectedOrders.value.filter(id => 
      !selectableOrders.some(order => order._id === id)
    );
  } else {
    // Seleccionar todos los seleccionables de la página actual
    selectableOrders.forEach(order => {
      if (!selectedOrders.value.includes(order._id)) {
        selectedOrders.value.push(order._id);
      }
    });
  }
}

function clearSelection() {
  selectedOrders.value = [];
}

function getOrderById(orderId) {
  return orders.value.find(order => order._id === orderId);
}

// NUEVO: Funciones para asignación masiva
async function openBulkAssignModal() {
  if (selectedOrders.value.length === 0) {
    alert('Por favor, selecciona al menos un pedido.');
    return;
  }
  
  showBulkAssignModal.value = true;
  bulkSelectedDriverId.value = '';
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  bulkAssignmentFinished.value = false;
  isBulkAssigning.value = false;
  
  // Cargar conductores si no están cargados
  if (availableDrivers.value.length === 0) {
    await fetchAvailableDrivers();
  }
}
async function downloadTemplate() {
  try {
    // Suponiendo que tienes un método en apiService para esto
    // que solicita el archivo como un 'blob'
    const response = await apiService.orders.downloadImportTemplate();
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importacion_pedidos.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error al descargar la plantilla:", error);
    alert('No se pudo descargar la plantilla. Inténtelo de nuevo.');
  }
}
async function confirmBulkAssignment() {
  if (!bulkSelectedDriverId.value) {
    alert('Por favor, selecciona un conductor.');
    return;
  }
  
  if (selectedOrders.value.length === 0) {
    alert('No hay pedidos seleccionados.');
    return;
  }
  
  const confirmation = confirm(
    `¿Estás seguro de asignar ${selectedOrders.value.length} pedidos al conductor ${
      availableDrivers.value.find(d => d.id === bulkSelectedDriverId.value)?.name
    }?`
  );
  
  if (!confirmation) return;
  
  isBulkAssigning.value = true;
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  
  console.log('🚀 Iniciando asignación masiva:', {
    ordersCount: selectedOrders.value.length,
    driverId: bulkSelectedDriverId.value,
    driverName: availableDrivers.value.find(d => d.id === bulkSelectedDriverId.value)?.name
  });
  
  try {
    // OPCIÓN 1: Usar el nuevo endpoint de asignación masiva (más eficiente)
    const response = await apiService.orders.bulkAssignDriver(
      selectedOrders.value, 
      bulkSelectedDriverId.value
    );
    
    // Simular progreso para mostrar feedback visual
    const totalOrders = selectedOrders.value.length;
    const results = response.data.results;
    
    // Actualizar progreso gradualmente para UX
    for (let i = 0; i <= totalOrders; i++) {
      bulkAssignmentCompleted.value = i;
      
      if (i < results.successful.length + results.failed.length) {
        const allResults = [...results.successful, ...results.failed];
        const currentResult = allResults[i];
        if (currentResult) {
          bulkAssignmentResults.value.push({
            orderId: currentResult.orderId,
            orderNumber: currentResult.orderNumber,
            success: results.successful.includes(currentResult),
            message: currentResult.message || currentResult.error || 'Procesado'
          });
        }
      }
      
      // Pausa para efecto visual
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Asignación masiva completada via endpoint:', response.data);
    
  } catch (error) {
    console.error('❌ Error en asignación masiva via endpoint, fallback a método individual:', error);
    
    // OPCIÓN 2: Fallback al método individual si falla el endpoint masivo
    for (let i = 0; i < selectedOrders.value.length; i++) {
      const orderId = selectedOrders.value[i];
      const order = getOrderById(orderId);
      
      console.log(`📦 Procesando pedido ${i + 1}/${selectedOrders.value.length}: ${order?.order_number}`);
      
      try {
        await apiService.orders.assignDriver(orderId, bulkSelectedDriverId.value);
        
        bulkAssignmentResults.value.push({
          orderId: orderId,
          orderNumber: order?.order_number || 'Sin número',
          success: true,
          message: 'Asignado exitosamente'
        });
        
        console.log(`✅ Pedido ${order?.order_number} asignado exitosamente`);
        
      } catch (error) {
        console.error(`❌ Error asignando pedido ${order?.order_number}:`, error);
        
        bulkAssignmentResults.value.push({
          orderId: orderId,
          orderNumber: order?.order_number || 'Sin número',
          success: false,
          message: error.response?.data?.error || error.message || 'Error desconocido'
        });
      }
      
      bulkAssignmentCompleted.value = i + 1;
      
      // Pausa entre asignaciones individuales
      if (i < selectedOrders.value.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  isBulkAssigning.value = false;
  bulkAssignmentFinished.value = true;
  
  console.log('🏁 Asignación masiva completada:', {
    total: selectedOrders.value.length,
    successful: bulkAssignmentResults.value.filter(r => r.success).length,
    failed: bulkAssignmentResults.value.filter(r => !r.success).length
  });
  
  // Recargar pedidos para mostrar cambios
  await fetchOrders();
  
  // Mostrar resumen final
  const successful = bulkAssignmentResults.value.filter(r => r.success).length;
  const failed = bulkAssignmentResults.value.filter(r => !r.success).length;
  
  alert(`
🏁 Asignación masiva completada:

✅ Exitosos: ${successful}
❌ Fallidos: ${failed}

${failed > 0 ? 'Revisa los detalles en el modal para ver qué pedidos fallaron.' : '¡Todos los pedidos fueron asignados exitosamente!'}
  `);
}

function closeBulkAssignModal() {
  showBulkAssignModal.value = false;
  
  // Limpiar selección si la asignación fue exitosa
  if (bulkAssignmentFinished.value) {
    const successfulOrderIds = bulkAssignmentResults.value
      .filter(r => r.success)
      .map(r => r.orderId);
    
    selectedOrders.value = selectedOrders.value.filter(id => 
      !successfulOrderIds.includes(id)
    );
  }
  
  // Reset estados
  bulkSelectedDriverId.value = '';
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  bulkAssignmentFinished.value = false;
  isBulkAssigning.value = false;
}
</script>

<style scoped>
/* Estilos base existentes */
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; }
.header-actions { display: flex; gap: 12px; }
.btn-action { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; transition: background-color 0.2s ease; }
.btn-primary { background-color: #10b981; color: white; }
.btn-primary:hover:not(:disabled) { background-color: #059669; }
.btn-primary:disabled { background-color: #6ee7b7; cursor: not-allowed; }
.btn-secondary { background-color: #4f46e5; color: white; }
.btn-secondary:hover { background-color: #4338ca; }
.filters-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.filters select, .filters input { padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.search-input { grid-column: span 2; }

/* Estilos para filtro de comuna */
.commune-filter {
  background-color: #f0f9ff;
  border-color: #0ea5e9;
}

.commune-cell {
  text-align: center;
}

.commune-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.commune-badge.commune-filled {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.commune-badge.commune-important {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
  font-weight: 600;
}

.commune-badge.commune-empty {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  font-style: italic;
}

/* NUEVO: Estilos para selección masiva */
.bulk-actions-section {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.bulk-actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.selection-count {
  font-weight: 600;
  font-size: 16px;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.btn-bulk-assign {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-bulk-assign:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-clear-selection {
  background-color: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-selection:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.content-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #374151; }

/* NUEVO: Estilos para checkboxes y selección */
.checkbox-column {
  width: 50px;
  text-align: center;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6366f1;
}

.selected-row {
  background-color: #f0f9ff;
  border-left: 4px solid #6366f1;
}

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e5e7eb; }
.page-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.page-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.loading-row, .empty-row { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
.order-form, .bulk-upload-content { max-height: 70vh; overflow-y: auto; padding: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group.section-header { background-color: #eef2ff; border-color: #c7d2fe; padding: 8px 12px; border-radius: 6px; margin-top: 10px; margin-bottom: 20px; grid-column: 1 / -1; }
.section-header h4 { margin: 0; color: #4338ca; font-size: 14px; font-weight: 600; }
.form-group label { margin-bottom: 8px; font-weight: 500; color: #374151; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
.btn-cancel { background-color: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 6px; }
.btn-save { background-color: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; }
.btn-save:disabled { background-color: #9ca3af; cursor: not-allowed; }
.bulk-upload-content p { color: #6b7280; margin-bottom: 16px; }
.file-upload-label { font-weight: 500; }
.file-name { margin-top: 8px; font-style: italic; color: #6b7280; }
.upload-feedback { margin-top: 16px; padding: 10px; border-radius: 6px; text-align: center; font-weight: 500; }
.upload-feedback.success { background-color: #d1fae5; color: #065f46; }
.upload-feedback.error { background-color: #fee2e2; color: #991b1b; }
.upload-feedback.processing { background-color: #dbeafe; color: #1e40af; }
.date-cell { font-size: 12px; white-space: nowrap; }
.date-label { font-weight: 500; color: #6b7280; }
.date-creation { margin-bottom: 4px; }
.action-buttons { display: flex; gap: 8px; }
.btn-table-action { font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; transition: all 0.2s ease; }
.btn-table-action.view { color: #3b82f6; border-color: #bfdbfe; }
.btn-table-action.view:hover { background-color: #3b82f6; color: white; }
.btn-table-action.edit { color: #8b5cf6; border-color: #ddd6fe; }
.btn-table-action.edit:hover { background-color: #8b5cf6; color: white; }
.btn-table-action.assign { color: #16a34a; border-color: #86efac; }
.btn-table-action.assign:hover:not(:disabled) { background-color: #16a34a; color: white; }
.btn-table-action.debug { color: #8b5cf6; border-color: #ddd6fe; }
.btn-table-action.debug:hover { background-color: #8b5cf6; color: white; }
.btn-table-action:disabled { background-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; border-color: #d1d5db; }
.loading-state { text-align: center; padding: 20px; color: #6b7280; }
.debug-section { margin-bottom: 16px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; }
.btn-debug { background-color: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.btn-debug:hover { background-color: #7c3aed; }
.driver-info { margin-top: 12px; padding: 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 11px; }
.driver-info pre { margin: 0; white-space: pre-wrap; word-break: break-all; }

/* NUEVO: Estilos para modal de asignación masiva */
.bulk-assign-content {
  max-height: 80vh;
  overflow-y: auto;
}

.selection-summary {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.selection-summary h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.selected-orders-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background-color: white;
}

.selected-order-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #475569;
}

.selected-order-item:last-child {
  border-bottom: none;
}

.driver-selection {
  margin-bottom: 24px;
}

.bulk-driver-info {
  margin-top: 12px;
  padding: 12px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  color: #065f46;
  font-weight: 500;
}

.bulk-progress {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.bulk-progress h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  transition: width 0.3s ease;
}

.results-preview {
  margin-top: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
  color: #475569;
}

.success-icon {
  color: #059669;
}

.error-icon {
  color: #dc2626;
}

.bulk-results {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.bulk-results h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
}

.results-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.result-stat {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 6px;
}

.result-stat.success {
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.result-stat.error {
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.result-stat.success .stat-number {
  color: #059669;
}

.result-stat.error .stat-number {
  color: #dc2626;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.error-details {
  margin-top: 16px;
}

.error-details h5 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 14px;
}

.error-item {
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #991b1b;
}

.error-item:last-child {
  margin-bottom: 0;
}
</style>