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
              Contactar
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
            Contactar
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
            <span class="text-sm font-semibold text-lime-700">Entregas Same-Day • Retiro Gratis desde 4 paquetes</span>
          </div>
          
          <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Logística de <span class="bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent">Última Milla</span><br/>
            para tu E-commerce
          </h1>
          
          <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Servicio profesional de entregas same-day en Santiago. Conecta tu tienda, gestionamos tus entregas: 
            retiro programado, tracking en vivo y prueba de entrega digital.
          </p>
          
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
        </div>
          <div class="bg-white rounded-b-2xl shadow-2xl overflow-hidden border-x-4 border-b-4 border-gray-800">
            <div class="bg-gradient-to-r from-lime-500 to-green-600 p-6 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold mb-1">Dashboard Principal</h2>
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
                  <span class="text-gray-700"><strong>Notificación automática</strong> a tus clientes</span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="text-4xl mb-4 text-center">📦</div>
                <div class="bg-lime-50 rounded-lg p-4">
                  <div class="text-center">
                    <div class="font-bold text-gray-900 mb-2">Paquetes Recogidos</div>
                    <div class="text-sm text-gray-600">6 paquetes escaneados</div>
                    <div class="mt-4 text-blue-700 text-sm">✓ Clientes notificados</div>
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
                  <span class="text-gray-700"><strong>Entrega durante el día</strong> en horario hábil</span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="text-4xl mb-4 text-center">📍</div>
                <div class="bg-gray-100 rounded-lg p-8 mb-4">
                  <div class="text-center">
                    <div class="text-5xl mb-2">🗺️</div>
                    <div class="text-sm text-gray-600">Tracking en vivo</div>
                  </div>
                </div>
                <div class="bg-lime-50 rounded-lg p-3 text-center">
                  <div class="font-semibold text-gray-900">En ruta de entrega</div>
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
                Al llegar al destino, el conductor entrega el paquete y captura foto, firma digital y GPS. 
                Todo queda registrado para protección contra reclamos.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Foto del paquete entregado</strong></span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>Firma digital</strong> del receptor</span>
                </li>
                <li class="flex items-start space-x-3">
                  <svg class="w-6 h-6 text-lime-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-gray-700"><strong>GPS y timestamp</strong></span>
                </li>
              </ul>
            </div>
            <div class="md:w-1/2">
              <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
                <div class="text-4xl mb-4 text-center">✅</div>
                <div class="bg-gray-100 rounded-lg p-6 mb-4">
                  <div class="text-center">
                    <div class="text-4xl mb-2">📸</div>
                    <div class="text-xs text-gray-600">Foto de prueba</div>
                  </div>
                </div>
                <div class="bg-green-50 rounded-lg p-3">
                  <div class="text-sm text-green-700 font-medium text-center">
                    ✓ Entrega completada
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
              Entrega durante el día same-day
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
      </div></section>

    <!-- Beneficios -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            ¿Por qué elegir enviGo?
          </h2>
          <p class="text-xl text-gray-600">
            Más que entregas, somos tu socio logístico
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-8 border border-lime-200">
            <div class="text-5xl mb-4">⚡</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Same-Day</h3>
            <p class="text-gray-700 mb-4">
              Entregas el mismo día en toda la RM. Velocidad que tus clientes esperan.
            </p>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200">
            <div class="text-5xl mb-4">🚚</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Retiro Gratis</h3>
            <p class="text-gray-700 mb-4">
              Desde 4 paquetes diarios retiramos gratis desde tu bodega.
            </p>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">Prueba Digital</h3>
            <p class="text-gray-700 mb-4">
              Foto + firma + GPS en cada entrega. Protección total contra reclamos.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="funcionalidades" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Plataforma Completa
          </h2>
          <p class="text-xl text-gray-600">
            Todas las herramientas para gestionar tu logística
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="feature in features" 
            :key="feature.title"
            class="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-lime-500"
          >
            <div class="w-12 h-12 bg-gradient-to-br from-lime-500 to-green-500 rounded-lg flex items-center justify-center text-2xl mb-4">
              {{ feature.emoji }}
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-600 text-sm mb-4">{{ feature.description }}</p>
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
            Conecta tu e-commerce en minutos
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
          Comienza a Optimizar tus Entregas
        </h2>
        <p class="text-xl mb-12 text-lime-100">
          Únete a empresas que confían en enviGo para su logística de última milla
        </p>
        
        <div class="flex flex-wrap gap-4 justify-center mb-12">
          <a 
            href="mailto:contacto@envigo.cl"
            class="px-8 py-4 bg-white text-lime-600 rounded-lg font-bold hover:bg-gray-100 transition-all shadow-xl flex items-center space-x-2"
          >
            <span>✉️ Contactar</span>
          </a>
          <a 
            href="tel:+56912345678"
            class="px-8 py-4 bg-lime-600 text-white rounded-lg font-bold border-2 border-white hover:bg-lime-700 transition-all flex items-center space-x-2"
          >
            <span>📞 Llamar</span>
          </a>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto text-left">
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">🚚</div>
            <div class="font-bold mb-1">Retiro gratis</div>
            <div class="text-sm text-lime-100">Desde 4 paquetes</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">⚡</div>
            <div class="font-bold mb-1">Same-Day</div>
            <div class="text-sm text-lime-100">Entrega el mismo día</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="text-3xl mb-2">💬</div>
            <div class="font-bold mb-1">Soporte</div>
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
              <li><a href="#precios" @click.prevent="scrollTo('precios')" class="hover:text-lime-400 transition-colors">Precios</a></li>
              <li><a href="#funcionalidades" @click.prevent="scrollTo('funcionalidades')" class="hover:text-lime-400 transition-colors">Funcionalidades</a></li>
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
  { id: 'precios', label: 'Precios' },
  { id: 'como-funciona', label: 'Cómo Funciona' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'integraciones', label: 'Integraciones' },
  { id: 'contacto', label: 'Contacto' }
])

const dashboardStats = ref([
  { icon: '📦', label: 'En Ruta', value: '42', change: '+12%', changeClass: 'bg-green-100 text-green-700' },
  { icon: '✅', label: 'Entregados Hoy', value: '156', change: '+8%', changeClass: 'bg-green-100 text-green-700' },
  { icon: '🚗', label: 'Conductores', value: '8', change: '100%', changeClass: 'bg-blue-100 text-blue-700' },
  { icon: '⏱️', label: 'Tiempo Prom.', value: 'Same-day', change: '⚡', changeClass: 'bg-lime-100 text-lime-700' }
])

const sampleOrders = ref([
  { id: '2845', customer: 'María González', address: 'Las Condes, RM', driver: 'Juan Pérez', status: 'En camino', statusClass: 'bg-blue-100 text-blue-700' },
  { id: '2844', customer: 'Pedro Rodríguez', address: 'Providencia, RM', driver: 'Ana Silva', status: 'Entregado', statusClass: 'bg-green-100 text-green-700' },
  { id: '2843', customer: 'Carmen López', address: 'Ñuñoa, RM', driver: 'Carlos Díaz', status: 'En ruta', statusClass: 'bg-yellow-100 text-yellow-700' }
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
    description: 'Rutas eficientes para entregas durante el día. Máxima cobertura en Santiago.',
    tags: ['GPS', 'Eficiencia']
  },
  {
    emoji: '📱',
    title: 'App Conductores',
    description: 'App móvil profesional para gestión de entregas y captura de pruebas.',
    tags: ['iOS', 'Android']
  },
  {
    emoji: '📷',
    title: 'Prueba de Entrega',
    description: 'Foto + firma + GPS en cada entrega. Protección total contra reclamos.',
    tags: ['Foto', 'Firma', 'GPS']
  },
  {
    emoji: '📊',
    title: 'Analytics',
    description: 'Métricas en tiempo real: costos, zonas, performance.',
    tags: ['Reportes', 'KPIs']
  },
  {
    emoji: '👥',
    title: 'Multi-empresa',
    description: 'Gestiona múltiples empresas. Facturación separada.',
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