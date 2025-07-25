<!-- frontend/src/views/LandingPage.vue -->
<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="navbar" :class="{ scrolled: isScrolled }">
      <div class="nav-container">
        <div class="logo">
          <span>enviGo</span>
          <span class="logo-subtitle">LOGISTICS</span>
        </div>
        <ul class="nav-links">
          <li><a href="#inicio" @click="scrollTo('inicio')">Inicio</a></li>
          <li><a href="#funcionalidades" @click="scrollTo('funcionalidades')">Funcionalidades</a></li>
          <li><a href="#integraciones" @click="scrollTo('integraciones')">Integraciones</a></li>
          <li><a href="#contacto" @click="scrollTo('contacto')">Contacto</a></li>
        </ul>
        <div class="nav-actions">
          <router-link to="/login" class="nav-login">Iniciar Sesión</router-link>
          <a href="#contacto" class="cta-button" @click="scrollTo('contacto')">Solicitar Demo</a>
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
              <i class="fas fa-motorcycle"></i>
              Comenzar Gratis
            </a>
            <a href="#funcionalidades" class="btn-secondary" @click="scrollTo('funcionalidades')">
              <i class="fas fa-play"></i>
              Ver Demo
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
            :class="{ 'fade-in-up': feature.visible }"
          >
            <div class="feature-icon">
              <i :class="feature.icon"></i>
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
              <i :class="integration.icon"></i>
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
              <i class="fas fa-motorcycle"></i>
              Solicitar Demo Gratuita
            </a>
            <a href="tel:+56912345678" class="btn-secondary">
              <i class="fas fa-phone"></i>
              Llamar Ahora
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
import { ref, onMounted, onUnmounted } from 'vue'

// Estado reactivo
const isScrolled = ref(false)
const demoStats = ref([
  { value: '1,247', label: 'Entregas Activas' },
  { value: '98.2%', label: 'Tasa de Éxito' },
  { value: '15', label: 'Conductores Online' },
  { value: '2.3h', label: 'Tiempo Promedio' }
])

// Datos de funcionalidades
const features = ref([
  {
    icon: 'fas fa-sync-alt',
    title: 'Sincronización Automática',
    description: 'Conecta tu Shopify, WooCommerce o Mercado Libre y sincroniza pedidos automáticamente. Sin intervención manual, sin errores.',
    tags: ['Shopify', 'WooCommerce', 'Mercado Libre'],
    visible: false
  },
  {
    icon: 'fas fa-route',
    title: 'Gestión Inteligente de Rutas',
    description: 'Optimización automática de rutas para tus conductores. Reduce tiempos de entrega y costos operacionales hasta en un 40%.',
    tags: ['Optimización IA', 'GPS Real-time', 'Multi-zona'],
    visible: false
  },
  {
    icon: 'fas fa-mobile-alt',
    title: 'Seguimiento en Tiempo Real',
    description: 'Tus clientes reciben notificaciones automáticas y pueden seguir sus pedidos en tiempo real. Mejora la experiencia de entrega.',
    tags: ['SMS/WhatsApp', 'Tracking Link', 'Notificaciones'],
    visible: false
  },
  {
    icon: 'fas fa-camera',
    title: 'Prueba de Entrega Digital',
    description: 'Fotos, firmas digitales y coordenadas GPS de cada entrega. Protección total contra reclamos y disputas.',
    tags: ['Foto + Firma', 'Geolocalización', 'Timestamp'],
    visible: false
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Analytics y Reportes',
    description: 'Dashboard completo con métricas de rendimiento, costos por entrega, y análisis de zonas más rentables.',
    tags: ['KPIs Logísticos', 'Costos', 'Exportación'],
    visible: false
  },
  {
    icon: 'fas fa-users',
    title: 'Gestión Multi-empresa',
    description: 'Administra múltiples empresas desde una sola cuenta. Facturación separada, usuarios independientes y control total.',
    tags: ['Multi-tenant', 'Roles', 'Facturación'],
    visible: false
  }
])

// Datos de integraciones
const integrations = ref([
  { name: 'Shopify', icon: 'fab fa-shopify', status: '✅ Integración Completa', statusClass: 'available' },
  { name: 'WooCommerce', icon: 'fab fa-wordpress', status: '✅ Integración Completa', statusClass: 'available' },
  { name: 'Mercado Libre', icon: 'fas fa-shopping-cart', status: '🚀 Próximamente', statusClass: 'coming-soon' },
  { name: 'Shipday', icon: 'fas fa-truck', status: '✅ API Integrada', statusClass: 'available' },
  { name: 'Excel/CSV', icon: 'fas fa-file-excel', status: '✅ Importación Masiva', statusClass: 'available' },
  { name: 'WhatsApp API', icon: 'fas fa-bell', status: '🚀 Próximamente', statusClass: 'coming-soon' }
])

// Métodos
const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

// Intersection Observer para animaciones
const setupIntersectionObserver = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up')
      }
    })
  }, { threshold: 0.1 })

  // Observar elementos para animación
  setTimeout(() => {
    document.querySelectorAll('.feature-card, .integration-card').forEach(el => {
      observer.observe(el)
    })
  }, 100)
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  setupIntersectionObserver()
  
  // Actualizar estadísticas cada 5 segundos
  const interval = setInterval(() => {
    demoStats.value[0].value = (Math.floor(Math.random() * 100) + 1200).toLocaleString()
  }, 5000)
  
  onUnmounted(() => {
    clearInterval(interval)
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* Importar todos los estilos del HTML anterior */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

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
  --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  --gradient-dark: linear-gradient(135deg, var(--accent) 0%, var(--primary-dark) 100%);
  --shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 20px 40px rgba(0, 0, 0, 0.15);
  --shadow-green: 0 10px 25px rgba(139, 197, 63, 0.2);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.landing-page {
  font-family: 'Inter', sans-serif;
  line-height: 1.6;
  color: var(--dark);
  overflow-x: hidden;
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
}

.navbar.scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-direction: column;
  line-height: 1;
}

.logo-subtitle {
  font-size: 0.8rem;
  color: var(--gray);
  font-weight: 400;
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
  background: var(--gradient);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: var(--shadow);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* Hero Section */
.hero {
  min-height: 100vh;
  background: linear-gradient(135deg, #2C2C2C 0%, #3A3A3A 50%, #4A4A4A 100%);
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
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
  background: var(--gradient);
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
  background: var(--gradient);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: var(--shadow);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-green);
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
  background: rgba(139, 197, 63, 0.1);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(139, 197, 63, 0.2);
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
  background: rgba(139, 197, 63, 0.1);
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid #8BC53F;
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
  box-shadow: var(--shadow);
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
  background: var(--gradient);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: var(--shadow-hover);
}

.feature-icon {
  width: 60px;
  height: 60px;
  background: var(--gradient);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
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
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  border: 1px solid #E2E8F0;
}

.integration-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
}

.integration-logo {
  width: 60px;
  height: 60px;
  background: var(--gradient);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
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

  .nav-container {
    justify-content: center;
  }

  .cta-content h2 {
    font-size: 2rem;
  }

  .section-title {
    font-size: 2rem;
  }
}
</style>