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
    const planId = await getOrCreateDailyPlan();

    // --- ✅ INICIO DE LA CORRECIÓN CON VALORES POR DEFECTO ---
    const stopData = {
      address: {
        addressLineOne: order.shipping_address,
        city: order.shipping_commune,
        // Si no hay zip, usamos '8700000' (código de Quilicura) como valor por defecto.
        zip: order.shipping_zip || '8700000',
        // Añadimos valores por defecto para estado y país para mayor robustez.
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
    // --- ✅ FIN DE LA CORRECIÓN ---

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

module.exports = {
  sendOrderToCircuit,
};