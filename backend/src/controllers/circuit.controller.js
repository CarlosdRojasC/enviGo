const axios = require('axios');

// Es crucial que guardes tu API Key como una variable de entorno y no directamente en el código.
const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// Objeto para guardar en caché el planId del día y evitar crearlo en cada llamada.
const dailyPlan = {
  date: null,
  planId: null,
};

/**
 * Obtiene el ID del plan de Circuit para el día actual.
 * Si no existe, crea uno nuevo.
 */
const getOrCreateDailyPlan = async () => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

  // Si ya tenemos un plan para hoy, lo reutilizamos.
  if (dailyPlan.date === today && dailyPlan.planId) {
    return dailyPlan.planId;
  }

  try {
    const response = await axios.post(
      `${CIRCUIT_API_URL}/plans`,
      {
        starts: { date: today },
        title: `Entregas del ${today}`,
      },
      {
        headers: {
          Authorization: `Bearer ${CIRCUIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const planId = response.data.id;
    // Guardamos el plan en nuestra caché simple
    dailyPlan.date = today;
    dailyPlan.planId = planId;

    console.log(`Plan de Circuit para hoy creado/obtenido: ${planId}`);
    return planId;
  } catch (error) {
    console.error('Error creando el plan en Circuit:', error.response ? error.response.data : error.message);
    throw new Error('No se pudo crear el plan en Circuit.');
  }
};


/**
 * Envía un pedido como una "parada" a la API de Circuit.
 * @param {object} order - El objeto del pedido con todos los detalles.
 */
const sendOrderToCircuit = async (order) => {
  if (!CIRCUIT_API_KEY) {
    console.error('Error: La variable de entorno CIRCUIT_API_KEY no está configurada.');
    return;
  }

  try {
    // 1. Asegurarnos de tener un plan para el día.
    const planId = await getOrCreateDailyPlan();

    // 2. Preparar los datos de la parada (stop) con la información del pedido.
    const stopData = {
      address: {
        addressLine1: order.deliveryAddress.street,
        city: order.deliveryAddress.city,
        postcode: order.deliveryAddress.postalCode,
        // puedes agregar más detalles si los tienes
        // country: order.deliveryAddress.country,
      },
      recipient: {
        name: order.customerName,
        phone: order.customerPhone,
      },
      notes: `Pedido #${order.orderNumber}. Detalles: ${order.orderDetails}`,
      // Aquí puedes especificar un conductor si tienes su ID de Circuit
      // allowedDrivers: ["driverId_de_circuit"]
    };

    // 3. Enviar la parada a la API de Circuit.
    const response = await axios.post(
      `${CIRCUIT_API_URL}/plans/${planId}/stops`,
       stopData,
      {
         headers: {
          Authorization: `Bearer ${CIRCUIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`Pedido ${order.orderNumber} enviado a Circuit con éxito.`);
    return response.data;

  } catch (error) {
    console.error(`Error enviando el pedido ${order.orderNumber} a Circuit:`, error.response ? error.response.data : error.message);
  }
};

module.exports = {
  sendOrderToCircuit,
};