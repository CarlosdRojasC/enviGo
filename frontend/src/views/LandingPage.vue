<template>
  <div class="min-h-screen bg-white">
    
    <!-- ==================== NAVEGACIÓN ==================== -->
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
              Contactar
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
            Contactar
          </a>
        </div>
      </div>
    </nav>

    <!-- ==================== HERO SECTION ==================== -->
    <section id="inicio" class="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <!-- Badge -->
          <div class="inline-flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full mb-6">
            <span class="text-2xl">⚡</span>
            <span class="text-sm font-semibold text-lime-700">Entregas Same-Day • Retiro Gratis desde 4 paquetes</span>
          </div>
          
          <!-- Título Principal -->
          <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Logística de <span class="bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent">Última Milla</span><br/>
            para tu E-commerce
          </h1>
          
          <!-- Descripción -->
          <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Servicio profesional de entregas same-day en Santiago. Conecta tu tienda online, 
            nosotros gestionamos tus entregas con tracking en vivo y prueba de entrega digital.
          </p>
          
          <!-- Botones CTA -->
          <div class="flex flex-wrap gap-4 justify-center mb-12">
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              class="px-8 py-4 bg-lime-500 text-white rounded-lg font-bold hover:bg-lime-600 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>Comenzar Ahora</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a 
              href="#precios"
              @click.prevent="scrollTo('precios')"
              class="px-8 py-4 bg-white text-gray-700 rounded-lg font-bold border-2 border-gray-300 hover:border-lime-500 transition-all flex items-center space-x-2"
            >
              <span>Ver Precios</span>
            </a>
          </div>

          <!-- Stats Banner -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">Same-Day</div>
              <div class="text-sm text-gray-600">Entrega el mismo día</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">Gratis</div>
              <div class="text-sm text-gray-600">Retiro desde 4 paquetes</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">32+</div>
              <div class="text-sm text-gray-600">Comunas RM</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">100%</div>
              <div class="text-sm text-gray-600">Prueba digital</div>
            </div>
          </div>
        </div>
      </div>
    </section>
<section class="py-16 bg-white">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Título de la sección -->
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-gray-900 mb-4">
        Tu centro de control logístico
      </h2>
      <p class="text-lg text-gray-600">
        Gestiona todas tus entregas desde un solo dashboard en tiempo real
      </p>
    </div>

    <!-- Dashboard Preview -->
    <div class="relative">
      
      <!-- Browser Chrome (barra superior) -->
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
        
        <!-- Header del Dashboard -->
        <div class="bg-gradient-to-r from-lime-500 to-green-600 p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold mb-1">Dashboard Principal</h2>
              <p class="text-lime-100 text-sm">Vista en tiempo real de tu operación</p>
            </div>
            <div class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span class="text-sm font-semibold">En vivo</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
          <div 
            v-for="stat in dashboardStats" 
            :key="stat.label"
            class="bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl">{{ stat.icon }}</span>
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', stat.changeClass]">
                {{ stat.change }}
              </span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-1">{{ stat.value }}</div>
            <div class="text-xs text-gray-600">{{ stat.label }}</div>
          </div>
        </div>

        <!-- Orders Table -->
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">Entregas en Curso</h3>
          
          <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Conductor</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr 
                  v-for="order in sampleOrders" 
                  :key="order.id" 
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-4 py-3 font-medium text-gray-900">#{{ order.id }}</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{{ order.customer }}</div>
                    <div class="text-xs text-gray-500">{{ order.address }}</div>
                  </td>
                  <td class="px-4 py-3 text-gray-900 hidden md:table-cell">{{ order.driver }}</td>
                  <td class="px-4 py-3">
                    <span :class="['px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap', order.statusClass]">
                      {{ order.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Quick Actions (opcional) -->
        <div class="p-6 bg-gray-50 border-t border-gray-200">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button class="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
              <span class="text-2xl">📦</span>
              <span class="text-sm font-semibold text-gray-700">Nueva Orden</span>
            </button>
            <button class="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
              <span class="text-2xl">🚗</span>
              <span class="text-sm font-semibold text-gray-700">Conductores</span>
            </button>
            <button class="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
              <span class="text-2xl">📊</span>
              <span class="text-sm font-semibold text-gray-700">Reportes</span>
            </button>
            <button class="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-500 hover:shadow-md transition-all">
              <span class="text-2xl">⚙️</span>
              <span class="text-sm font-semibold text-gray-700">Configuración</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- CTA debajo del dashboard -->
    <div class="text-center mt-8">
      <p class="text-gray-600 mb-4">
        ¿Quieres ver cómo funciona en tu negocio?
      </p>
      <a 
        href="#contacto"
        @click.prevent="scrollTo('contacto')"
        class="inline-flex items-center space-x-2 px-6 py-3 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-all shadow-md hover:shadow-lg"
      >
        <span>Solicitar Información</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </a>
    </div>

  </div>
</section>
  <!-- ==================== SECCIÓN DE PRECIOS ==================== -->
<section id="precios" class="py-20 bg-white border-t border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Título de la sección -->
    <div class="text-center mb-16">
      <h2 class="text-4xl font-bold text-gray-900 mb-4">
        Precios Simples y Transparentes
      </h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        Sin costos ocultos. Paga solo por las entregas que realizas.
      </p>
    </div>

    <!-- Grids de Precios -->
    <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
      
      <!-- ========== Precio por Entrega ========== -->
      <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-8 border-2 border-lime-200">
        <div class="text-center mb-6">
          <div class="text-5xl mb-4">📦</div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Precio por Entrega</h3>
          <p class="text-gray-600">Según zona de destino en Santiago</p>
        </div>
        
        <div class="space-y-4">
          <!-- Zona Centro -->
          <div class="bg-white rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div class="font-semibold text-gray-900">Zona Centro</div>
              <div class="text-sm text-gray-600">Santiago Centro, Providencia, Ñuñoa</div>
            </div>
            <div class="text-2xl font-bold text-lime-600">$2.500</div>
          </div>
          
          <!-- Zona Oriente -->
          <div class="bg-white rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div class="font-semibold text-gray-900">Zona Oriente</div>
              <div class="text-sm text-gray-600">Las Condes, Vitacura, Lo Barnechea</div>
            </div>
            <div class="text-2xl font-bold text-lime-600">$2.500</div>
          </div>
          
          <!-- Zona Sur/Poniente -->
          <div class="bg-white rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div class="font-semibold text-gray-900">Zona Sur/Poniente</div>
              <div class="text-sm text-gray-600">Maipú, La Florida, Puente Alto</div>
            </div>
            <div class="text-2xl font-bold text-lime-600">$2.500</div>
          </div>
        </div>

        <!-- Nota adicional -->
        <div class="mt-6 bg-lime-100 rounded-lg p-4">
          <div class="text-sm text-lime-800 text-center font-medium">
            💡 Precios incluyen tracking, prueba de entrega y notificaciones
          </div>
        </div>
      </div>

      <!-- ========== Retiro Gratis ========== -->
      <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200">
        <div class="text-center mb-6">
          <div class="text-5xl mb-4">🚚</div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Retiro GRATIS</h3>
          <p class="text-gray-600">Cumpliendo estos requisitos</p>
        </div>
        
        <div class="space-y-4">
          <!-- Requisito 1 -->
          <div class="bg-white rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Mínimo 4 paquetes diarios</div>
                <div class="text-sm text-gray-600">Retiramos gratis desde tu bodega u oficina</div>
              </div>
            </div>
          </div>

          <!-- Requisito 2 -->
          <div class="bg-white rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Peso máximo: 12 kg</div>
                <div class="text-sm text-gray-600">Por cada paquete individual</div>
              </div>
            </div>
          </div>

          <!-- Requisito 3 -->
          <div class="bg-white rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Dimensiones máximas</div>
                <div class="text-sm text-gray-600">40cm x 40cm x 40cm por paquete</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Advertencia -->
        <div class="mt-6 bg-blue-100 rounded-lg p-4">
          <div class="text-sm text-blue-800 font-medium text-center">
            ⚠️ Menos de 4 paquetes: cargo por retiro de $3.000
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Características Incluidas ========== -->
    <div class="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
      <h3 class="text-xl font-bold text-gray-900 mb-6 text-center">
        ✨ Incluido en TODOS los envíos
      </h3>
      
      <div class="grid md:grid-cols-3 gap-6">
        <!-- Feature 1 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Tracking en vivo</div>
            <div class="text-sm text-gray-600">GPS actualizado cada 30 seg</div>
          </div>
        </div>

        <!-- Feature 2 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Prueba de entrega</div>
            <div class="text-sm text-gray-600">Foto + firma digital + GPS</div>
          </div>
        </div>

        <!-- Feature 3 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Notificaciones</div>
            <div class="text-sm text-gray-600">Email y WhatsApp automáticos</div>
          </div>
        </div>

        <!-- Feature 4 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Dashboard completo</div>
            <div class="text-sm text-gray-600">Panel de control en tiempo real</div>
          </div>
        </div>

        <!-- Feature 5 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Soporte dedicado</div>
            <div class="text-sm text-gray-600">Equipo disponible por chat</div>
          </div>
        </div>

        <!-- Feature 6 -->
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-semibold text-gray-900">Sin permanencia</div>
            <div class="text-sm text-gray-600">Cancela cuando quieras</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA al final de precios -->
    <div class="text-center mt-12">
      <a 
        href="#contacto"
        @click.prevent="scrollTo('contacto')"
        class="inline-flex items-center space-x-2 px-8 py-4 bg-lime-500 text-white rounded-lg font-bold hover:bg-lime-600 transition-all shadow-lg hover:shadow-xl"
      >
        <span>Solicitar Información</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </a>
    </div>

  </div>
</section>
<!-- ==================== SECCIÓN CÓMO FUNCIONA ==================== -->
<section id="como-funciona" class="py-20 bg-gradient-to-br from-lime-50 to-green-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Título de la sección -->
    <div class="text-center mb-16">
      <h2 class="text-4xl font-bold text-gray-900 mb-4">
        ¿Cómo funciona enviGo?
      </h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        Desde que recibes un pedido hasta la entrega final con prueba digital. Todo automatizado y simple.
      </p>
    </div>

    <div class="space-y-16">

      <!-- ========== PASO 1: Recepción del Pedido ========== -->
      <div class="flex flex-col md:flex-row items-center gap-12">
        <div class="md:w-1/2">
          <div class="inline-flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">1</div>
            <h3 class="text-3xl font-bold text-gray-900">Recepción del Pedido</h3>
          </div>
          
          <p class="text-lg text-gray-600 mb-6 leading-relaxed">
            Tu cliente realiza una compra en tu tienda online. El pedido se sincroniza automáticamente con enviGo. 
            También puedes crear órdenes manualmente o importarlas desde Excel.
          </p>
          
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Sincronización automática</strong> con Shopify, WooCommerce, Mercado Libre</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Importación masiva</strong> desde Excel o CSV</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Creación manual</strong> para pedidos por WhatsApp o Instagram</span>
            </li>
          </ul>
        </div>
        
        <div class="md:w-1/2">
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="text-4xl">🛒</div>
              <div>
                <div class="font-bold text-gray-900">Nuevo Pedido Recibido</div>
                <div class="text-sm text-gray-500">Hace 2 minutos • Shopify</div>
              </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Cliente:</span>
                <span class="font-semibold">María González</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Dirección:</span>
                <span class="font-semibold">Las Condes, RM</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Peso:</span>
                <span class="font-semibold">8kg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Dimensiones:</span>
                <span class="font-semibold">35x35x30cm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== PASO 2: Programación de Retiro ========== -->
      <div class="flex flex-col md:flex-row-reverse items-center gap-12">
        <div class="md:w-1/2">
          <div class="inline-flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">2</div>
            <h3 class="text-3xl font-bold text-gray-900">Programación de Retiro</h3>
          </div>
          
          <p class="text-lg text-gray-600 mb-6 leading-relaxed">
            Defines el horario de retiro desde tu bodega. Nuestro equipo coordina la logística 
            y programa las rutas. Con 4+ paquetes diarios, el retiro es completamente gratis.
          </p>
          
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Horarios flexibles</strong> según tu operación</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Retiro gratis</strong> con 4+ paquetes (máx 12kg, 40x40x40cm)</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Confirmación inmediata</strong> del retiro programado</span>
            </li>
          </ul>
        </div>
        
        <div class="md:w-1/2">
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-4xl">📅</div>
              <div>
                <div class="font-bold text-gray-900">Retiro Programado</div>
                <div class="text-sm text-gray-500">Hoy entre 10:00 - 12:00</div>
              </div>
            </div>
            <div class="space-y-3">
              <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Paquetes:</span>
                  <span class="font-semibold">6 paquetes</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Punto de retiro:</span>
                  <span class="font-semibold">Tu bodega</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Costo retiro:</span>
                  <span class="font-semibold text-lime-600">GRATIS ✓</span>
                </div>
              </div>
              <div class="bg-lime-50 border-l-4 border-lime-500 p-3 rounded">
                <div class="text-sm text-lime-700 font-medium">
                  ✓ Retiro confirmado para hoy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== PASO 3: Recogida de Paquetes ========== -->
      <div class="flex flex-col md:flex-row items-center gap-12">
        <div class="md:w-1/2">
          <div class="inline-flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">3</div>
            <h3 class="text-3xl font-bold text-gray-900">Recogida de Paquetes</h3>
          </div>
          
          <p class="text-lg text-gray-600 mb-6 leading-relaxed">
            Nuestro conductor llega a tu bodega en el horario programado. Recoge los paquetes y escanea cada uno 
            para registrarlos en el sistema. Los paquetes quedan listos para distribución.
          </p>
          
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Escaneo de código de barras</strong> de cada paquete</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Verificación de datos</strong> antes de salir</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Notificación automática</strong> a tus clientes</span>
            </li>
          </ul>
        </div>
        
        <div class="md:w-1/2">
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-4xl">📦</div>
              <div>
                <div class="font-bold text-gray-900">Paquetes Recogidos</div>
                <div class="text-sm text-gray-500">Hace 10 minutos</div>
              </div>
            </div>
            <div class="space-y-4">
              <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div class="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center text-2xl">
                  📍
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-900">Bodega Central</div>
                  <div class="text-xs text-gray-500">6 paquetes escaneados ✓</div>
                </div>
                <svg class="w-5 h-5 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div class="flex items-center space-x-2 text-sm">
                  <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-blue-700 font-medium">Clientes notificados: "Tu pedido está en camino"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== PASO 4: Distribución y Tracking ========== -->
      <div class="flex flex-col md:flex-row-reverse items-center gap-12">
        <div class="md:w-1/2">
          <div class="inline-flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">4</div>
            <h3 class="text-3xl font-bold text-gray-900">Distribución y Tracking</h3>
          </div>
          
          <p class="text-lg text-gray-600 mb-6 leading-relaxed">
            Los paquetes se distribuyen en rutas optimizadas durante el día. Tu cliente recibe un link de tracking 
            para seguir su pedido en tiempo real con GPS.
          </p>
          
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Link de tracking</strong> por email y WhatsApp</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Mapa en vivo</strong> con ubicación actualizada</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Entrega durante el día</strong> en horario hábil</span>
            </li>
          </ul>
        </div>
        
        <div class="md:w-1/2">
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-4xl">📍</div>
              <div>
                <div class="font-bold text-gray-900">Seguimiento en Vivo</div>
                <div class="text-sm text-gray-500">Actualizado hace 30 seg</div>
              </div>
            </div>
            <div class="bg-gray-100 rounded-lg p-8 mb-4 flex items-center justify-center">
              <div class="text-center">
                <div class="text-6xl mb-2">🗺️</div>
                <div class="text-sm text-gray-600">Mapa en tiempo real</div>
              </div>
            </div>
            <div class="bg-lime-50 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-white">
                  🚗
                </div>
                <div>
                  <div class="font-semibold text-gray-900">En ruta de entrega</div>
                  <div class="text-sm text-gray-600">Zona Las Condes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== PASO 5: Entrega y Prueba Digital ========== -->
      <div class="flex flex-col md:flex-row items-center gap-12">
        <div class="md:w-1/2">
          <div class="inline-flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">5</div>
            <h3 class="text-3xl font-bold text-gray-900">Entrega y Prueba Digital</h3>
          </div>
          
          <p class="text-lg text-gray-600 mb-6 leading-relaxed">
            Al llegar al destino, el conductor entrega el paquete y captura foto, firma digital y GPS. 
            Todo queda registrado para protección total contra reclamos.
          </p>
          
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Foto del paquete entregado</strong> en el lugar exacto</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Firma digital</strong> del receptor (nombre y RUT)</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Geolocalización GPS</strong> y timestamp</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700"><strong>Notificación de entrega</strong> al cliente</span>
            </li>
          </ul>
        </div>
        
        <div class="md:w-1/2">
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-4xl">✅</div>
              <div>
                <div class="font-bold text-gray-900">Entrega Completada</div>
                <div class="text-sm text-gray-500">Hoy a las 15:42</div>
              </div>
            </div>
            <div class="space-y-4">
              <div class="bg-gray-100 rounded-lg p-6 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-5xl mb-2">📸</div>
                  <div class="text-xs text-gray-600">Foto de prueba capturada</div>
                </div>
              </div>
              <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Receptor:</span>
                  <span class="font-semibold">María González</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">RUT:</span>
                  <span class="font-semibold">12.345.678-9</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Firma:</span>
                  <span class="font-semibold text-lime-600">✓ Capturada</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">GPS:</span>
                  <span class="font-semibold">-33.4161, -70.6050</span>
                </div>
              </div>
              <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <div class="text-sm text-green-700 font-medium text-center">
                  ✓ Prueba de entrega completa y almacenada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- CTA Final de la sección -->
    <div class="mt-16 text-center">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border-2 border-lime-200">
        <h3 class="text-2xl font-bold text-gray-900 mb-4">
          Entrega same-day en toda la RM
        </h3>
        <p class="text-gray-600 mb-6">
          Los pedidos se entregan el mismo día en horario hábil. Retiro gratis desde 4 paquetes diarios.
        </p>
        <a 
          href="#contacto"
          @click.prevent="scrollTo('contacto')"
          class="inline-flex items-center space-x-2 px-8 py-4 bg-lime-500 text-white rounded-lg font-bold hover:bg-lime-600 transition-all shadow-lg"
        >
          <span>Comenzar Ahora</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>

  </div>
</section>
<section id="contacto" class="py-20 bg-gradient-to-br from-lime-500 to-green-600">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Título de la sección -->
    <div class="text-center mb-12">
      <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
        Comienza a Optimizar tus Entregas Hoy
      </h2>
      <p class="text-xl text-lime-100 max-w-2xl mx-auto">
        Déjanos tus datos y te contactaremos para ofrecerte la mejor solución logística para tu negocio
      </p>
    </div>

    <!-- Formulario -->
    <div class="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Grid de 2 columnas para desktop -->
        <div class="grid md:grid-cols-2 gap-6">
          
          <!-- Nombre -->
          <div>
            <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">
              Nombre completo *
            </label>
            <input 
              v-model="contactForm.name"
              type="text" 
              id="name"
              required
              placeholder="Ej: Juan Pérez"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-semibold text-gray-700 mb-2">
              Email *
            </label>
            <input 
              v-model="contactForm.email"
              type="email" 
              id="email"
              required
              placeholder="tu@email.com"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Empresa -->
          <div>
            <label for="company" class="block text-sm font-semibold text-gray-700 mb-2">
              Empresa *
            </label>
            <input 
              v-model="contactForm.company"
              type="text" 
              id="company"
              required
              placeholder="Nombre de tu empresa"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Teléfono -->
          <div>
            <label for="phone" class="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono *
            </label>
            <input 
              v-model="contactForm.phone"
              type="tel" 
              id="phone"
              required
              placeholder="+56 9 1234 5678"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <!-- Cantidad de pedidos (full width) -->
        <div>
          <label for="monthlyOrders" class="block text-sm font-semibold text-gray-700 mb-2">
            ¿Cuántos pedidos envías al mes? *
          </label>
          <select 
            v-model="contactForm.monthlyOrders"
            id="monthlyOrders"
            required
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors bg-white"
          >
            <option value="" disabled selected>Selecciona una opción</option>
            <option value="0-50">0 - 50 pedidos</option>
            <option value="51-100">51 - 100 pedidos</option>
            <option value="101-200">101 - 200 pedidos</option>
            <option value="201-500">201 - 500 pedidos</option>
            <option value="500+">Más de 500 pedidos</option>
          </select>
        </div>

        <!-- Mensaje -->
        <div>
          <label for="message" class="block text-sm font-semibold text-gray-700 mb-2">
            Mensaje o comentarios (opcional)
          </label>
          <textarea 
            v-model="contactForm.message"
            id="message"
            rows="4"
            placeholder="Cuéntanos sobre tu operación actual, necesidades específicas, etc."
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Botón de envío -->
        <div class="pt-4">
          <button 
            type="submit"
            class="w-full py-4 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2"
          >
            <span>Enviar Solicitud</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        <!-- Texto legal pequeño -->
        <p class="text-xs text-gray-500 text-center">
          Al enviar este formulario, aceptas que enviGo se ponga en contacto contigo para ofrecerte información sobre nuestros servicios.
        </p>
      </form>
    </div>

    <!-- Información adicional debajo del formulario -->
    <div class="grid md:grid-cols-3 gap-8 mt-12 text-white">
      
      <!-- Feature 1 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">🚚</div>
        <div class="font-bold text-lg mb-2">Retiro Gratis</div>
        <div class="text-sm text-lime-100">Desde 4 paquetes diarios</div>
      </div>

      <!-- Feature 2 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">⚡</div>
        <div class="font-bold text-lg mb-2">Same-Day</div>
        <div class="text-sm text-lime-100">Entrega el mismo día</div>
      </div>

      <!-- Feature 3 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">💬</div>
        <div class="font-bold text-lg mb-2">Respuesta Rápida</div>
        <div class="text-sm text-lime-100">Te contactamos en 24 horas</div>
      </div>
    </div>

    <!-- Métodos de contacto alternativos -->
    <div class="mt-12 text-center">
      <p class="text-white mb-4 font-semibold">¿Prefieres contactarnos directamente?</p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a 
          href="mailto:contacto@envigo.cl"
          class="px-6 py-3 bg-white text-lime-600 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center space-x-2"
        >
          <span>✉️</span>
          <span>contacto@envigo.cl</span>
        </a>
        <a 
          href="tel:+56912345678"
          class="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border-2 border-white/30 hover:bg-white/20 transition-all flex items-center space-x-2"
        >
          <span>📞</span>
          <span>+56 9 1234 5678</span>
        </a>
      </div>
    </div>

  </div>
</section>
<section id="contacto" class="py-20 bg-gradient-to-br from-lime-500 to-green-600">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Título de la sección -->
    <div class="text-center mb-12">
      <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
        Comienza a Optimizar tus Entregas Hoy
      </h2>
      <p class="text-xl text-lime-100 max-w-2xl mx-auto">
        Déjanos tus datos y te contactaremos para ofrecerte la mejor solución logística para tu negocio
      </p>
    </div>

    <!-- Formulario -->
    <div class="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Grid de 2 columnas para desktop -->
        <div class="grid md:grid-cols-2 gap-6">
          
          <!-- Nombre -->
          <div>
            <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">
              Nombre completo *
            </label>
            <input 
              v-model="contactForm.name"
              type="text" 
              id="name"
              required
              placeholder="Ej: Juan Pérez"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-semibold text-gray-700 mb-2">
              Email *
            </label>
            <input 
              v-model="contactForm.email"
              type="email" 
              id="email"
              required
              placeholder="tu@email.com"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Empresa -->
          <div>
            <label for="company" class="block text-sm font-semibold text-gray-700 mb-2">
              Empresa *
            </label>
            <input 
              v-model="contactForm.company"
              type="text" 
              id="company"
              required
              placeholder="Nombre de tu empresa"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>

          <!-- Teléfono -->
          <div>
            <label for="phone" class="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono *
            </label>
            <input 
              v-model="contactForm.phone"
              type="tel" 
              id="phone"
              required
              placeholder="+56 9 1234 5678"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <!-- Cantidad de pedidos (full width) -->
        <div>
          <label for="monthlyOrders" class="block text-sm font-semibold text-gray-700 mb-2">
            ¿Cuántos pedidos envías al mes? *
          </label>
          <select 
            v-model="contactForm.monthlyOrders"
            id="monthlyOrders"
            required
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors bg-white"
          >
            <option value="" disabled selected>Selecciona una opción</option>
            <option value="0-50">0 - 50 pedidos</option>
            <option value="51-100">51 - 100 pedidos</option>
            <option value="101-200">101 - 200 pedidos</option>
            <option value="201-500">201 - 500 pedidos</option>
            <option value="500+">Más de 500 pedidos</option>
          </select>
        </div>

        <!-- Mensaje -->
        <div>
          <label for="message" class="block text-sm font-semibold text-gray-700 mb-2">
            Mensaje o comentarios (opcional)
          </label>
          <textarea 
            v-model="contactForm.message"
            id="message"
            rows="4"
            placeholder="Cuéntanos sobre tu operación actual, necesidades específicas, etc."
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Botón de envío -->
        <div class="pt-4">
          <button 
            type="submit"
            class="w-full py-4 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2"
          >
            <span>Enviar Solicitud</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        <!-- Texto legal pequeño -->
        <p class="text-xs text-gray-500 text-center">
          Al enviar este formulario, aceptas que enviGo se ponga en contacto contigo para ofrecerte información sobre nuestros servicios.
        </p>
      </form>
    </div>

    <!-- Información adicional debajo del formulario -->
    <div class="grid md:grid-cols-3 gap-8 mt-12 text-white">
      
      <!-- Feature 1 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">🚚</div>
        <div class="font-bold text-lg mb-2">Retiro Gratis</div>
        <div class="text-sm text-lime-100">Desde 4 paquetes diarios</div>
      </div>

      <!-- Feature 2 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">⚡</div>
        <div class="font-bold text-lg mb-2">Same-Day</div>
        <div class="text-sm text-lime-100">Entrega el mismo día</div>
      </div>

      <!-- Feature 3 -->
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3">💬</div>
        <div class="font-bold text-lg mb-2">Respuesta Rápida</div>
        <div class="text-sm text-lime-100">Te contactamos en 24 horas</div>
      </div>
    </div>

    <!-- Métodos de contacto alternativos -->
    <div class="mt-12 text-center">
      <p class="text-white mb-4 font-semibold">¿Prefieres contactarnos directamente?</p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a 
          href="mailto:contacto@envigo.cl"
          class="px-6 py-3 bg-white text-lime-600 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center space-x-2"
        >
          <span>✉️</span>
          <span>contacto@envigo.cl</span>
        </a>
        <a 
          href="tel:+56912345678"
          class="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border-2 border-white/30 hover:bg-white/20 transition-all flex items-center space-x-2"
        >
          <span>📞</span>
          <span>+56 9 1234 5678</span>
        </a>
      </div>
    </div>

  </div>
</section>
  </div>
  <!-- ==================== DASHBOARD PREVIEW ==================== -->
<!-- Esta sección va DESPUÉS del Hero y ANTES de Precios -->


</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ==================== STATE ====================
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

// ==================== NAVIGATION ====================
const navItems = ref([
  { id: 'inicio', label: 'Inicio' },
  { id: 'precios', label: 'Precios' },
  { id: 'como-funciona', label: 'Cómo Funciona' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'contacto', label: 'Contacto' }
])

// ==================== DASHBOARD STATS ====================
const dashboardStats = ref([
  { 
    icon: '📦', 
    label: 'En Ruta', 
    value: '42', 
    change: '+12%', 
    changeClass: 'bg-green-100 text-green-700' 
  },
  { 
    icon: '✅', 
    label: 'Entregados Hoy', 
    value: '156', 
    change: '+8%', 
    changeClass: 'bg-green-100 text-green-700' 
  },
  { 
    icon: '🚗', 
    label: 'Conductores', 
    value: '8', 
    change: '100%', 
    changeClass: 'bg-blue-100 text-blue-700' 
  },
  { 
    icon: '⏱️', 
    label: 'Entrega', 
    value: 'Same-Day', 
    change: '⚡', 
    changeClass: 'bg-lime-100 text-lime-700' 
  }
])

// ==================== SAMPLE ORDERS ====================
const sampleOrders = ref([
  { 
    id: '2845', 
    customer: 'María González', 
    address: 'Las Condes, RM', 
    driver: 'Juan Pérez', 
    status: 'En camino', 
    statusClass: 'bg-blue-100 text-blue-700' 
  },
  { 
    id: '2844', 
    customer: 'Pedro Rodríguez', 
    address: 'Providencia, RM', 
    driver: 'Ana Silva', 
    status: 'Entregado', 
    statusClass: 'bg-green-100 text-green-700' 
  },
  { 
    id: '2843', 
    customer: 'Carmen López', 
    address: 'Ñuñoa, RM', 
    driver: 'Carlos Díaz', 
    status: 'En ruta', 
    statusClass: 'bg-yellow-100 text-yellow-700' 
  }
])

// ==================== FEATURES ====================
const features = ref([
  {
    emoji: '🔄',
    title: 'Sincronización Automática',
    description: 'Conecta Shopify, WooCommerce o Mercado Libre. Pedidos sincronizados automáticamente.',
    tags: ['Shopify', 'WooCommerce', 'Mercado Libre']
  },
  {
    emoji: '🗺️',
    title: 'Optimización de Rutas',
    description: 'Rutas eficientes para entregas durante el día. Máxima cobertura en Santiago.',
    tags: ['GPS', 'Eficiencia', 'Multi-zona']
  },
  {
    emoji: '📱',
    title: 'App Móvil Conductores',
    description: 'App profesional para gestión de entregas y captura de pruebas digitales.',
    tags: ['iOS', 'Android', 'Offline']
  },
  {
    emoji: '📷',
    title: 'Prueba de Entrega',
    description: 'Foto + firma digital + GPS en cada entrega. Protección total contra reclamos.',
    tags: ['Foto', 'Firma', 'GPS']
  },
  {
    emoji: '📊',
    title: 'Analytics Avanzado',
    description: 'Métricas en tiempo real: costos por zona, tiempos de entrega, performance.',
    tags: ['Reportes', 'KPIs', 'Excel']
  },
  {
    emoji: '👥',
    title: 'Multi-empresa',
    description: 'Gestiona múltiples empresas desde una cuenta. Facturación separada.',
    tags: ['Multi-tenant', 'Roles', 'Permisos']
  }
])

// ==================== INTEGRATIONS ====================
const integrations = ref([
  { 
    name: 'Shopify', 
    emoji: '🛒', 
    status: '✅ Activo', 
    statusClass: 'available' 
  },
  { 
    name: 'WooCommerce', 
    emoji: '🌐', 
    status: '✅ Activo', 
    statusClass: 'available' 
  },
  { 
    name: 'Mercado Libre', 
    emoji: '🛍️', 
    status: '✅ Activo', 
    statusClass: 'available' 
  },
  { 
    name: 'Excel/CSV', 
    emoji: '📄', 
    status: '✅ Activo', 
    statusClass: 'available' 
  },
  { 
    name: 'WhatsApp', 
    emoji: '💬', 
    status: '🚀 Próximo', 
    statusClass: 'coming-soon' 
  }
])

// ==================== CONTACT FORM ====================
const contactForm = ref({
  name: '',
  email: '',
  company: '',
  phone: '',
  monthlyOrders: '',
  message: ''
})

// ==================== METHODS ====================

// Scroll suave a sección
const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Toggle menú móvil
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  document.body.style.overflow = mobileMenuOpen.value ? 'hidden' : ''
}

// Scroll y cerrar menú móvil
const mobileScrollTo = (elementId) => {
  scrollTo(elementId)
  toggleMobileMenu()
}

// Detectar scroll para navbar
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

// Manejar envío del formulario de contacto
const handleSubmit = async () => {
  try {
    console.log('Formulario enviado:', contactForm.value)
    
    // Aquí puedes agregar la lógica para enviar al backend
    // Ejemplo con fetch:
    /*
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactForm.value)
    })
    
    if (response.ok) {
      alert('¡Gracias! Hemos recibido tu solicitud. Te contactaremos pronto.')
    } else {
      alert('Hubo un error. Por favor intenta nuevamente.')
    }
    */
    
    // Por ahora solo mostramos un mensaje de éxito
    alert('¡Gracias! Hemos recibido tu solicitud. Te contactaremos pronto.')
    
    // Limpiar el formulario
    contactForm.value = {
      name: '',
      email: '',
      company: '',
      phone: '',
      monthlyOrders: '',
      message: ''
    }
  } catch (error) {
    console.error('Error al enviar formulario:', error)
    alert('Hubo un error al enviar el formulario. Por favor intenta nuevamente.')
  }
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Smooth scroll global */
html {
  scroll-behavior: smooth;
}

/* Scrollbar personalizado */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #84cc16;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #65a30d;
}
</style>