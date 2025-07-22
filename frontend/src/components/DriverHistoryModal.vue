<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content history-modal" @click.stop>
      <!-- Header with Driver Info -->
      <div class="modal-header">
        <div class="driver-header-info">
          <div class="driver-avatar-large">
            <img v-if="driver.avatar || driver.carrierPhoto" :src="driver.avatar || driver.carrierPhoto" :alt="driver.name" />
            <span v-else class="avatar-initials">{{ getInitials(driver.name) }}</span>
            <div class="status-indicator" :class="getStatusClass(driver)">
              <div class="pulse-ring" v-if="driver.status === 'working'"></div>
            </div>
          </div>
          <div class="driver-details">
            <h2 class="driver-name">{{ driver.name }}</h2>
            <p class="driver-email">{{ driver.email }}</p>
            <div class="driver-meta">
              <span class="meta-item">
                <i class="icon-truck"></i>
                {{ getVehicleIcon(driver.vehicleType || driver.vehicle_type) }} {{ driver.vehicleType || driver.vehicle_type }}
              </span>
              <span class="meta-item">
                <i class="icon-calendar"></i>
                Conductor desde {{ formatDate(driver.createdAt || new Date()) }}
              </span>
              <span class="meta-item" v-if="driver.zone">
                <i class="icon-map-pin"></i>
                {{ driver.zone }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button @click="exportReport" class="btn-export">
            <i class="icon-download"></i>
            Exportar
          </button>
          <button @click="$emit('close')" class="btn-close">
            <i class="icon-x"></i>
          </button>
        </div>
      </div>

      <!-- Quick Stats Bar -->
      <div class="quick-stats-bar">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalDeliveries }}</div>
          <div class="stat-label">Entregas</div>
          <div class="stat-trend positive">+{{ stats.deliveriesGrowth }}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.efficiency }}%</div>
          <div class="stat-label">Eficiencia</div>
          <div class="stat-trend" :class="stats.efficiencyTrend">{{ stats.efficiencyChange }}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.rating }}/5</div>
          <div class="stat-label">Rating</div>
          <div class="stat-subtitle">{{ stats.totalRatings }} reseñas</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${{ formatCurrency(stats.totalEarnings) }}</div>
          <div class="stat-label">Ganancias</div>
          <div class="stat-subtitle">Total acumulado</div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-navigation">
        <div class="tabs-container">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            @click="activeTab = tab.key"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
            <span v-if="tab.count !== null" class="tab-badge">{{ tab.count }}</span>
          </button>
        </div>
        <div class="tab-indicator" :style="{ transform: `translateX(${tabIndicatorPosition}px)` }"></div>
      </div>

      <!-- Tab Content -->
      <div class="modal-body">
        <!-- Overview Tab -->
        <div v-show="activeTab === 'overview'" class="tab-content overview-tab">
          <div class="content-grid">
            <!-- Performance Chart -->
            <div class="chart-section">
              <div class="section-header">
                <h3>📈 Rendimiento Mensual</h3>
                <div class="chart-controls">
                  <select v-model="chartPeriod" class="chart-select">
                    <option value="6m">Últimos 6 meses</option>
                    <option value="1y">Último año</option>
                    <option value="all">Todo el tiempo</option>
                  </select>
                </div>
              </div>
              <div class="performance-chart">
                <canvas ref="performanceChart" width="400" height="200"></canvas>
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="activity-section">
              <div class="section-header">
                <h3>🕒 Actividad Reciente</h3>
                <button @click="refreshActivity" class="btn-refresh" :class="{ spinning: refreshingActivity }">
                  <i class="icon-refresh"></i>
                </button>
              </div>
              <div class="activity-timeline">
                <div 
                  v-for="activity in recentActivities" 
                  :key="activity.id"
                  class="activity-item"
                  :class="activity.type"
                >
                  <div class="activity-time">{{ formatTimeAgo(activity.timestamp) }}</div>
                  <div class="activity-icon">
                    <i :class="getActivityIcon(activity.type)"></i>
                  </div>
                  <div class="activity-content">
                    <div class="activity-title">{{ activity.title }}</div>
                    <div class="activity-description">{{ activity.description }}</div>
                    <div class="activity-metadata" v-if="activity.metadata">
                      <span v-for="(value, key) in activity.metadata" :key="key" class="metadata-item">
                        {{ key }}: {{ value }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="recentActivities.length === 0" class="empty-activity">
                <i class="icon-inbox"></i>
                <p>No hay actividad reciente</p>
              </div>
            </div>

            <!-- Performance Metrics -->
            <div class="metrics-section">
              <h3>📊 Métricas Detalladas</h3>
              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-header">
                    <i class="icon-target"></i>
                    <span>Puntualidad</span>
                  </div>
                  <div class="metric-value">{{ performance.punctuality }}%</div>
                  <div class="metric-bar">
                    <div class="bar-fill" :style="{ width: performance.punctuality + '%' }"></div>
                  </div>
                  <div class="metric-subtitle">{{ performance.onTimeDeliveries }} de {{ performance.totalDeliveries }} a tiempo</div>
                </div>

                <div class="metric-card">
                  <div class="metric-header">
                    <i class="icon-zap"></i>
                    <span>Velocidad Promedio</span>
                  </div>
                  <div class="metric-value">{{ performance.avgSpeed }} km/h</div>
                  <div class="metric-comparison">
                    <span class="comparison-label">vs Promedio:</span>
                    <span class="comparison-value" :class="performance.speedComparison > 0 ? 'positive' : 'negative'">
                      {{ performance.speedComparison > 0 ? '+' : '' }}{{ performance.speedComparison }}%
                    </span>
                  </div>
                </div>

                <div class="metric-card">
                  <div class="metric-header">
                    <i class="icon-repeat"></i>
                    <span>Tasa de Reintento</span>
                  </div>
                  <div class="metric-value">{{ performance.retryRate }}%</div>
                  <div class="metric-bar error">
                    <div class="bar-fill" :style="{ width: performance.retryRate + '%' }"></div>
                  </div>
                  <div class="metric-subtitle">{{ performance.failedDeliveries }} entregas fallidas</div>
                </div>

                <div class="metric-card">
                  <div class="metric-header">
                    <i class="icon-thumbs-up"></i>
                    <span>Satisfacción Cliente</span>
                  </div>
                  <div class="metric-value">{{ performance.customerSatisfaction }}/5</div>
                  <div class="star-rating">
                    <i v-for="star in 5" :key="star" 
                       class="icon-star" 
                       :class="{ filled: star <= Math.floor(performance.customerSatisfaction) }">
                    </i>
                  </div>
                  <div class="metric-subtitle">{{ performance.totalReviews }} evaluaciones</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Deliveries Tab -->
        <div v-show="activeTab === 'deliveries'" class="tab-content deliveries-tab">
          <div class="deliveries-section">
            <div class="section-header">
              <h3>📦 Historial de Entregas</h3>
              <div class="delivery-filters">
                <div class="filter-group">
                  <select v-model="deliveryStatusFilter" class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="completed">✅ Completadas</option>
                    <option value="failed">❌ Fallidas</option>
                    <option value="returned">↩️ Devueltas</option>
                    <option value="cancelled">🚫 Canceladas</option>
                  </select>
                  <input 
                    v-model="deliveryDateFilter" 
                    type="date" 
                    class="filter-date"
                    :max="today"
                  />
                  <input 
                    v-model="deliverySearchQuery" 
                    type="text" 
                    placeholder="Buscar por orden #..." 
                    class="filter-search"
                  />
                </div>
                <button @click="clearDeliveryFilters" class="btn-clear-filters">
                  <i class="icon-filter-x"></i>
                  Limpiar
                </button>
              </div>
            </div>

            <div class="deliveries-stats">
              <div class="stat-pill">
                <span class="stat-number">{{ filteredDeliveries.length }}</span>
                <span class="stat-text">entregas mostradas</span>
              </div>
              <div class="stat-pill">
                <span class="stat-number">{{ completedDeliveries }}</span>
                <span class="stat-text">completadas</span>
              </div>
              <div class="stat-pill">
                <span class="stat-number">{{ failedDeliveries }}</span>
                <span class="stat-text">fallidas</span>
              </div>
            </div>

            <div class="deliveries-list">
              <div 
                v-for="delivery in paginatedDeliveries" 
                :key="delivery.id"
                class="delivery-item"
                :class="delivery.status"
                @click="selectDelivery(delivery)"
              >
                <div class="delivery-header">
                  <div class="delivery-info">
                    <span class="delivery-id">#{{ delivery.orderNumber }}</span>
                    <span class="delivery-status" :class="delivery.status">
                      {{ getDeliveryStatusText(delivery.status) }}
                    </span>
                    <span v-if="delivery.priority" class="delivery-priority" :class="delivery.priority">
                      {{ delivery.priority }}
                    </span>
                  </div>
                  <div class="delivery-date">{{ formatDateTime(delivery.date) }}</div>
                </div>
                
                <div class="delivery-route">
                  <div class="route-point pickup">
                    <i class="icon-package"></i>
                    <div class="point-info">
                      <div class="point-label">Origen</div>
                      <div class="point-address">{{ delivery.pickup }}</div>
                    </div>
                  </div>
                  <div class="route-arrow">
                    <i class="icon-arrow-right"></i>
                  </div>
                  <div class="route-point delivery">
                    <i class="icon-home"></i>
                    <div class="point-info">
                      <div class="point-label">Destino</div>
                      <div class="point-address">{{ delivery.destination }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="delivery-metrics">
                  <div class="metric-item">
                    <i class="icon-clock"></i>
                    <span>{{ delivery.duration }}min</span>
                  </div>
                  <div class="metric-item">
                    <i class="icon-map"></i>
                    <span>{{ delivery.distance }}km</span>
                  </div>
                  <div class="metric-item">
                    <i class="icon-dollar-sign"></i>
                    <span>${{ delivery.earnings }}</span>
                  </div>
                  <div v-if="delivery.rating" class="metric-item rating">
                    <i class="icon-star"></i>
                    <span>{{ delivery.rating }}/5</span>
                  </div>
                </div>

                <div v-if="delivery.notes" class="delivery-notes">
                  <i class="icon-message-circle"></i>
                  <span>{{ delivery.notes }}</span>
                </div>

                <div v-if="delivery.proofOfDelivery" class="delivery-proof">
                  <div class="proof-label">Prueba de entrega:</div>
                  <div class="proof-items">
                    <span v-if="delivery.proofOfDelivery.photo" class="proof-item photo">
                      <i class="icon-camera"></i>Foto
                    </span>
                    <span v-if="delivery.proofOfDelivery.signature" class="proof-item signature">
                      <i class="icon-edit-3"></i>Firma
                    </span>
                    <span v-if="delivery.proofOfDelivery.location" class="proof-item location">
                      <i class="icon-map-pin"></i>GPS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalDeliveryPages > 1" class="deliveries-pagination">
              <button 
                @click="deliveryPage--" 
                :disabled="deliveryPage === 1"
                class="btn-page"
              >
                <i class="icon-chevron-left"></i>
                Anterior
              </button>
              
              <div class="page-numbers">
                <button 
                  v-for="page in visibleDeliveryPages" 
                  :key="page"
                  @click="deliveryPage = page"
                  class="btn-page-num"
                  :class="{ active: deliveryPage === page }"
                >
                  {{ page }}
                </button>
              </div>
              
              <button 
                @click="deliveryPage++" 
                :disabled="deliveryPage === totalDeliveryPages"
                class="btn-page"
              >
                Siguiente
                <i class="icon-chevron-right"></i>
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="filteredDeliveries.length === 0" class="empty-deliveries">
              <div class="empty-icon">📦</div>
              <h4>No se encontraron entregas</h4>
              <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
          </div>
        </div>

        <!-- Schedule Tab -->
        <div v-show="activeTab === 'schedule'" class="tab-content schedule-tab">
          <div class="schedule-section">
            <div class="section-header">
              <h3>📅 Horarios y Disponibilidad</h3>
              <div class="schedule-controls">
                <button @click="viewScheduleType = 'week'" class="btn-view" :class="{ active: viewScheduleType === 'week' }">
                  Semana
                </button>
                <button @click="viewScheduleType = 'month'" class="btn-view" :class="{ active: viewScheduleType === 'month' }">
                  Mes
                </button>
              </div>
            </div>

            <!-- Weekly Schedule View -->
            <div v-if="viewScheduleType === 'week'" class="weekly-schedule">
              <div class="week-navigation">
                <button @click="previousWeek" class="btn-nav-week">
                  <i class="icon-chevron-left"></i>
                </button>
                <span class="week-range">{{ currentWeekRange }}</span>
                <button @click="nextWeek" class="btn-nav-week">
                  <i class="icon-chevron-right"></i>
                </button>
              </div>

              <div class="schedule-grid">
                <div class="schedule-headers">
                  <div class="time-header">Hora</div>
                  <div v-for="day in weekDays" :key="day.key" class="day-header" :class="{ today: day.isToday }">
                    <div class="day-name">{{ day.name }}</div>
                    <div class="day-date">{{ day.date }}</div>
                  </div>
                </div>

                <div class="schedule-body">
                  <div v-for="hour in workingHours" :key="hour" class="time-row">
                    <div class="time-label">{{ formatHour(hour) }}</div>
                    <div v-for="day in weekDays" :key="`${day.key}-${hour}`" class="time-cell" :class="getCellClass(day.key, hour)">
                      <div v-if="hasDelivery(day.key, hour)" class="delivery-indicator" @click="showDeliveryDetails(day.key, hour)">
                        <i class="icon-package"></i>
                        <span class="delivery-count">{{ getDeliveryCount(day.key, hour) }}</span>
                      </div>
                      <div v-else-if="isWorkingTime(day.key, hour)" class="available-indicator">
                        <i class="icon-check"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="schedule-legend">
                <div class="legend-item">
                  <div class="legend-color working"></div>
                  <span>Horario de trabajo</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color delivery"></div>
                  <span>Con entregas</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color break"></div>
                  <span>Descanso</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color off"></div>
                  <span>Fuera de horario</span>
                </div>
              </div>
            </div>

            <!-- Monthly Calendar View -->
            <div v-if="viewScheduleType === 'month'" class="monthly-calendar">
              <div class="month-navigation">
                <button @click="previousMonth" class="btn-nav-month">
                  <i class="icon-chevron-left"></i>
                </button>
                <span class="month-year">{{ currentMonthYear }}</span>
                <button @click="nextMonth" class="btn-nav-month">
                  <i class="icon-chevron-right"></i>
                </button>
              </div>

              <div class="calendar-grid">
                <div class="calendar-headers">
                  <div v-for="day in dayHeaders" :key="day" class="calendar-day-header">{{ day }}</div>
                </div>
                <div class="calendar-body">
                  <div 
                    v-for="date in calendarDates" 
                    :key="date.date"
                    class="calendar-date"
                    :class="{ 
                      today: date.isToday,
                      'other-month': date.otherMonth,
                      'has-deliveries': date.deliveries > 0,
                      'work-day': date.isWorkDay
                    }"
                    @click="selectCalendarDate(date)"
                  >
                    <div class="date-number">{{ date.day }}</div>
                    <div v-if="date.deliveries > 0" class="date-deliveries">{{ date.deliveries }}</div>
                    <div v-if="date.isWorkDay" class="work-indicator"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Time Off Requests -->
            <div class="time-off-section">
              <div class="section-header">
                <h4>🏖️ Solicitudes de Tiempo Libre</h4>
                <button @click="showNewTimeOffForm = true" class="btn-add-time-off">
                  <i class="icon-plus"></i>
                  Nueva Solicitud
                </button>
              </div>
              
              <div class="time-off-list">
                <div 
                  v-for="request in timeOffRequests" 
                  :key="request.id"
                  class="time-off-item"
                  :class="request.status"
                >
                  <div class="request-info">
                    <div class="request-dates">
                      <i class="icon-calendar"></i>
                      {{ formatDateRange(request.startDate, request.endDate) }}
                    </div>
                    <div class="request-reason">{{ request.reason }}</div>
                    <div class="request-type">{{ request.type }}</div>
                  </div>
                  <div class="request-status" :class="request.status">
                    <i :class="getTimeOffStatusIcon(request.status)"></i>
                    {{ getTimeOffStatusText(request.status) }}
                  </div>
                  <div class="request-actions">
                    <button v-if="request.status === 'pending'" @click="cancelTimeOffRequest(request.id)" class="btn-cancel-request">
                      <i class="icon-x"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="timeOffRequests.length === 0" class="empty-time-off">
                <i class="icon-sun"></i>
                <p>No hay solicitudes de tiempo libre</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Earnings Tab -->
        <div v-show="activeTab === 'earnings'" class="tab-content earnings-tab">
          <div class="earnings-section">
            <div class="section-header">
              <h3>💰 Historial de Ganancias</h3>
              <div class="earnings-controls">
                <select v-model="earningsPeriod" class="period-select">
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="quarter">Este trimestre</option>
                  <option value="year">Este año</option>
                </select>
              </div>
            </div>

            <!-- Earnings Summary -->
            <div class="earnings-summary">
              <div class="summary-cards">
                <div class="earnings-card primary">
                  <div class="card-icon">💵</div>
                  <div class="card-content">
                    <div class="card-title">Total Período</div>
                    <div class="card-value">${{ formatCurrency(earnings.periodTotal) }}</div>
                    <div class="card-change" :class="earnings.periodGrowth >= 0 ? 'positive' : 'negative'">
                      <i :class="earnings.periodGrowth >= 0 ? 'icon-trending-up' : 'icon-trending-down'"></i>
                      {{ Math.abs(earnings.periodGrowth) }}% vs anterior
                    </div>
                  </div>
                </div>

                <div class="earnings-card success">
                  <div class="card-icon">📈</div>
                  <div class="card-content">
                    <div class="card-title">Promedio Diario</div>
                    <div class="card-value">${{ formatCurrency(earnings.dailyAverage) }}</div>
                    <div class="card-subtitle">Últimos {{ earnings.activeDays }} días activos</div>
                  </div>
                </div>

                <div class="earnings-card info">
                  <div class="card-icon">🎯</div>
                  <div class="card-content">
                    <div class="card-title">Meta Mensual</div>
                    <div class="card-value">{{ earnings.monthlyProgress }}%</div>
                    <div class="card-subtitle">${{ formatCurrency(earnings.monthlyGoal) }} objetivo</div>
                  </div>
                </div>

                <div class="earnings-card warning">
                  <div class="card-icon">⚡</div>
                  <div class="card-content">
                    <div class="card-title">Por Entrega</div>
                    <div class="card-value">${{ formatCurrency(earnings.perDelivery) }}</div>
                    <div class="card-subtitle">Promedio actual</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Earnings Chart -->
            <div class="earnings-chart-section">
              <div class="chart-container">
                <canvas ref="earningsChart" width="600" height="300"></canvas>
              </div>
            </div>

            <!-- Earnings Breakdown -->
            <div class="earnings-breakdown">
              <h4>Desglose de Ingresos</h4>
              <div class="breakdown-list">
                <div 
                  v-for="category in earningsBreakdown" 
                  :key="category.name"
                  class="breakdown-item"
                >
                  <div class="breakdown-info">
                    <div class="category-name">{{ category.name }}</div>
                    <div class="category-description">{{ category.description }}</div>
                  </div>
                  <div class="breakdown-bar">
                    <div 
                      class="bar-fill"
                      :style="{ 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color 
                      }"
                    ></div>
                  </div>
                  <div class="breakdown-values">
                    <span class="category-amount">${{ formatCurrency(category.amount) }}</span>
                    <span class="category-percentage">{{ category.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Payments -->
            <div class="payments-section">
              <h4>💳 Pagos Recientes</h4>
              <div class="payments-list">
                <div 
                  v-for="payment in recentPayments" 
                  :key="payment.id"
                  class="payment-item"
                  :class="payment.status"
                >
                  <div class="payment-info">
                    <div class="payment-date">
                      <i class="icon-calendar"></i>
                      {{ formatDate(payment.date) }}
                    </div>
                    <div class="payment-description">{{ payment.description }}</div>
                    <div class="payment-method">{{ payment.method }}</div>
                  </div>
                  <div class="payment-amount">${{ formatCurrency(payment.amount) }}</div>
                  <div class="payment-status" :class="payment.status">
                    <i :class="getPaymentStatusIcon(payment.status)"></i>
                    {{ getPaymentStatusText(payment.status) }}
                  </div>
                </div>
              </div>

              <div v-if="recentPayments.length === 0" class="empty-payments">
                <i class="icon-credit-card"></i>
                <p>No hay pagos registrados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delivery Detail Modal -->
      <div v-if="selectedDelivery" class="delivery-detail-modal" @click="selectedDelivery = null">
        <div class="delivery-detail-content" @click.stop>
          <div class="detail-header">
            <h3>Detalle de Entrega #{{ selectedDelivery.orderNumber }}</h3>
            <button @click="selectedDelivery = null" class="btn-close-detail">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <div class="detail-body">
            <div class="detail-section">
              <h4>📍 Ruta</h4>
              <div class="route-details">
                <div class="route-point">
                  <strong>Origen:</strong> {{ selectedDelivery.pickup }}
                </div>
                <div class="route-point">
                  <strong>Destino:</strong> {{ selectedDelivery.destination }}
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedDelivery.timeline">
              <h4>⏱️ Timeline</h4>
              <div class="timeline">
                <div v-for="event in selectedDelivery.timeline" :key="event.id" class="timeline-event">
                  <div class="event-time">{{ formatTime(event.timestamp) }}</div>
                  <div class="event-description">{{ event.description }}</div>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedDelivery.proofOfDelivery">
              <h4>📸 Prueba de Entrega</h4>
              <div class="proof-details">
                <div v-if="selectedDelivery.proofOfDelivery.photo" class="proof-photo">
                  <img :src="selectedDelivery.proofOfDelivery.photo" alt="Prueba de entrega" />
                </div>
                <div v-if="selectedDelivery.proofOfDelivery.signature" class="proof-signature">
                  <strong>Firma:</strong> Recibido por {{ selectedDelivery.proofOfDelivery.receivedBy }}
                </div>
                <div v-if="selectedDelivery.proofOfDelivery.location" class="proof-location">
                  <strong>Ubicación:</strong> 
                  {{ selectedDelivery.proofOfDelivery.location.lat }}, {{ selectedDelivery.proofOfDelivery.location.lng }}
                  <button @click="openLocationMap(selectedDelivery.proofOfDelivery.location)" class="btn-map">
                    <i class="icon-map-pin"></i>
                    Ver en mapa
                  </button>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>💰 Información de Pago</h4>
              <div class="payment-details">
                <div class="payment-row">
                  <span>Tarifa base:</span>
                  <span>${{ selectedDelivery.baseRate || 0 }}</span>
                </div>
                <div class="payment-row">
                  <span>Distancia ({{ selectedDelivery.distance }}km):</span>
                  <span>${{ selectedDelivery.distanceRate || 0 }}</span>
                </div>
                <div class="payment-row" v-if="selectedDelivery.timeBonus">
                  <span>Bono por tiempo:</span>
                  <span>${{ selectedDelivery.timeBonus }}</span>
                </div>
                <div class="payment-row total">
                  <span>Total ganado:</span>
                  <span>${{ selectedDelivery.earnings }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Off Request Modal -->
      <div v-if="showNewTimeOffForm" class="time-off-modal" @click="showNewTimeOffForm = false">
        <div class="time-off-form" @click.stop>
          <div class="form-header">
            <h3>Nueva Solicitud de Tiempo Libre</h3>
            <button @click="showNewTimeOffForm = false" class="btn-close-form">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <form @submit.prevent="submitTimeOffRequest" class="time-off-form-content">
            <div class="form-group">
              <label for="timeOffType">Tipo de solicitud</label>
              <select id="timeOffType" v-model="newTimeOffRequest.type" required>
                <option value="vacation">Vacaciones</option>
                <option value="sick">Licencia médica</option>
                <option value="personal">Día personal</option>
                <option value="emergency">Emergencia</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="startDate">Fecha inicio</label>
                <input id="startDate" v-model="newTimeOffRequest.startDate" type="date" required />
              </div>
              <div class="form-group">
                <label for="endDate">Fecha fin</label>
                <input id="endDate" v-model="newTimeOffRequest.endDate" type="date" required />
              </div>
            </div>

            <div class="form-group">
              <label for="reason">Motivo</label>
              <textarea 
                id="reason" 
                v-model="newTimeOffRequest.reason" 
                placeholder="Describe el motivo de tu solicitud..."
                rows="3"
                required
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="showNewTimeOffForm = false" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-submit" :disabled="submittingTimeOff">
                {{ submittingTimeOff ? 'Enviando...' : 'Enviar Solicitud' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Cargando historial...</p>
        </div>
      </div>
    </div>
  </div>
</template>