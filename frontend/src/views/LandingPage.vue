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
          <div class="flex items-center">
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-12 w-auto" />
          </div>
          
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

    <!-- Hero Section -->
    <section id="inicio" class="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <div class="inline-flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full mb-6">
            <span class="text-2xl">⚡</span>
            <span class="text-sm font-semibold text-lime-700">Entregas Same-Day • Última Milla Profesional</span>
          </div>
          
          <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Logística de <span class="bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent">Última Milla</span><br/>
            para tu E-commerce
          </h1>
          
          <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Servicio profesional de entregas same-day en Santiago. Conecta tu tienda, nosotros nos encargamos del resto: 
            asignación de conductores, tracking en vivo y prueba de entrega digital.
          </p>
          
          <div class="flex flex-wrap gap-4 justify-center mb-12">
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              class="px-8 py-4 bg-lime-500 text-white rounded-lg font-bold hover:bg-lime-600 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>Comenzar Gratis 14 días</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a 
              href="#como-funciona"
              @click.prevent="scrollTo('como-funciona')"
              class="px-8 py-4 bg-white text-gray-700 rounded-lg font-bold border-2 border-gray-300 hover:border-lime-500 transition-all flex items-center space-x-2"
            >
              <span>¿Cómo Funciona?</span>
            </a>
          </div>

          <!-- Stats Banner -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">Same-Day</div>
              <div class="text-sm text-gray-600">Entrega el mismo día</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">98%</div>
              <div class="text-sm text-gray-600">Entregas exitosas</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">24/7</div>
              <div class="text-sm text-gray-600">Tracking en vivo</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-lime-600 mb-1">100%</div>
              <div class="text-sm text-gray-600">Prueba digital</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dashboard Preview -->
    <section class="py-16 bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Tu centro de control logístico</h2>
          <p class="text-lg text-gray-600">Gestiona todas tus entregas desde un solo dashboard</p>
        </div>

        <div class="relative">
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

          <div class="bg-white rounded-b-2xl shadow-2xl overflow-hidden border-x-4 border-b-4 border-gray-800">
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

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
              <div 
                v-for="stat in dashboardStats" 
                :key="stat.label"
                class="bg-white rounded-xl p-4 shadow-md border border-gray-200"
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

            <div class="p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Entregas en Curso</h3>
              <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Conductor</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="order in sampleOrders" :key="order.id" class="hover:bg-gray-50">
                      <td class="px-4 py-3 font-medium text-gray-900">#{{ order.id }}</td>
                      <td class="px-4 py-3">
                        <div class="font-medium text-gray-900">{{ order.customer }}</div>
                        <div class="text-xs text-gray-500">{{ order.address }}</div>
                      </td>
                      <td class="px-4 py-3 text-gray-900">{{ order.driver }}</td>
                      <td class="px-4 py-3">
                        <span :class="['px-2 py-1 rounded-full text-xs font-semibold', order.statusClass]">
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cómo Funciona - Proceso Detallado -->
    <section id="como-funciona" class="py-20 bg-gradient-to-br from-lime-50 to-green-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            ¿Cómo funciona enviGo?
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Desde que recibes un pedido hasta la entrega final con prueba digital. Todo el proceso optimizado y automatizado.
          </p>
        </div>

        <div class="space-y-16">
          <!-- Step 1 -->
          <div class="flex flex-col md:flex-row items-center gap-12">
            <div class="md:w-1/2">
              <div class="inline-flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">1</div>
                <h3 class="text-3xl font-bold text-gray-900">Recepción del Pedido</h3>
              </div>
              <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                Tu cliente realiza una compra en tu tienda online (Shopify, WooCommerce, Mercado Libre). El pedido se sincroniza automáticamente con enviGo en tiempo real. 
                También puedes crear órdenes manualmente o importarlas desde Excel.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Sincronización automática</strong> con tu e-commerce cada 5 minutos</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Importación masiva</strong> desde archivos Excel o CSV</span>
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
                    <span class="text-gray-600">Productos:</span>
                    <span class="font-semibold">3 items</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Tipo entrega:</span>
                    <span class="font-semibold text-lime-600">Same-Day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="flex flex-col md:flex-row-reverse items-center gap-12">
            <div class="md:w-1/2">
              <div class="inline-flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">2</div>
                <h3 class="text-3xl font-bold text-gray-900">Asignación Inteligente</h3>
              </div>
              <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                Nuestro sistema de inteligencia artificial asigna automáticamente el conductor más cercano y disponible. 
                La ruta se optimiza considerando tráfico en tiempo real, múltiples entregas y ventanas horarias.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Algoritmo de proximidad</strong> encuentra al conductor más cercano (GPS)</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Optimización de rutas</strong> para múltiples entregas en la misma zona</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Consideración de tráfico</strong> y horarios pico en Santiago</span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center space-x-3">
                    <div class="text-4xl">🤖</div>
                    <div>
                      <div class="font-bold text-gray-900">Asignación Automática</div>
                      <div class="text-sm text-gray-500">Procesando...</div>
                    </div>
                  </div>
                  <div class="w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div class="space-y-3">
                  <div class="bg-lime-50 border-l-4 border-lime-500 p-4 rounded">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold">
                        JP
                      </div>
                      <div class="flex-1">
                        <div class="font-bold text-gray-900">Juan Pérez</div>
                        <div class="text-sm text-gray-600">⭐ 4.9 • 1,247 entregas</div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-semibold text-lime-600">2.3 km</div>
                        <div class="text-xs text-gray-500">8 min</div>
                      </div>
                    </div>
                  </div>
                  <div class="text-sm text-gray-600 flex items-center space-x-2">
                    <svg class="w-5 h-5 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Ruta optimizada • 3 entregas en la zona</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
<!-- CONTINUACIÓN DEL TEMPLATE - Agregar después del Step 2 -->

          <!-- Step 3 -->
          <div class="flex flex-col md:flex-row items-center gap-12">
            <div class="md:w-1/2">
              <div class="inline-flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">3</div>
                <h3 class="text-3xl font-bold text-gray-900">Recogida del Paquete</h3>
              </div>
              <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                El conductor recibe la notificación en su app móvil y se dirige a tu bodega o punto de retiro. 
                Escanea el código de barras del paquete para confirmar la recogida y actualizar el estado en tiempo real.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Notificación push</strong> al conductor con detalles de la orden</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Escaneo de código de barras</strong> para confirmar recogida</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Actualización automática</strong> del estado a "En ruta"</span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="text-4xl">📦</div>
                  <div>
                    <div class="font-bold text-gray-900">Paquete Recogido</div>
                    <div class="text-sm text-gray-500">Hace 15 minutos</div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center text-2xl">
                      📍
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-semibold text-gray-900">Bodega Central</div>
                      <div class="text-xs text-gray-500">Av. Las Condes 12345</div>
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
                      <span class="text-blue-700 font-medium">Cliente notificado: "Tu pedido está en camino"</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="flex flex-col md:flex-row-reverse items-center gap-12">
            <div class="md:w-1/2">
              <div class="inline-flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">4</div>
                <h3 class="text-3xl font-bold text-gray-900">Tracking en Tiempo Real</h3>
              </div>
              <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                Tu cliente recibe un link de tracking por email o WhatsApp. Puede ver en un mapa la ubicación exacta del conductor 
                y el tiempo estimado de llegada. Actualizaciones cada 30 segundos con GPS de alta precisión.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Link de tracking único</strong> enviado por email y WhatsApp</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Mapa en vivo</strong> con ubicación del conductor (GPS cada 30seg)</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>ETA actualizado</strong> considerando tráfico en tiempo real</span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="text-4xl">📍</div>
                  <div>
                    <div class="font-bold text-gray-900">Seguimiento en Vivo</div>
                    <div class="text-sm text-gray-500">Actualizado hace 12 segundos</div>
                  </div>
                </div>
                <div class="bg-gray-100 rounded-lg p-4 mb-4 h-48 flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-6xl mb-2">🗺️</div>
                    <div class="text-sm text-gray-600">Mapa en tiempo real</div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-3 bg-lime-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-white">
                        🚗
                      </div>
                      <div>
                        <div class="font-semibold text-gray-900">En camino</div>
                        <div class="text-sm text-gray-600">2.1 km restantes</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-lime-600">12 min</div>
                      <div class="text-xs text-gray-500">ETA estimado</div>
                    </div>
                  </div>
                  <div class="text-xs text-gray-600 text-center">
                    🔔 Recibirás una notificación cuando el conductor esté cerca
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5 -->
          <div class="flex flex-col md:flex-row items-center gap-12">
            <div class="md:w-1/2">
              <div class="inline-flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-xl">5</div>
                <h3 class="text-3xl font-bold text-gray-900">Entrega y Prueba Digital</h3>
              </div>
              <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                Al llegar al destino, el conductor entrega el paquete y captura una foto del producto entregado, 
                la firma digital del receptor en tablet, y las coordenadas GPS exactas. Todo queda registrado con timestamp 
                para protección contra reclamos.
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
                  <span class="text-gray-700"><strong>Geolocalización GPS</strong> y timestamp de la entrega</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Notificación automática</strong> al cliente confirmando entrega</span>
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
                  <div class="bg-gray-100 rounded-lg p-4 h-32 flex items-center justify-center">
                    <div class="text-center">
                      <div class="text-5xl mb-1">📸</div>
                      <div class="text-xs text-gray-600">Foto de prueba</div>
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
                    <div class="text-sm text-green-700 font-medium">
                      ✓ Prueba de entrega completa y almacenada
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA después del proceso -->
        <div class="mt-16 text-center">
          <div class="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border-2 border-lime-200">
            <h3 class="text-2xl font-bold text-gray-900 mb-4">
              Todo este proceso toma solo 2-4 horas
            </h3>
            <p class="text-gray-600 mb-6">
              Con nuestro servicio same-day, los pedidos realizados antes de las 14:00 se entregan el mismo día. 
              Después de esa hora, entrega garantizada al día siguiente.
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

    <!-- Beneficios del Servicio -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            ¿Por qué elegir enviGo?
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Más que un servicio de entregas, somos tu socio logístico estratégico
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-8 border border-lime-200">
            <div class="text-5xl mb-4">⚡</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Entregas Same-Day</h3>
            <p class="text-gray-700 mb-4">
              Pedidos antes de las 14:00 se entregan el mismo día en toda la Región Metropolitana. 
              Velocidad que tus clientes esperan.
            </p>
            <div class="text-sm font-semibold text-lime-600">
              2-4 horas promedio de entrega
            </div>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200">
            <div class="text-5xl mb-4">📍</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Cobertura Total RM</h3>
            <p class="text-gray-700 mb-4">
              Cobertura completa en todas las comunas de Santiago. Desde Las Condes hasta Maipú, 
              Providencia hasta Puente Alto.
            </p>
            <div class="text-sm font-semibold text-blue-600">
              32+ comunas cubiertas
            </div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
            <div class="text-5xl mb-4">🚗</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Conductores Profesionales</h3>
            <p class="text-gray-700 mb-4">
              Flota de conductores capacitados y verificados. Cada conductor pasa por verificación de antecedentes 
              y training de servicio al cliente.
            </p>
            <div class="text-sm font-semibold text-purple-600">
              4.8/5 rating promedio
            </div>
          </div>

          <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-200">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Protección Total</h3>
            <p class="text-gray-700 mb-4">
              Foto + firma + GPS en cada entrega. Evidencia irrefutable contra reclamos falsos. 
              Reduce disputas en un 90%.
            </p>
            <div class="text-sm font-semibold text-orange-600">
              Almacenamiento por 2 años
            </div>
          </div>

          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
            <div class="text-5xl mb-4">💰</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Precios Transparentes</h3>
            <p class="text-gray-700 mb-4">
              Sin costos ocultos ni sorpresas. Tarifas fijas por zona, sin cobros adicionales. 
              Facturación mensual clara y detallada.
            </p>
            <div class="text-sm font-semibold text-green-600">
              Desde $2.990 por entrega
            </div>
          </div>

          <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-200">
            <div class="text-5xl mb-4">📊</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Analytics Completo</h3>
            <p class="text-gray-700 mb-4">
              Dashboard con métricas en tiempo real: entregas por zona, costos operacionales, 
              performance de conductores y más.
            </p>
            <div class="text-sm font-semibold text-indigo-600">
              Reportes exportables a Excel
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="funcionalidades" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Plataforma Completa de Gestión
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Todas las herramientas que necesitas para gestionar tu operación logística
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
    <section id="integraciones" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Integraciones Nativas
          </h2>
          <p class="text-xl text-gray-600">
            Conecta tu e-commerce en minutos sin conocimientos técnicos
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

        <div class="mt-12 text-center">
          <p class="text-gray-600 mb-6">
            ¿No ves tu plataforma? También puedes importar pedidos desde Excel o usar nuestra API
          </p>
          <a href="#contacto" @click.prevent="scrollTo('contacto')" class="text-lime-600 hover:text-lime-700 font-semibold">
            Solicitar integración personalizada →
          </a>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section id="contacto" class="py-20 bg-gradient-to-br from-lime-500 to-green-600 text-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          Comienza a Optimizar tus Entregas Hoy
        </h2>
        <p class="text-xl mb-12 text-lime-100">
          Únete a más de 200 empresas que ya confían en enviGo para su logística de última milla
        </p>
        
        <div class="flex flex-wrap gap-4 justify-center mb-12">
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

        <div class="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto text-left">
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">🎁</div>
            <div class="font-bold mb-1">14 días gratis</div>
            <div class="text-sm text-lime-100">Prueba sin compromiso</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">⚙️</div>
            <div class="font-bold mb-1">Setup en 1 día</div>
            <div class="text-sm text-lime-100">Te ayudamos a configurar</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">💬</div>
            <div class="font-bold mb-1">Soporte 24/7</div>
            <div class="text-sm text-lime-100">Siempre disponibles</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-slate-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-10 mb-4" />
            <p class="text-sm">Servicio profesional de última milla para e-commerce en Chile</p>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4 text-sm">Producto</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#como-funciona" @click.prevent="scrollTo('como-funciona')" class="hover:text-lime-400 transition-colors">Cómo Funciona</a></li>
              <li><a href="#funcionalidades" @click.prevent="scrollTo('funcionalidades')" class="hover:text-lime-400 transition-colors">Funcionalidades</a></li>
              <li><a href="#integraciones" @click.prevent="scrollTo('integraciones')" class="hover:text-lime-400 transition-colors">Integraciones</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4 text-sm">Empresa</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-lime-400 transition-colors">Nosotros</a></li>
              <li><a href="#" class="hover:text-lime-400 transition-colors">Conductores</a></li>
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

// ==================== STATE ====================
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

// ==================== NAVIGATION ====================
const navItems = ref([
  { id: 'inicio', label: 'Inicio' },
  { id: 'como-funciona', label: 'Cómo Funciona' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'integraciones', label: 'Integraciones' },
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
    label: 'Tiempo Prom.', 
    value: '2.3h', 
    change: '-15%', 
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
    status: 'Recogido', 
    statusClass: 'bg-yellow-100 text-yellow-700' 
  }
])

// ==================== FEATURES ====================
const features = ref([
  {
    emoji: '🔄',
    title: 'Sincronización Automática',
    description: 'Conecta Shopify, WooCommerce o Mercado Libre. Pedidos sincronizados cada 5 minutos sin intervención manual.',
    tags: ['Shopify', 'WooCommerce', 'Auto-sync']
  },
  {
    emoji: '🗺️',
    title: 'Optimización de Rutas',
    description: 'IA que calcula las rutas más eficientes considerando tráfico, múltiples entregas y ventanas horarias.',
    tags: ['IA', 'GPS', 'Tráfico']
  },
  {
    emoji: '📱',
    title: 'App Móvil Conductores',
    description: 'App profesional para conductores con navegación GPS, gestión de órdenes y captura de pruebas de entrega.',
    tags: ['iOS', 'Android', 'Offline']
  },
  {
    emoji: '📷',
    title: 'Prueba de Entrega',
    description: 'Foto + firma digital + GPS + timestamp en cada entrega. Evidencia completa contra reclamos.',
    tags: ['Foto', 'Firma', 'GPS']
  },
  {
    emoji: '📊',
    title: 'Analytics Avanzado',
    description: 'Dashboard con métricas en tiempo real: costos por zona, tiempos de entrega, performance de conductores.',
    tags: ['Reportes', 'KPIs', 'Excel']
  },
  {
    emoji: '👥',
    title: 'Multi-empresa',
    description: 'Gestiona múltiples empresas desde una cuenta. Facturación separada, usuarios y roles independientes.',
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

// ==================== METHODS ====================
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
html {
  scroll-behavior: smooth;
}
</style>