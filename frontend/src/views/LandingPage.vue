<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav 
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg' 
          : 'bg-white/95 backdrop-blur-lg'
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <div class="flex items-center">
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-12 w-auto" />
          </div>
          
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-8">
            <a 
              v-for="item in navItems" 
              :key="item.id"
              :href="`#${item.id}`"
              @click.prevent="scrollTo(item.id)"
              class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors"
            >
              {{ item.label }}
            </a>
          </div>
          
          <!-- Desktop Actions -->
          <div class="hidden md:flex items-center space-x-4">
            <router-link 
              to="/login"
              class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors"
            >
              Iniciar Sesión
            </router-link>
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              class="px-6 py-2.5 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-all shadow-md hover:shadow-lg"
            >
              Demo Gratis
            </a>
          </div>
          
          <!-- Mobile Menu Button -->
          <button 
            @click="toggleMobileMenu"
            class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Mobile Menu -->
      <div 
        v-if="mobileMenuOpen"
        class="md:hidden bg-white border-t border-gray-200 shadow-xl"
      >
        <div class="px-4 py-6 space-y-4">
          <a 
            v-for="item in navItems" 
            :key="item.id"
            :href="`#${item.id}`"
            @click="mobileScrollTo(item.id)"
            class="block px-4 py-3 text-gray-700 hover:bg-lime-50 hover:text-lime-600 rounded-lg transition-colors font-medium"
          >
            {{ item.label }}
          </a>
          <router-link 
            to="/login"
            class="block px-4 py-3 text-center bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-semibold"
          >
            Iniciar Sesión
          </router-link>
          <a 
            href="#contacto"
            @click="mobileScrollTo('contacto')"
            class="block px-4 py-3 text-center bg-lime-500 text-white hover:bg-lime-600 rounded-lg transition-colors font-semibold"
          >
            Demo Gratis
          </a>
        </div>
      </div>
    </nav>

    <!-- Hero Section with Dashboard Preview -->
    <section id="inicio" class="pt-32 pb-20 bg-gradient-to-br from-gray-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Hero Content -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full mb-6">
            <span class="text-2xl">🚚</span>
            <span class="text-sm font-semibold text-lime-700">Plataforma de Última Milla</span>
          </div>
          
          <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Gestiona tus entregas <br/>
            <span class="bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent">
              en tiempo real
            </span>
          </h1>
          
          <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Conecta tu e-commerce, asigna conductores automáticamente y monitorea cada entrega. 
            La plataforma todo-en-uno para optimizar tu logística de última milla.
          </p>
          
          <div class="flex flex-wrap gap-4 justify-center mb-16">
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              class="px-8 py-4 bg-lime-500 text-white rounded-lg font-bold hover:bg-lime-600 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>Comenzar Gratis</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a 
              href="#funcionalidades"
              @click.prevent="scrollTo('funcionalidades')"
              class="px-8 py-4 bg-white text-gray-700 rounded-lg font-bold border-2 border-gray-300 hover:border-lime-500 transition-all flex items-center space-x-2"
            >
              <span>Ver Funcionalidades</span>
            </a>
          </div>
        </div>

        <!-- Dashboard Preview - Más grande y prominente -->
        <div class="relative">
          <!-- Browser Chrome -->
          <div class="bg-gray-800 rounded-t-2xl p-3 flex items-center space-x-2">
            <div class="flex space-x-2">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div class="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div class="flex-1 bg-gray-700 rounded-md px-4 py-1 text-xs text-gray-400 text-center">
              app.envigo.cl/dashboard
            </div>
          </div>

          <!-- Dashboard Content -->
          <div class="bg-white rounded-b-2xl shadow-2xl overflow-hidden border-x-4 border-b-4 border-gray-800">
            <!-- Dashboard Header -->
            <div class="bg-gradient-to-r from-lime-500 to-green-600 p-6 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold mb-1">Dashboard Principal</h2>
                  <p class="text-lime-100 text-sm">Bienvenido de vuelta, Admin</p>
                </div>
                <div class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div class="text-xs text-lime-100">Actualización en vivo</div>
                  <div class="flex items-center space-x-1 mt-1">
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span class="text-sm font-semibold">Activo</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
              <div 
                v-for="stat in dashboardStats" 
                :key="stat.label"
                class="bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-3xl">{{ stat.icon }}</span>
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', stat.changeClass]">
                    {{ stat.change }}
                  </span>
                </div>
                <div class="text-3xl font-bold text-gray-900 mb-1">{{ stat.value }}</div>
                <div class="text-sm text-gray-600">{{ stat.label }}</div>
              </div>
            </div>

            <!-- Orders Table -->
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-gray-900">Entregas en Curso</h3>
                <div class="flex items-center space-x-2">
                  <button class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Filtrar
                  </button>
                  <button class="px-3 py-1.5 bg-lime-500 text-white rounded-lg text-sm font-medium hover:bg-lime-600 transition-colors">
                    + Nueva Orden
                  </button>
                </div>
              </div>

              <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Conductor</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="order in sampleOrders" :key="order.id" class="hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">#{{ order.id }}</td>
                      <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900">{{ order.customer }}</div>
                        <div class="text-xs text-gray-500">{{ order.address }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center space-x-2">
                          <div class="w-8 h-8 bg-lime-100 rounded-full flex items-center justify-center text-sm">
                            {{ order.driver.charAt(0) }}
                          </div>
                          <span class="text-sm text-gray-900">{{ order.driver }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <span :class="['px-3 py-1 rounded-full text-xs font-semibold', order.statusClass]">
                          {{ order.status }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <button class="text-lime-600 hover:text-lime-700 text-sm font-medium">
                          Ver mapa →
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="p-6 bg-gray-50 border-t border-gray-200">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button class="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
                  <span class="text-2xl">📦</span>
                  <div class="text-left">
                    <div class="text-sm font-semibold text-gray-900">Crear Orden</div>
                    <div class="text-xs text-gray-500">Nueva entrega</div>
                  </div>
                </button>
                <button class="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
                  <span class="text-2xl">🚗</span>
                  <div class="text-left">
                    <div class="text-sm font-semibold text-gray-900">Conductores</div>
                    <div class="text-xs text-gray-500">8 activos</div>
                  </div>
                </button>
                <button class="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
                  <span class="text-2xl">📊</span>
                  <div class="text-left">
                    <div class="text-sm font-semibold text-gray-900">Reportes</div>
                    <div class="text-xs text-gray-500">Ver analytics</div>
                  </div>
                </button>
                <button class="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
                  <span class="text-2xl">⚙️</span>
                  <div class="text-left">
                    <div class="text-sm font-semibold text-gray-900">Configuración</div>
                    <div class="text-xs text-gray-500">Ajustes</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="funcionalidades" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Todo lo que Necesitas en una Plataforma
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Desde la integración con tu tienda online hasta la entrega final
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="feature in features" 
            :key="feature.title"
            class="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-lime-500 group"
          >
            <div class="w-12 h-12 bg-gradient-to-br from-lime-500 to-green-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              {{ feature.emoji }}
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-600 text-sm mb-4 leading-relaxed">{{ feature.description }}</p>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="tag in feature.tags" 
                :key="tag"
                class="px-2 py-1 bg-lime-50 text-lime-700 rounded-md text-xs font-medium"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Integrations -->
    <section id="integraciones" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Integraciones Nativas
          </h2>
          <p class="text-xl text-gray-600">
            Conecta con las plataformas que ya usas
          </p>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div 
            v-for="integration in integrations" 
            :key="integration.name"
            class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all text-center border border-gray-200 hover:border-lime-400"
          >
            <div class="text-4xl mb-3">{{ integration.emoji }}</div>
            <h4 class="font-bold text-gray-900 mb-1 text-sm">{{ integration.name }}</h4>
            <p :class="[
              'text-xs font-medium',
              integration.statusClass === 'available' ? 'text-lime-600' : 'text-gray-500'
            ]">
              {{ integration.status }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section id="contacto" class="py-20 bg-gradient-to-br from-lime-500 to-green-600 text-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          ¿Listo para Optimizar tus Entregas?
        </h2>
        <p class="text-xl mb-12 text-lime-100">
          Únete a las empresas que ya confían en enviGo para su logística de última milla
        </p>
        
        <div class="flex flex-wrap gap-4 justify-center">
          <a 
            href="mailto:contacto@envigo.cl"
            class="px-8 py-4 bg-white text-lime-600 rounded-lg font-bold hover:bg-gray-100 transition-all shadow-xl flex items-center space-x-2"
          >
            <span>✉️ Solicitar Demo</span>
          </a>
          <a 
            href="tel:+56912345678"
            class="px-8 py-4 bg-lime-600 text-white rounded-lg font-bold border-2 border-white hover:bg-lime-700 transition-all flex items-center space-x-2"
          >
            <span>📞 Llamar Ahora</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-slate-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-10 mb-4" />
            <p class="text-sm">Plataforma de logística de última milla para e-commerce</p>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4 text-sm">Producto</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#funcionalidades" @click.prevent="scrollTo('funcionalidades')" class="hover:text-lime-400 transition-colors">Funcionalidades</a></li>
              <li><a href="#integraciones" @click.prevent="scrollTo('integraciones')" class="hover:text-lime-400 transition-colors">Integraciones</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4 text-sm">Empresa</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-lime-400 transition-colors">Nosotros</a></li>
              <li><a href="#contacto" @click.prevent="scrollTo('contacto')" class="hover:text-lime-400 transition-colors">Contacto</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4 text-sm">Legal</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-lime-400 transition-colors">Términos</a></li>
              <li><a href="#" class="hover:text-lime-400 transition-colors">Privacidad</a></li>
            </ul>
          </div>
        </div>
        
        <div class="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; 2025 enviGo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const navItems = ref([
  { id: 'inicio', label: 'Inicio' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'integraciones', label: 'Integraciones' },
  { id: 'contacto', label: 'Contacto' }
])

const dashboardStats = ref([
  { icon: '📦', label: 'En Ruta', value: '42', change: '+12%', changeClass: 'bg-green-100 text-green-700' },
  { icon: '✅', label: 'Entregados Hoy', value: '156', change: '+8%', changeClass: 'bg-green-100 text-green-700' },
  { icon: '🚗', label: 'Conductores', value: '8', change: '100%', changeClass: 'bg-blue-100 text-blue-700' },
  { icon: '⏱️', label: 'Tiempo Prom.', value: '2.3h', change: '-15%', changeClass: 'bg-lime-100 text-lime-700' }
])

const sampleOrders = ref([
  { id: '2845', customer: 'María González', address: 'Las Condes, RM', driver: 'Juan Pérez', status: 'En camino', statusClass: 'bg-blue-100 text-blue-700' },
  { id: '2844', customer: 'Pedro Rodríguez', address: 'Providencia, RM', driver: 'Ana Silva', status: 'Entregado', statusClass: 'bg-green-100 text-green-700' },
  { id: '2843', customer: 'Carmen López', address: 'Ñuñoa, RM', driver: 'Carlos Díaz', status: 'Recogido', statusClass: 'bg-yellow-100 text-yellow-700' },
  { id: '2842', customer: 'Luis Martínez', address: 'Santiago Centro', driver: 'María Torres', status: 'En camino', statusClass: 'bg-blue-100 text-blue-700' }
])

const features = ref([
  {
    emoji: '🔄',
    title: 'Sincronización Automática',
    description: 'Conecta Shopify, WooCommerce o Mercado Libre. Pedidos sincronizados automáticamente.',
    tags: ['Shopify', 'WooCommerce']
  },
  {
    emoji: '🗺️',
    title: 'Optimización de Rutas',
    description: 'IA que calcula rutas eficientes. Reduce tiempo y costos operacionales.',
    tags: ['IA', 'GPS']
  },
  {
    emoji: '📱',
    title: 'Tracking en Vivo',
    description: 'Clientes siguen pedidos en tiempo real. Notificaciones automáticas.',
    tags: ['Real-time', 'Notificaciones']
  },
  {
    emoji: '📷',
    title: 'Prueba de Entrega',
    description: 'Foto + firma + GPS en cada entrega. Protección contra reclamos.',
    tags: ['Foto', 'Firma', 'GPS']
  },
  {
    emoji: '📊',
    title: 'Analytics Completo',
    description: 'Métricas de rendimiento, costos por zona y KPIs logísticos.',
    tags: ['Reportes', 'KPIs']
  },
  {
    emoji: '👥',
    title: 'Multi-empresa',
    description: 'Gestiona múltiples empresas. Facturación separada y roles independientes.',
    tags: ['Multi-tenant', 'Roles']
  }
])

const integrations = ref([
  { name: 'Shopify', emoji: '🛒', status: '✅ Activo', statusClass: 'available' },
  { name: 'WooCommerce', emoji: '🌐', status: '✅ Activo', statusClass: 'available' },
  { name: 'Mercado Libre', emoji: '🛍️', status: '✅ Activo', statusClass: 'available' },
  { name: 'Excel/CSV', emoji: '📄', status: '✅ Activo', statusClass: 'available' },
  { name: 'WhatsApp', emoji: '💬', status: '🚀 Próximo', statusClass: 'coming-soon' }
])

const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  document.body.style.overflow = mobileMenuOpen.value ? 'hidden' : ''
}

const mobileScrollTo = (elementId) => {
  scrollTo(elementId)
  toggleMobileMenu()
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>