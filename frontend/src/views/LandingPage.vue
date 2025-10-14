<template>
  <div class="min-h-screen bg-white">
    
    <!-- ========== NAVEGACIÓN ========== -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <div class="flex items-center">
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-12 w-auto" />
          </div>
          
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-8">
            <a href="#servicios" @click.prevent="scrollTo('servicios')" class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors">Servicios</a>
            <a href="#como-funciona" @click.prevent="scrollTo('como-funciona')" class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors">Cómo Funciona</a>
            <a href="#precios" @click.prevent="scrollTo('precios')" class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors">Precios</a>
          </div>
          
          <!-- Desktop Actions -->
          <div class="hidden md:flex items-center space-x-4">
            <router-link to="/login" class="text-sm font-medium text-gray-700 hover:text-lime-600 transition-colors">
              Iniciar Sesión
            </router-link>
            <a href="#contacto" @click.prevent="scrollTo('contacto')" class="px-6 py-2.5 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-all shadow-md hover:shadow-lg">
              Comenzar
            </a>
          </div>
          
          <!-- Mobile Menu Button -->
          <button @click="toggleMobileMenu" class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Mobile Menu -->
      <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t border-gray-200 shadow-xl">
        <div class="px-4 py-6 space-y-4">
          <a href="#servicios" @click="mobileScrollTo('servicios')" class="block px-4 py-3 text-gray-700 hover:bg-lime-50 hover:text-lime-600 rounded-lg transition-colors font-medium">Servicios</a>
          <a href="#como-funciona" @click="mobileScrollTo('como-funciona')" class="block px-4 py-3 text-gray-700 hover:bg-lime-50 hover:text-lime-600 rounded-lg transition-colors font-medium">Cómo Funciona</a>
          <a href="#precios" @click="mobileScrollTo('precios')" class="block px-4 py-3 text-gray-700 hover:bg-lime-50 hover:text-lime-600 rounded-lg transition-colors font-medium">Precios</a>
          <router-link to="/login" class="block px-4 py-3 text-center bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-semibold">
            Iniciar Sesión
          </router-link>
          <a href="#contacto" @click="mobileScrollTo('contacto')" class="block px-4 py-3 text-center bg-lime-500 text-white hover:bg-lime-600 rounded-lg transition-colors font-semibold">
            Comenzar
          </a>
        </div>
      </div>
    </nav>

    <!-- ========== HERO SECTION ========== -->
    <section id="inicio" class="pt-32 pb-20 bg-gradient-to-br from-lime-50 via-white to-green-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <!-- Badge -->
          <div class="inline-flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full mb-6 animate-bounce">
            <span class="text-2xl">⚡</span>
            <span class="text-sm font-semibold text-lime-700">Entregas Same-Day • Mercado Libre Flex</span>
          </div>
          
          <!-- Título Principal -->
          <h1 class="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Logística de <span class="bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent">Última Milla</span><br/>para tu E-commerce
          </h1>
          
          <!-- Descripción -->
          <p class="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
            Entregas <strong>same-day</strong> en toda la Región Metropolitana.<br/>
            Especialistas en <strong>Mercado Libre Flex</strong> y tiendas online.
          </p>
          
          <!-- Botones CTA -->
          <div class="flex flex-wrap gap-4 justify-center mb-16">
            <a href="#contacto" @click.prevent="scrollTo('contacto')" class="px-8 py-4 bg-lime-500 text-white rounded-xl font-bold text-lg hover:bg-lime-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center space-x-2">
              <span>Comenzar Ahora</span>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="#precios" @click.prevent="scrollTo('precios')" class="px-8 py-4 bg-white text-gray-700 rounded-xl font-bold text-lg border-2 border-gray-300 hover:border-lime-500 hover:shadow-lg transition-all flex items-center space-x-2">
              <span>Ver Precios</span>
            </a>
          </div>

          <!-- Stats Banner -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div class="text-4xl font-bold text-lime-600 mb-2">Same-Day</div>
              <div class="text-sm text-gray-600">Entrega el mismo día</div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div class="text-4xl font-bold text-lime-600 mb-2">Gratis</div>
              <div class="text-sm text-gray-600">Retiro desde 4 paquetes</div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div class="text-4xl font-bold text-lime-600 mb-2">32+</div>
              <div class="text-sm text-gray-600">Comunas RM</div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div class="text-4xl font-bold text-lime-600 mb-2">100%</div>
              <div class="text-sm text-gray-600">Prueba digital</div>
            </div>
          </div>
        </div>
      </div>
    </section>
<section class="py-20 bg-white border-t border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-12">
      <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Números que Hablan</h2>
      <p class="text-xl text-gray-600">Resultados reales de nuestro servicio</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
      <!-- Stat 1 -->
      <div class="text-center bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-8 border-2 border-lime-200 hover:shadow-xl transition-all">
        <div class="text-5xl font-extrabold text-lime-600 mb-3">15,000+</div>
        <div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Entregas Realizadas</div>
        <div class="text-xs text-gray-500 mt-2">En los últimos 12 meses</div>
      </div>

      <!-- Stat 2 -->
      <div class="text-center bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200 hover:shadow-xl transition-all">
        <div class="text-5xl font-extrabold text-blue-600 mb-3">98%</div>
        <div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tasa de Éxito</div>
        <div class="text-xs text-gray-500 mt-2">Entregas completadas exitosamente</div>
      </div>

      <!-- Stat 3 -->
      <div class="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200 hover:shadow-xl transition-all">
        <div class="text-5xl font-extrabold text-purple-600 mb-3">4.8/5</div>
        <div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Satisfacción</div>
        <div class="text-xs text-gray-500 mt-2">Calificación promedio de clientes</div>
      </div>

      <!-- Stat 4 -->
      <div class="text-center bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 border-2 border-orange-200 hover:shadow-xl transition-all">
        <div class="text-5xl font-extrabold text-orange-600 mb-3">&lt;2h</div>
        <div class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tiempo Promedio</div>
        <div class="text-xs text-gray-500 mt-2">Desde retiro hasta entrega</div>
      </div>
    </div>

    <!-- Badge de confianza adicional -->
    <div class="mt-12 flex flex-wrap justify-center gap-6">
      <div class="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-xl border border-gray-200">
        <span class="text-3xl">🛡️</span>
        <div class="text-left">
          <div class="font-bold text-gray-900">Partner Oficial</div>
          <div class="text-sm text-gray-600">Mercado Libre Flex</div>
        </div>
      </div>

      <div class="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-xl border border-gray-200">
        <span class="text-3xl">📱</span>
        <div class="text-left">
          <div class="font-bold text-gray-900">Soporte 7/7</div>
          <div class="text-sm text-gray-600">Días a la semana</div>
        </div>
      </div>

      <div class="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-xl border border-gray-200">
        <span class="text-3xl">🔒</span>
        <div class="text-left">
          <div class="font-bold text-gray-900">100% Seguro</div>
          <div class="text-sm text-gray-600">Datos protegidos</div>
        </div>
      </div>
    </div>
  </div>
</section>
    <!-- ========== SERVICIOS PRINCIPALES ========== -->
    <section id="servicios" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Nuestros Servicios</h2>
          <p class="text-xl text-gray-600">Soluciones logísticas adaptadas a tu negocio</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <!-- Servicio 1: Mercado Libre Flex -->
          <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 border-2 border-yellow-200 hover:shadow-2xl transition-all">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-3xl shadow-lg">🏪</div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">Mercado Libre Flex</h3>
                <p class="text-yellow-700 font-semibold">Partner Oficial</p>
              </div>
            </div>
            <p class="text-gray-700 mb-6 leading-relaxed">
              Somos <strong>operador logístico certificado</strong> de Mercado Libre Flex. 
              Entregamos tus pedidos en toda la RM con tracking en vivo y garantía de entrega same-day.
            </p>
            <ul class="space-y-3">
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Sincronización automática</strong> con tu cuenta ML</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Solo pedidos Flex</strong> - filtrado inteligente</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Cumplimiento de SLA</strong> garantizado</span>
              </li>
            </ul>
          </div>

          <!-- Servicio 2: Same-Day E-commerce -->
          <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-3xl p-8 border-2 border-lime-200 hover:shadow-2xl transition-all">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-16 h-16 bg-lime-400 rounded-2xl flex items-center justify-center text-3xl shadow-lg">⚡</div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">Same-Day E-commerce</h3>
                <p class="text-lime-700 font-semibold">Tiendas Online</p>
              </div>
            </div>
            <p class="text-gray-700 mb-6 leading-relaxed">
              Para tu tienda Shopify, WooCommerce o cualquier plataforma. 
              <strong>Retiro gratis desde tu bodega</strong> y entrega el mismo día en toda la RM.
            </p>
            <ul class="space-y-3">
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-lime-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Integración con tu tienda</strong> (Shopify, WooCommerce)</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-lime-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Retiro gratis</strong> con 4+ paquetes diarios</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-6 h-6 text-lime-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700"><strong>Tracking en vivo</strong> para tus clientes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
<!-- ========== COMPARACIÓN ANTES/DESPUÉS ========== -->
<section class="py-20 bg-gradient-to-br from-gray-50 to-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">El Cambio que Hace la Diferencia</h2>
      <p class="text-xl text-gray-600">Compara tu logística actual con enviGo</p>
    </div>

    <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
      
      <!-- ANTES -->
      <div class="bg-white rounded-3xl p-8 border-2 border-red-200 shadow-lg">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl">❌</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">ANTES</h3>
            <p class="text-red-600 font-semibold">Logística Tradicional</p>
          </div>
        </div>

        <ul class="space-y-4">
          <li class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Entregas lentas</div>
              <div class="text-sm text-gray-600">2 a 5 días hábiles de espera</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Sin visibilidad</div>
              <div class="text-sm text-gray-600">Cliente pregunta "¿dónde está mi pedido?"</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Reclamos constantes</div>
              <div class="text-sm text-gray-600">"No recibí el pedido" sin pruebas</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Gestión manual</div>
              <div class="text-sm text-gray-600">Excel, WhatsApp, llamadas telefónicas</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Costos variables</div>
              <div class="text-sm text-gray-600">Tarifas distintas según zona y peso</div>
            </div>
          </li>
        </ul>
      </div>

      <!-- DESPUÉS -->
      <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-3xl p-8 border-2 border-lime-300 shadow-xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-16 h-16 bg-lime-400 rounded-2xl flex items-center justify-center text-3xl shadow-lg">✅</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">DESPUÉS</h3>
            <p class="text-lime-700 font-semibold">Con enviGo</p>
          </div>
        </div>

        <ul class="space-y-4">
          <li class="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-lime-200">
            <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Same-day garantizado</div>
              <div class="text-sm text-gray-600">Entrega el mismo día en toda la RM</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-lime-200">
            <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Tracking GPS en vivo</div>
              <div class="text-sm text-gray-600">Link con mapa actualizado cada 30 segundos</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-lime-200">
            <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Prueba digital = 0 reclamos</div>
              <div class="text-sm text-gray-600">Foto + firma + GPS en cada entrega</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-lime-200">
            <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">100% automatizado</div>
              <div class="text-sm text-gray-600">Sincronización automática desde tu tienda</div>
            </div>
          </li>

          <li class="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-lime-200">
            <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div class="font-semibold text-gray-900">Precio fijo transparente</div>
              <div class="text-sm text-gray-600">$2.500 por entrega, todas las zonas</div>
            </div>
          </li>
        </ul>
      </div>

    </div>

    <!-- CTA -->
    <div class="text-center mt-12">
      <a 
        href="#contacto" 
        @click.prevent="scrollTo('contacto')" 
        class="inline-flex items-center space-x-2 px-8 py-4 bg-lime-500 text-white rounded-xl font-bold text-lg hover:bg-lime-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
      >
        <span>Hacer el Cambio Ahora</span>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </a>
    </div>
  </div>
</section>
    <!-- ========== CÓMO FUNCIONA ========== -->
    <section id="como-funciona" class="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple y Automático</h2>
          <p class="text-xl text-gray-600">4 pasos para empezar a entregar</p>
        </div>

        <div class="grid md:grid-cols-4 gap-8">
          <!-- Paso 1 -->
          <div class="text-center">
            <div class="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg">1</div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow h-full">
              <div class="text-4xl mb-4">🔌</div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Conecta</h3>
              <p class="text-gray-600">Sincroniza tu tienda o cuenta de Mercado Libre en 2 minutos</p>
            </div>
          </div>

          <!-- Paso 2 -->
          <div class="text-center">
            <div class="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg">2</div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow h-full">
              <div class="text-4xl mb-4">📦</div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Prepara</h3>
              <p class="text-gray-600">Empaqueta tus pedidos cuando lleguen. Nosotros nos encargamos del resto</p>
            </div>
          </div>

          <!-- Paso 3 -->
          <div class="text-center">
            <div class="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg">3</div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow h-full">
              <div class="text-4xl mb-4">🚚</div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Retiramos</h3>
              <p class="text-gray-600">Pasamos por tu bodega gratis (4+ paquetes) y llevamos todo</p>
            </div>
          </div>

          <!-- Paso 4 -->
          <div class="text-center">
            <div class="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg">4</div>
            <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow h-full">
              <div class="text-4xl mb-4">✅</div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Entregamos</h3>
              <p class="text-gray-600">Same-day con foto, firma y GPS. Tú y tu cliente tranquilos</p>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="text-center mt-12">
          <a href="#contacto" @click.prevent="scrollTo('contacto')" class="inline-flex items-center space-x-2 px-8 py-4 bg-lime-500 text-white rounded-xl font-bold text-lg hover:bg-lime-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105">
            <span>Empezar Ahora</span>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- ========== PRECIOS ========== -->
    <section id="precios" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Precios Transparentes</h2>
          <p class="text-xl text-gray-600">Sin costos ocultos. Paga solo por lo que envías</p>
        </div>

        <!-- Card de Precio -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-3xl p-10 border-2 border-lime-200 shadow-2xl">
            <div class="text-center mb-8">
              <div class="text-6xl mb-4">📦</div>
              <h3 class="text-3xl font-bold text-gray-900 mb-2">Precio por Entrega</h3>
              <div class="flex items-center justify-center gap-2 mb-4">
                <span class="text-6xl font-extrabold text-lime-600">$2.500</span>
                <span class="text-2xl text-gray-600">/ pedido</span>
              </div>
              <p class="text-lg text-gray-600">Todas las zonas de Santiago</p>
            </div>

            <div class="space-y-4 mb-8">
              <div class="flex items-start gap-3 bg-white rounded-xl p-4">
                <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div class="font-semibold text-gray-900">Retiro GRATIS</div>
                  <div class="text-sm text-gray-600">Con 4+ paquetes diarios (máx 12kg, 40x40x40cm)</div>
                </div>
              </div>

              <div class="flex items-start gap-3 bg-white rounded-xl p-4">
                <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div class="font-semibold text-gray-900">Tracking GPS en vivo</div>
                  <div class="text-sm text-gray-600">Link para tu cliente con mapa actualizado</div>
                </div>
              </div>

              <div class="flex items-start gap-3 bg-white rounded-xl p-4">
                <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div class="font-semibold text-gray-900">Prueba de entrega digital</div>
                  <div class="text-sm text-gray-600">Foto + firma + GPS en cada pedido</div>
                </div>
              </div>

              <div class="flex items-start gap-3 bg-white rounded-xl p-4">
                <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div class="font-semibold text-gray-900">Dashboard completo</div>
                  <div class="text-sm text-gray-600">Panel de control y reportes en tiempo real</div>
                </div>
              </div>
            </div>

            <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg">
              <p class="text-sm text-yellow-800 font-medium">
                ⚠️ Menos de 4 paquetes: cargo adicional de $3.000 por retiro
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- ========== FAQ (PREGUNTAS FRECUENTES) ========== -->
<section class="py-20 bg-gradient-to-br from-gray-50 to-white">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
      <p class="text-xl text-gray-600">Todo lo que necesitas saber sobre enviGo</p>
    </div>

    <div class="space-y-4">
      
      <!-- Pregunta 1 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(1)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Qué pasa si no tengo 4 paquetes diarios?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 1 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 1"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          No hay problema. Si tienes <strong>menos de 4 paquetes</strong>, aplicamos un cargo único de <strong>$3.000 por retiro</strong>. El precio por entrega sigue siendo $2.500 por pedido. Igual puedes usar todos nuestros servicios: tracking GPS, prueba digital, dashboard, etc.
        </div>
      </div>

      <!-- Pregunta 2 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(2)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Entregan los sábados y domingos?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 2 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 2"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          Por ahora, nuestro servicio opera de <strong>lunes a viernes</strong> en horario hábil (9:00 - 19:00). Los pedidos del viernes se entregan ese mismo día. Estamos evaluando ampliar a sábados según la demanda de nuestros clientes.
        </div>
      </div>

      <!-- Pregunta 3 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(3)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Cómo funciona la integración con Mercado Libre Flex?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 3 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 3"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          Es muy simple: conectas tu cuenta de Mercado Libre con enviGo (toma 2 minutos). Nuestro sistema <strong>sincroniza automáticamente solo los pedidos Flex</strong> que requieren entrega. Tú solo preparas los paquetes y nosotros nos encargamos de todo: retiro, entrega, tracking y actualización del estado en ML.
        </div>
      </div>

      <!-- Pregunta 4 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(4)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Qué pasa si el cliente no está en casa?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 4 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 4"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          Nuestro conductor <strong>contacta al cliente antes de llegar</strong> mediante llamada o WhatsApp. Si no está, intentamos coordinar un horario alternativo el mismo día. En caso de no poder entregar, se coordina la entrega para el siguiente día hábil <strong>sin costo adicional</strong> (primer reintento incluido).
        </div>
      </div>

      <!-- Pregunta 5 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(5)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Puedo cancelar el servicio cuando quiera?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 5 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 5"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          <strong>Sí, totalmente.</strong> No tenemos contratos de permanencia. Funciona bajo demanda: solo pagas por las entregas que realizamos. Si decides pausar o cancelar el servicio, puedes hacerlo en cualquier momento sin penalizaciones ni costos adicionales.
        </div>
      </div>

      <!-- Pregunta 6 -->
      <div class="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-lime-300 transition-all">
        <button 
          @click="toggleFaq(6)"
          class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span class="text-lg font-bold text-gray-900 pr-8">¿Cobran por intentos fallidos de entrega?</span>
          <svg 
            class="w-6 h-6 text-lime-500 flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': openFaq === 6 }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          v-show="openFaq === 6"
          class="px-8 pb-6 text-gray-600 leading-relaxed"
        >
          El <strong>primer intento está incluido</strong> en el precio de $2.500. Si se requiere un segundo intento porque el cliente no coordinó o no estaba disponible, se cobra $1.500 adicionales. Por eso es importante que tus clientes estén atentos al tracking GPS y a las notificaciones.
        </div>
      </div>

    </div>

    <!-- CTA al final del FAQ -->
    <div class="text-center mt-12">
      <p class="text-gray-600 mb-6 text-lg">¿Tienes más preguntas?</p>
      <a 
        href="#contacto" 
        @click.prevent="scrollTo('contacto')" 
        class="inline-flex items-center space-x-2 px-8 py-4 bg-lime-500 text-white rounded-xl font-bold text-lg hover:bg-lime-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
      >
        <span>Contáctanos</span>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </a>
    </div>
  </div>
</section>

    <!-- ========== CONTACTO ========== -->
    <section id="contacto" class="py-20 bg-gradient-to-br from-lime-500 to-green-600">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Comienza Hoy</h2>
          <p class="text-xl text-lime-100">Te contactamos en menos de 24 horas</p>
        </div>

        <div class="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre completo *</label>
                <input v-model="contactForm.name" type="text" required placeholder="Juan Pérez" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors" />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input v-model="contactForm.email" type="email" required placeholder="tu@email.com" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors" />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Empresa *</label>
                <input v-model="contactForm.company" type="text" required placeholder="Tu empresa" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors" />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                <input v-model="contactForm.phone" type="tel" required placeholder="+56 9 1234 5678" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">¿Cuántos pedidos envías al mes? *</label>
              <select v-model="contactForm.monthlyOrders" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none transition-colors bg-white">
                <option value="" disabled selected>Selecciona una opción</option>
                <option value="0-50">0 - 50 pedidos</option>
                <option value="51-100">51 - 100 pedidos</option>
                <option value="101-200">101 - 200 pedidos</option>
                <option value="201-500">201 - 500 pedidos</option>
                <option value="500+">Más de 500 pedidos</option>
              </select>
            </div>

            <button type="submit" class="w-full py-4 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2">
              <span>Enviar Solicitud</span>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <p class="text-xs text-gray-500 text-center">
              Al enviar aceptas que enviGo te contacte para ofrecerte información sobre nuestros servicios
            </p>
          </form>
        </div>

        <!-- Contacto alternativo -->
        <div class="mt-8 text-center">
          <p class="text-white mb-4 font-semibold">¿Prefieres contactarnos directamente?</p>
          <div class="flex flex-wrap gap-4 justify-center">
            <a href="mailto:contacto@envigo.cl" class="px-6 py-3 bg-white text-lime-600 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center space-x-2">
              <span>✉️</span>
              <span>contacto@envigo.cl</span>
            </a>
            <a href="tel:+56912345678" class="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold border-2 border-white/30 hover:bg-white/20 transition-all flex items-center space-x-2">
              <span>📞</span>
              <span>+56 9 1234 5678</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== FOOTER ========== -->
    <footer class="bg-gray-900 text-white py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8 mb-8">
          <!-- Logo y descripción -->
          <div>
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-10 w-auto mb-4 brightness-0 invert" />
            <p class="text-gray-400 text-sm">
              Logística de última milla para e-commerce. Same-day en toda la Región Metropolitana.
            </p>
          </div>

          <!-- Enlaces rápidos -->
          <div>
            <h4 class="font-semibold mb-4">Enlaces Rápidos</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#servicios" @click.prevent="scrollTo('servicios')" class="text-gray-400 hover:text-lime-400 transition-colors">Servicios</a></li>
              <li><a href="#como-funciona" @click.prevent="scrollTo('como-funciona')" class="text-gray-400 hover:text-lime-400 transition-colors">Cómo Funciona</a></li>
              <li><a href="#precios" @click.prevent="scrollTo('precios')" class="text-gray-400 hover:text-lime-400 transition-colors">Precios</a></li>
              <li><router-link to="/login" class="text-gray-400 hover:text-lime-400 transition-colors">Iniciar Sesión</router-link></li>
            </ul>
          </div>

          <!-- Contacto -->
          <div>
            <h4 class="font-semibold mb-4">Contacto</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li class="flex items-center gap-2">
                <span>✉️</span>
                <a href="mailto:contacto@envigo.cl" class="hover:text-lime-400 transition-colors">contacto@envigo.cl</a>
              </li>
              <li class="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+56912345678" class="hover:text-lime-400 transition-colors">+56 9 1234 5678</a>
              </li>
              <li class="flex items-center gap-2">
                <span>📍</span>
                <span>Santiago, Chile</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {{ new Date().getFullYear() }} enviGo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ==================== STATE ====================
const mobileMenuOpen = ref(false)
const openFaq = ref(null)


// ==================== CONTACT FORM ====================
const contactForm = ref({
  name: '',
  email: '',
  company: '',
  phone: '',
  monthlyOrders: '',
})

// ==================== METHODS ====================

// Scroll suave
const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
const toggleFaq = (id) => {
  openFaq.value = openFaq.value === id ? null : id
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

// Manejar envío del formulario
const handleSubmit = async () => {
  try {
    console.log('Formulario enviado:', contactForm.value)
    
    // Aquí integrar con tu backend
    // const response = await fetch('/api/contact', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(contactForm.value)
    // })
    
    alert('¡Gracias! Hemos recibido tu solicitud. Te contactaremos pronto.')
    
    // Limpiar formulario
    contactForm.value = {
      name: '',
      email: '',
      company: '',
      phone: '',
      monthlyOrders: '',
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Hubo un error. Por favor intenta nuevamente.')
  }
}

// ==================== LIFECYCLE ====================
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Smooth scroll */
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