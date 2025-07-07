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
                  <button @click="openEditCompanyModal(company)" class="btn-action edit" title="Editar Empresa">
                    ✏️
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

    <!-- Modal de Añadir/Editar Empresa -->
    <Modal v-model="showAddCompanyModal" :title="editingCompany ? `Editar ${editingCompany.name}` : 'Añadir Nueva Empresa'" width="700px">
      <form @submit.prevent="handleSubmitCompany" class="company-form">
        <!-- Información Básica -->
        <div class="form-section">
          <h4>Información Básica</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="company-name">Nombre de la Empresa *</label>
              <input 
                id="company-name"
                v-model="companyForm.name" 
                type="text" 
                required 
                placeholder="Ej: Pizza Express"
                :class="{ error: errors.name }"
                @input="generateSlug"
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
            
            <div class="form-group">
              <label for="company-slug">Identificador (URL) *</label>
              <input 
                id="company-slug"
                v-model="companyForm.slug" 
                type="text" 
                required 
                placeholder="pizza-express"
                :class="{ error: errors.slug }"
              />
              <small class="form-hint">URL: tudominio.com/<strong>{{ companyForm.slug || 'identificador' }}</strong></small>
              <span v-if="errors.slug" class="error-message">{{ errors.slug }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="contact-email">Email de Contacto</label>
              <input 
                id="contact-email"
                v-model="companyForm.contact_email" 
                type="email" 
                placeholder="contacto@empresa.com"
                :class="{ error: errors.contact_email }"
              />
              <span v-if="errors.contact_email" class="error-message">{{ errors.contact_email }}</span>
            </div>
            
            <div class="form-group">
              <label for="phone">Teléfono</label>
              <input 
                id="phone"
                v-model="companyForm.phone" 
                type="tel" 
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="address">Dirección</label>
            <textarea 
              id="address"
              v-model="companyForm.address" 
              rows="2"
              placeholder="Dirección completa de la empresa"
            ></textarea>
          </div>
        </div>

        <!-- Configuración de Plan y Precios -->
        <div class="form-section">
          <h4>Configuración de Plan</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="plan-type">Tipo de Plan *</label>
              <select id="plan-type" v-model="companyForm.plan_type" @change="updateDefaultPrice" required>
                <option value="basic">Básico - {{ formatCurrency(planPricing.basic.price) }}/pedido</option>
                <option value="pro">Pro - {{ formatCurrency(planPricing.pro.price) }}/pedido</option>
                <option value="enterprise">Enterprise - {{ formatCurrency(planPricing.enterprise.price) }}/pedido</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="billing-cycle">Ciclo de Facturación</label>
              <select id="billing-cycle" v-model="companyForm.billing_cycle">
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral (-5%)</option>
                <option value="annual">Anual (-10%)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="price-per-order">Precio por Pedido (Sin IVA) *</label>
            <div class="price-input-group">
              <span class="currency-symbol">$</span>
              <input 
                id="price-per-order"
                v-model.number="companyForm.price_per_order" 
                type="number" 
                required 
                min="0"
                step="1"
                placeholder="0"
                :class="{ error: errors.price_per_order }"
              />
              <span class="price-suggestion">
                + IVA = ${{ formatCurrency(getTotalPriceWithIVA(companyForm.price_per_order || 0)) }}
              </span>
            </div>
            <span v-if="errors.price_per_order" class="error-message">{{ errors.price_per_order }}</span>
          </div>
        </div>

        <!-- Administrador Inicial (solo en modo crear) -->
        <div v-if="!editingCompany" class="form-section">
          <h4>Administrador Inicial</h4>
          <p class="section-description">Se creará un usuario administrador para la empresa</p>
          
          <div class="form-row">
            <div class="form-group">
              <label for="admin-name">Nombre Completo *</label>
              <input 
                id="admin-name"
                v-model="companyForm.admin_name" 
                type="text" 
                required 
                placeholder="Juan Pérez"
                :class="{ error: errors.admin_name }"
              />
              <span v-if="errors.admin_name" class="error-message">{{ errors.admin_name }}</span>
            </div>
            
            <div class="form-group">
              <label for="admin-email">Email del Administrador *</label>
              <input 
                id="admin-email"
                v-model="companyForm.admin_email" 
                type="email" 
                required 
                placeholder="admin@empresa.com"
                :class="{ error: errors.admin_email }"
              />
              <span v-if="errors.admin_email" class="error-message">{{ errors.admin_email }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="admin-password">Contraseña Provisional *</label>
            <input 
              id="admin-password"
              v-model="companyForm.admin_password" 
              type="password" 
              required 
              minlength="6"
              placeholder="Mínimo 6 caracteres"
              :class="{ error: errors.admin_password }"
            />
            <small class="form-hint">El administrador podrá cambiarla en su primer acceso</small>
            <span v-if="errors.admin_password" class="error-message">{{ errors.admin_password }}</span>
          </div>
        </div>

        <!-- Configuración Adicional -->
        <div class="form-section">
          <h4>Configuración Adicional</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="companyForm.is_active" 
                  class="checkbox-input"
                />
                <span class="checkbox-label">Empresa Activa</span>
              </label>
              <small class="form-hint">La empresa podrá acceder al sistema inmediatamente</small>
            </div>
            
            <div v-if="!editingCompany" class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="companyForm.send_welcome_email" 
                  class="checkbox-input"
                />
                <span class="checkbox-label">Enviar Email de Bienvenida</span>
              </label>
              <small class="form-hint">Se enviará un email al administrador con las credenciales</small>
            </div>
          </div>

          <div class="form-group">
            <label for="notes">Notas Internas</label>
            <textarea 
              id="notes"
              v-model="companyForm.notes" 
              rows="3"
              placeholder="Notas internas sobre la empresa, acuerdos especiales, etc."
            ></textarea>
          </div>
        </div>

        <!-- Resumen de Configuración -->
        <div class="form-section summary-section">
          <h4>Resumen de Configuración</h4>
          <div class="config-summary">
            <div class="summary-row">
              <span>Plan:</span>
              <span class="plan-badge" :class="companyForm.plan_type">
                {{ getPlanName(companyForm.plan_type) }}
              </span>
            </div>
            <div class="summary-row">
              <span>Precio por pedido (base):</span>
              <span>${{ formatCurrency(companyForm.price_per_order || 0) }}</span>
            </div>
            <div class="summary-row">
              <span>IVA por pedido:</span>
              <span>${{ formatCurrency(calculateIVA(companyForm.price_per_order || 0)) }}</span>
            </div>
            <div class="summary-row total">
              <span>Total por pedido:</span>
              <span>${{ formatCurrency(getTotalPriceWithIVA(companyForm.price_per_order || 0)) }}</span>
            </div>
            <div class="summary-row">
              <span>Límite de usuarios:</span>
              <span>{{ getPlanUserLimit(companyForm.plan_type) }} usuarios</span>
            </div>
          </div>
        </div>

        <!-- Error General -->
        <div v-if="errors.general" class="general-error">
          <span class="error-message">{{ errors.general }}</span>
        </div>

        <!-- Acciones del Modal -->
        <div class="modal-actions">
          <button type="button" @click="closeAddCompanyModal" class="btn-cancel">
            Cancelar
          </button>
          <button type="submit" :disabled="isSubmittingCompany" class="btn-save">
            {{ isSubmittingCompany ? 'Guardando...' : (editingCompany ? 'Actualizar Empresa' : 'Crear Empresa') }}
          </button>
        </div>
      </form>
    </Modal>

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

    <!-- Modal de Usuarios -->
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
    
    <!-- Modal de Añadir Usuario -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import Modal from '../components/Modal.vue'

// Estado existente
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

// Estado para modal de empresa
const showAddCompanyModal = ref(false)
const editingCompany = ref(null)
const isSubmittingCompany = ref(false)
const isExporting = ref(false)
const errors = ref({})

// Configuración de precios
const pricingForm = ref({
  plan_type: 'basic',
  price_per_order: 0,
  billing_cycle: 'monthly',
  pricing_notes: ''
})

// Formulario de empresa
const companyForm = ref({
  name: '',
  slug: '',
  contact_email: '',
  phone: '',
  address: '',
  plan_type: 'basic',
  billing_cycle: 'monthly',
  price_per_order: 500,
  admin_name: '',
  admin_email: '',
  admin_password: '',
  is_active: true,
  send_welcome_email: true,
  notes: ''
})

// Planes y precios sugeridos
const planPricing = {
  basic: { price: 500, users: 3, name: 'Básico' },
  pro: { price: 350, users: 10, name: 'Pro' },
  enterprise: { price: 250, users: 50, name: 'Enterprise' },
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

// Funciones principales
onMounted(fetchCompanies)

async function fetchCompanies() {
  loading.value = true
  try {
    const { data } = await apiService.companies.getAll()
    companies.value = data.map(company => ({
      ...company,
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

// Funciones del modal de empresa
function openAddCompanyModal() {
  editingCompany.value = null
  resetCompanyForm()
  showAddCompanyModal.value = true
}

function closeAddCompanyModal() {
  showAddCompanyModal.value = false
  editingCompany.value = null
  resetCompanyForm()
  errors.value = {}
}

function resetCompanyForm() {
  companyForm.value = {
    name: '',
    slug: '',
    contact_email: '',
    phone: '',
    address: '',
    plan_type: 'basic',
    billing_cycle: 'monthly',
    price_per_order: 500,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    is_active: true,
    send_welcome_email: true,
    notes: ''
  }
}

function generateSlug() {
  if (!companyForm.value.name) return
  
  const slug = companyForm.value.name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
  
  companyForm.value.slug = slug
}

function updateDefaultPrice() {
  const plan = planPricing[companyForm.value.plan_type]
  if (plan && plan.price > 0) {
    companyForm.value.price_per_order = plan.price
  }
}

function validateCompanyForm() {
  errors.value = {}
  
  if (!companyForm.value.name || companyForm.value.name.trim().length < 2) {
    errors.value.name = 'El nombre debe tener al menos 2 caracteres'
  }
  
  if (!companyForm.value.slug || companyForm.value.slug.trim().length < 2) {
    errors.value.slug = 'El identificador es requerido'
  } else if (!/^[a-z0-9-]+$/.test(companyForm.value.slug)) {
    errors.value.slug = 'Solo se permiten letras minúsculas, números y guiones'
  }
  
  if (companyForm.value.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.value.contact_email)) {
    errors.value.contact_email = 'Formato de email inválido'
  }
  
  if (!companyForm.value.price_per_order || companyForm.value.price_per_order <= 0) {
    errors.value.price_per_order = 'El precio debe ser mayor a 0'
  }
  
  // Validar administrador solo en modo crear
  if (!editingCompany.value) {
    if (!companyForm.value.admin_name || companyForm.value.admin_name.trim().length < 2) {
      errors.value.admin_name = 'El nombre del administrador es requerido'
    }
    
    if (!companyForm.value.admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.value.admin_email)) {
      errors.value.admin_email = 'Email del administrador inválido'
    }
    
    if (!companyForm.value.admin_password || companyForm.value.admin_password.length < 6) {
      errors.value.admin_password = 'La contraseña debe tener al menos 6 caracteres'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

async function handleSubmitCompany() {
  if (!validateCompanyForm()) {
    return
  }

  isSubmittingCompany.value = true
  errors.value = {}

  try {
    const companyData = {
      name: companyForm.value.name.trim(),
      slug: companyForm.value.slug.trim(),
      contact_email: companyForm.value.contact_email?.trim() || null,
      phone: companyForm.value.phone?.trim() || null,
      address: companyForm.value.address?.trim() || null,
      plan_type: companyForm.value.plan_type,
      billing_cycle: companyForm.value.billing_cycle,
      price_per_order: companyForm.value.price_per_order,
      is_active: companyForm.value.is_active,
      notes: companyForm.value.notes?.trim() || null
    }

    // Solo agregar admin_user si estamos creando una nueva empresa
    if (!editingCompany.value) {
      companyData.admin_user = {
        full_name: companyForm.value.admin_name.trim(),
        email: companyForm.value.admin_email.trim(),
        password: companyForm.value.admin_password,
        role: 'company_owner'
      }
      companyData.send_welcome_email = companyForm.value.send_welcome_email
    }

    let result
    if (editingCompany.value) {
      result = await apiService.companies.update(editingCompany.value._id, companyData)
      
      const index = companies.value.findIndex(c => c._id === editingCompany.value._id)
      if (index !== -1) {
        companies.value[index] = { ...companies.value[index], ...result.data }
      }
      
      alert('Empresa actualizada exitosamente')
    } else {
      result = await apiService.companies.create(companyData)
      companies.value.unshift(result.data)
      alert('Empresa creada exitosamente')
    }

    closeAddCompanyModal()
    await fetchCompanies()

  } catch (error) {
    console.error('Error al guardar empresa:', error)
    
    if (error.response?.data?.message) {
      errors.value.general = error.response.data.message
    } else if (error.response?.data?.details) {
      const serverErrors = error.response.data.details
      if (typeof serverErrors === 'object') {
        Object.assign(errors.value, serverErrors)
      } else {
        errors.value.general = serverErrors
      }
    } else {
      errors.value.general = error.message || 'Error al crear la empresa'
    }
  } finally {
    isSubmittingCompany.value = false
  }
}

function openEditCompanyModal(company) {
  editingCompany.value = company
  companyForm.value = {
    name: company.name || '',
    slug: company.slug || '',
    contact_email: company.contact_email || '',
    phone: company.phone || '',
    address: company.address || '',
    plan_type: company.plan_type || 'basic',
    billing_cycle: company.billing_cycle || 'monthly',
    price_per_order: company.price_per_order || 0,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    is_active: company.is_active !== undefined ? company.is_active : true,
    send_welcome_email: false,
    notes: company.notes || ''
  }
  showAddCompanyModal.value = true
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
    await apiService.companies.updatePrice(selectedCompany.value._id, pricingForm.value.price_per_order)
    
    const updateData = {
      plan_type: pricingForm.value.plan_type,
      billing_cycle: pricingForm.value.billing_cycle,
      pricing_notes: pricingForm.value.pricing_notes
    }
    
    await apiService.companies.update(selectedCompany.value._id, updateData)
    
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
  // Los computed properties se actualizarán automáticamente
}

async function exportCompaniesData() {
  try {
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