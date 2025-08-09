const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// Objeto para guardar en caché el planId del día y evitar crearlo en cada llamada.
const dailyPlan = {
  date: null,
  planId: null,
};

/**
 * Obtiene o crea el plan diario en Circuit.
 */
const getOrCreateDailyPlan = async () => {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0]; // 'YYYY-MM-DD' para la caché y el título

  // Si ya tenemos un plan para hoy, lo reutilizamos.
  if (dailyPlan.date === todayISO && dailyPlan.planId) {
    return dailyPlan.planId;
  }

  try {
    // --- ✅ INICIO DE LA CORRECIÓN DEFINITIVA ---
    // La documentación especifica que 'starts' debe ser un objeto con day, month, y year como números.
    const planData = {
      starts: {
        day: today.getDate(),          // -> Número para el día (ej: 9)
        month: today.getMonth() + 1,   // -> Número para el mes (getMonth() es base 0, por eso +1)
        year: today.getFullYear()     // -> Número para el año (ej: 2025)
      },
      title: `Entregas del ${todayISO}`, // El título puede seguir siendo un texto
    };
    // --- ✅ FIN DE LA CORRECIÓN DEFINITIVA ---

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
 * Envía un pedido como una "parada" a la API de Circuit.
 * @param {object} order - El objeto del pedido con todos los detalles.
 */
const sendOrderToCircuit = async (order) => {
  if (!CIRCUIT_API_KEY) {
    console.error('Circuit: La variable de entorno CIRCUIT_API_KEY no está configurada.');
    throw new Error('La clave de API de Circuit no está configurada.');
  }

  try {
    const planId = await getOrCreateDailyPlan();

    const stopData = {
      address: {
        addressLine1: order.shipping_address,
        city: order.shipping_commune,
        postcode: order.shipping_zip || '',
      },
      recipient: {
        name: order.customer_name,
        phone: order.customer_phone,
      },
      notes: `Pedido #${order.order_number}. Detalles: ${order.notes || 'Sin notas.'}`,
    };

    await axios.post(`${CIRCUIT_API_URL}/${planId}/stops`, stopData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error enviando el pedido ${order.order_number} - ${errorMessage}`);
    throw new Error(`Fallo al enviar el pedido ${order.order_number} a Circuit.`);
  }
};

module.exports = {
  sendOrderToCircuit,
};