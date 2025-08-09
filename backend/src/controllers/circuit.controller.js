const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

const dailyPlan = {
  date: null,
  planId: null,
};

const getOrCreateDailyPlan = async () => {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  if (dailyPlan.date === todayISO && dailyPlan.planId) {
    return dailyPlan.planId;
  }

  try {
    const planData = {
      starts: {
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      },
      title: `Entregas del ${todayISO}`,
    };

    const response = await axios.post(`${CIRCUIT_API_URL}/plans`, planData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const planId = response.data.id;
    dailyPlan.date = todayISO;
    dailyPlan.planId = planId;

    console.log(`Circuit: Plan para hoy creado/obtenido: ${planId}`);
    return planId;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error creando el plan - ${errorMessage}`);
    throw new Error(`No se pudo crear el plan en Circuit: ${errorMessage}`);
  }
};

const sendOrderToCircuit = async (order, circuitDriverId) => {
  // ... (Esta función ya está correcta, no necesita cambios)
  if (!CIRCUIT_API_KEY) {
    console.error('Circuit: La variable de entorno CIRCUIT_API_KEY no está configurada.');
    throw new Error('La clave de API de Circuit no está configurada.');
  }

  try {
    const planId = await getOrCreateDailyPlan();
    const stopData = {
      address: {
        addressLineOne: order.shipping_address,
        city: order.shipping_commune,
        zip: order.shipping_zip || '8700000',
        state: order.shipping_state || 'RM',
        country: order.shipping_country || 'CL',
      },
      recipient: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email || '',
      },
      notes: `Pedido #${order.order_number}. Detalles: ${order.notes || 'Sin notas.'}`,
    };
    if (circuitDriverId) {
      stopData.driver = circuitDriverId;
      console.log(`   Circuit: Asignando parada a conductor de Circuit con ID: ${circuitDriverId}`);
    }
    await axios.post(`${CIRCUIT_API_URL}/${planId}/stops`, stopData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Circuit: Pedido ${order.order_number} enviado a Circuit exitosamente.`);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error enviando el pedido ${order.order_number} - ${errorMessage}`);
    throw new Error(`Fallo al enviar el pedido ${order.order_number} a Circuit.`);
  }
};


/**
 * Crea un nuevo conductor en la API de Circuit.
 * @param {object} driverData - Datos como { name, email, phone }.
 * @returns {Promise<object|null>} El objeto del conductor creado o null si falla.
 */
const createDriverInCircuit = async (driverData) => {
  console.log(`Circuit Controller: Creando conductor con email ${driverData.email}...`);
  try {
    
    // --- ✅ INICIO DE LA CORRECCIÓN DEL TELÉFONO ---
    // Normalizamos el número de teléfono para que contenga ÚNICAMENTE dígitos.
    // Esto elimina espacios, guiones, paréntesis y el signo '+'
    const phoneWithOnlyDigits = driverData.phone.replace(/\D/g, '');

    console.log(`   -> Teléfono original: "${driverData.phone}", Teléfono normalizado para Circuit: "${phoneWithOnlyDigits}"`);

    // Preparamos los datos para enviar a Circuit con el teléfono limpio
    const circuitPayload = {
      name: driverData.name,
      email: driverData.email,
      phone: phoneWithOnlyDigits,
    };
    // --- ✅ FIN DE LA CORRECCIÓN ---

    const response = await axios.post(`${CIRCUIT_API_URL}/drivers`, circuitPayload, { // <-- Usamos el payload corregido
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Circuit Controller: Conductor creado en Circuit.`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Circuit Controller: Error al crear conductor: ${errorMessage}`);
    return null;
  }
};

module.exports = {
  sendOrderToCircuit,
  createDriverInCircuit
};