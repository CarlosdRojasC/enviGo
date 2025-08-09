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

/**
 * Envía un pedido a Circuit y lo asigna a un conductor.
 * @param {object} order - El objeto del pedido con todos los detalles.
 * @param {string} circuitDriverId - El ID del conductor específico de Circuit.
 */
const sendOrderToCircuit = async (order, circuitDriverId) => { // <-- 1. AÑADIMOS EL NUEVO PARÁMETRO
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

    // --- ✅ 2. AÑADIMOS EL CONDUCTOR A LOS DATOS DE LA PARADA ---
    // Si recibimos un ID de conductor de Circuit, lo añadimos al objeto.
    // El campo 'driver' asigna la parada directamente a ese conductor.
    if (circuitDriverId) {
      stopData.driver = circuitDriverId;
      console.log(`   Circuit: Asignando parada a conductor de Circuit con ID: ${circuitDriverId}`);
    }
    // --- ✅ FIN DE LA MODIFICACIÓN ---

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
// ... (aquí va todo tu código existente: getOrCreateDailyPlan, sendOrderToCircuit, etc.) ...

/**
 * Crea un nuevo conductor en la API de Circuit.
 * @param {object} driverData - Datos como { name, email, phone }.
 * @returns {Promise<object|null>} El objeto del conductor creado o null si falla.
 */
const createDriverInCircuit = async (driverData) => {
  console.log(`Circuit Controller: Creando conductor con email ${driverData.email}...`);
  try {
    const response = await axios.post(`${CIRCUIT_API_URL}/drivers`, driverData, {
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
    return null; // Devuelve null si falla, para no detener el proceso principal.
  }
};

module.exports = {
  sendOrderToCircuit,
  createDriverInCircuit
};