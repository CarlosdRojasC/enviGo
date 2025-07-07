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
      <div v-if="selectedCompany" class="pricing-config">
        </div>
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
const isExporting = ref(false);
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

function openAddCompanyModal() {
  newCompany.value = {
    name: '', email: '', phone: '', address: '',
    price_per_order: 500, owner_name: '', owner_email: '', owner_password: ''
  };
  showAddCompanyModal.value = true;
}

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
        const { data } = await apiService.users.getByCompany(company._id);
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
  };
  showAddUserForm.value = true;
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

let searchTimeout;
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchCompanies();
  }, 500);
}
</script>

<style scoped>
.page-container { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
  max-width: 1400px;
  margin: 0 auto;
}
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px; 
}
.page-title { 
  font-size: 28px; 
  font-weight: 700; 
  color: #1f2937; 
}
.header-actions {
  display: flex;
  gap: 12px;
}
.btn-primary, .btn-secondary { 
  padding: 10px 20px; 
  border-radius: 6px; 
  border: none; 
  cursor: pointer; 
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-primary { 
  background-color: #4f46e5; 
  color: white; 
}
.btn-primary:hover { 
  background-color: #4338ca; 
}
.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: center;
}
.filters-grid select,
.filters-grid input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}
.search-input {
  grid-column: span 2;
}
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  font-size: 32px;
  opacity: 0.8;
}
.stat-info {
  flex: 1;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}
.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.content-section { 
  background: white; 
  border-radius: 12px; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
  border: 1px solid #e5e7eb; 
  overflow: hidden; 
}
.table-wrapper { 
  overflow-x: auto; 
}
.data-table { 
  width: 100%; 
  border-collapse: collapse; 
}
.data-table th, .data-table td { 
  padding: 12px 16px; 
  border-bottom: 1px solid #e5e7eb; 
  text-align: left; 
  font-size: 14px; 
}
.data-table th { 
  background: #f9fafb; 
  font-weight: 600; 
  font-size: 12px; 
  color: #374151; 
}
.data-table tr:last-child td { 
  border-bottom: none; 
}
.company-info {
  min-width: 200px;
}
.company-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}
.company-email {
  font-size: 12px;
  color: #6b7280;
}
.pricing-info {
  min-width: 160px;
}
.current-plan {
  margin-bottom: 4px;
}
.plan-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
}
.plan-badge.basic {
  background: #f3f4f6;
  color: #374151;
}
.plan-badge.pro {
  background: #dbeafe;
  color: #1e40af;
}
.plan-badge.enterprise {
  background: #d1fae5;
  color: #065f46;
}
.plan-badge.custom {
  background: #fef3c7;
  color: #92400e;
}
.price-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 2px;
}
.price-amount {
  font-weight: 600;
  color: #1f2937;
}
.price-unit {
  font-size: 11px;
  color: #6b7280;
}
.price-breakdown {
  font-size: 10px;
  color: #6b7280;
}
.orders-count {
  text-align: center;
}
.orders-total {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}
.orders-month {
  font-size: 11px;
  color: #6b7280;
}
.revenue-info {
  min-width: 140px;
}
.revenue-amount {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}
.revenue-breakdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.revenue-base,
.revenue-iva {
  font-size: 10px;
  color: #6b7280;
}
.status-badge { 
  padding: 4px 10px; 
  border-radius: 12px; 
  font-size: 12px; 
  font-weight: 500; 
}
.status-badge.active { 
  background-color: #d1fae5; 
  color: #065f46; 
}
.status-badge.inactive { 
  background-color: #fee2e2; 
  color: #991b1b; 
}
.status-badge.trial {
  background-color: #fef3c7;
  color: #92400e;
}
.last-activity {
  font-size: 12px;
  color: #6b7280;
}
.actions-column {
  min-width: 120px;
}
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.btn-action {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-action.pricing {
  background: #fef3c7;
  color: #92400e;
}
.btn-action.users {
  background: #dbeafe;
  color: #1e40af;
}
.btn-action.stats {
  background: #d1fae5;
  color: #065f46;
}
.btn-action.toggle {
  background: #f3f4f6;
  color: #374151;
}
.btn-action:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
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
.btn-cancel, 
.btn-save { 
  padding: 10px 20px; 
  border-radius: 6px; 
  border: 1px solid transparent; 
  cursor: pointer; 
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-cancel { 
  background-color: #e5e7eb; 
  color: #374151;
}
.btn-cancel:hover {
  background-color: #d1d5db;
}
.btn-save { 
  background-color: #4f46e5; 
  color: white; 
}
.btn-save:hover {
  background-color: #4338ca;
}
.btn-save:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}
.loading, 
.empty-row, 
.loading-state, 
.empty-state-small { 
  text-align: center; 
  padding: 40px; 
  color: #6b7280; 
  font-style: italic; 
}
.empty-state-small {
  padding: 20px;
}
</style>