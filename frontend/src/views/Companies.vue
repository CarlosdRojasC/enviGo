<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Principal -->
    <header class="mb-8">
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 class="text-3xl font-bold text-white flex items-center gap-2">
            <span class="material-icons text-4xl">business</span>
            Gestión de Empresas
          </h1>
          <p class="text-indigo-200 mt-1">Administra todas las empresas del sistema</p>
        </div>
        <button 
          @click="openCreateCompanyModal"
          class="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-all hover:scale-105"
        >
          <span class="material-icons">add_business</span>
          Crear Empresa
        </button>
      </div>
    </header>

    <!-- Métricas Rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total Empresas</p>
            <p class="text-3xl font-bold text-gray-900">{{ companies.length }}</p>
          </div>
          <div class="bg-indigo-100 p-3 rounded-full">
            <span class="material-icons text-indigo-600">business</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Empresas Activas</p>
            <p class="text-3xl font-bold text-green-600">{{ activeCompaniesCount }}</p>
          </div>
          <div class="bg-green-100 p-3 rounded-full">
            <span class="material-icons text-green-600">check_circle</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Pedidos del Mes</p>
            <p class="text-3xl font-bold text-blue-600">{{ formatNumber(totalOrders) }}</p>
          </div>
          <div class="bg-blue-100 p-3 rounded-full">
            <span class="material-icons text-blue-600">local_shipping</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Revenue Total</p>
            <p class="text-3xl font-bold text-orange-600">${{ formatNumber(totalRevenue) }}</p>
          </div>
          <div class="bg-orange-100 p-3 rounded-full">
            <span class="material-icons text-orange-600">payments</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel de Búsqueda y Filtros -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="mb-6">
        <div class="relative">
          <span class="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar empresas por nombre, email o RUT..."
            class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <select v-model="filters.status" @change="applyFilters" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700">
            <option value="">Todos los estados</option>
            <option value="active">✅ Activas</option>
            <option value="inactive">❌ Inactivas</option>
          </select>

          <select v-model="filters.plan" @change="applyFilters" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700">
            <option value="">Todos los planes</option>
            <option value="basic">📦 Basic</option>
            <option value="pro">⭐ Pro</option>
            <option value="enterprise">💎 Enterprise</option>
          </select>

          <select v-model="filters.revenue" @change="applyFilters" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700">
            <option value="">Todo el revenue</option>
            <option value="high">💰 Alto (&gt;$500k)</option>
            <option value="medium">💵 Medio ($100k-$500k)</option>
            <option value="low">💸 Bajo (&lt;$100k)</option>
          </select>
        </div>

        <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button @click="viewMode = 'grid'" :class="['px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2', viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900']">
            <span class="material-icons text-lg">grid_view</span>
            Grid
          </button>
          <button @click="viewMode = 'table'" :class="['px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2', viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900']">
            <span class="material-icons text-lg">table_rows</span>
            Tabla
          </button>
        </div>
      </div>

      <div v-if="activeFilters.length > 0" class="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
        <span class="text-sm font-medium text-gray-600">Filtros activos:</span>
        <div class="flex flex-wrap gap-2">
          <div v-for="filter in activeFilters" :key="filter.key" class="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
            {{ filter.label }}
            <button @click="removeFilter(filter.key)" class="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
          <button @click="clearAllFilters" class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200 transition-colors">
            Limpiar todo
          </button>
        </div>
      </div>
    </div>

    <!-- VISTA GRID -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="company in filteredCompanies" 
        :key="company._id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        @click="selectCompany(company)"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {{ getCompanyInitials(company.name) }}
          </div>
          <span :class="['px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1', company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
            <span class="material-icons text-sm">{{ company.is_active ? 'check_circle' : 'cancel' }}</span>
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>

        <h3 class="text-lg font-bold text-gray-900 mb-1 truncate">{{ company.name }}</h3>
        <p class="text-sm text-gray-500 mb-4 truncate">{{ getCompanyEmail(company) }}</p>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Plan</p>
            <span :class="['inline-block px-2 py-1 rounded text-xs font-semibold', getPlanColor(company.plan_type)]">
              {{ getPlanName(company.plan_type) }}
            </span>
          </div>

          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Precio/Pedido</p>
            <p class="text-sm font-bold text-gray-900">${{ formatNumber(company.price_per_order || 0) }}</p>
          </div>

          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Pedidos Mes</p>
            <p class="text-sm font-bold text-blue-600">{{ company.orders_this_month || 0 }}</p>
          </div>

          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Revenue Mes</p>
            <p class="text-sm font-bold text-orange-600">${{ formatNumber(calculateMonthlyRevenue(company)) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2">
          <button @click.stop="openPricingModal(company)" class="p-2 bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors group" title="Pricing">
            <span class="material-icons text-gray-600 group-hover:text-indigo-600">payments</span>
          </button>
          <button @click.stop="openStatsModal(company)" class="p-2 bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors group" title="Estadísticas">
            <span class="material-icons text-gray-600 group-hover:text-blue-600">bar_chart</span>
          </button>
          <button @click.stop="openUsersModal(company)" class="p-2 bg-gray-100 hover:bg-green-100 rounded-lg transition-colors group" title="Usuarios">
            <span class="material-icons text-gray-600 group-hover:text-green-600">group</span>
          </button>
          <button @click.stop="toggleCompanyStatus(company)" class="p-2 bg-gray-100 hover:bg-purple-100 rounded-lg transition-colors group" :title="company.is_active ? 'Desactivar' : 'Activar'">
            <span class="material-icons text-gray-600 group-hover:text-purple-600">{{ company.is_active ? 'pause' : 'play_arrow' }}</span>
          </button>
        </div>
      </div>

      <div v-if="filteredCompanies.length === 0" class="col-span-full text-center py-12">
        <span class="material-icons text-6xl text-gray-300 mb-4">business</span>
        <p class="text-gray-500 text-lg mb-2">No se encontraron empresas</p>
        <p class="text-gray-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
      </div>
    </div>

    <!-- VISTA TABLA -->
    <div v-if="viewMode === 'table'" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th @click="sortBy('name')" class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-2">
                  Empresa
                  <span v-if="sortField === 'name'" class="material-icons text-sm text-indigo-600">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </div>
              </th>
              <th @click="sortBy('plan_type')" class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-2">
                  Plan
                  <span v-if="sortField === 'plan_type'" class="material-icons text-sm text-indigo-600">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </div>
              </th>
              <th @click="sortBy('price_per_order')" class="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-end gap-2">
                  Precio/Pedido
                  <span v-if="sortField === 'price_per_order'" class="material-icons text-sm text-indigo-600">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </div>
              </th>
              <th @click="sortBy('orders_this_month')" class="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-end gap-2">
                  Pedidos Mes
                  <span v-if="sortField === 'orders_this_month'" class="material-icons text-sm text-indigo-600">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </div>
              </th>
              <th @click="sortBy('revenue')" class="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-end gap-2">
                  Revenue
                  <span v-if="sortField === 'revenue'" class="material-icons text-sm text-indigo-600">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </div>
              </th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="company in sortedCompanies" :key="company._id" class="hover:bg-gray-50 transition-colors cursor-pointer" @click="selectCompany(company)">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {{ getCompanyInitials(company.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-900 truncate">{{ company.name }}</p>
                    <p class="text-sm text-gray-500 truncate">{{ getCompanyEmail(company) }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="['inline-block px-2 py-1 rounded text-xs font-semibold', getPlanColor(company.plan_type)]">{{ getPlanName(company.plan_type) }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <p class="font-bold text-gray-900">${{ formatNumber(company.price_per_order || 0) }}</p>
                <p class="text-xs text-gray-500">${{ formatNumber(getTotalPriceWithIVA(company.price_per_order || 0)) }} c/IVA</p>
              </td>
              <td class="px-6 py-4 text-right">
                <p class="font-bold text-blue-600">{{ company.orders_this_month || 0 }}</p>
              </td>
              <td class="px-6 py-4 text-right">
                <p class="font-bold text-orange-600">${{ formatNumber(calculateMonthlyRevenue(company)) }}</p>
                <p class="text-xs text-gray-500">Base: ${{ formatNumber(getBaseRevenue(company)) }}</p>
              </td>
              <td class="px-6 py-4 text-center">
                <span :class="['inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold', company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                  <span class="material-icons text-sm">{{ company.is_active ? 'check_circle' : 'cancel' }}</span>
                  {{ company.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-1">
                  <button @click.stop="openPricingModal(company)" class="p-2 hover:bg-indigo-100 rounded-lg transition-colors group" title="Pricing">
                    <span class="material-icons text-sm text-gray-600 group-hover:text-indigo-600">payments</span>
                  </button>
                  <button @click.stop="openStatsModal(company)" class="p-2 hover:bg-blue-100 rounded-lg transition-colors group" title="Estadísticas">
                    <span class="material-icons text-sm text-gray-600 group-hover:text-blue-600">bar_chart</span>
                  </button>
                  <button @click.stop="openUsersModal(company)" class="p-2 hover:bg-green-100 rounded-lg transition-colors group" title="Usuarios">
                    <span class="material-icons text-sm text-gray-600 group-hover:text-green-600">group</span>
                  </button>
                  <button @click.stop="toggleCompanyStatus(company)" class="p-2 hover:bg-purple-100 rounded-lg transition-colors group" :title="company.is_active ? 'Desactivar' : 'Activar'">
                    <span class="material-icons text-sm text-gray-600 group-hover:text-purple-600">{{ company.is_active ? 'pause' : 'play_arrow' }}</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="sortedCompanies.length === 0">
              <td colspan="7" class="px-6 py-12 text-center">
                <span class="material-icons text-6xl text-gray-300 mb-4">table_rows</span>
                <p class="text-gray-500 text-lg mb-2">No se encontraron empresas</p>
                <p class="text-gray-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CREAR EMPRESA -->
    <div v-if="showAddCompanyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span class="material-icons text-indigo-600">add_business</span>
              Crear Nueva Empresa
            </h2>
            <p class="text-sm text-gray-500 mt-1">Complete la información de la empresa y su propietario</p>
          </div>
          <button @click="closeCreateCompanyModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="createCompany">
            <div class="mb-6">
              <div class="bg-indigo-50 border-l-4 border-indigo-500 px-4 py-3 mb-4">
                <h3 class="font-semibold text-indigo-900 flex items-center gap-2">
                  <span class="material-icons text-lg">business</span>
                  Información de la Empresa
                </h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Empresa *</label>
                  <input v-model="newCompanyForm.name" type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Mi Empresa SpA" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email de Contacto *</label>
                  <input v-model="newCompanyForm.contact_email" type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="contacto@empresa.cl" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                  <input v-model="newCompanyForm.phone" type="tel" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="+56 9 1234 5678" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">RUT/NIT</label>
                  <input v-model="newCompanyForm.rut" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="12.345.678-9" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                  <textarea v-model="newCompanyForm.address" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Dirección completa de la empresa"></textarea>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <div class="bg-green-50 border-l-4 border-green-500 px-4 py-3 mb-4">
                <h3 class="font-semibold text-green-900 flex items-center gap-2">
                  <span class="material-icons text-lg">payments</span>
                  Configuración de Pricing
                </h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Plan *</label>
                  <select v-model="newCompanyForm.plan_type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Precio por Pedido ($) *</label>
                  <input v-model.number="newCompanyForm.price_per_order" type="number" required min="0" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="1500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ciclo de Facturación</label>
                  <select v-model="newCompanyForm.billing_cycle" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <div class="bg-purple-50 border-l-4 border-purple-500 px-4 py-3 mb-4">
                <h3 class="font-semibold text-purple-900 flex items-center gap-2">
                  <span class="material-icons text-lg">person</span>
                  Propietario de la Empresa
                </h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Completo *</label>
                  <input v-model="newCompanyForm.owner_name" type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Juan Pérez" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email del Propietario *</label>
                  <input v-model="newCompanyForm.owner_email" type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="propietario@empresa.cl" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña *</label>
                  <input v-model="newCompanyForm.owner_password" type="password" required minlength="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Mínimo 6 caracteres" />
                  <p class="text-xs text-gray-500 mt-1">Esta contraseña será usada para el primer acceso del propietario</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button @click="closeCreateCompanyModal" type="button" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium">Cancelar</button>
          <button @click="createCompany" :disabled="isCreatingCompany" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span v-if="isCreatingCompany" class="material-icons animate-spin">refresh</span>
            {{ isCreatingCompany ? 'Creando...' : 'Crear Empresa' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL PRICING -->
    <div v-if="showPricingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div class="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
              <span class="material-icons">payments</span>
              Configuración de Pricing
            </h2>
            <p class="text-green-100 text-sm mt-1">{{ selectedCompany?.name }}</p>
          </div>
          <button @click="closePricingModal" class="text-white hover:text-green-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="savePricing">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Plan</label>
                <select v-model="pricingForm.plan_type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Precio por Pedido ($)</label>
                <input v-model.number="pricingForm.price_per_order" type="number" min="0" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ciclo de Facturación</label>
                <select v-model="pricingForm.billing_cycle" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                <textarea v-model="pricingForm.pricing_notes" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="Notas adicionales sobre el pricing..."></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button @click="closePricingModal" type="button" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium">Cancelar</button>
          <button @click="savePricing" :disabled="isSavingPricing" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span v-if="isSavingPricing" class="material-icons animate-spin text-sm">refresh</span>
            {{ isSavingPricing ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL ESTADÍSTICAS -->
    <div v-if="showStatsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-lg sticky top-0">
          <div>
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
              <span class="material-icons">bar_chart</span>
              Estadísticas de Empresa
            </h2>
            <p class="text-blue-100 text-sm mt-1">{{ selectedCompany?.name }}</p>
          </div>
          <button @click="closeStatsModal" class="text-white hover:text-blue-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p class="text-sm text-blue-600 font-medium mb-1">Total Pedidos</p>
              <p class="text-3xl font-bold text-blue-900">{{ companyStats.totalOrders || 0 }}</p>
            </div>
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <p class="text-sm text-green-600 font-medium mb-1">Pedidos Este Mes</p>
              <p class="text-3xl font-bold text-green-900">{{ selectedCompany?.orders_this_month || 0 }}</p>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p class="text-sm text-orange-600 font-medium mb-1">Revenue Total</p>
              <p class="text-3xl font-bold text-orange-900">${{ formatNumber(companyStats.totalRevenue || 0) }}</p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-2">Información General</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-600">Plan:</span><span class="font-medium">{{ getPlanName(selectedCompany?.plan_type) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Precio/Pedido:</span><span class="font-medium">${{ formatNumber(selectedCompany?.price_per_order || 0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Estado:</span><span :class="selectedCompany?.is_active ? 'text-green-600' : 'text-red-600'" class="font-medium">{{ selectedCompany?.is_active ? 'Activa' : 'Inactiva' }}</span></div>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-lg">
          <button @click="closeStatsModal" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- MODAL USUARIOS -->
    <div v-if="showUsersModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between rounded-t-lg sticky top-0">
          <div>
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
              <span class="material-icons">group</span>
              Usuarios de la Empresa
            </h2>
            <p class="text-purple-100 text-sm mt-1">{{ selectedCompany?.name }}</p>
          </div>
          <button @click="closeUsersModal" class="text-white hover:text-purple-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold text-gray-900">Lista de Usuarios</h3>
            <button @click="showAddUserModal = true" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2">
              <span class="material-icons text-sm">person_add</span>
              Agregar Usuario
            </button>
          </div>

          <div v-if="isLoadingUsers" class="text-center py-8">
            <span class="material-icons animate-spin text-4xl text-gray-400">refresh</span>
            <p class="text-gray-500 mt-2">Cargando usuarios...</p>
          </div>

          <div v-else-if="companyUsers.length === 0" class="text-center py-8">
            <span class="material-icons text-6xl text-gray-300">group</span>
            <p class="text-gray-500 mt-2">No hay usuarios registrados</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="user in companyUsers" :key="user._id" class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                  {{ user.full_name?.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-gray-900">{{ user.full_name }}</p>
                  <p class="text-sm text-gray-500">{{ user.email }}</p>
                </div>
              </div>
              <span :class="['px-3 py-1 rounded-full text-xs font-semibold', user.role === 'company_owner' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700']">
                {{ user.role === 'company_owner' ? 'Propietario' : 'Empleado' }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-lg">
          <button @click="closeUsersModal" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- MODAL AGREGAR USUARIO -->
    <div v-if="showAddUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="bg-purple-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h3 class="text-xl font-bold text-white">Agregar Usuario</h3>
          <button @click="showAddUserModal = false" class="text-white hover:text-purple-100">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="createUser" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
              <input v-model="newUserForm.full_name" type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input v-model="newUserForm.email" type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <input v-model="newUserForm.password" type="password" required minlength="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select v-model="newUserForm.role" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="company_employee">Empleado</option>
                <option value="company_owner">Propietario</option>
              </select>
            </div>
          </form>
        </div>

        <div class="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button @click="showAddUserModal = false" type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button @click="createUser" :disabled="isCreatingUser" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <span v-if="isCreatingUser" class="material-icons animate-spin text-sm">refresh</span>
            {{ isCreatingUser ? 'Creando...' : 'Crear Usuario' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiService } from '/services/api'

export default {
  name: 'Company',
  setup() {
    const auth = useAuthStore()

    // Estados principales
    const companies = ref([])
    const selectedCompany = ref(null)
    const companyUsers = ref([])
    const companyStats = ref({})
    
    // Estados de modales
    const showAddCompanyModal = ref(false)
    const showPricingModal = ref(false)
    const showStatsModal = ref(false)
    const showUsersModal = ref(false)
    const showAddUserModal = ref(false)
    
    // Estados de carga
    const isLoading = ref(false)
    const isLoadingUsers = ref(false)
    const isCreatingCompany = ref(false)
    const isCreatingUser = ref(false)
    const isSavingPricing = ref(false)
    
    // Búsqueda y filtros
    const searchQuery = ref('')
    const filters = ref({
      status: '',
      plan: '',
      revenue: ''
    })
    const viewMode = ref('grid') // 'grid' o 'table'
    const sortField = ref('name')
    const sortDirection = ref('asc')
    
    // Formularios
    const newCompanyForm = ref({
      name: '',
      contact_email: '',
      phone: '',
      rut: '',
      address: '',
      plan_type: 'basic',
      price_per_order: 0,
      billing_cycle: 'monthly',
      owner_name: '',
      owner_email: '',
      owner_password: ''
    })
    
    const pricingForm = ref({
      plan_type: 'basic',
      price_per_order: 0,
      billing_cycle: 'monthly',
      pricing_notes: ''
    })
    
    const newUserForm = ref({
      full_name: '',
      email: '',
      password: '',
      role: 'company_employee'
    })

    // Computed properties
    const activeCompaniesCount = computed(() => {
      return companies.value.filter(c => c.is_active).length
    })

    const totalMonthlyOrders = computed(() => {
      return companies.value.reduce((sum, c) => sum + (c.orders_this_month || 0), 0)
    })

    const totalRevenue = computed(() => {
      // Usar monthly_revenue del backend
      return companies.value.reduce((sum, c) => sum + (c.monthly_revenue || 0), 0)
    })

    const filteredCompanies = computed(() => {
      let result = [...companies.value]
      
      // Filtro de búsqueda
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(c => 
          c.name?.toLowerCase().includes(query) ||
          c.contact_email?.toLowerCase().includes(query) ||
          c.rut?.toLowerCase().includes(query)
        )
      }
      
      // Filtro de estado
      if (filters.value.status) {
        result = result.filter(c => 
          filters.value.status === 'active' ? c.is_active : !c.is_active
        )
      }
      
      // Filtro de plan
      if (filters.value.plan) {
        result = result.filter(c => c.plan_type === filters.value.plan)
      }
      
      // Filtro de revenue
      if (filters.value.revenue) {
        result = result.filter(c => {
          const revenue = c.monthly_revenue || 0
          if (filters.value.revenue === 'high') return revenue > 500000
          if (filters.value.revenue === 'medium') return revenue >= 100000 && revenue <= 500000
          if (filters.value.revenue === 'low') return revenue < 100000
          return true
        })
      }
      
      return result
    })

    const sortedCompanies = computed(() => {
      const sorted = [...filteredCompanies.value]
      
      sorted.sort((a, b) => {
        let aValue = a[sortField.value]
        let bValue = b[sortField.value]
        
        // Para revenue usar monthly_revenue del backend
        if (sortField.value === 'revenue') {
          aValue = a.monthly_revenue || 0
          bValue = b.monthly_revenue || 0
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }
        
        if (sortDirection.value === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
      
      return sorted
    })

    const activeFilters = computed(() => {
      const active = []
      if (filters.value.status) {
        active.push({
          key: 'status',
          label: filters.value.status === 'active' ? 'Activas' : 'Inactivas'
        })
      }
      if (filters.value.plan) {
        active.push({
          key: 'plan',
          label: getPlanName(filters.value.plan)
        })
      }
      if (filters.value.revenue) {
        active.push({
          key: 'revenue',
          label: filters.value.revenue === 'high' ? 'Revenue Alto' : 
                 filters.value.revenue === 'medium' ? 'Revenue Medio' : 'Revenue Bajo'
        })
      }
      return active
    })

    // Métodos
    const loadCompanies = async () => {
      try {
        isLoading.value = true
        console.log('📊 Cargando empresas...')
        const response = await apiService.companies.getAll()
        companies.value = response.data || []
        console.log(`✅ ${companies.value.length} empresas cargadas`)
        
        // Log para debug
        if (companies.value.length > 0) {
          console.log('Ejemplo de empresa:', companies.value[0])
        }
      } catch (error) {
        console.error('Error cargando empresas:', error)
        alert('Error al cargar empresas')
      } finally {
        isLoading.value = false
      }
    }

    const openCreateCompanyModal = () => {
      newCompanyForm.value = {
        name: '',
        contact_email: '',
        phone: '',
        rut: '',
        address: '',
        plan_type: 'basic',
        price_per_order: 0,
        billing_cycle: 'monthly',
        owner_name: '',
        owner_email: '',
        owner_password: ''
      }
      showAddCompanyModal.value = true
    }

    const closeCreateCompanyModal = () => {
      showAddCompanyModal.value = false
    }

    const createCompany = async () => {
      try {
        isCreatingCompany.value = true
        await apiService.companies.create(newCompanyForm.value)
        await loadCompanies()
        closeCreateCompanyModal()
      } catch (error) {
        console.error('Error creando empresa:', error)
        alert('Error al crear la empresa: ' + (error.response?.data?.error || error.message))
      } finally {
        isCreatingCompany.value = false
      }
    }

    const selectCompany = (company) => {
      selectedCompany.value = company
    }

    const openPricingModal = (company) => {
      selectedCompany.value = company
      pricingForm.value = {
        plan_type: company.plan_type || 'basic',
        price_per_order: company.price_per_order || 0,
        billing_cycle: company.billing_cycle || 'monthly',
        pricing_notes: company.pricing_notes || ''
      }
      showPricingModal.value = true
    }

    const closePricingModal = () => {
      showPricingModal.value = false
      selectedCompany.value = null
    }

    const savePricing = async () => {
      try {
        isSavingPricing.value = true
        await apiService.companies.update(selectedCompany.value._id, pricingForm.value)
        await loadCompanies()
        closePricingModal()
      } catch (error) {
        console.error('Error guardando pricing:', error)
        alert('Error al guardar pricing')
      } finally {
        isSavingPricing.value = false
      }
    }

    const openStatsModal = async (company) => {
      selectedCompany.value = company
      showStatsModal.value = true
      
      try {
        const response = await apiService.companies.getStats(company._id)
        companyStats.value = response.data || {}
      } catch (error) {
        console.error('Error cargando estadísticas:', error)
        companyStats.value = {
          totalOrders: company.orders_count || 0,
          ordersThisMonth: company.orders_this_month || 0,
          totalRevenue: company.total_revenue || 0,
          monthlyRevenue: company.monthly_revenue || 0
        }
      }
    }

    const closeStatsModal = () => {
      showStatsModal.value = false
      selectedCompany.value = null
      companyStats.value = {}
    }

    const openUsersModal = async (company) => {
      selectedCompany.value = company
      showUsersModal.value = true
      
      try {
        isLoadingUsers.value = true
        const response = await apiService.companies.getUsers(company._id)
        companyUsers.value = response.data || []
      } catch (error) {
        console.error('Error cargando usuarios:', error)
      } finally {
        isLoadingUsers.value = false
      }
    }

    const closeUsersModal = () => {
      showUsersModal.value = false
      selectedCompany.value = null
      companyUsers.value = []
    }

    const createUser = async () => {
      try {
        isCreatingUser.value = true
        const userData = {
          ...newUserForm.value,
          company_id: selectedCompany.value._id
        }
        await apiService.users.create(userData)
        
        // Recargar usuarios
        const response = await apiService.companies.getUsers(selectedCompany.value._id)
        companyUsers.value = response.data || []
        
        showAddUserModal.value = false
        newUserForm.value = {
          full_name: '',
          email: '',
          password: '',
          role: 'company_employee'
        }
      } catch (error) {
        console.error('Error creando usuario:', error)
        alert('Error al crear usuario: ' + (error.response?.data?.error || error.message))
      } finally {
        isCreatingUser.value = false
      }
    }

    const toggleCompanyStatus = async (company) => {
      try {
        await apiService.companies.update(company._id, {
          is_active: !company.is_active
        })
        await loadCompanies()
      } catch (error) {
        console.error('Error cambiando estado:', error)
      }
    }

    const applyFilters = () => {
      // Los filtros se aplican automáticamente a través del computed
    }

    const removeFilter = (key) => {
      filters.value[key] = ''
    }

    const clearAllFilters = () => {
      filters.value = {
        status: '',
        plan: '',
        revenue: ''
      }
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

    // Funciones auxiliares
    const getCompanyInitials = (name) => {
      if (!name) return '??'
      const words = name.split(' ')
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    const getCompanyEmail = (company) => {
      return company.contact_email || 'Sin email'
    }

    const getPlanName = (plan) => {
      const plans = {
        basic: 'Basic',
        pro: 'Pro',
        enterprise: 'Enterprise'
      }
      return plans[plan] || 'N/A'
    }

    const getPlanColor = (plan) => {
      const colors = {
        basic: 'bg-gray-100 text-gray-700',
        pro: 'bg-blue-100 text-blue-700',
        enterprise: 'bg-purple-100 text-purple-700'
      }
      return colors[plan] || 'bg-gray-100 text-gray-700'
    }

    const formatNumber = (num) => {
      return new Intl.NumberFormat('es-CL').format(num || 0)
    }

    const calculateMonthlyRevenue = (company) => {
      // Usar monthly_revenue del backend si existe, si no calcular
      return company.monthly_revenue || ((company.orders_this_month || 0) * (company.price_per_order || 0))
    }

    const getBaseRevenue = (company) => {
      return company.monthly_revenue || 0
    }

    const getTotalPriceWithIVA = (price) => {
      return price * 1.19 // 19% IVA en Chile
    }

    // Lifecycle
    onMounted(() => {
      loadCompanies()
    })

    return {
      // Estados
      companies,
      selectedCompany,
      companyUsers,
      companyStats,
      showAddCompanyModal,
      showPricingModal,
      showStatsModal,
      showUsersModal,
      showAddUserModal,
      isLoading,
      isLoadingUsers,
      isCreatingCompany,
      isCreatingUser,
      isSavingPricing,
      searchQuery,
      filters,
      viewMode,
      sortField,
      sortDirection,
      newCompanyForm,
      pricingForm,
      newUserForm,
      
      // Computed
      activeCompaniesCount,
      totalMonthlyOrders,
      totalRevenue,
      filteredCompanies,
      sortedCompanies,
      activeFilters,
      
      // Métodos
      loadCompanies,
      openCreateCompanyModal,
      closeCreateCompanyModal,
      createCompany,
      selectCompany,
      openPricingModal,
      closePricingModal,
      savePricing,
      openStatsModal,
      closeStatsModal,
      openUsersModal,
      closeUsersModal,
      createUser,
      toggleCompanyStatus,
      applyFilters,
      removeFilter,
      clearAllFilters,
      sortBy,
      getCompanyInitials,
      getCompanyEmail,
      getPlanName,
      getPlanColor,
      formatNumber,
      calculateMonthlyRevenue,
      getBaseRevenue,
      getTotalPriceWithIVA
    }
  }
}
</script>

<style scoped>
.material-icons {
  font-family: 'Material Icons';
  font-size: 24px;
}
</style>