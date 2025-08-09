const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// Objeto para guardar en caché el planId del día.
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
 * Envía un pedido como una "parada" a la API de Circuit.
 */
const sendOrderToCircuit = async (order) => {
  if (!CIRCUIT_API_KEY) {
    console.error('Circuit: La variable de entorno CIRCUIT_API_KEY no está configurada.');
    throw new Error('La clave de API de Circuit no está configurada.');
  }

  try {
    const planId = await getOrCreateDailyPlan(); // Esto devuelve "plans/some_id"

    // --- ✅ INICIO DE LA CORRECIÓN BASADA EN TU ESQUEMA ---
    // Construimos el objeto stopData siguiendo la estructura exacta que proporcionaste.
    const stopData = {
      address: {
        // Nombres de campo corregidos según tu JSON
        addressLineOne: order.shipping_address,
        city: order.shipping_commune,
        zip: order.shipping_zip || '',
        // state: 'RM', // Opcional: Podrías añadir un estado/región si lo tienes
        // country: 'CL' // Opcional: Podrías añadir el país
      },
      recipient: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email || '', // Añadido el email
      },
      notes: `Pedido #${order.order_number}. Detalles: ${order.notes || 'Sin notas.'}`,
      // Opcional: Puedes añadir el número de paquetes si tienes ese dato
      // packageCount: order.items_count || 1, 
    };
    // --- ✅ FIN DE LA CORRECIÓN ---

    // Usamos la URL base y luego el planId que ya contiene "plans/..."
    await axios.post(`${CIRCUIT_API_URL}/${planId}/stops`, stopData, {
      headers: {
        Authorization: `Bearer ${CIRCUIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Si la línea anterior no lanza un error, el envío fue exitoso.
    console.log(`✅ Circuit: Pedido ${order.order_number} enviado a Circuit exitosamente.`);

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Circuit: Error enviando el pedido ${order.order_number} - ${errorMessage}`);
    throw new Error(`Fallo al enviar el pedido ${order.order_number} a Circuit.`);
  }
};

module.exports = {
  sendOrderToCircuit,
};