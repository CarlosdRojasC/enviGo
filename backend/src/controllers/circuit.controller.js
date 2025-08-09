const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

const dailyPlan = {
  date: null,
  planId: null,
};

/**
 * Obtiene o crea el plan diario en Circuit.
 * ✅ CORRECCIÓN: Lanza un error si la creación falla para que la función que llama se entere.
 */
const getOrCreateDailyPlan = async () => {
  const today = new Date().toISOString().split('T')[0];

  if (dailyPlan.date === today && dailyPlan.planId) {
    return dailyPlan.planId;
  }

  try {
    const planData = {
      // ✅ CORRECCIÓN: El campo se llama 'day', no 'date'.
      starts: { day: today }, 
      title: `Entregas del ${today}`,
    };

    const response = await axios.post(`${CIRCUIT_API_URL}/plans`, planData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const planId = response.data.id;
    dailyPlan.date = today;
    dailyPlan.planId = planId;

    console.log(`Circuit: Plan para hoy creado/obtenido: ${planId}`);
    return planId;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error creando el plan - ${errorMessage}`);
    // ✅ CORRECCIÓN: Lanzamos el error hacia arriba.
    throw new Error(`No se pudo crear el plan en Circuit: ${errorMessage}`);
  }
};

/**
 * Envía un pedido a Circuit.
 * ✅ CORRECCIÓN: Propaga el error si algo falla.
 * @param {object} order - El objeto del pedido con todos los detalles.
 */
const sendOrderToCircuit = async (order) => {
  if (!CIRCUIT_API_KEY) {
    console.error('Circuit: La variable de entorno CIRCUIT_API_KEY no está configurada.');
    // Lanzamos un error para detener el proceso si no hay clave.
    throw new Error('La clave de API de Circuit no está configurada.');
  }

  try {
    const planId = await getOrCreateDailyPlan();

    const stopData = {
      address: {
        addressLine1: order.shipping_address, // <-- Usar el campo correcto de tu modelo.
        city: order.shipping_commune,      // <-- Usar el campo correcto de tu modelo.
        postcode: order.shipping_zip || '', // <-- Usar el campo correcto de tu modelo.
      },
      recipient: {
        name: order.customer_name,
        phone: order.customer_phone,
      },
      notes: `Pedido #${order.order_number}. Detalles: ${order.notes || 'Sin notas.'}`,
    };

    await axios.post(`${CIRCUIT_API_URL}/plans/${planId}/stops`, stopData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Si todo va bien, no se lanza error y la función termina.
    
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error enviando el pedido ${order.order_number} - ${errorMessage}`);
    // ✅ CORRECCIÓN: Lanzamos el error para que la función principal sepa que falló.
    throw new Error(`Fallo al enviar el pedido ${order.order_number} a Circuit.`);
  }
};

module.exports = {
  sendOrderToCircuit,
};