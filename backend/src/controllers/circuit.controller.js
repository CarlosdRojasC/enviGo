const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// --- Caché Mejorada para Depots y el Plan Diario ---
const circuitCache = {
  mainDepotId: null,
  dailyPlan: {
    id: null,
    date: null,
    driverIds: new Set(), // Un Set para guardar los IDs de los conductores en el plan sin duplicados
  },
};

/**
 * Obtiene el ID del depot principal de Circuit, usando caché.
 */
async function getMainDepotId() {
  if (circuitCache.mainDepotId) {
    return circuitCache.mainDepotId;
  }
  try {
    const response = await axios.get(`${CIRCUIT_API_URL}/depots`, {
      headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}` },
    });
    const depots = response.data.depots;
    if (!depots || depots.length === 0) throw new Error('No se encontraron depots en Circuit.');
    const mainDepotId = depots[0].id;
    circuitCache.mainDepotId = mainDepotId;
    return mainDepotId;
  } catch (error) {
    console.error('❌ Circuit Controller: Error crítico al obtener depots.', error.message);
    throw error;
  }
}

/**
 * Función inteligente: Obtiene, crea o ACTUALIZA el plan del día para incluir a los conductores necesarios.
 * @param {Array<string>} requiredDriverIds - Un array de IDs de conductores de Circuit que deben estar en el plan.
 * @returns {Promise<string>} El ID del plan.
 */
async function getOrCreateDailyPlan(requiredDriverIds = []) {
  const todayISO = new Date().toISOString().split('T')[0];
  const isSameDay = circuitCache.dailyPlan.date === todayISO;
  const allDriversAlreadyIncluded = requiredDriverIds.every(id => circuitCache.dailyPlan.driverIds.has(id));

  // Si es el mismo día, ya tenemos un plan y todos los conductores necesarios ya están, lo reutilizamos.
  if (isSameDay && circuitCache.dailyPlan.id && allDriversAlreadyIncluded) {
    return circuitCache.dailyPlan.id;
  }

  try {
    const today = new Date();
    // Añadimos los nuevos conductores a nuestra lista en caché para no perderlos
    requiredDriverIds.forEach(id => circuitCache.dailyPlan.driverIds.add(id));
    const allDriverIdsForPlan = Array.from(circuitCache.dailyPlan.driverIds);

    const planData = {
      starts: { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() },
      title: `Entregas del ${todayISO}`,
      drivers: allDriverIdsForPlan, // <-- Incluimos la lista completa de conductores
    };

    let planId;

    if (isSameDay && circuitCache.dailyPlan.id) {
      // Si ya hay un plan para hoy pero faltan conductores, lo ACTUALIZAMOS (PATCH)
      console.log(`Circuit Controller: Actualizando plan ${circuitCache.dailyPlan.id} para añadir conductores...`);
      await axios.patch(`${CIRCUIT_API_URL}/${circuitCache.dailyPlan.id}`, { drivers: allDriverIdsForPlan }, {
        headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
      });
      planId = circuitCache.dailyPlan.id;
    } else {
      // Si no hay plan para hoy, lo CREAMOS (POST)
      console.log('Circuit Controller: Creando un nuevo plan para hoy...');
      const response = await axios.post(`${CIRCUIT_API_URL}/plans`, planData, {
        headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
      });
      planId = response.data.id;
    }

    // Actualizamos la caché con la información más reciente
    circuitCache.dailyPlan.id = planId;
    circuitCache.dailyPlan.date = todayISO;
    
    console.log(`✅ Circuit Controller: Plan listo con ID: ${planId} y ${allDriverIdsForPlan.length} conductor(es).`);
    return planId;

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Circuit Controller: Error gestionando el plan - ${errorMessage}`);
    throw new Error(`No se pudo gestionar el plan en Circuit: ${errorMessage}`);
  }
}

/**
 * Añade una parada (pedido) a un plan existente y la asigna a un conductor.
 */
async function addStopToPlan(order, planId, circuitDriverId) {
  try {
    const stopData = {
      address: {
        addressLineOne: order.shipping_address,
        city: order.shipping_commune,
        zip: order.shipping_zip || '8700000',
        state: order.shipping_state || 'RM',
        country: order.shipping_country || 'CL',
      },
      recipient: { name: order.customer_name, phone: order.customer_phone, email: order.customer_email || '' },
      notes: `Pedido #${order.order_number}.`,
      driver: circuitDriverId, // Asignamos la parada al conductor correcto
    };

    await axios.post(`${CIRCUIT_API_URL}/${planId}/stops`, stopData, {
      headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Fallo al añadir la parada para la orden #${order.order_number}: ${errorMessage}`);
  }
}

/**
 * Crea un nuevo conductor en Circuit.
 */
async function createDriverInCircuit(driverData) {
    const mainDepotId = await getMainDepotId();
    const circuitPayload = {
      name: driverData.name,
      email: driverData.email,
      phone: null,
      displayName: driverData.name,
      depots: [mainDepotId],
      routeOverrides: {},
    };
    try {
      const response = await axios.post(`${CIRCUIT_API_URL}/drivers`, circuitPayload, {
          headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      return null;
    }
}


module.exports = {
  getOrCreateDailyPlan,
  addStopToPlan,
  createDriverInCircuit,
};