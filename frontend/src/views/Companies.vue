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

    <!-- Filtros y Búsqueda -->
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
      <!-- Estadísticas Rápidas -->
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

      <!-- Tabla de Empresas -->
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

    <!-- Modal de Configuración de Precios -->
    <Modal v-model="showPricingModal" :title="`Configurar Precios - ${selectedCompany?.name}`" width="600px">
      <div v-if="selectedCompany" class="pricing-config">
        <div class="pricing-header">
          <h4>Configuración de Facturación</h4>
          <p>Configura el precio por pedido y las condiciones de facturación</p>
        </div>

        <div class="pricing-form">
          <div class="form-row">
            <div class="form-group">
              <label for="plan-type">Tipo de Plan</label>
              <select id="plan-type" v-model="pricingForm.plan_type" @change="updatePriceSuggestion">
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div class="form-group">
              <label for="billing-cycle">Ciclo de Facturación</label>
              <select id="billing-cycle" v-model="pricingForm.billing_cycle">
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="price-per-order">Precio por Pedido (Sin IVA)</label>
            <div class="price-input-group">
              <span class="currency-symbol">$</span>
              <input 
                id="price-per-order"
                type="number" 
                v-model.number="pricingForm.price_per_order"
                @input="calculatePricingBreakdown"
                placeholder="0"
                min="0"
                step="1"
              />
              <span class="price-suggestion" v-if="suggestedPrice">
                Sugerido: ${{ formatCurrency(suggestedPrice) }}
              </span>
            </div>
          </div>

          <!-- Desglose de Precios -->
          <div class="pricing-breakdown">
            <h5>Desglose de Facturación</h5>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <span class="breakdown-label">Precio Base:</span>
                <span class="breakdown-value">${{ formatCurrency(pricingForm.price_per_order || 0) }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">IVA (19%):</span>
                <span class="breakdown-value">${{ formatCurrency(calculateIVA(pricingForm.price_per_order || 0)) }}</span>
              </div>
              <div class="breakdown-item total">
                <span class="breakdown-label">Total por Pedido:</span>
                <span class="breakdown-value">${{ formatCurrency(getTotalPriceWithIVA(pricingForm.price_per_order || 0)) }}</span>
              </div>
            </div>
          </div>

          <!-- Proyección de Ingresos -->
          <div class="revenue-projection" v-if="selectedCompany.orders_this_month">
            <h5>Proyección de Ingresos</h5>
            <div class="projection-grid">
              <div class="projection-item">
                <span class="projection-label">Pedidos este mes:</span>
                <span class="projection-value">{{ selectedCompany.orders_this_month }}</span>
              </div>
              <div class="projection-item">
                <span class="projection-label">Revenue estimado (base):</span>
                <span class="projection-value">${{ formatCurrency((pricingForm.price_per_order || 0) * selectedCompany.orders_this_month) }}</span>
              </div>
              <div class="projection-item">
                <span class="projection-label">IVA a facturar:</span>
                <span class="projection-value">${{ formatCurrency(calculateIVA((pricingForm.price_per_order || 0) * selectedCompany.orders_this_month)) }}</span>
              </div>
              <div class="projection-item total">
                <span class="projection-label">Total a facturar:</span>
                <span class="projection-value">${{ formatCurrency(getTotalPriceWithIVA((pricingForm.price_per_order || 0) * selectedCompany.orders_this_month)) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="pricing-notes">Notas de Facturación</label>
            <textarea 
              id="pricing-notes"
              v-model="pricingForm.pricing_notes"
              placeholder="Condiciones especiales, descuentos, etc."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showPricingModal = false" class="btn-cancel">Cancelar</button>
          <button @click="savePricingConfig" :disabled="savingPricing" class="btn-save">
            {{ savingPricing ? 'Guardando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Usuarios (mantenemos el existente pero mejorado) -->
    <Modal v-model="showUsersModal" :title="`Usuarios de ${selectedCompany?.name}`" width="800px">
      <div v-if="loadingUsers" class="loading-state">Cargando usuarios...</div>
      <div v-else>
        <div class="users-header">
          <div class="users-summary">
            <span class="users-count">{{ users.length }} usuario{{ users.length !== 1 ? 's' : '' }}</span>
            <span class="users-limit">Límite del plan: {{ getPlanUserLimit(selectedCompany?.plan_type) }}</span>
          </div>
          <button @click="openAddUserModal" class="btn-add-user" :disabled="users.length >= getPlanUserLimit(selectedCompany?.plan_type)">
            + Añadir Usuario
          </button>
        </div>
        
        <div class="users-table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="users.length === 0">
                  <td colspan="6" class="empty-state-small">No hay usuarios en esta empresa.</td>
              </tr>
              <tr v-else v-for="user in users" :key="user._id">
                <td>{{ user.full_name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="user.role">
                    {{ getRoleName(user.role) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                    {{ user.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>{{ formatDate(user.last_login) }}</td>
                <td>
                  <button @click="toggleUserStatus(user)" class="btn-toggle-status" :disabled="user.role === 'admin'">
                    {{ user.is_active ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
    
    <!-- Modal de Añadir Usuario (mejorado) -->
    <Modal v-model="showAddUserForm" :title="`Añadir Usuario a ${selectedCompany?.name}`" width="500px">
        <form @submit.prevent="handleAddNewUser">
            <div class="form-group">
                <label for="new-user-name">Nombre Completo</label>
                <input id="new-user-name" v-model="newUser.full_name" type="text" required>
            </div>
            <div class="form-group">
                <label for="new-user-email">Email</label>
                <input id="new-user-email" v-model="newUser.email" type="email" required>
            </div>
            <div class="form-group">
                <label for="new-user-password">Contraseña Provisional</label>
                <input id="new-user-password" v-model="newUser.password" type="password" required minlength="6">
                <small class="form-hint">El usuario podrá cambiarla en su primer acceso</small>
            </div>
            <div class="form-group">
                <label for="new-user-role">Rol</label>
                <select id="new-user-role" v-model="newUser.role">
                    <option value="company_employee">Empleado</option>
                    <option value="company_owner">Dueño/Administrador</option>
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" @click="showAddUserForm = false" class="btn-cancel">Cancelar</button>
                <button type="submit" :disabled="isAddingUser" class="btn-save">
                    {{ isAddingUser ? 'Añadiendo...' : 'Añadir Usuario' }}
                </button>
            </div>
        </form>
    </Modal>

    <!-- Modal de Estadísticas de Empresa -->
    <Modal v-model="showStatsModal" :title="`Estadísticas - ${selectedCompany?.name}`" width="900px">
      <div v-if="selectedCompany" class="company-stats-modal">
        <div class="stats-grid">
          <div class="stat-card-modal">
            <h4>Pedidos</h4>
            <div class="stat-value">{{ selectedCompany.orders_count || 0 }}</div>
            <div class="stat-change">+{{ selectedCompany.orders_this_month || 0 }} este mes</div>
          </div>
          <div class="stat-card-modal">
            <h4>Revenue Generado</h4>
            <div class="stat-value">${{ formatCurrency(calculateMonthlyRevenue(selectedCompany)) }}</div>
            <div class="stat-change">Solo este mes</div>
          </div>
          <div class="stat-card-modal">
            <h4>Promedio por Pedido</h4>
            <div class="stat-value">${{ formatCurrency(selectedCompany.price_per_order || 0) }}</div>
            <div class="stat-change">+ IVA incluido</div>
          </div>
          <div class="stat-card-modal">
            <h4>Usuarios Activos</h4>
            <div class="stat-value">{{ selectedCompany.active_users || selectedCompany.users_count || 0 }}</div>
            <div class="stat-change">De {{ selectedCompany.users_count || 0 }} totales</div>
          </div>
        </div>
        
        <div class="stats-details">
          <h4>Detalles de Facturación</h4>
          <div class="billing-details">
            <div class="billing-row">
              <span>Plan Actual:</span>
              <span class="plan-badge" :class="selectedCompany.plan_type">{{ getPlanName(selectedCompany.plan_type) }}</span>
            </div>
            <div class="billing-row">
              <span>Precio por Pedido (base):</span>
              <span>${{ formatCurrency(selectedCompany.price_per_order || 0) }}</span>
            </div>
            <div class="billing-row">
              <span>IVA por Pedido:</span>
              <span>${{ formatCurrency(calculateIVA(selectedCompany.price_per_order || 0)) }}</span>
            </div>
            <div class="billing-row total">
              <span>Total por Pedido:</span>
              <span>${{ formatCurrency(getTotalPriceWithIVA(selectedCompany.price_per_order || 0)) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
    <Modal v-model="showAddCompanyModal" title="Añadir Nueva Empresa" width="500px">
  <form @submit.prevent="handleAddCompany">
    <div class="form-group">
      <label for="company-name">Nombre</label>
      <input id="company-name" v-model="newCompany.name" required placeholder="Nombre de la empresa" />
    </div>
    <div class="form-group">
      <label for="company-email">Email de contacto</label>
      <input id="company-email" v-model="newCompany.contact_email" type="email" placeholder="email@empresa.cl" />
    </div>
    <div class="form-group">
      <label for="company-plan">Plan</label>
      <select id="company-plan" v-model="newCompany.plan_type">
        <option value="basic">Básico</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
        <option value="custom">Personalizado</option>
      </select>
    </div>
    <div class="form-group">
      <label for="company-price">Precio por pedido (sin IVA)</label>
      <input id="company-price" v-model.number="newCompany.price_per_order" type="number" min="0" placeholder="Ej: 500" />
    </div>
    <div class="form-divider">Usuario Administrador</div>

<div class="form-group">
  <label for="owner-name">Nombre del Dueño</label>
  <input id="owner-name" v-model="newCompany.owner.full_name" required />
</div>
<div class="form-group">
  <label for="owner-email">Email del Dueño</label>
  <input id="owner-email" v-model="newCompany.owner.email" type="email" required />
</div>
<div class="form-group">
  <label for="owner-password">Contraseña Provisional</label>
  <input id="owner-password" v-model="newCompany.owner.password" type="password" minlength="6" required />
  <small class="form-hint">El dueño podrá cambiarla en su primer acceso</small>
</div>
    <div class="modal-actions">
      <button type="button" class="btn-cancel" @click="showAddCompanyModal = false">Cancelar</button>
      <button type="submit" class="btn-save">Crear Empresa</button>
    </div>
  </form>
</Modal>

  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import Modal from '../components/Modal.vue'

// Estado existente (mantenemos la lógica original)
const companies = ref([])
const users = ref([])
const loading = ref(true)
const loadingUsers = ref(false)
const showUsersModal = ref(false)
const showAddUserForm = ref(false)
const isAddingUser = ref(false)
const selectedCompany = ref(null)

// Nuevo estado para facturación y precios
const showPricingModal = ref(false)
const showStatsModal = ref(false)
const savingPricing = ref(false)
const filters = ref({ status: '', plan: '', search: '' })

// Configuración de precios
const pricingForm = ref({
  plan_type: 'basic',
  price_per_order: 0,
  billing_cycle: 'monthly',
  pricing_notes: ''
})

// Planes y precios sugeridos
const planPricing = {
  basic: { price: 2800, users: 3, name: 'Básico' },
  pro: { price: 2300, users: 10, name: 'Pro' },
  enterprise: { price: 2000, users: 50, name: 'Enterprise' },
  custom: { price: 0, users: 999, name: 'Personalizado' }
}

const IVA_RATE = 0.19 // 19% IVA en Chile

const newUser = ref({ full_name: '', email: '', password: '', role: 'company_employee', company_id: null })

// Computed properties para estadísticas
const activeCompanies = computed(() => 
  companies.value.filter(c => c.is_active).length
)

const totalMonthlyRevenue = computed(() => 
  companies.value.reduce((total, company) => total + calculateMonthlyRevenue(company), 0)
)

const totalOrders = computed(() => 
  companies.value.reduce((total, company) => total + (company.orders_count || 0), 0)
)

const suggestedPrice = computed(() => {
  const plan = planPricing[pricingForm.value.plan_type]
  return plan ? plan.price : 0
})

// Funciones existentes (mantenemos la lógica original)
onMounted(fetchCompanies)

async function fetchCompanies() {
  loading.value = true
  try {
    const { data } = await apiService.companies.getAll()
    companies.value = data.map(company => ({
      ...company,
      // Asegurar que tenemos datos de precio y plan
      price_per_order: company.price_per_order || 0,
      plan_type: company.plan_type || 'basic',
      orders_this_month: company.orders_this_month || 0
    }))
  } catch (error) {
    console.error("Error fetching companies:", error)
    alert('No se pudieron cargar las empresas.')
  } finally {
    loading.value = false
  }
}

async function openUsersModal(company) {
  selectedCompany.value = company
  showUsersModal.value = true
  loadingUsers.value = true
  try {
    const { data } = await apiService.users.getByCompany(company._id)
    users.value = data
  } catch (error) {
    console.error("Error cargando usuarios:", error)
    alert('No se pudieron cargar los usuarios de la empresa.')
  } finally {
    loadingUsers.value = false
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
    isAddingUser.value = true
    try {
        await apiService.users.create(newUser.value)
        alert('Usuario creado con éxito.')
        showAddUserForm.value = false
        await openUsersModal(selectedCompany.value)
        await fetchCompanies()
    } catch (error) {
        alert(`Error al crear usuario: ${error.message}`)
    } finally {
        isAddingUser.value = false
    }
}

async function toggleUserStatus(user) {
  const newStatus = !user.is_active
  const confirmation = confirm(`¿Estás seguro de que quieres ${newStatus ? 'activar' : 'desactivar'} a ${user.full_name}?`)
  if (confirmation) {
    try {
      await apiService.users.update(user._id, { is_active: newStatus })
      user.is_active = newStatus
      alert('Usuario actualizado con éxito.')
    } catch (error) {
      alert(`Error al actualizar usuario: ${error.message}`)
    }
  }
}

// Nuevas funciones para facturación y precios
function openPricingModal(company) {
  selectedCompany.value = company
  pricingForm.value = {
    plan_type: company.plan_type || 'basic',
    price_per_order: company.price_per_order || 0,
    billing_cycle: company.billing_cycle || 'monthly',
    pricing_notes: company.pricing_notes || ''
  }
  showPricingModal.value = true
}

function openStatsModal(company) {
  selectedCompany.value = company
  showStatsModal.value = true
}

async function savePricingConfig() {
  if (!selectedCompany.value) return
  
  savingPricing.value = true
  try {
    // Actualizar precio por pedido
    await apiService.companies.updatePrice(selectedCompany.value._id, pricingForm.value.price_per_order)
    
    // Si tienes endpoint para actualizar plan completo
    const updateData = {
      plan_type: pricingForm.value.plan_type,
      billing_cycle: pricingForm.value.billing_cycle,
      pricing_notes: pricingForm.value.pricing_notes
    }
    
    await apiService.companies.update(selectedCompany.value._id, updateData)
    
    // Actualizar en la lista local
    const companyIndex = companies.value.findIndex(c => c._id === selectedCompany.value._id)
    if (companyIndex !== -1) {
      companies.value[companyIndex] = {
        ...companies.value[companyIndex],
        price_per_order: pricingForm.value.price_per_order,
        ...updateData
      }
    }
    
    showPricingModal.value = false
    alert('Configuración de precios guardada con éxito.')
    
  } catch (error) {
    alert(`Error al guardar configuración: ${error.message}`)
  } finally {
    savingPricing.value = false
  }
}
async function exportCompanyOrders(company) {
  const confirmation = confirm(`¿Deseas exportar todos los pedidos para OptiRoute de la empresa "${company.name}"?`);
  if (!confirmation) return;

  isExporting.value = true;
  try {
    const params = { company_id: company._id };
    const response = await apiService.orders.export(params);
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedidos_optiroute_${company.slug}_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting company orders:', error);
    alert('No se encontraron pedidos para exportar para esta empresa.');
  } finally {
    isExporting.value = false;
  }
}

async function toggleCompanyStatus(company) {
  const newStatus = !company.is_active
  const confirmation = confirm(`¿Estás seguro de que quieres ${newStatus ? 'activar' : 'desactivar'} la empresa ${company.name}?`)
  
  if (confirmation) {
    try {
      await apiService.companies.update(company._id, { is_active: newStatus })
      company.is_active = newStatus
      alert(`Empresa ${newStatus ? 'activada' : 'desactivada'} con éxito.`)
    } catch (error) {
      alert(`Error al actualizar empresa: ${error.message}`)
    }
  }
}

function updatePriceSuggestion() {
  const plan = planPricing[pricingForm.value.plan_type]
  if (plan && plan.price > 0) {
    pricingForm.value.price_per_order = plan.price
  }
  calculatePricingBreakdown()
}

function calculatePricingBreakdown() {
  // Esta función se llama cuando cambia el precio para recalcular todo
  // Los computed properties se actualizarán automáticamente
}

async function exportCompaniesData() {
  try {
    // Crear CSV con datos de facturación
    const csvData = companies.value.map(company => ({
      'Nombre Empresa': company.name,
      'Plan': getPlanName(company.plan_type),
      'Precio Base': company.price_per_order || 0,
      'IVA': calculateIVA(company.price_per_order || 0),
      'Total por Pedido': getTotalPriceWithIVA(company.price_per_order || 0),
      'Pedidos este Mes': company.orders_this_month || 0,
      'Revenue Mensual': calculateMonthlyRevenue(company),
      'Estado': company.is_active ? 'Activa' : 'Inactiva',
      'Usuarios': company.users_count || 0
    }))
    
    const csv = convertToCSV(csvData)
    downloadCSV(csv, `empresas_facturacion_${new Date().toISOString().split('T')[0]}.csv`)
    
  } catch (error) {
    alert('Error al exportar datos')
  }
}

// Funciones de cálculo de precios e IVA
function calculateIVA(basePrice) {
  return Math.round(basePrice * IVA_RATE)
}

function getTotalPriceWithIVA(basePrice) {
  return basePrice + calculateIVA(basePrice)
}

function calculateMonthlyRevenue(company) {
  const baseRevenue = (company.price_per_order || 0) * (company.orders_this_month || 0)
  return baseRevenue + calculateIVA(baseRevenue)
}

function getBaseRevenue(company) {
  return (company.price_per_order || 0) * (company.orders_this_month || 0)
}

function getIVARevenue(company) {
  return calculateIVA(getBaseRevenue(company))
}

// Funciones de utilidad
function getPlanName(planType) {
  return planPricing[planType]?.name || 'Básico'
}

function getPlanUserLimit(planType) {
  return planPricing[planType]?.users || 3
}

function getRoleName(role) {
  const roles = {
    company_owner: 'Dueño',
    company_employee: 'Empleado',
    admin: 'Administrador'
  }
  return roles[role] || role
}

function getStatusClass(company) {
  if (!company.is_active) return 'inactive'
  if (company.plan_type === 'trial') return 'trial'
  return 'active'
}

function getStatusText(company) {
  if (!company.is_active) return 'Inactiva'
  if (company.plan_type === 'trial') return 'En Prueba'
  return 'Activa'
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  })
}

// Funciones de búsqueda y filtros
let searchTimeout
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchCompanies()
  }, 500)
}

// Funciones de exportación
function convertToCSV(data) {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escapar comillas y agregar comillas si contiene comas
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(',')
    )
  ].join('\n')
  
  return csvContent
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const showAddCompanyModal = ref(false)

const newCompany = ref({
  name: '',
  contact_email: '',
  plan_type: 'basic',
  price_per_order: 0,
  owner: {
    full_name: '',
    email: '',
    password: ''
  }
})

function openAddCompanyModal() {
  // Resetear el formulario incluyendo el dueño
  newCompany.value = {
    name: '',
    contact_email: '',
    plan_type: 'basic',
    price_per_order: 0,
    owner: {
      full_name: '',
      email: '',
      password: ''
    }
  }
  showAddCompanyModal.value = true
}

async function handleAddCompany() {
  try {
    // Paso 1: Crear empresa
    const { data: createdCompany } = await apiService.companies.create({
      name: newCompany.value.name,
      contact_email: newCompany.value.contact_email,
      plan_type: newCompany.value.plan_type,
      price_per_order: newCompany.value.price_per_order
    })

    // Paso 2: Crear usuario dueño
    await apiService.users.create({
      full_name: newCompany.value.owner.full_name,
      email: newCompany.value.owner.email,
      password: newCompany.value.owner.password,
      role: 'company_owner',
      company_id: createdCompany._id
    })

    alert('Empresa y usuario creados con éxito')
    showAddCompanyModal.value = false
    await fetchCompanies()
  } catch (error) {
    alert('Error al crear empresa o usuario: ' + (error.response?.data?.message || error.message))
  }
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

/* Filtros */
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

/* Estadísticas Overview */
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

/* Tabla Principal */
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

/* Estilos específicos por columna */
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

/* Acciones */
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

/* Modal de Precios */
.pricing-config {
  max-height: 80vh;
  overflow-y: auto;
}

.pricing-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.pricing-header h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 18px;
}

.pricing-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.pricing-form {
  space-y: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group { 
  margin-bottom: 16px; 
}

.form-group label { 
  display: block; 
  margin-bottom: 8px; 
  font-weight: 500; 
  color: #374151;
}

.form-group input, 
.form-group select, 
.form-group textarea { 
  width: 100%; 
  padding: 10px 12px; 
  border: 1px solid #d1d5db; 
  border-radius: 6px; 
  box-sizing: border-box; 
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.price-input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-weight: 500;
  z-index: 1;
}

.price-input-group input {
  padding-left: 28px;
}

.price-suggestion {
  margin-left: 12px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 500;
}

/* Desglose de Precios */
.pricing-breakdown {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.pricing-breakdown h5 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 14px;
}

.breakdown-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.breakdown-item.total {
  border-top: 1px solid #d1d5db;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  color: #1f2937;
}

.breakdown-label {
  color: #6b7280;
}

.breakdown-value {
  color: #1f2937;
  font-weight: 500;
}

/* Proyección de Ingresos */
.revenue-projection {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.revenue-projection h5 {
  margin: 0 0 12px 0;
  color: #1e40af;
  font-size: 14px;
}

.projection-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.projection-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.projection-item.total {
  border-top: 1px solid #bfdbfe;
  margin-top: 8px;
  padding-top: 8px;
  font-weight: 600;
  color: #1e40af;
}

.projection-label {
  color: #3b82f6;
}

.projection-value {
  color: #1e40af;
  font-weight: 500;
}

/* Modal de Usuarios */
.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.users-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.users-count {
  font-weight: 600;
  color: #1f2937;
}

.users-limit {
  font-size: 12px;
  color: #6b7280;
}

.btn-add-user { 
  background-color: #10b981; 
  color: white; 
  padding: 8px 16px; 
  border-radius: 6px; 
  border: none; 
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-add-user:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.users-table-wrapper { 
  overflow-x: auto; 
}

.users-table { 
  width: 100%; 
  border-collapse: collapse; 
  text-align: left; 
}

.users-table th, 
.users-table td { 
  padding: 12px 16px; 
  border-bottom: 1px solid #e5e7eb; 
  font-size: 14px;
}

.users-table th { 
  background-color: #f9fafb; 
  font-weight: 600; 
  font-size: 12px; 
  color: #374151;
}

.role-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: capitalize;
}

.role-badge.company_owner {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.company_employee {
  background: #e0e7ff;
  color: #3730a3;
}

.btn-toggle-status { 
  font-size: 12px; 
  padding: 4px 8px; 
  border-radius: 4px; 
  border: 1px solid #d1d5db; 
  background-color: white; 
  cursor: pointer; 
  transition: all 0.2s ease;
}

.btn-toggle-status:hover {
  background-color: #f3f4f6;
}

.btn-toggle-status:disabled { 
  cursor: not-allowed; 
  opacity: 0.5; 
}

/* Modal de Estadísticas */
.company-stats-modal {
  max-height: 70vh;
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card-modal {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-card-modal h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6b7280;
}

.stat-card-modal .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-card-modal .stat-change {
  font-size: 12px;
  color: #10b981;
}

.stats-details {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.stats-details h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.billing-details {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.billing-row:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.billing-row.total {
  font-weight: 600;
  color: #1f2937;
  border-top: 2px solid #d1d5db;
  margin-top: 8px;
  padding-top: 12px;
}

/* Acciones del Modal */
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

/* Estados de carga y vacío */
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

/* Responsive */
@media (max-width: 1200px) {
  .search-input {
    grid-column: span 1;
  }
  
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .breakdown-grid,
  .projection-grid {
    font-size: 12px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .company-info,
  .pricing-info,
  .revenue-info {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .modal-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-save {
    width: 100%;
  }
}
</style>