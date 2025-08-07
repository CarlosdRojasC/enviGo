<template>
  <div class="companies-dashboard-container">
    <!-- Header con métricas en tiempo real -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="dashboard-title">Gestión de Empresas</h1>
        <div class="header-metrics">
          <div class="metric-badge">
            <span class="metric-value">{{ companies.length }}</span>
            <span class="metric-label">empresas activas</span>
          </div>
          <div class="metric-badge success">
            <span class="metric-value">{{ activeCompaniesPercentage }}%</span>
            <span class="metric-label">tasa de actividad</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="action-btn secondary" :disabled="loading">
          <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
          <span v-else>🔄</span>
          Actualizar
        </button>
        <button @click="exportData" class="action-btn secondary">
          📊 Exportar
        </button>
        <button @click="openAddCompanyModal" class="action-btn primary">
          ➕ Nueva Empresa
        </button>
      </div>
    </div>

    <!-- Panel de métricas avanzadas -->
    <div class="metrics-grid">
      <div class="metric-card revenue">
        <div class="metric-header">
          <div class="metric-icon">💰</div>
          <div class="metric-trend" :class="revenueTrend.direction">
            {{ revenueTrend.direction === 'up' ? '↗️' : '↘️' }}
            {{ revenueTrend.percentage }}%
          </div>
        </div>
        <div class="metric-content">
          <div class="metric-main-value">${{ formatLargeNumber(totalRevenue) }}</div>
          <div class="metric-subtitle">Revenue Total</div>
          <div class="metric-breakdown">
            <span>Base: ${{ formatLargeNumber(baseRevenue) }}</span>
            <span>IVA: ${{ formatLargeNumber(ivaRevenue) }}</span>
          </div>
        </div>
      </div>

      <div class="metric-card orders">
        <div class="metric-header">
          <div class="metric-icon">📦</div>
          <div class="metric-trend up">
            ↗️ 12%
          </div>
        </div>
        <div class="metric-content">
          <div class="metric-main-value">{{ formatNumber(totalOrders) }}</div>
          <div class="metric-subtitle">Pedidos del Mes</div>
          <div class="metric-breakdown">
            <span>Promedio: {{ avgOrdersPerCompany }} por empresa</span>
          </div>
        </div>
      </div>

      <div class="metric-card efficiency">
        <div class="metric-header">
          <div class="metric-icon">⚡</div>
          <div class="metric-trend up">
            ↗️ 8%
          </div>
        </div>
        <div class="metric-content">
          <div class="metric-main-value">${{ avgRevenuePerOrder }}</div>
          <div class="metric-subtitle">Revenue por Pedido</div>
          <div class="metric-breakdown">
            <span>Rango: ${{ minPrice }} - ${{ maxPrice }}</span>
          </div>
        </div>
      </div>

      <div class="metric-card growth">
        <div class="metric-header">
          <div class="metric-icon">📈</div>
          <div class="metric-trend up">
            ↗️ 15%
          </div>
        </div>
        <div class="metric-content">
          <div class="metric-main-value">{{ newCompaniesThisMonth }}</div>
          <div class="metric-subtitle">Nuevas Empresas</div>
          <div class="metric-breakdown">
            <span>Este mes</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros avanzados con búsqueda inteligente -->
    <div class="filters-panel">
      <div class="filters-row">
        <div class="search-container">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              v-model="searchQuery" 
              @input="handleSearch"
              type="text" 
              placeholder="Buscar empresas..." 
              class="search-input"
            />
            <button v-if="searchQuery" @click="clearSearch" class="clear-search">
              ✕
            </button>
          </div>
        </div>

        <div class="filter-group">
          <select v-model="filters.status" @change="applyFilters" class="filter-select">
            <option value="">Estado</option>
            <option value="active">🟢 Activas</option>
            <option value="inactive">🔴 Inactivas</option>
            <option value="trial">🟡 En Prueba</option>
          </select>

          <select v-model="filters.plan" @change="applyFilters" class="filter-select">
            <option value="">Plan</option>
            <option value="basic">📦 Básico</option>
            <option value="pro">⭐ Pro</option>
            <option value="enterprise">💎 Enterprise</option>
          </select>

          <select v-model="filters.revenue" @change="applyFilters" class="filter-select">
            <option value="">Revenue</option>
            <option value="high">💰 Alto (>$500k)</option>
            <option value="medium">💵 Medio ($100k-$500k)</option>
            <option value="low">💸 Bajo (<$100k)</option>
          </select>
        </div>

        <div class="view-controls">
          <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }" class="view-btn">
            ⊞ Grid
          </button>
          <button @click="viewMode = 'table'" :class="{ active: viewMode === 'table' }" class="view-btn">
            ☰ Tabla
          </button>
        </div>
      </div>

      <!-- Tags de filtros activos -->
      <div v-if="activeFilters.length > 0" class="active-filters">
        <span class="filters-label">Filtros activos:</span>
        <div class="filter-tags">
          <div v-for="filter in activeFilters" :key="filter.key" class="filter-tag">
            {{ filter.label }}
            <button @click="removeFilter(filter.key)" class="remove-filter">✕</button>
          </div>
          <button @click="clearAllFilters" class="clear-all-filters">
            Limpiar todo
          </button>
        </div>
      </div>
    </div>

    <!-- Vista Grid Mejorada -->
    <div v-if="viewMode === 'grid'" class="companies-grid">
      <div 
        v-for="company in filteredCompanies" 
        :key="company._id" 
        class="company-card"
        :class="getCompanyCardClass(company)"
        @click="selectCompany(company)"
      >
        <div class="card-header">
          <div class="company-avatar">
            {{ getCompanyInitials(company.name) }}
          </div>
          <div class="company-status">
            <span class="status-badge" :class="company.is_active ? 'active' : 'inactive'">
              {{ company.is_active ? '🟢' : '🔴' }}
            </span>
          </div>
        </div>

        <div class="card-content">
          <h3 class="company-name">{{ company.name }}</h3>
          <p class="company-email">{{ getCompanyEmail(company) }}</p>
          
          <div class="company-metrics">
            <div class="metric-item">
              <span class="metric-label">Plan</span>
              <span class="plan-badge" :class="company.plan_type || 'basic'">
                {{ getPlanName(company.plan_type) }}
              </span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Precio/Pedido</span>
              <span class="price-value">${{ formatNumber(company.price_per_order || 0) }}</span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Pedidos Mes</span>
              <span class="orders-count">{{ company.orders_this_month || 0 }}</span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Revenue Mes</span>
              <span class="revenue-value">${{ formatNumber(calculateMonthlyRevenue(company)) }}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button @click.stop="openPricingModal(company)" class="card-action-btn">
            💰 Pricing
          </button>
          <button @click.stop="openStatsModal(company)" class="card-action-btn">
            📊 Stats
          </button>
          <button @click.stop="toggleCompanyStatus(company)" class="card-action-btn">
            {{ company.is_active ? '⏸️' : '▶️' }}
          </button>
            <button @click.stop="openUsersModal(company)" class="card-action-btn">
    👥 Usuarios
  </button>
        </div>

        <!-- Gráfico mini de tendencia -->
        <div class="mini-chart">
          <canvas :ref="el => chartRefs[company._id] = el" width="200" height="60"></canvas>
        </div>
      </div>
    </div>

    <!-- Vista Tabla Mejorada -->
    <div v-else class="table-container">
      <div class="table-wrapper">
        <table class="enhanced-table">
          <thead>
            <tr>
              <th @click="sortBy('name')" class="sortable">
                Empresa
                <span class="sort-indicator" v-if="sortField === 'name'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('plan_type')" class="sortable">Plan</th>
              <th @click="sortBy('price_per_order')" class="sortable">
                Precio/Pedido
                <span class="sort-indicator" v-if="sortField === 'price_per_order'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('orders_this_month')" class="sortable">
                Pedidos
                <span class="sort-indicator" v-if="sortField === 'orders_this_month'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('revenue')" class="sortable">
                Revenue
                <span class="sort-indicator" v-if="sortField === 'revenue'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="company in filteredCompanies" 
              :key="company._id" 
              class="table-row"
              :class="{ selected: selectedCompany?._id === company._id }"
              @click="selectCompany(company)"
            >
              <td class="company-cell">
                <div class="company-info">
                  <div class="company-avatar-small">
                    {{ getCompanyInitials(company.name) }}
                  </div>
                  <div>
                    <div class="company-name-table">{{ company.name }}</div>
                    <div class="company-email-table">{{ getCompanyEmail(company) }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="plan-badge-table" :class="company.plan_type || 'basic'">
                  {{ getPlanName(company.plan_type) }}
                </span>
              </td>
              <td class="price-cell">
                <div class="price-main">${{ formatNumber(company.price_per_order || 0) }}</div>
                <div class="price-with-iva">${{ formatNumber(getTotalPriceWithIVA(company.price_per_order || 0)) }} c/IVA</div>
              </td>
              <td class="orders-cell">
                <div class="orders-main">{{ company.orders_this_month || 0 }}</div>
                <div class="orders-trend">
                  <span class="trend-indicator up">↗️ 15%</span>
                </div>
              </td>
              <td class="revenue-cell">
                <div class="revenue-main">${{ formatNumber(calculateMonthlyRevenue(company)) }}</div>
                <div class="revenue-breakdown">
                  Base: ${{ formatNumber(getBaseRevenue(company)) }}
                </div>
              </td>
              <td>
                <span class="status-badge-table" :class="getStatusClass(company)">
                  {{ getStatusText(company) }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button @click.stop="openPricingModal(company)" class="action-btn-small">
                    💰
                  </button>
                  <button @click.stop="openStatsModal(company)" class="action-btn-small">
                    📊
                  </button>
                  <button @click.stop="openUsersModal(company)" class="action-btn-small" title="Gestionar Usuarios">
      👥
    </button>
                  <button @click.stop="openUsersModal(company)" class="action-btn-small">
                    👥
                  </button>
                  <button @click.stop="toggleCompanyStatus(company)" class="action-btn-small">
                    {{ company.is_active ? '⏸️' : '▶️' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Panel lateral de detalles -->
    <div v-if="selectedCompany" class="details-panel">
      <div class="details-header">
        <h3>{{ selectedCompany.name }}</h3>
        <button @click="selectedCompany = null" class="close-details">✕</button>
      </div>
      
      <div class="details-content">
        <div class="detail-section">
          <h4>Información General</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">{{ getCompanyEmail(selectedCompany) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Teléfono:</span>
              <span class="detail-value">{{ selectedCompany.phone || 'No registrado' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Dirección:</span>
              <span class="detail-value">{{ selectedCompany.address || 'No registrada' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Métricas de Rendimiento</h4>
          <div class="performance-metrics">
            <div class="performance-item">
              <div class="performance-label">Pedidos Completados</div>
              <div class="performance-value">{{ selectedCompany.completed_orders || 0 }}</div>
              <div class="performance-bar">
                <div class="performance-fill" :style="{ width: '75%' }"></div>
              </div>
            </div>
            <div class="performance-item">
              <div class="performance-label">Tasa de Entrega</div>
              <div class="performance-value">94%</div>
              <div class="performance-bar">
                <div class="performance-fill success" :style="{ width: '94%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Actividad Reciente</h4>
          <div class="activity-feed">
            <div class="activity-item">
              <div class="activity-icon">📦</div>
              <div class="activity-content">
                <div class="activity-title">Nuevo pedido creado</div>
                <div class="activity-time">Hace 2 horas</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon">💰</div>
              <div class="activity-content">
                <div class="activity-title">Factura generada</div>
                <div class="activity-time">Hace 1 día</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALES -->
    
    <!-- Modal Nueva Empresa -->
    <div v-if="showAddCompanyModal" class="modal-overlay" @click="closeModal('add')">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>Nueva Empresa</h3>
          <button @click="closeModal('add')" class="modal-close">✕</button>
        </div>
        
        <div class="modal-content">
          <form @submit.prevent="createCompany">
            <div class="form-section">
              <h4>Información de la Empresa</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre de la Empresa *</label>
                  <input v-model="newCompanyForm.name" type="text" required placeholder="Ej: Mi Empresa SpA">
                </div>
                <div class="form-group">
                  <label>RUT</label>
                  <input v-model="newCompanyForm.rut" type="text" placeholder="12.345.678-9">
                </div>
                <div class="form-group">
                  <label>Email de Contacto *</label>
                  <input v-model="newCompanyForm.contact_email" type="email" required placeholder="contacto@miempresa.com">
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input v-model="newCompanyForm.phone" type="tel" placeholder="+56 9 1234 5678">
                </div>
                <div class="form-group full-width">
                  <label>Dirección</label>
                  <input v-model="newCompanyForm.address" type="text" placeholder="Av. Providencia 1234, Santiago">
                </div>
              </div>
            </div>
            <div class="form-section">
  <h4>Logo de la Empresa</h4>
  <div class="form-group">
    <label for="logoInput">Subir Logo (PNG o JPG)</label>
    <input type="file" id="logoInput" accept="image/*" @change="handleLogoUpload">
    <div v-if="logoPreview" class="logo-preview">
      <p>Vista previa:</p>
      <img :src="logoPreview" alt="Logo preview" class="h-20 mt-2 rounded border" />
    </div>
  </div>
</div>

            <div class="form-section">
              <h4>Configuración de Precios</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Plan</label>
                  <select v-model="newCompanyForm.plan_type">
                    <option value="basic">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Precio por Pedido (CLP) *</label>
                  <input v-model.number="newCompanyForm.price_per_order" type="number" required min="0">
                </div>
                <div class="form-group">
                  <label>Ciclo de Facturación</label>
                  <select v-model="newCompanyForm.billing_cycle">
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4>Usuario Administrador</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre Completo *</label>
                  <input v-model="newCompanyForm.owner_name" type="text" required placeholder="Juan Pérez">
                </div>
                <div class="form-group">
                  <label>Email *</label>
                  <input v-model="newCompanyForm.owner_email" type="email" required placeholder="admin@miempresa.com">
                </div>
                <div class="form-group full-width">
                  <label>Contraseña Temporal *</label>
                  <input v-model="newCompanyForm.owner_password" type="password" required minlength="8" placeholder="Mínimo 8 caracteres">
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal('add')" class="btn-cancel">Cancelar</button>
          <button @click="createCompany" :disabled="isCreatingCompany" class="btn-primary">
            {{ isCreatingCompany ? 'Creando...' : 'Crear Empresa' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Pricing -->
    <div v-if="showPricingModal" class="modal-overlay" @click="closeModal('pricing')">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>Configurar Pricing - {{ selectedCompany?.name }}</h3>
          <button @click="closeModal('pricing')" class="modal-close">✕</button>
        </div>
        
        <div class="modal-content">
          <div class="pricing-current">
            <h4>Configuración Actual</h4>
            <div class="pricing-summary">
              <div class="pricing-item">
                <span>Plan Actual:</span>
                <span class="plan-badge" :class="selectedCompany?.plan_type">{{ getPlanName(selectedCompany?.plan_type) }}</span>
              </div>
              <div class="pricing-item">
                <span>Precio por Pedido:</span>
                <span>${{ formatNumber(selectedCompany?.price_per_order || 0) }}</span>
              </div>
              <div class="pricing-item">
                <span>Con IVA:</span>
                <span>${{ formatNumber(getTotalPriceWithIVA(selectedCompany?.price_per_order || 0)) }}</span>
              </div>
            </div>
          </div>

          <form @submit.prevent="savePricing">
            <div class="form-grid">
              <div class="form-group">
                <label>Plan</label>
                <select v-model="pricingForm.plan_type">
                  <option value="basic">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="form-group">
                <label>Precio por Pedido (CLP)</label>
                <input v-model.number="pricingForm.price_per_order" type="number" min="0">
              </div>
              <div class="form-group">
                <label>Ciclo de Facturación</label>
                <select v-model="pricingForm.billing_cycle">
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div class="form-group full-width">
                <label>Notas de Pricing</label>
                <textarea v-model="pricingForm.pricing_notes" rows="3" placeholder="Notas adicionales sobre el pricing..."></textarea>
              </div>
            </div>

            <div class="pricing-preview">
              <h4>Vista Previa</h4>
              <div class="preview-grid">
                <div class="preview-item">
                  <span>Precio Base:</span>
                  <span>${{ formatNumber(pricingForm.price_per_order || 0) }}</span>
                </div>
                <div class="preview-item">
                  <span>IVA (19%):</span>
                  <span>${{ formatNumber(Math.round((pricingForm.price_per_order || 0) * 0.19)) }}</span>
                </div>
                <div class="preview-item total">
                  <span>Total por Pedido:</span>
                  <span>${{ formatNumber(getTotalPriceWithIVA(pricingForm.price_per_order || 0)) }}</span>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal('pricing')" class="btn-cancel">Cancelar</button>
          <button @click="savePricing" :disabled="isSavingPricing" class="btn-primary">
            {{ isSavingPricing ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Estadísticas -->
    <div v-if="showStatsModal" class="modal-overlay" @click="closeModal('stats')">
      <div class="modal-container large" @click.stop>
        <div class="modal-header">
          <h3>Estadísticas - {{ selectedCompany?.name }}</h3>
          <button @click="closeModal('stats')" class="modal-close">✕</button>
        </div>
        
        <div class="modal-content">
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-icon">📦</div>
              <div class="stat-details">
                <div class="stat-value">{{ companyStats.orders_total || 0 }}</div>
                <div class="stat-label">Total Pedidos</div>
              </div>
            </div>
            
            <div class="stat-box">
              <div class="stat-icon">📅</div>
              <div class="stat-details">
                <div class="stat-value">{{ companyStats.orders_this_month || 0 }}</div>
                <div class="stat-label">Pedidos Este Mes</div>
              </div>
            </div>
            
            <div class="stat-box">
              <div class="stat-icon">💰</div>
              <div class="stat-details">
                <div class="stat-value">${{ formatNumber(companyStats.revenue_this_month || 0) }}</div>
                <div class="stat-label">Revenue Este Mes</div>
              </div>
            </div>
            
            <div class="stat-box">
              <div class="stat-icon">👥</div>
              <div class="stat-details">
                <div class="stat-value">{{ companyStats.users_count || 0 }}</div>
                <div class="stat-label">Usuarios Activos</div>
              </div>
            </div>
            
            <div class="stat-box">
              <div class="stat-icon">📡</div>
              <div class="stat-details">
                <div class="stat-value">{{ companyStats.channels_count || 0 }}</div>
                <div class="stat-label">Canales Conectados</div>
              </div>
            </div>
            
            <div class="stat-box">
              <div class="stat-icon">⚡</div>
              <div class="stat-details">
                <div class="stat-value">{{ selectedCompany ? Math.round(calculateMonthlyRevenue(selectedCompany) / (selectedCompany.orders_this_month || 1)) : 0 }}</div>
                <div class="stat-label">Revenue/Pedido Promedio</div>
              </div>
            </div>
          </div>

          <div class="chart-container">
            <h4>Tendencia de Pedidos (Últimos 7 días)</h4>
            <div class="chart-placeholder">
              <p>📈 Gráfico de tendencias aquí</p>
              <small>Implementar con Chart.js o similar</small>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal('stats')" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal Usuarios -->
    <div v-if="showUsersModal" class="modal-overlay" @click="closeModal('users')">
      <div class="modal-container large" @click.stop>
        <div class="modal-header">
          <h3>Usuarios - {{ selectedCompany?.name }}</h3>
          <button @click="closeModal('users')" class="modal-close">✕</button>
        </div>
        
        <div class="modal-content">
          <div v-if="isLoadingUsers" class="loading-section">
            <div class="loading-spinner"></div>
            <p>Cargando usuarios...</p>
          </div>
          
          <div v-else>
            <div class="users-summary">
              <div class="summary-item">
                <span class="summary-value">{{ companyUsers.length }}</span>
                <span class="summary-label">Total Usuarios</span>
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ companyUsers.filter(u => u.is_active).length }}</span>
                <span class="summary-label">Activos</span>
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ companyUsers.filter(u => u.role === 'company_owner').length }}</span>
                <span class="summary-label">Administradores</span>
              </div>
            </div>

            <div class="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="companyUsers.length === 0">
                    <td colspan="5" class="empty-row">No hay usuarios registrados</td>
                  </tr>
                  <tr v-else v-for="user in companyUsers" :key="user._id">
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
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="openAddUserModal(selectedCompany)" class="btn-secondary">
    ➕ Agregar Usuario
  </button>
          <button @click="closeModal('users')" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
    <!-- Modal Agregar Usuario -->
<div v-if="showAddUserModal" class="modal-overlay" @click="closeModal('addUser')">
  <div class="modal-container" @click.stop>
    <div class="modal-header">
      <h3>Agregar Usuario - {{ selectedCompany?.name }}</h3>
      <button @click="closeModal('addUser')" class="modal-close">✕</button>
    </div>
    
    <div class="modal-content">
      <form @submit.prevent="createUser">
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input v-model="newUserForm.full_name" type="text" required placeholder="Juan Pérez">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input v-model="newUserForm.email" type="email" required placeholder="juan@empresa.com">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input v-model="newUserForm.phone" type="tel" placeholder="+56 9 1234 5678">
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="newUserForm.role">
              <option value="company_employee">Empleado</option>
              <option value="company_owner">Administrador</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Contraseña Temporal *</label>
            <input v-model="newUserForm.password" type="password" required minlength="8" placeholder="Mínimo 8 caracteres">
          </div>
        </div>
      </form>
    </div>
    
    <div class="modal-footer">
      <button @click="closeModal('addUser')" class="btn-cancel">Cancelar</button>
      <button @click="createUser" :disabled="isCreatingUser" class="btn-primary">
        {{ isCreatingUser ? 'Creando...' : 'Crear Usuario' }}
      </button>
    </div>
  </div>
</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import axios from 'axios';

const toast = useToast()

// Estado reactivo
const companies = ref([])
const loading = ref(false)
const searchQuery = ref('')
const viewMode = ref('grid')
const selectedCompany = ref(null)
const chartRefs = ref({})

// Estados de modales
const showAddCompanyModal = ref(false)
const showPricingModal = ref(false)
const showStatsModal = ref(false)
const showUsersModal = ref(false)
const showAddUserModal = ref(false)
const isCreatingUser = ref(false)
const newUserForm = ref({
  full_name: '',
  email: '',
  password: '',
  role: 'company_employee',
  phone: ''
})


// Estados de formularios
const isCreatingCompany = ref(false)
const isSavingPricing = ref(false)
const isLoadingUsers = ref(false)

// Datos de formularios
const newCompanyForm = ref({
  name: '',
  contact_email: '',
  phone: '',
  address: '',
  rut: '',
  price_per_order: 500,
  plan_type: 'basic',
  billing_cycle: 'monthly',
  owner_name: '',
  owner_email: '',
  owner_password: '',
  logo_url: ''
})

const pricingForm = ref({
  plan_type: 'basic',
  price_per_order: 0,
  billing_cycle: 'monthly',
  pricing_notes: ''
})

const companyUsers = ref([])
const companyStats = ref({})

// Filtros
const filters = ref({
  status: '',
  plan: '',
  revenue: ''
})

// Ordenamiento
const sortField = ref('name')
const sortDirection = ref('asc')
const logoFile = ref(null);
const logoPreview = ref(null);

// Maneja el input file
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
}
// Computed properties
const filteredCompanies = computed(() => {
  let result = [...companies.value]

  // Filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(company => 
      company.name.toLowerCase().includes(query) ||
      (company.contact_email || '').toLowerCase().includes(query) ||
      (company.email || '').toLowerCase().includes(query) ||
      (company.rut || '').toLowerCase().includes(query)
    )
  }

  // Filtros adicionales
  if (filters.value.status) {
    result = result.filter(company => {
      if (filters.value.status === 'active') return company.is_active
      if (filters.value.status === 'inactive') return !company.is_active
      if (filters.value.status === 'trial') return company.plan_type === 'trial'
      return true
    })
  }

  if (filters.value.plan) {
    result = result.filter(company => 
      (company.plan_type || 'basic') === filters.value.plan
    )
  }

  // Ordenamiento
  result.sort((a, b) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]

    if (sortField.value === 'revenue') {
      aVal = calculateMonthlyRevenue(a)
      bVal = calculateMonthlyRevenue(b)
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    if (sortDirection.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  return result
})

const totalRevenue = computed(() => 
  companies.value.reduce((sum, company) => sum + calculateMonthlyRevenue(company), 0)
)

const baseRevenue = computed(() => 
  companies.value.reduce((sum, company) => sum + getBaseRevenue(company), 0)
)

const ivaRevenue = computed(() => totalRevenue.value - baseRevenue.value)

const totalOrders = computed(() => 
  companies.value.reduce((sum, company) => sum + (company.orders_this_month || 0), 0)
)

const activeCompaniesPercentage = computed(() => {
  if (companies.value.length === 0) return 0
  const active = companies.value.filter(c => c.is_active).length
  return Math.round((active / companies.value.length) * 100)
})

const avgOrdersPerCompany = computed(() => {
  if (companies.value.length === 0) return 0
  return Math.round(totalOrders.value / companies.value.length)
})

const avgRevenuePerOrder = computed(() => {
  if (totalOrders.value === 0) return 0
  return Math.round(totalRevenue.value / totalOrders.value)
})

const minPrice = computed(() => {
  const prices = companies.value.map(c => c.price_per_order || 0).filter(p => p > 0)
  return prices.length > 0 ? Math.min(...prices) : 0
})

const maxPrice = computed(() => {
  const prices = companies.value.map(c => c.price_per_order || 0)
  return prices.length > 0 ? Math.max(...prices) : 0
})

const newCompaniesThisMonth = computed(() => {
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  return companies.value.filter(c => {
    if (!c.created_at && !c.createdAt) return false
    const createdDate = new Date(c.created_at || c.createdAt)
    return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
  }).length
})

const revenueTrend = computed(() => ({
  direction: 'up',
  percentage: 23
}))

const activeFilters = computed(() => {
  const active = []
  if (filters.value.status) {
    const statusLabels = { active: 'Activas', inactive: 'Inactivas', trial: 'En Prueba' }
    active.push({ key: 'status', label: statusLabels[filters.value.status] })
  }
  if (filters.value.plan) {
    const planLabels = { basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise' }
    active.push({ key: 'plan', label: planLabels[filters.value.plan] })
  }
  if (filters.value.revenue) {
    const revenueLabels = { high: 'Revenue Alto', medium: 'Revenue Medio', low: 'Revenue Bajo' }
    active.push({ key: 'revenue', label: revenueLabels[filters.value.revenue] })
  }
  return active
})

// Métodos


const openAddUserModal = (company) => {
  selectedCompany.value = company
  newUserForm.value = {
    full_name: '',
    email: '',
    password: '',
    role: 'company_employee',
    phone: ''
  }
  showAddUserModal.value = true
}

const createUser = async () => {
  if (!selectedCompany.value) return
  
  isCreatingUser.value = true
  try {
    await apiService.users.create({
      ...newUserForm.value,
      company_id: selectedCompany.value._id
    })
    
    toast.success('Usuario creado exitosamente')
    showAddUserModal.value = false
    
    // Recargar usuarios si el modal está abierto
    if (showUsersModal.value) {
      await openUsersModal(selectedCompany.value)
    }
  } catch (error) {
    console.error('Error creating user:', error)
    toast.error('Error al crear usuario')
  } finally {
    isCreatingUser.value = false
  }
}

const toggleUserStatus = async (user) => {
  try {
    await apiService.users.update(user._id, {
      is_active: !user.is_active
    })
    
    user.is_active = !user.is_active
    toast.success(`Usuario ${user.is_active ? 'activado' : 'desactivado'}`)
  } catch (error) {
    console.error('Error updating user:', error)
    toast.error('Error al actualizar usuario')
  }
}

const loadCompanies = async () => {
  loading.value = true
  try {
    console.log('🔄 Cargando empresas desde la base de datos...')
    const { data } = await apiService.companies.getAll()
    
    // Procesar datos para asegurar que tengan todas las propiedades necesarias
    companies.value = data.map(company => ({
      ...company,
      // Asegurar valores por defecto basados en tu modelo
      price_per_order: company.price_per_order || 0,
      plan_type: company.plan_type || 'basic',
      billing_cycle: company.billing_cycle || 'monthly',
      contact_email: company.contact_email || company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      rut: company.rut || '',
      is_active: company.is_active !== undefined ? company.is_active : true,
      
      // Datos computados desde el backend (si están disponibles)
      orders_count: company.orders_count || 0,
      users_count: company.users_count || 0,
      channels_count: company.channels_count || 0,
      
      // Para métricas calculadas - estos pueden venir del backend o calcularse
      orders_this_month: company.orders_this_month || company.orders_count || 0,
      completed_orders: company.completed_orders || Math.floor((company.orders_count || 0) * 0.85), // Estimación del 85%
      
      // Fechas
      created_at: company.created_at || company.createdAt,
      updated_at: company.updated_at || company.updatedAt
    }))
    
    console.log(`✅ ${companies.value.length} empresas cargadas exitosamente`)
    
    // Cargar estadísticas adicionales si es necesario
    await loadAdditionalStats()
    
  } catch (error) {
    console.error('❌ Error loading companies:', error)
    toast.error('Error al cargar las empresas: ' + (error.response?.data?.message || error.message))
    companies.value = []
  } finally {
    loading.value = false
  }
}

// Cargar estadísticas adicionales (pedidos del mes, revenue, etc.)
const loadAdditionalStats = async () => {
  try {
    // Si tu API no proporciona orders_this_month, puedes calcularlo aquí
    for (const company of companies.value) {
      if (!company.orders_this_month && apiService.companies.getStats) {
        try {
          const statsResponse = await apiService.companies.getStats(company._id, {
            period: 'current_month'
          })
          
          if (statsResponse.data) {
            company.orders_this_month = statsResponse.data.orders_count || 0
            company.completed_orders = statsResponse.data.completed_orders || 0
            company.monthly_revenue = statsResponse.data.revenue || 0
          }
        } catch (error) {
          console.warn(`No se pudieron cargar estadísticas para ${company.name}:`, error.message)
        }
      }
    }
  } catch (error) {
    console.warn('Error cargando estadísticas adicionales:', error)
  }
}

const refreshData = async () => {
  await loadCompanies()
  toast.success('Datos actualizados')
}

const handleSearch = () => {
  // La búsqueda es reactiva a través del computed
}

const clearSearch = () => {
  searchQuery.value = ''
}

const applyFilters = () => {
  // Los filtros son reactivos a través del computed
}

const removeFilter = (key) => {
  filters.value[key] = ''
}

const clearAllFilters = () => {
  filters.value = { status: '', plan: '', revenue: '' }
  searchQuery.value = ''
}

const sortBy = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const selectCompany = (company) => {
  selectedCompany.value = selectedCompany.value?._id === company._id ? null : company
}

const getCompanyEmail = (company) => {
  return company.contact_email || company.email || 'Sin email registrado'
}

const getCompanyInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

const getCompanyCardClass = (company) => {
  return {
    'card-active': company.is_active,
    'card-inactive': !company.is_active,
    'card-premium': ['pro', 'enterprise'].includes(company.plan_type)
  }
}

const getPlanName = (planType) => {
  const plans = {
    basic: 'Básico',
    pro: 'Pro',
    enterprise: 'Enterprise',
    trial: 'Prueba'
  }
  return plans[planType] || 'Básico'
}

const getStatusClass = (company) => {
  if (!company.is_active) return 'inactive'
  if (company.plan_type === 'trial') return 'trial'
  return 'active'
}

const getStatusText = (company) => {
  if (!company.is_active) return 'Inactiva'
  if (company.plan_type === 'trial') return 'En Prueba'
  return 'Activa'
}

const calculateMonthlyRevenue = (company) => {
  const base = (company.price_per_order || 0) * (company.orders_this_month || 0)
  return Math.round(base * 1.19) // Incluye IVA
}

const getBaseRevenue = (company) => {
  return (company.price_per_order || 0) * (company.orders_this_month || 0)
}

const getTotalPriceWithIVA = (price) => {
  return Math.round(price * 1.19)
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('es-CL').format(num || 0)
}

const formatLargeNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return formatNumber(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  })
}

const getRoleName = (role) => {
  const roles = {
    company_owner: 'Administrador',
    company_employee: 'Empleado',
    admin: 'Super Admin'
  }
  return roles[role] || role
}

const openAddCompanyModal = async () => {
  try {
    console.log('➕ Abriendo modal para nueva empresa')
    // Resetear formulario
    newCompanyForm.value = {
      name: '',
      contact_email: '',
      phone: '',
      address: '',
      rut: '',
      price_per_order: 500,
      plan_type: 'basic',
      billing_cycle: 'monthly',
      owner_name: '',
      owner_email: '',
      owner_password: ''
    }
    showAddCompanyModal.value = true
  } catch (error) {
    console.error('Error opening add company modal:', error)
    toast.error('Error al abrir el modal de nueva empresa')
  }
}

const openPricingModal = async (company) => {
  try {
    console.log('💰 Abriendo modal pricing para:', company.name)
    selectedCompany.value = company
    
    // Cargar datos actuales en el formulario
    pricingForm.value = {
      plan_type: company.plan_type || 'basic',
      price_per_order: company.price_per_order || 0,
      billing_cycle: company.billing_cycle || 'monthly',
      pricing_notes: company.pricing_notes || ''
    }
    
    showPricingModal.value = true
  } catch (error) {
    console.error('Error opening pricing modal:', error)
    toast.error('Error al abrir el modal de pricing')
  }
}

const openStatsModal = async (company) => {
  try {
    console.log('📊 Abriendo modal estadísticas para:', company.name)
    selectedCompany.value = company
    
    // Cargar estadísticas reales desde el backend
    const { data } = await apiService.companies.getStats(company._id)
    companyStats.value = data
    
    console.log('📊 Stats cargadas:', data)
    showStatsModal.value = true
  } catch (error) {
    console.error('Error loading stats:', error)
    // Fallback con datos básicos
    companyStats.value = {
      orders_total: company.orders_count || 0,
      orders_this_month: company.orders_this_month || 0,
      revenue_this_month: calculateMonthlyRevenue(company),
      users_count: company.users_count || 0,
      channels_count: company.channels_count || 0,
      delivery_rate: 85, // Estimación
      growth_rate: 12 // Estimación
    }
    showStatsModal.value = true
    toast.warning('Cargando estadísticas básicas')
  }
}

const openUsersModal = async (company) => {
  try {
    console.log('👥 Abriendo modal usuarios para:', company.name)
    selectedCompany.value = company
    isLoadingUsers.value = true
    showUsersModal.value = true // Mostrar modal inmediatamente
    
    // Cargar usuarios
    const { data } = await apiService.companies.getUsers(company._id)
    companyUsers.value = data || []
    
    console.log('👥 Usuarios cargados:', data.length)
  } catch (error) {
    console.error('Error loading users:', error)
    toast.error('Error al cargar usuarios')
    companyUsers.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

const toggleCompanyStatus = async (company) => {
  const newStatus = !company.is_active
  const confirmation = confirm(`¿Estás seguro de que quieres ${newStatus ? 'activar' : 'desactivar'} la empresa ${company.name}?`)
  
  if (confirmation) {
    try {
      console.log(`🔄 Cambiando estado de ${company.name} a:`, newStatus ? 'activa' : 'inactiva')
      
      // Llamar a la API para actualizar el estado
      await apiService.companies.update(company._id, {
        is_active: newStatus
      })
      
      // Actualizar el estado local
      company.is_active = newStatus
      
      toast.success(`${company.name} ${newStatus ? 'activada' : 'desactivada'} exitosamente`)
    } catch (error) {
      console.error('Error toggling company status:', error)
      toast.error('Error al cambiar el estado de la empresa: ' + (error.response?.data?.message || error.message))
    }
  }
}

const exportData = async () => {
  try {
    console.log('📊 Exportando datos de empresas')
    
    // Llamar a la API de exportación si existe
    if (apiService.companies.export) {
      const response = await apiService.companies.export()
      
      // Manejar la descarga del archivo
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `empresas_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Datos exportados exitosamente')
    } else {
      // Fallback: exportar como JSON
      const dataStr = JSON.stringify(companies.value, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `empresas_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('Datos exportados como JSON')
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    toast.error('Error al exportar datos: ' + (error.response?.data?.message || error.message))
  }
}

// Funciones de formularios
const createCompany = async () => {
  if (!newCompanyForm.value.name || !newCompanyForm.value.contact_email) {
    toast.error('Por favor completa los campos obligatorios')
    return
  }
  
  isCreatingCompany.value = true
  try {
    console.log('🏢 Creando nueva empresa:', newCompanyForm.value.name)

     if (logoFile.value) {
      const formData = new FormData();
      formData.append('logo', logoFile.value);

      const uploadRes = await axios.post(`/api/companies/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      newCompanyForm.logo_url = uploadRes.data.logo_url;
    }
    await apiService.companies.create({
      // Datos de la empresa
      name: newCompanyForm.value.name,
      contact_email: newCompanyForm.value.contact_email,
      phone: newCompanyForm.value.phone,
      address: newCompanyForm.value.address,
      rut: newCompanyForm.value.rut,
      price_per_order: newCompanyForm.value.price_per_order,
      plan_type: newCompanyForm.value.plan_type,
      billing_cycle: newCompanyForm.value.billing_cycle,
      
      // Datos del usuario administrador
      owner_name: newCompanyForm.value.owner_name,
      owner_email: newCompanyForm.value.owner_email,
      owner_password: newCompanyForm.value.owner_password,
      logo_url: newCompanyForm.value.logo_url || ''
    })
    
    toast.success('Empresa creada exitosamente')
    showAddCompanyModal.value = false
    await loadCompanies() // Recargar lista
  } catch (error) {
    console.error('Error creating company:', error)
    toast.error('Error al crear empresa: ' + (error.response?.data?.message || error.message))
  } finally {
    isCreatingCompany.value = false
  }
}

const savePricing = async () => {
  if (!selectedCompany.value) return
  
  isSavingPricing.value = true
  try {
    console.log('💰 Guardando pricing para:', selectedCompany.value.name)
    
    // Actualizar precio
    if (apiService.companies.updatePrice) {
      await apiService.companies.updatePrice(selectedCompany.value._id, pricingForm.value.price_per_order)
    }
    
    // Actualizar otros datos
    await apiService.companies.update(selectedCompany.value._id, {
      plan_type: pricingForm.value.plan_type,
      billing_cycle: pricingForm.value.billing_cycle,
      pricing_notes: pricingForm.value.pricing_notes
    })
    
    // Actualizar datos locales
    const companyIndex = companies.value.findIndex(c => c._id === selectedCompany.value._id)
    if (companyIndex !== -1) {
      companies.value[companyIndex] = {
        ...companies.value[companyIndex],
        price_per_order: pricingForm.value.price_per_order,
        plan_type: pricingForm.value.plan_type,
        billing_cycle: pricingForm.value.billing_cycle,
        pricing_notes: pricingForm.value.pricing_notes
      }
    }
    
    toast.success('Configuración de precios guardada exitosamente')
    showPricingModal.value = false
  } catch (error) {
    console.error('Error saving pricing:', error)
    toast.error('Error al guardar pricing: ' + (error.response?.data?.message || error.message))
  } finally {
    isSavingPricing.value = false
  }
}

const closeModal = (modalName) => {
  switch (modalName) {
    case 'add':
      showAddCompanyModal.value = false
      break
    case 'pricing':
      showPricingModal.value = false
      break
    case 'stats':
      showStatsModal.value = false
      break
    case 'users':
      showUsersModal.value = false
      break
  }
}

// Lifecycle
onMounted(() => {
  loadCompanies()
})
</script>

<style scoped>
.companies-dashboard-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header Styles */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-metrics {
  display: flex;
  gap: 16px;
}

.metric-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background: #f1f5f9;
  border-radius: 12px;
  min-width: 80px;
}

.metric-badge.success {
  background: #dcfce7;
  color: #166534;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.action-btn.secondary {
  background: #f8fafc;
  color: #475569;
  border: 2px solid #e2e8f0;
}

.action-btn.secondary:hover {
  background: #e2e8f0;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.metric-card.revenue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.metric-card.orders {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.metric-card.efficiency {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.metric-card.growth {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.metric-icon {
  font-size: 28px;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.metric-trend.up {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.metric-trend.down {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.metric-main-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 8px;
}

.metric-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.metric-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  opacity: 0.8;
}

/* Filters Panel */
.filters-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 300px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  width: 20px;
  height: 20px;
  color: #64748b;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.clear-search {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.clear-search:hover {
  background: #f1f5f9;
}

.filter-group {
  display: flex;
  gap: 16px;
}

.filter-select {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.view-controls {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
}

.view-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;
}

.view-btn.active {
  background: white;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.filters-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border-radius: 8px;
  font-size: 14px;
}

.remove-filter {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
}

.remove-filter:hover {
  background: rgba(255, 255, 255, 0.2);
}

.clear-all-filters {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

/* Companies Grid */
.companies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.company-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.company-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.company-card.card-premium {
  border: 2px solid #fbbf24;
}

.company-card.card-inactive {
  opacity: 0.7;
  background: #f8fafc;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.company-avatar {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 20px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.company-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.company-email {
  color: #64748b;
  font-size: 14px;
  margin: 0 0 20px 0;
}

.company-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.plan-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.plan-badge.basic {
  background: #e0e7ff;
  color: #3730a3;
}

.plan-badge.pro {
  background: #fef3c7;
  color: #92400e;
}

.plan-badge.enterprise {
  background: #d1fae5;
  color: #065f46;
}

.price-value, .orders-count, .revenue-value {
  font-weight: 700;
  color: #1e293b;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.card-action-btn {
  flex: 1;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-action-btn:hover {
  background: #e2e8f0;
}

.mini-chart {
  height: 60px;
  margin-top: 16px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

/* Enhanced Table */
.table-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.enhanced-table {
  width: 100%;
  border-collapse: collapse;
}

.enhanced-table th {
  background: #f8fafc;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.enhanced-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.enhanced-table th.sortable:hover {
  background: #e2e8f0;
}

.sort-indicator {
  margin-left: 8px;
  color: #667eea;
}

.enhanced-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.table-row {
  transition: all 0.2s ease;
  cursor: pointer;
}

.table-row:hover {
  background: #f8fafc;
}

.table-row.selected {
  background: #f0f9ff;
  border-left: 4px solid #667eea;
}

.company-cell {
  min-width: 250px;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.company-name-table {
  font-weight: 600;
  color: #1e293b;
}

.company-email-table {
  font-size: 14px;
  color: #64748b;
}

.plan-badge-table {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.price-cell, .orders-cell, .revenue-cell {
  text-align: right;
}

.price-main, .orders-main, .revenue-main {
  font-weight: 700;
  color: #1e293b;
}

.price-with-iva, .orders-trend, .revenue-breakdown {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.trend-indicator {
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 4px;
}

.trend-indicator.up {
  background: #dcfce7;
  color: #166534;
}

.status-badge-table {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge-table.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge-table.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge-table.trial {
  background: #fef3c7;
  color: #92400e;
}

.actions-cell {
  width: 150px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn-small {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn-small:hover {
  background: #e2e8f0;
  transform: scale(1.1);
}

/* Details Panel */
.details-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow-y: auto;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.details-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.close-details {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.details-content {
  padding: 24px;
}

.detail-section {
  margin-bottom: 32px;
}

.detail-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-label {
  font-weight: 500;
  color: #64748b;
}

.detail-value {
  color: #1e293b;
  text-align: right;
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.performance-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.performance-label {
  font-size: 14px;
  color: #64748b;
}

.performance-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.performance-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.performance-fill {
  height: 100%;
  background: #667eea;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.performance-fill.success {
  background: #10b981;
}

.activity-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 12px;
  color: #64748b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}

.modal-container.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 16px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #cbd5e1;
  color: #475569;
}

.modal-content {
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
}

/* Form Styles */
.form-section {
  margin-bottom: 32px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.btn-cancel {
  padding: 12px 20px;
  background: #f8fafc;
  color: #475569;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

/* Pricing Modal Specific */
.pricing-current {
  background: #f1f5f9;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.pricing-current h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  border: none;
  padding: 0;
}

.pricing-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pricing-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pricing-preview {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 12px;
  margin-top: 24px;
}

.pricing-preview h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
  border: none;
  padding: 0;
}

.preview-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.preview-item.total {
  border-top: 2px solid #0284c7;
  padding-top: 12px;
  margin-top: 8px;
  font-weight: 700;
  color: #0369a1;
}

/* Stats Modal Specific */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-box:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-box:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-box:nth-child(4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-box:nth-child(5) {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-box:nth-child(6) {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #1e293b;
}

.stat-icon {
  font-size: 32px;
}

.stat-details {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.chart-container {
  background: #f8fafc;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}

.chart-container h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
}

.chart-placeholder p {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.chart-placeholder small {
  font-size: 14px;
  opacity: 0.7;
}

/* Users Modal Specific */
.loading-section {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.users-summary {
  display: flex;
  gap: 32px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.summary-item {
  text-align: center;
  flex: 1;
}

.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #64748b;
}

.users-table {
  overflow-x: auto;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f1f5f9;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e2e8f0;
}

.users-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.empty-row {
  text-align: center;
  color: #64748b;
  font-style: italic;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.role-badge.company_owner {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.company_employee {
  background: #e0e7ff;
  color: #3730a3;
}

.role-badge.admin {
  background: #fee2e2;
  color: #991b1b;
}

/* Loading States */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
}

.empty-state-description {
  font-size: 16px;
  margin-bottom: 24px;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease;
}

/* Tooltips */
.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltip-text {
  visibility: hidden;
  width: 140px;
  background-color: #1e293b;
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 8px;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
  left: 50%;
  margin-left: -70px;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 12px;
}

.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

/* Utility Classes */
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-left { text-align: left; }

.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }

.text-sm { font-size: 14px; }
.text-xs { font-size: 12px; }
.text-lg { font-size: 18px; }
.text-xl { font-size: 20px; }

.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }

.p-2 { padding: 8px; }
.p-4 { padding: 16px; }
.p-6 { padding: 24px; }

.rounded { border-radius: 8px; }
.rounded-lg { border-radius: 12px; }
.rounded-xl { border-radius: 16px; }

.shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.shadow-md { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }

/* Responsive Design */
@media (max-width: 1200px) {
  .companies-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
  
  .details-panel {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .companies-dashboard-container {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-metrics {
    justify-content: center;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .filters-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .search-container {
    min-width: auto;
  }
  
  .filter-group {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .companies-grid {
    grid-template-columns: 1fr;
  }
  
  .details-panel {
    width: 100%;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .table-wrapper {
    overflow-x: scroll;
  }

  .modal-container {
    width: 95%;
    margin: 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full-width {
    grid-column: span 1;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .users-summary {
    flex-direction: column;
    gap: 16px;
  }
  
  .pricing-item,
  .preview-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .company-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .action-buttons {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .dashboard-title {
    font-size: 24px;
  }

  .metric-badge {
    min-width: 60px;
    padding: 8px 12px;
  }

  .metric-value {
    font-size: 18px;
  }

  .action-btn {
    padding: 10px 16px;
    font-size: 13px;
  }

  .company-card {
    padding: 16px;
  }

  .company-avatar {
    width: 50px;
    height: 50px;
    font-size: 16px;
  }

  .modal-content {
    padding: 16px;
  }

  .modal-header,
  .modal-footer {
    padding: 16px;
  }
}

/* Dark mode support (opcional) */
@media (prefers-color-scheme: dark) {
  .companies-dashboard-container {
    background: #0f172a;
    color: #e2e8f0;
  }
  
  .dashboard-header,
  .filters-panel,
  .metric-card:not(.revenue):not(.orders):not(.efficiency):not(.growth),
  .company-card,
  .table-container,
  .modal-container {
    background: #1e293b;
    border-color: #334155;
  }
  
  .dashboard-title,
  .company-name,
  .company-name-table {
    color: #f1f5f9;
  }
  
  .search-input,
  .filter-select,
  .form-group input,
  .form-group select,
  .form-group textarea {
    background: #374151;
    border-color: #4b5563;
    color: #f1f5f9;
  }

  .enhanced-table th {
    background: #374151;
    color: #f1f5f9;
  }

  .table-row:hover {
    background: #374151;
  }

  .details-panel {
    background: #1e293b;
  }

  .details-header {
    background: #374151;
  }

  .activity-item {
    background: #374151;
  }
}

/* Print styles */
@media print {
  .companies-dashboard-container {
    background: white;
    padding: 0;
  }

  .header-actions,
  .filters-panel,
  .card-actions,
  .action-buttons,
  .details-panel {
    display: none;
  }

  .company-card,
  .table-container {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}

</style>