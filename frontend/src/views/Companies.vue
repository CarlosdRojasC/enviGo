<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Gestión de Empresas</h1>
      <div class="header-actions">
        <button @click="exportCompaniesData" class="btn-secondary" :disabled="loading">
          📊 Exportar Datos
        </button>
        <button @click="openAddCompanyModal" class="btn-primary">+ Añadir Empresa</button>
      </div>
    </div>

    <div class="filters-section">
      <div class="filters-grid">
        <select v-model="filters.status" @change="fetchCompanies">
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
          <option value="trial">En Prueba</option>
        </select>
        
        <select v-model="filters.plan" @change="fetchCompanies">
          <option value="">Todos los planes</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        
        <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar empresa..."
          class="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="loading"><p>Cargando empresas...</p></div>
    <div v-else class="content-section">
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-info">
            <div class="stat-value">{{ companies.length }}</div>
            <div class="stat-label">Total Empresas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ activeCompanies }}</div>
            <div class="stat-label">Activas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">${{ formatCurrency(totalMonthlyRevenue) }}</div>
            <div class="stat-label">Revenue Mensual</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value">{{ totalOrders }}</div>
            <div class="stat-label">Pedidos Totales</div>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Plan / Precio</th>
              <th>Usuarios</th>
              <th>Pedidos</th>
              <th>Revenue Mensual</th>
              <th>Estado</th>
              <th>Última Actividad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="companies.length === 0">
              <td colspan="8" class="empty-row">No hay empresas registradas.</td>
            </tr>
            <tr v-else v-for="company in companies" :key="company._id" class="company-row">
              <td class="company-info">
                <div class="company-name">{{ company.name }}</div>
                <div class="company-email">{{ company.contact_email || 'Sin email' }}</div>
              </td>
              <td class="pricing-info">
                <div class="current-plan">
                  <span class="plan-badge" :class="company.plan_type || 'basic'">
                    {{ getPlanName(company.plan_type) }}
                  </span>
                </div>
                <div class="price-display">
                  <span class="price-amount">${{ formatCurrency(company.price_per_order || 0) }}</span>
                  <span class="price-unit">por pedido</span>
                </div>
                <div class="price-breakdown" v-if="company.price_per_order">
                  <span class="price-detail">+ IVA: ${{ formatCurrency(calculateIVA(company.price_per_order)) }}</span>
                </div>
              </td>
              <td class="users-count">{{ company.users_count }}</td>
              <td class="orders-count">
                <div class="orders-total">{{ company.orders_count }}</div>
                <div class="orders-month">{{ company.orders_this_month || 0 }} este mes</div>
              </td>
              <td class="revenue-info">
                <div class="revenue-amount">${{ formatCurrency(calculateMonthlyRevenue(company)) }}</div>
                <div class="revenue-breakdown">
                  <span class="revenue-base">Base: ${{ formatCurrency(getBaseRevenue(company)) }}</span>
                  <span class="revenue-iva">IVA: ${{ formatCurrency(getIVARevenue(company)) }}</span>
                </div>
              </td>
              <td class="company-status">
                <span class="status-badge" :class="getStatusClass(company)">
                  {{ getStatusText(company) }}
                </span>
              </td>
              <td class="last-activity">{{ formatDate(company.last_activity || company.updated_at) }}</td>
              <td class="actions-column">
                <div class="action-buttons">
                  <button @click="openPricingModal(company)" class="btn-action pricing" title="Configurar Precios">
                    💰
                  </button>
                  <button @click="openUsersModal(company)" class="btn-action users" title="Gestionar Usuarios">
                    👥
                  </button>
                  <button @click="exportCompanyOrders(company)" class="btn-action stats" title="Exportar Pedidos (OptiRoute)">
                    🚚
                  </button>
                  <button @click="openStatsModal(company)" class="btn-action stats" title="Ver Estadísticas">
                    📊
                  </button>
                  <button @click="toggleCompanyStatus(company)" class="btn-action toggle" :title="company.is_active ? 'Desactivar' : 'Activar'">
                    {{ company.is_active ? '⏸️' : '▶️' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-model="showAddCompanyModal" title="Añadir Nueva Empresa" width="700px">
      <form @submit.prevent="handleAddNewCompany" class="company-form">
        <div class="form-section">
          <h4>Datos de la Empresa</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="company-name">Nombre de la Empresa *</label>
              <input id="company-name" v-model="newCompany.name" type="text" required>
            </div>
            <div class="form-group">
              <label for="company-email">Email de Contacto *</label>
              <input id="company-email" v-model="newCompany.email" type="email" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="company-phone">Teléfono</label>
              <input id="company-phone" v-model="newCompany.phone" type="tel">
            </div>
            <div class="form-group">
              <label for="company-price">Precio por Pedido (CLP) *</label>
              <input id="company-price" v-model.number="newCompany.price_per_order" type="number" required>
            </div>
          </div>
          <div class="form-group">
            <label for="company-address">Dirección</label>
            <input id="company-address" v-model="newCompany.address" type="text">
          </div>
        </div>

        <div class="form-section">
          <h4>Usuario Administrador de la Empresa</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="owner-name">Nombre del Dueño *</label>
              <input id="owner-name" v-model="newCompany.owner_name" type="text" required>
            </div>
            <div class="form-group">
              <label for="owner-email">Email del Dueño *</label>
              <input id="owner-email" v-model="newCompany.owner_email" type="email" required>
            </div>
          </div>
          <div class="form-group">
            <label for="owner-password">Contraseña Provisional *</label>
            <input id="owner-password" v-model="newCompany.owner_password" type="password" required minlength="8">
            <small class="form-hint">El usuario deberá usar esta contraseña para su primer acceso.</small>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="showAddCompanyModal = false" class="btn-cancel">Cancelar</button>
          <button type="submit" :disabled="isAddingCompany" class="btn-save">
            {{ isAddingCompany ? 'Creando...' : 'Crear Empresa' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal v-model="showPricingModal" :title="`Configurar Precios - ${selectedCompany?.name}`" width="600px">
      </Modal>

    <Modal v-model="showUsersModal" :title="`Usuarios de ${selectedCompany?.name}`" width="800px">
      </Modal>
    
    <Modal v-model="showAddUserForm" :title="`Añadir Usuario a ${selectedCompany?.name}`" width="500px">
      </Modal>

    <Modal v-model="showStatsModal" :title="`Estadísticas - ${selectedCompany?.name}`" width="900px">
        </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';

// Estado
const companies = ref([]);
const users = ref([]);
const loading = ref(true);
const loadingUsers = ref(false);
const showUsersModal = ref(false);
const showAddUserForm = ref(false);
const isAddingUser = ref(false);
const isExporting = ref(false); // Estado para la exportación
const selectedCompany = ref(null);

const showPricingModal = ref(false);
const showStatsModal = ref(false);
const savingPricing = ref(false);
const filters = ref({ status: '', plan: '', search: '' });

const pricingForm = ref({
  plan_type: 'basic',
  price_per_order: 0,
  billing_cycle: 'monthly',
  pricing_notes: ''
});

// NUEVO: Estado para el modal de añadir empresa
const showAddCompanyModal = ref(false);
const isAddingCompany = ref(false);
const newCompany = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  price_per_order: 500,
  owner_name: '',
  owner_email: '',
  owner_password: ''
});

const planPricing = {
  basic: { price: 500, users: 3, name: 'Básico' },
  pro: { price: 350, users: 10, name: 'Pro' },
  enterprise: { price: 250, users: 50, name: 'Enterprise' },
  custom: { price: 0, users: 999, name: 'Personalizado' }
};

const IVA_RATE = 0.19;

const newUser = ref({ full_name: '', email: '', password: '', role: 'company_employee', company_id: null });

// Computed
const activeCompanies = computed(() => companies.value.filter(c => c.is_active).length);
const totalMonthlyRevenue = computed(() => companies.value.reduce((total, company) => total + calculateMonthlyRevenue(company), 0));
const totalOrders = computed(() => companies.value.reduce((total, company) => total + (company.orders_count || 0), 0));
const suggestedPrice = computed(() => {
  const plan = planPricing[pricingForm.value.plan_type];
  return plan ? plan.price : 0;
});

// Lifecycle
onMounted(fetchCompanies);

// Funciones
async function fetchCompanies() {
  loading.value = true;
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data.map(company => ({
      ...company,
      price_per_order: company.price_per_order || 0,
      plan_type: company.plan_type || 'basic',
      orders_this_month: company.orders_this_month || 0
    }));
  } catch (error) {
    console.error("Error fetching companies:", error);
    alert('No se pudieron cargar las empresas.');
  } finally {
    loading.value = false;
  }
}

// NUEVO: Función para abrir el modal de añadir empresa
function openAddCompanyModal() {
  newCompany.value = {
    name: '', email: '', phone: '', address: '',
    price_per_order: 500, owner_name: '', owner_email: '', owner_password: ''
  };
  showAddCompanyModal.value = true;
}

// NUEVO: Función para manejar la creación de una empresa
async function handleAddNewCompany() {
  isAddingCompany.value = true;
  try {
    await apiService.companies.create(newCompany.value);
    alert('Empresa creada exitosamente.');
    showAddCompanyModal.value = false;
    await fetchCompanies();
  } catch (error) {
    alert(`Error al crear la empresa: ${error.response?.data?.error || error.message}`);
  } finally {
    isAddingCompany.value = false;
  }
}

async function openUsersModal(company) {
    selectedCompany.value = company;
    showUsersModal.value = true;
    loadingUsers.value = true;
    try {
        const { data } = await apiService.companies.getUsers(company._id);
        users.value = data;
    } catch (error) {
        alert('No se pudieron cargar los usuarios de la empresa.');
    } finally {
        loadingUsers.value = false;
    }
}

function openAddUserModal() {
  newUser.value = {
    full_name: '', email: '', password: '', 
    role: 'company_employee', company_id: selectedCompany.value?._id
  }
  showAddUserForm.value = true
}

async function handleAddNewUser() {
    isAddingUser.value = true;
    try {
        await apiService.auth.register({ ...newUser.value });
        alert('Usuario creado con éxito.');
        showAddUserForm.value = false;
        await openUsersModal(selectedCompany.value);
    } catch (error) {
        alert(`Error al crear usuario: ${error.response?.data?.error || error.message}`);
    } finally {
        isAddingUser.value = false;
    }
}

function openPricingModal(company) {
  selectedCompany.value = company;
  pricingForm.value = {
    plan_type: company.plan_type || 'basic',
    price_per_order: company.price_per_order || 0,
    billing_cycle: company.billing_cycle || 'monthly',
    pricing_notes: company.pricing_notes || ''
  };
  showPricingModal.value = true;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function calculateMonthlyRevenue(company) {
    const baseRevenue = (company.price_per_order || 0) * (company.orders_this_month || 0);
    return baseRevenue + calculateIVA(baseRevenue);
}

function calculateIVA(basePrice) {
  return Math.round(basePrice * IVA_RATE);
}

function getPlanName(planType) {
  return planPricing[planType]?.name || 'Básico';
}

function getBaseRevenue(company) {
    return (company.price_per_order || 0) * (company.orders_this_month || 0);
}

function getIVARevenue(company) {
    return calculateIVA(getBaseRevenue(company));
}

function getStatusClass(company) {
  if (!company.is_active) return 'inactive';
  if (company.plan_type === 'trial') return 'trial';
  return 'active';
}

function getStatusText(company) {
  if (!company.is_active) return 'Inactiva';
  if (company.plan_type === 'trial') return 'En Prueba';
  return 'Activa';
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  });
}

function getTotalPriceWithIVA(basePrice) {
  return basePrice + calculateIVA(basePrice);
}

// (Otras funciones existentes)

</script>

<style scoped>
/* (Estilos existentes) */
.company-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}
.form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}
.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.form-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.form-group { 
  margin-bottom: 0; 
}
.form-group label { 
  display: block; 
  margin-bottom: 8px; 
  font-weight: 500; 
  color: #374151;
}
.form-group input { 
  width: 100%; 
  padding: 10px 12px; 
  border: 1px solid #d1d5db; 
  border-radius: 6px; 
  box-sizing: border-box; 
  font-size: 14px;
}
.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.modal-actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 12px; 
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}
.btn-cancel { 
  background-color: #e5e7eb; 
  color: #374151;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-save { 
  background-color: #4f46e5; 
  color: white; 
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-save:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}
</style>