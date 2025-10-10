<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav 
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg' 
          : 'bg-transparent'
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-12 w-auto" />
          </div>
          
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-8">
            <a 
              v-for="item in navItems" 
              :key="item.id"
              :href="`#${item.id}`"
              @click.prevent="scrollTo(item.id)"
              :class="[
                'text-sm font-medium transition-colors hover:text-lime-600',
                isScrolled ? 'text-gray-700' : 'text-white'
              ]"
            >
              {{ item.label }}
            </a>
          </div>
          
          <!-- Desktop Actions -->
          <div class="hidden md:flex items-center space-x-4">
            <router-link 
              to="/login"
              :class="[
                'text-sm font-medium transition-colors',
                isScrolled ? 'text-gray-700 hover:text-lime-600' : 'text-white hover:text-lime-300'
              ]"
            >
              Iniciar Sesión
            </router-link>
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              class="px-6 py-2.5 bg-lime-500 text-white rounded-full font-semibold hover:bg-lime-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Demo Gratis
            </a>
          </div>
          
          <!-- Mobile Menu Button -->
          <button 
            @click="toggleMobileMenu"
            class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-6 h-6" :class="isScrolled ? 'text-gray-700' : 'text-white'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- Hero Section -->
    <section id="inicio" class="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <!-- Background Gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-lime-900 to-slate-900">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0yNCAzOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
      </div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <!-- Hero Content -->
          <div class="text-white space-y-6 animate-fade-in-up">
            <div class="inline-flex items-center space-x-2 bg-lime-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-lime-500/30">
              <span class="text-lime-400 text-2xl">🚚</span>
              <span class="text-sm font-semibold text-lime-300">Entregas de Última Milla</span>
            </div>
            
            <h1 class="text-5xl md:text-6xl font-bold leading-tight">
              Entrega tus pedidos
              <span class="bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent"> más rápido </span>
              con enviGo
            </h1>
            
            <p class="text-xl text-gray-300 leading-relaxed">
              Servicio de <strong>última milla profesional</strong> para tu e-commerce. 
              Asignación inteligente de conductores, tracking en tiempo real y prueba de entrega digital.
            </p>
            
            <!-- Stats -->
            <div class="grid grid-cols-3 gap-6 pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-lime-400">24-48h</div>
                <div class="text-sm text-gray-400">Entrega</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-lime-400">GPS</div>
                <div class="text-sm text-gray-400">En vivo</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-lime-400">96%</div>
                <div class="text-sm text-gray-400">Satisfacción</div>
              </div>
            </div>
            
            <!-- CTA Buttons -->
            <div class="flex flex-wrap gap-4 pt-4">
              <a 
                href="#contacto"
                @click.prevent="scrollTo('contacto')"
                class="px-8 py-4 bg-lime-500 text-white rounded-full font-bold hover:bg-lime-600 transition-all transform hover:scale-105 shadow-2xl hover:shadow-lime-500/50 flex items-center space-x-2"
              >
                <span>Comenzar Ahora</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a 
                href="#funcionalidades"
                @click.prevent="scrollTo('funcionalidades')"
                class="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-bold border-2 border-white/30 hover:bg-white/20 transition-all flex items-center space-x-2"
              >
                <span>Cómo Funciona</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>
          
          <!-- Hero Visual -->
          <div class="relative">
            <div class="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl transform hover:scale-105 transition-transform duration-500">
              <!-- Dashboard Preview -->
              <div class="flex items-center space-x-2 mb-6">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              
              <div class="space-y-4">
                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-lime-500/20 backdrop-blur-sm p-4 rounded-xl border border-lime-500/30">
                    <div class="text-3xl font-bold text-lime-400">42</div>
                    <div class="text-sm text-gray-300">En Ruta</div>
                  </div>
                  <div class="bg-blue-500/20 backdrop-blur-sm p-4 rounded-xl border border-blue-500/30">
                    <div class="text-3xl font-bold text-blue-400">128</div>
                    <div class="text-sm text-gray-300">Entregados Hoy</div>
                  </div>
                </div>
                
                <!-- Driver Status -->
                <div class="bg-lime-500/20 backdrop-blur-sm p-4 rounded-xl border-l-4 border-lime-500">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-sm text-gray-300">🚗 Conductor: Juan P.</div>
                      <div class="text-white font-semibold">5 entregas pendientes</div>
                    </div>
                    <div class="w-3 h-3 rounded-full bg-lime-400 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cómo Funciona -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            ¿Cómo funciona enviGo?
          </h2>
          <p class="text-xl text-gray-600">Tres pasos simples para optimizar tus entregas</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="(step, index) in howItWorks" :key="index" class="relative">
            <!-- Connector Line (hidden on mobile) -->
            <div v-if="index < howItWorks.length - 1" class="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-lime-200 -z-10"></div>
            
            <div class="text-center">
              <div class="w-32 h-32 mx-auto bg-gradient-to-br from-lime-500 to-green-600 rounded-full flex items-center justify-center text-white text-6xl mb-6 shadow-xl">
                {{ step.emoji }}
              </div>
              <div class="absolute top-14 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {{ index + 1 }}
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ step.title }}</h3>
              <p class="text-gray-600 leading-relaxed">{{ step.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Beneficios de Última Milla -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            La mejor solución de última milla para tu negocio
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Tecnología y logística profesional para que tus clientes reciban sus pedidos a tiempo
          </p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="benefit in deliveryBenefits" :key="benefit.title" class="group">
            <div class="bg-gradient-to-br from-lime-50 to-white p-8 rounded-2xl border-2 border-lime-100 hover:border-lime-400 transition-all hover:shadow-xl h-full">
              <div class="text-5xl mb-4">{{ benefit.emoji }}</div>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ benefit.title }}</h3>
              <p class="text-gray-600 leading-relaxed mb-4">{{ benefit.description }}</p>
              <div class="text-sm font-semibold text-lime-600">{{ benefit.highlight }}</div>
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
            Plataforma completa de gestión de entregas
          </h2>
          <p class="text-xl text-gray-600">Todas las herramientas que necesitas en un solo lugar</p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="feature in features" 
            :key="feature.title"
            class="bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border-t-4 border-lime-500 group hover:-translate-y-2"
          >
            <div class="w-14 h-14 bg-gradient-to-br from-lime-500 to-green-500 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              {{ feature.emoji }}
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ feature.title }}</h3>
            <p class="text-gray-600 mb-4 leading-relaxed">{{ feature.description }}</p>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="tag in feature.tags" 
                :key="tag"
                class="px-3 py-1 bg-lime-50 text-lime-700 rounded-full text-xs font-medium"
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
            Conecta tu tienda en minutos
          </h2>
          <p class="text-xl text-gray-600">Integraciones nativas con las principales plataformas de e-commerce</p>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div 
            v-for="integration in integrations" 
            :key="integration.name"
            class="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all text-center border border-gray-200 hover:border-lime-400"
          >
            <div class="text-5xl mb-4">{{ integration.emoji }}</div>
            <h4 class="font-bold text-gray-900 mb-2">{{ integration.name }}</h4>
            <p :class="[
              'text-sm font-medium',
              integration.statusClass === 'available' ? 'text-lime-600' : 'text-gray-500'
            ]">
              {{ integration.status }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold mb-4">Planes simples y transparentes</h2>
          <p class="text-xl text-gray-300">Escala según tus necesidades de entrega</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="plan in pricingPlans" :key="plan.name" :class="[
            'rounded-3xl p-8 border-2',
            plan.popular 
              ? 'bg-gradient-to-br from-lime-500 to-green-600 border-lime-400 transform scale-105 shadow-2xl' 
              : 'bg-white/10 backdrop-blur-sm border-white/20'
          ]">
            <div v-if="plan.popular" class="text-center mb-4">
              <span class="bg-white text-lime-600 px-4 py-1 rounded-full text-sm font-bold">
                Más Popular
              </span>
            </div>
            
            <h3 class="text-2xl font-bold mb-2">{{ plan.name }}</h3>
            <div class="mb-6">
              <span class="text-5xl font-bold">{{ plan.price }}</span>
              <span class="text-gray-300">/mes</span>
            </div>
            <p class="text-gray-300 mb-6">{{ plan.description }}</p>
            
            <ul class="space-y-3 mb-8">
              <li v-for="feature in plan.features" :key="feature" class="flex items-start space-x-3">
                <svg class="w-6 h-6 text-lime-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ feature }}</span>
              </li>
            </ul>
            
            <a 
              href="#contacto"
              @click.prevent="scrollTo('contacto')"
              :class="[
                'block w-full py-4 rounded-full font-bold text-center transition-all',
                plan.popular 
                  ? 'bg-white text-lime-600 hover:bg-gray-100' 
                  : 'bg-lime-500 text-white hover:bg-lime-600'
              ]"
            >
              Comenzar Ahora
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
          <p class="text-xl text-gray-600">Todo lo que necesitas saber sobre nuestro servicio</p>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="bg-white rounded-2xl shadow-md overflow-hidden"
          >
            <button 
              @click="toggleFaq(index)"
              class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span class="font-bold text-gray-900 text-lg">{{ faq.question }}</span>
              <svg 
                :class="['w-6 h-6 text-lime-600 transition-transform', openFaq === index ? 'rotate-180' : '']"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              v-if="openFaq === index"
              class="px-8 pb-6 text-gray-600 leading-relaxed"
            >
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section id="contacto" class="py-20 bg-gradient-to-r from-lime-500 to-green-600">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          Comienza a optimizar tus entregas hoy
        </h2>
        <p class="text-xl mb-8 text-lime-100">
          Únete a empresas que confían en enviGo para sus entregas de última milla
        </p>
        
        <div class="bg-white rounded-3xl p-8 md:p-12 shadow-2xl max-w-2xl mx-auto">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div>
              <input 
                v-model="form.name"
                type="text" 
                placeholder="Nombre completo"
                required
                class="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none text-gray-900"
              />
            </div>
            <div>
              <input 
                v-model="form.email"
                type="email" 
                placeholder="Email empresarial"
                required
                class="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none text-gray-900"
              />
            </div>
            <div>
              <input 
                v-model="form.company"
                type="text" 
                placeholder="Nombre de tu empresa"
                required
                class="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none text-gray-900"
              />
            </div>
            <div>
              <select 
                v-model="form.deliveries"
                required
                class="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none text-gray-900"
              >
                <option value="">¿Cuántas entregas haces al mes?</option>
                <option value="0-50">0-50 entregas</option>
                <option value="51-200">51-200 entregas</option>
                <option value="201-500">201-500 entregas</option>
                <option value="500+">Más de 500 entregas</option>
              </select>
            </div>
            <div>
              <textarea 
                v-model="form.message"
                placeholder="Cuéntanos sobre tu operación actual"
                rows="4"
                class="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-lime-500 focus:outline-none text-gray-900 resize-none"
              ></textarea>
            </div>
            <button 
              type="submit"
              class="w-full py-4 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Solicitar Demo Gratuita
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-slate-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img src="../assets/envigoLogo.png" alt="enviGo" class="h-12 mb-4" />
            <p class="text-sm">Solución profesional de última milla para e-commerce en Chile</p>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4">Producto</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#funcionalidades" @click.prevent="scrollTo('funcionalidades')" class="hover:text-lime-400 transition-colors">Funcionalidades</a></li>
              <li><a href="#integraciones" @click.prevent="scrollTo('integraciones')" class="hover:text-lime-400 transition-colors">Integraciones</a></li>
              <li><a href="#pricing" @click.prevent="scrollTo('pricing')" class="hover:text-lime-400 transition-colors">Precios</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4">Empresa</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-lime-400 transition-colors">Sobre Nosotros</a></li>
              <li><a href="#" class="hover:text-lime-400 transition-colors">Conductores</a></li>
              <li><a href="#contacto" @click.prevent="scrollTo('contacto')" class="hover:text-lime-400 transition-colors">Contacto</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-white font-bold mb-4">Legal</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-lime-400 transition-colors">Términos y Condiciones</a></li>
              <li><a href="#" class="hover:text-lime-400 transition-colors">Política de Privacidad</a></li>
            </ul>
          </div>
        </div>
        
        <div class="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; 2024 enviGo. Todos los derechos reservados.</p>
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
const openFaq = ref(null)

const form = ref({
  name: '',
  email: '',
  company: '',
  deliveries: '',
  message: ''
})

// ==================== NAVIGATION ====================
const navItems = ref([
  { id: 'inicio', label: 'Inicio' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'integraciones', label: 'Integraciones' },
  { id: 'pricing', label: 'Precios' },
  { id: 'contacto', label: 'Contacto' }
])

// ==================== HOW IT WORKS ====================
const howItWorks = ref([
  {
    emoji: '🛒',
    title: 'Recibe Pedidos',
    description: 'Conecta tu tienda (Shopify, WooCommerce, Mercado Libre) o importa pedidos manualmente. enviGo sincroniza automáticamente.'
  },
  {
    emoji: '🚚',
    title: 'Asignamos Conductor',
    description: 'Nuestro sistema asigna inteligentemente el conductor más cercano y optimiza la ruta de entrega para máxima eficiencia.'
  },
  {
    emoji: '📦',
    title: 'Entrega Confirmada',
    description: 'El conductor entrega con foto, firma digital y geolocalización. Tu cliente recibe notificación automática.'
  }
])

// ==================== DELIVERY BENEFITS ====================
const deliveryBenefits = ref([
  {
    emoji: '🎯',
    title: 'Asignación Inteligente',
    description: 'Algoritmo que asigna automáticamente el conductor más cercano disponible. Optimización de rutas en tiempo real para reducir tiempos y costos.',
    highlight: 'Hasta 40% más eficiente'
  },
  {
    emoji: '📱',
    title: 'Tracking en Vivo',
    description: 'Tus clientes pueden ver en tiempo real dónde está el conductor con el pedido. GPS actualizado cada 30 segundos.',
    highlight: 'Satisfacción garantizada'
  },
  {
    emoji: '✅',
    title: 'Prueba de Entrega',
    description: 'Cada entrega incluye foto del paquete, firma digital del cliente y coordenadas GPS exactas. Protección total contra reclamos.',
    highlight: '-90% de disputas'
  },
  {
    emoji: '⚡',
    title: 'Entregas Rápidas',
    description: 'Compromiso de entrega en 24-48 horas en Región Metropolitana. Entregas express same-day disponibles.',
    highlight: '24-48h garantizado'
  },
  {
    emoji: '🔔',
    title: 'Notificaciones Auto',
    description: 'Email y WhatsApp automáticos al cliente: pedido recibido, en camino, a 5 minutos, entregado. Sin intervención manual.',
    highlight: 'Comunicación perfecta'
  },
  {
    emoji: '📊',
    title: 'Dashboard Completo',
    description: 'Visualiza todas tus entregas en tiempo real. Métricas de rendimiento, costos por zona y análisis de conductores.',
    highlight: 'Control total'
  }
])

// ==================== FEATURES ====================
const features = ref([
  {
    emoji: '🔄',
    title: 'Sincronización Automática',
    description: 'Conecta tu e-commerce y los pedidos se importan automáticamente. Shopify, WooCommerce, Mercado Libre y más.',
    tags: ['API', 'Auto-sync', 'E-commerce']
  },
  {
    emoji: '🗺️',
    title: 'Optimización de Rutas',
    description: 'IA que calcula la ruta más eficiente para cada conductor. Ahorra tiempo y combustible automáticamente.',
    tags: ['IA', 'GPS', 'Eficiencia']
  },
  {
    emoji: '👨‍✈️',
    title: 'Gestión de Conductores',
    description: 'Administra tu flota de conductores: asignación manual o automática, horarios, zonas de cobertura y performance.',
    tags: ['Flota', 'Asignación', 'KPIs']
  },
  {
    emoji: '📸',
    title: 'Prueba Digital',
    description: 'Foto + firma + GPS en cada entrega. Evidencia irrefutable para proteger tu negocio de reclamos falsos.',
    tags: ['Foto', 'Firma', 'GPS']
  },
  {
    emoji: '💬',
    title: 'Chat con Conductor',
    description: 'Comunicación directa entre cliente y conductor dentro de la app. Sin compartir números personales.',
    tags: ['Chat', 'In-app', 'Privacidad']
  },
  {
    emoji: '📈',
    title: 'Analytics Avanzado',
    description: 'Reportes detallados: tiempo promedio de entrega, zonas más rentables, performance de conductores, costos operativos.',
    tags: ['Reportes', 'Métricas', 'Excel']
  },
  {
    emoji: '🔐',
    title: 'Multi-usuario',
    description: 'Crea usuarios con diferentes roles: admin, operador, conductor. Cada uno ve solo lo que necesita.',
    tags: ['Roles', 'Permisos', 'Seguridad']
  },
  {
    emoji: '📦',
    title: 'Gestión de Manifiestos',
    description: 'Agrupa entregas por conductor o zona. Imprime manifiestos con código de barras para control total.',
    tags: ['Manifiestos', 'Control', 'Barcode']
  },
  {
    emoji: '💳',
    title: 'Facturación Integrada',
    description: 'Genera facturas automáticas por cada entrega. Compatible con SII Chile. Reportes mensuales listos para contabilidad.',
    tags: ['Facturación', 'SII', 'Contabilidad']
  }
])

// ==================== INTEGRATIONS ====================
const integrations = ref([
  { name: 'Shopify', emoji: '🛒', status: '✅ Integrado', statusClass: 'available' },
  { name: 'WooCommerce', emoji: '🌐', status: '✅ Integrado', statusClass: 'available' },
  { name: 'Mercado Libre', emoji: '🛍️', status: '✅ Integrado', statusClass: 'available' },
  { name: 'Excel/CSV', emoji: '📄', status: '✅ Integrado', statusClass: 'available' },
  { name: 'WhatsApp', emoji: '💬', status: '🚀 Próximo', statusClass: 'coming-soon' }
])

// ==================== PRICING ====================
const pricingPlans = ref([
  {
    name: 'Starter',
    price: '$49.990',
    description: 'Para emprendedores y negocios pequeños',
    popular: false,
    features: [
      'Hasta 100 entregas/mes',
      'Tracking en tiempo real',
      'Prueba de entrega digital',
      'Notificaciones automáticas',
      'Dashboard básico',
      'Soporte por email'
    ]
  },
  {
    name: 'Business',
    price: '$99.990',
    description: 'Para tiendas en crecimiento',
    popular: true,
    features: [
      'Hasta 500 entregas/mes',
      'Todo de Starter +',
      'Optimización de rutas',
      'Analytics avanzado',
      'Multi-usuario (10 usuarios)',
      'API acceso',
      'Soporte prioritario 24/7',
      'Conductor dedicado'
    ]
  },
  {
    name: 'Enterprise',
    price: 'Contactar',
    description: 'Para operaciones grandes',
    popular: false,
    features: [
      'Entregas ilimitadas',
      'Todo de Business +',
      'Flota dedicada',
      'Integraciones custom',
      'SLA personalizado',
      'Account Manager',
      'Reportes personalizados',
      'Onboarding dedicado'
    ]
  }
])

// ==================== FAQ ====================
const faqs = ref([
  {
    question: '¿En qué zonas hacen entregas?',
    answer: 'Actualmente cubrimos toda la Región Metropolitana. Estamos expandiéndonos a Valparaíso y Concepción. Para otras regiones, contáctanos para ver opciones personalizadas.'
  },
  {
    question: '¿Cuánto demoran las entregas?',
    answer: 'Nuestro compromiso es 24-48 horas en Región Metropolitana. También ofrecemos servicio express same-day (entrega el mismo día) para pedidos urgentes con un cargo adicional.'
  },
  {
    question: '¿Cómo funciona la asignación de conductores?',
    answer: 'Nuestro sistema asigna automáticamente el conductor más cercano disponible cuando se crea una orden. También puedes asignar manualmente o crear reglas por zona. El conductor recibe la notificación en su app móvil.'
  },
  {
    question: '¿Qué pasa si el cliente no está para recibir?',
    answer: 'El conductor intenta contactar por teléfono. Si no hay respuesta, se agenda una segunda visita sin costo adicional. El cliente puede reprogramar desde el link de tracking. Todo queda registrado con evidencia.'
  },
  {
    question: '¿Cómo integro mi tienda con enviGo?',
    answer: 'Si usas Shopify, WooCommerce o Mercado Libre, la integración es automática: solo ingresas tus credenciales API. Si vendes por Instagram/WhatsApp, puedes importar pedidos desde Excel. El setup toma menos de 10 minutos.'
  },
  {
    question: '¿Puedo tener mi propia flota de conductores?',
    answer: 'Sí, puedes agregar tus propios conductores a la plataforma. Ellos descargan nuestra app móvil para recibir órdenes, actualizar estados y capturar pruebas de entrega. También puedes usar nuestra flota compartida.'
  },
  {
    question: '¿Qué incluye la prueba de entrega?',
    answer: 'Cada entrega completada incluye: foto del paquete entregado, firma digital del receptor (capturada en tablet/celular), coordenadas GPS exactas, timestamp, nombre y RUT del receptor. Todo se almacena por 2 años.'
  },
  {
    question: '¿Cobran comisión por cada entrega?',
    answer: 'No, trabajamos con planes mensuales fijos según volumen de entregas. No hay comisiones ocultas ni cargos por entrega adicional. Solo pagas tu plan mensual.'
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

const toggleFaq = (index) => {
  openFaq.value = openFaq.value === index ? null : index
}

const handleSubmit = () => {
  console.log('Form submitted:', form.value)
  alert('¡Gracias! Te contactaremos pronto para agendar tu demo.')
  
  // Reset form
  form.value = {
    name: '',
    email: '',
    company: '',
    deliveries: '',
    message: ''
  }
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
/* Animaciones personalizadas */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s ease-out;
}

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