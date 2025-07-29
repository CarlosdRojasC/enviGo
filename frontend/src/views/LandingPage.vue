<!-- frontend/src/views/LandingPage.vue - VERSIÓN CORREGIDA -->
<template>
  <div class="landing-page">
    <!-- Navigation -->
    <!-- REEMPLAZA TU SECCIÓN <nav> COMPLETA CON ESTO -->
<nav class="navbar" :class="{ scrolled: isScrolled }">
  <div class="nav-container">
    <!-- Logo -->
    <div class="logo">
      <img class="imagelogo" src="../assets/envigoLogo.png" alt="enviGo Logistics" />
    </div>
    
    <!-- Desktop Navigation -->
    <ul class="nav-links desktop-only">
      <li><a href="#inicio" @click="scrollTo('inicio')">Inicio</a></li>
      <li><a href="#funcionalidades" @click="scrollTo('funcionalidades')">Funcionalidades</a></li>
      <li><a href="#integraciones" @click="scrollTo('integraciones')">Integraciones</a></li>
      <li><a href="#contacto" @click="scrollTo('contacto')">Contacto</a></li>
    </ul>
    
    <!-- Desktop Actions -->
    <div class="nav-actions desktop-only">
      <router-link to="/login" class="nav-login">Iniciar Sesión</router-link>
      <a href="#contacto" class="cta-button" @click="scrollTo('contacto')">Demo</a>
    </div>
    
    <!-- Mobile Menu Button -->
    <button 
      class="mobile-menu-btn mobile-only" 
      @click="toggleMobileMenu"
      :class="{ active: mobileMenuOpen }"
      aria-label="Menú"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
  
  <!-- Mobile Menu Overlay -->
  <div 
    class="mobile-overlay" 
    :class="{ active: mobileMenuOpen }" 
    @click="closeMobileMenu"
  ></div>
  
  <!-- Mobile Menu -->
  <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
    <div class="mobile-header">
      <img src="../assets/envigoLogo.png" alt="enviGo" class="mobile-logo" />
      <button class="mobile-close" @click="closeMobileMenu">✕</button>
    </div>
    
    <div class="mobile-content">
      <nav class="mobile-nav">
        <a href="#inicio" @click="mobileScrollTo('inicio')" class="mobile-link">
          <span class="mobile-icon">🏠</span>
          <span>Inicio</span>
        </a>
        <a href="#funcionalidades" @click="mobileScrollTo('funcionalidades')" class="mobile-link">
          <span class="mobile-icon">⚙️</span>
          <span>Funcionalidades</span>
        </a>
        <a href="#integraciones" @click="mobileScrollTo('integraciones')" class="mobile-link">
          <span class="mobile-icon">🔗</span>
          <span>Integraciones</span>
        </a>
        <a href="#contacto" @click="mobileScrollTo('contacto')" class="mobile-link">
          <span class="mobile-icon">📞</span>
          <span>Contacto</span>
        </a>
      </nav>
      
      <div class="mobile-actions">
        <router-link to="/login" class="mobile-login" @click="closeMobileMenu">
          Iniciar Sesión
        </router-link>
        <a href="#contacto" class="mobile-cta" @click="mobileScrollTo('contacto')">
          🎯 Solicitar Demo
        </a>
      </div>
      
      <div class="mobile-contact">
        <p><strong>¿Necesitas ayuda inmediata?</strong></p>
        <div class="contact-buttons">
          <a href="mailto:contacto@envigo.cl" class="contact-email">
            ✉️ Email
          </a>
          <a href="tel:+56912345678" class="contact-phone">
            📱 Llamar
          </a>
        </div>
      </div>
    </div>
  </div>
</nav>

    <!-- Hero Section -->
    <section class="hero" id="inicio">
      <div class="hero-container">
        <div class="hero-content fade-in-up">
          <h1>Logística de <span class="highlight">Última Milla</span> que Escala con tu Negocio</h1>
          <p>Conecta tu e-commerce, automatiza entregas y optimiza tu operación logística con la plataforma todo-en-uno más completa de Chile. Gestión inteligente con conductores especializados.</p>
          <div class="hero-buttons">
            <a href="#contacto" class="btn-primary" @click="scrollTo('contacto')">
              🏍️ Comenzar Gratis
            </a>
            <a href="#funcionalidades" class="btn-secondary" @click="scrollTo('funcionalidades')">
              ▶️ Ver Demo
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="dashboard-preview">
            <div class="dashboard-header">
              <div class="dot red"></div>
              <div class="dot yellow"></div>
              <div class="dot green"></div>
            </div>
            <div class="dashboard-content">
              <div class="stats-grid">
                <div class="stat-card" v-for="stat in demoStats" :key="stat.label">
                  <div class="stat-number pulse">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
              </div>
              <div class="sync-status">
                <strong>🏍️ Sincronización activa:</strong><br>
                <small>{{ Math.floor(Math.random() * 1000) + 500 }} pedidos sincronizados desde Shopify y WooCommerce</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="funcionalidades">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Todo lo que Necesitas en una Plataforma</h2>
          <p class="section-subtitle">Desde la integración con tu tienda online hasta la entrega final, enviGo maneja cada paso de tu proceso logístico</p>
        </div>
        <div class="features-grid">
          <div 
            class="feature-card" 
            v-for="feature in features" 
            :key="feature.title"
          >
            <div class="feature-icon">
              {{ feature.emoji }}
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-tags">
              <span class="tag" v-for="tag in feature.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Integrations Section -->
    <section class="integrations" id="integraciones">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Integraciones Nativas</h2>
          <p class="section-subtitle">Conecta con las plataformas que ya usas. Sin complicaciones técnicas, configuración en minutos.</p>
        </div>
        <div class="integrations-grid">
          <div 
            class="integration-card" 
            v-for="integration in integrations" 
            :key="integration.name"
          >
            <div class="integration-logo">
              {{ integration.emoji }}
            </div>
            <div class="integration-name">{{ integration.name }}</div>
            <div class="integration-status" :class="integration.statusClass">
              {{ integration.status }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section" id="contacto">
      <div class="container">
        <div class="cta-content">
          <h2>¿Listo para Revolucionar tu Logística?</h2>
          <p>Únete a las empresas que ya están optimizando sus entregas con enviGo. Comienza con una demo gratuita y descubre el potencial de tu operación.</p>
          <div class="hero-buttons">
            <a href="mailto:contacto@envigo.cl" class="btn-primary">
              🏍️ Solicitar Demo Gratuita
            </a>
            <a href="tel:+56912345678" class="btn-secondary">
              📞 Llamar Ahora
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>enviGo Logistics</h3>
            <p>La plataforma de logística de última milla más completa de Chile. Optimiza, automatiza y escala tu operación con conductores especializados.</p>
          </div>
          <div class="footer-section">
            <h3>Producto</h3>
            <a href="#funcionalidades" @click="scrollTo('funcionalidades')">Funcionalidades</a>
            <a href="#integraciones" @click="scrollTo('integraciones')">Integraciones</a>
            <a href="#">Precios</a>
            <a href="#">API</a>
          </div>
          <div class="footer-section">
            <h3>Empresa</h3>
            <a href="#">Nosotros</a>
            <a href="#">Blog</a>
            <a href="#">Carreras</a>
            <a href="#contacto" @click="scrollTo('contacto')">Contacto</a>
          </div>
          <div class="footer-section">
            <h3>Soporte</h3>
            <a href="#">Centro de Ayuda</a>
            <a href="#">Documentación</a>
            <a href="#">Status</a>
            <a href="mailto:soporte@envigo.cl">Soporte Técnico</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 enviGo Logistics. Todos los derechos reservados. | 
            <a href="#" style="color: #64748B;">Términos de Servicio</a> | 
            <a href="#" style="color: #64748B;">Política de Privacidad</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// REEMPLAZA TU <script setup> COMPLETO CON ESTO:

import { ref, onMounted, onUnmounted } from 'vue'

// ==================== ESTADO REACTIVO ====================
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const demoStats = ref([
  { value: '1,247', label: 'Entregas Activas' },
  { value: '98.2%', label: 'Tasa de Éxito' },
  { value: '15', label: 'Conductores Online' },
  { value: '2.3h', label: 'Tiempo Promedio' }
])

// Datos de funcionalidades usando emojis
const features = ref([
  {
    emoji: '🔄',
    title: 'Sincronización Automática',
    description: 'Conecta tu Shopify, WooCommerce o Mercado Libre y sincroniza pedidos automáticamente. Sin intervención manual, sin errores.',
    tags: ['Shopify', 'WooCommerce', 'Mercado Libre']
  },
  {
    emoji: '🗺️',
    title: 'Gestión Inteligente de Rutas',
    description: 'Optimización automática de rutas para conductores. Reduce tiempos de entrega y costos operacionales hasta en un 40%.',
    tags: ['Optimización IA', 'GPS Real-time', 'Multi-zona']
  },
  {
    emoji: '📱',
    title: 'Seguimiento en Tiempo Real',
    description: 'Tus clientes reciben notificaciones automáticas y pueden seguir sus pedidos en tiempo real. Mejora la experiencia de entrega.',
    tags: ['SMS/WhatsApp', 'Tracking Link', 'Notificaciones']
  },
  {
    emoji: '📷',
    title: 'Prueba de Entrega Digital',
    description: 'Fotos, firmas digitales y coordenadas GPS de cada entrega. Protección total contra reclamos y disputas.',
    tags: ['Foto + Firma', 'Geolocalización', 'Timestamp']
  },
  {
    emoji: '📊',
    title: 'Analytics y Reportes',
    description: 'Dashboard completo con métricas de rendimiento, costos por entrega, y análisis de zonas más rentables.',
    tags: ['KPIs Logísticos', 'Costos', 'Exportación']
  },
  {
    emoji: '👥',
    title: 'Gestión Multi-empresa',
    description: 'Administra múltiples empresas desde una sola cuenta. Facturación separada, usuarios independientes y control total.',
    tags: ['Multi-tenant', 'Roles', 'Facturación']
  }
])

// Datos de integraciones usando emojis
const integrations = ref([
  { name: 'Shopify', emoji: '🛒', status: '✅ Integración Completa', statusClass: 'available' },
  { name: 'WooCommerce', emoji: '🌐', status: '✅ Integración Completa', statusClass: 'available' },
  { name: 'Mercado Libre', emoji: '🛍️', status: '✅ Integración Completa', statusClass: 'available' },
  { name: 'Excel/CSV', emoji: '📄', status: '✅ Importación Masiva', statusClass: 'available' },
  { name: 'WhatsApp API', emoji: '💬', status: '🚀 Próximamente', statusClass: 'coming-soon' }
])

// ==================== MÉTODOS PRINCIPALES ====================
const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

// ==================== MOBILE MENU ====================
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  document.body.style.overflow = mobileMenuOpen.value ? 'hidden' : ''
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
  document.body.style.overflow = ''
}

const mobileScrollTo = (elementId) => {
  closeMobileMenu()
  setTimeout(() => scrollTo(elementId), 300)
}

// ==================== EVENT HANDLERS ====================
const handleResize = () => {
  if (window.innerWidth > 768 && mobileMenuOpen.value) {
    closeMobileMenu()
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && mobileMenuOpen.value) {
    closeMobileMenu()
  }
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Reset y Variables */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.landing-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #2C2C2C;
  overflow-x: hidden;
}

/* Variables CSS */
:root {
  --primary: #8BC53F;
  --primary-dark: #7AB32E;
  --secondary: #A4D65E;
  --accent: #6BA428;
  --dark: #2C2C2C;
  --dark-lighter: #3A3A3A;
  --gray: #64748B;
  --gray-light: #F1F5F9;
  --white: #FFFFFF;
}

/* Navigation */
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
  height: 100px;
}

.navbar.scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100% !important;
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.imagelogo {
  width: 150px;
  height: auto;
  filter: drop-shadow(0 0 4px rgba(0, 255, 128, 0.2));
}


.nav-links {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: var(--dark);
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
}

.nav-links a:hover {
  color: var(--primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-login {
  color: var(--dark);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-login:hover {
  color: var(--primary);
}

.cta-button {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 197, 63, 0.3);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 197, 63, 0.4);
}

/* Hero Section */
.hero {
  min-height: 100vh;
  background: linear-gradient(135deg, #2C2C2C 0%, #3A3A3A 50%, #4A4A4A 100%);
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding-top: 100px !important;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 20%, rgba(139, 197, 63, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(164, 214, 94, 0.1) 0%, transparent 50%);
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 2;
}

.hero-content h1 {
  font-size: 3.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.hero-content .highlight {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-content p {
  font-size: 1.2rem;
  color: #94A3B8;
  margin-bottom: 2rem;
  line-height: 1.8;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 197, 63, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(139, 197, 63, 0.4);
}

.btn-secondary {
  background: transparent;
  color: white;
  padding: 1rem 2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Dashboard Preview */
.hero-visual {
  position: relative;
}

.dashboard-preview {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.3s ease;
}

.dashboard-preview:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}

.dashboard-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #FF5F56; }
.dot.yellow { background: #FFBD2E; }
.dot.green { background: #27CA3F; }

.dashboard-content {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 1.5rem;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: rgba(139, 197, 63, 0.15);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(139, 197, 63, 0.3);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.8rem;
  color: #94A3B8;
}

.sync-status {
  background: rgba(139, 197, 63, 0.15);
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

/* Features Section */
.features {
  padding: 6rem 0;
  background: var(--white);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--dark);
}

.section-subtitle {
  font-size: 1.1rem;
  color: var(--gray);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2.5rem;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #F1F5F9;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.feature-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--dark);
}

.feature-description {
  color: var(--gray);
  line-height: 1.6;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.tag {
  background: var(--gray-light);
  color: var(--gray);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Integration Section */
.integrations {
  padding: 6rem 0;
  background: var(--gray-light);
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.integration-card {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #E2E8F0;
}

.integration-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.integration-logo {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto 1rem;
}

.integration-name {
  font-weight: 600;
  color: var(--dark);
  margin-bottom: 0.5rem;
}

.integration-status {
  font-size: 0.9rem;
  font-weight: 500;
}

.integration-status.available {
  color: var(--primary);
}

.integration-status.coming-soon {
  color: var(--gray);
}

/* CTA Section */
.cta-section {
  padding: 6rem 0;
  background: var(--dark);
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 10% 80%, rgba(139, 197, 63, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 90% 20%, rgba(164, 214, 94, 0.1) 0%, transparent 50%);
}

.cta-content {
  text-align: center;
  position: relative;
  z-index: 2;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.1rem;
  color: #94A3B8;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* Footer */
.footer {
  background: var(--dark);
  color: #94A3B8;
  padding: 3rem 0 1rem;
  border-top: 1px solid var(--dark-lighter);
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section h3 {
  color: white;
  font-weight: 600;
  margin-bottom: 1rem;
}

.footer-section a {
  color: #94A3B8;
  text-decoration: none;
  display: block;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
  cursor: pointer;
}

.footer-section a:hover {
  color: var(--primary);
}

.footer-section p {
  color: #94A3B8;
  line-height: 1.6;
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid var(--dark-lighter);
  color: #64748B;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s ease forwards;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.pulse {
  animation: pulse 2s infinite;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .nav-links, .nav-actions {
    display: none;
  }

  .nav-container {
    justify-content: center;
  }

  .hero {
    padding-top: 100px;
  }

  .hero-container {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }

  .hero-content h1 {
    font-size: 2.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .hero-buttons {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .cta-content h2 {
    font-size: 2rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .container {
    padding: 0 1rem;
  }

  .logo {
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }

  .logo-main {
    font-size: 1.5rem;
  }

  .logo-subtitle {
    font-size: 0.6rem;
  }
}

@media (max-width: 480px) {
  .hero-content h1 {
    font-size: 2rem;
  }

  .hero-content p {
    font-size: 1rem;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }

  .feature-card {
    padding: 2rem;
  }

  .section-title {
    font-size: 1.75rem;
  }

  .cta-content h2 {
    font-size: 1.75rem;
  }

  .dashboard-preview {
    padding: 1.5rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .stat-number {
    font-size: 1.25rem;
  }
}

/* Importar Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* Asegurar que los estilos tomen precedencia */
.landing-page * {
  box-sizing: border-box;
}

/* Fix para Safari */
@supports (-webkit-backdrop-filter: blur(20px)) {
  .navbar {
    -webkit-backdrop-filter: blur(20px);
  }
  
  .dashboard-preview {
    -webkit-backdrop-filter: blur(20px);
  }
}

/* Mejora de contraste para accesibilidad */
.nav-links a:focus,
.cta-button:focus,
.btn-primary:focus,
.btn-secondary:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Asegurar que los gradientes funcionen en todos los navegadores */
.highlight {
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  /* Fallback para navegadores que no soportan background-clip */
  color: #8BC53F;
}

/* Fix específico para elementos que no cargan colores */
.feature-icon,
.integration-logo,
.btn-primary,
.cta-button {
  background: #8BC53F !important;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%) !important;
}

/* Asegurar que los hover effects funcionen */
.feature-card:hover,
.integration-card:hover,
.btn-primary:hover,
.cta-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(139, 197, 63, 0.3);
}

/* Fix para el logo */
.logo-main {
  color: #8BC53F !important;
}

/* Asegurar que el texto sea legible */
.hero-content h1,
.hero-content p,
.cta-content h2,
.cta-content p {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.desktop-only { display: flex; }
.mobile-only { display: none; }

/* Mobile Menu Button */
.mobile-menu-btn {
  background: none;
  border: none;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1001;
}

.mobile-menu-btn span {
  width: 25px;
  height: 2px;
  background: var(--dark);
  border-radius: 1px;
  transition: all 0.3s ease;
  transform-origin: center;
}

.mobile-menu-btn:hover {
  background: rgba(139, 197, 63, 0.1);
}

/* Hamburger Animation */
.mobile-menu-btn.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.mobile-menu-btn.active span:nth-child(2) {
  opacity: 0;
  transform: translateX(-25px);
}

.mobile-menu-btn.active span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Mobile Overlay */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 100%;
  max-width: 380px;
  height: 100vh;
  background: white;
  z-index: 1000;
  transition: right 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.mobile-menu.active {
  right: 0;
}

/* Mobile Header */
.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.mobile-logo {
  height: 36px;
  width: auto;
}

.mobile-close {
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: var(--gray);
  transition: all 0.2s ease;
}

.mobile-close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Mobile Content */
.mobile-content {
  flex: 1;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* Mobile Navigation */
.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
  color: var(--dark);
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  position: relative;
}

.mobile-link:hover {
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.05) 0%, rgba(164, 214, 94, 0.05) 100%);
  border-left-color: var(--primary);
  color: var(--primary);
  transform: translateX(4px);
}

.mobile-icon {
  font-size: 1.3rem;
  width: 24px;
  text-align: center;
}

/* Mobile Actions */
.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #f1f5f9;
}

.mobile-login {
  padding: 1rem;
  text-align: center;
  color: var(--dark);
  text-decoration: none;
  font-weight: 600;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: white;
}

.mobile-login:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(139, 197, 63, 0.02);
}

.mobile-cta {
  padding: 1.25rem 1rem;
  text-align: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.05rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(139, 197, 63, 0.3);
  position: relative;
  overflow: hidden;
}

.mobile-cta::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.mobile-cta:hover::before {
  left: 100%;
}

.mobile-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 197, 63, 0.4);
}

/* Mobile Contact */
.mobile-contact {
  margin-top: auto;
  padding-top: 2rem;
  border-top: 2px solid #f1f5f9;
}

.mobile-contact p {
  text-align: center;
  color: var(--gray);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.contact-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.contact-email,
.contact-phone {
  padding: 1rem 0.75rem;
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.contact-email {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 2px solid rgba(59, 130, 246, 0.2);
}

.contact-phone {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 2px solid rgba(34, 197, 94, 0.2);
}

.contact-email:hover,
.contact-phone:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.contact-email:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
}

.contact-phone:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
}
/* AGREGA ESTO AL FINAL DE TU CSS - DESPUÉS DE TODO LO QUE TIENES */

/* ==================== MOBILE VISIBILITY FIX ==================== */

/* Override de los media queries existentes */
@media (max-width: 768px) {
  /* Ocultar navegación desktop COMPLETAMENTE */
  .nav-links, 
  .nav-actions {
    display: none !important;
  }
  
  /* Mostrar elementos mobile */
  .desktop-only {
    display: none !important;
  }
  
  .mobile-only {
    display: flex !important;
  }
  
  /* Ajustar container de navegación */
  .nav-container {
    justify-content: space-between !important;
    padding: 1rem 1.5rem !important;
  }
  
  /* Logo más pequeño en mobile */
  .imagelogo {
    width: 120px !important;
  }
  
  /* Hero ajustes mobile */
  .hero {
    padding-top: 100px !important;
  }

  .hero-container {
    grid-template-columns: 1fr !important;
    gap: 2rem !important;
    text-align: center !important;
  }

  .hero-content h1 {
    font-size: 2.5rem !important;
  }

  .features-grid {
    grid-template-columns: 1fr !important;
  }

  .hero-buttons {
    justify-content: center !important;
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .cta-content h2 {
    font-size: 2rem !important;
  }

  .section-title {
    font-size: 2rem !important;
  }

  .container {
    padding: 0 1rem !important;
  }
}

@media (max-width: 480px) {
  .imagelogo {
    width: 100px !important;
  }
  
  .mobile-menu {
    width: 90vw !important;
    max-width: 300px !important;
  }
  
  .hero-content h1 {
    font-size: 2rem !important;
  }

  .hero-content p {
    font-size: 1rem !important;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem !important;
    font-size: 0.9rem !important;
  }

  .feature-card {
    padding: 2rem !important;
  }

  .section-title {
    font-size: 1.75rem !important;
  }

  .cta-content h2 {
    font-size: 1.75rem !important;
  }

  .dashboard-preview {
    padding: 1.5rem !important;
  }

  .stat-card {
    padding: 0.75rem !important;
  }

  .stat-number {
    font-size: 1.25rem !important;
  }
}

/* ==================== DESKTOP VISIBILITY FIX ==================== */
@media (min-width: 769px) {
  .desktop-only {
    display: flex !important;
  }
  
  .mobile-only {
    display: none !important;
  }
  
  .mobile-menu {
    display: none !important;
  }
  
  .mobile-overlay {
    display: none !important;
  }
}
</style>