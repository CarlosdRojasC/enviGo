const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// --- Caché Mejorada para Depots y el Plan Diario ---
const circuitCache = {
  mainDepotId: null,
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
 * Crea un NUEVO plan (ruta) para una asignación específica a un conductor.
 * @param {string} circuitDriverId - El ID del conductor de Circuit para esta ruta.
 * @param {Array<object>} orders - La lista de pedidos (solo para dar un título descriptivo).
 * @returns {Promise<string>} El ID del nuevo plan creado.
 */
async function createPlanForAssignment(circuitDriverId, orders) {
  try {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    const orderCount = orders.length;

    const planData = {
      starts: { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() },
      title: `Ruta de ${orderCount} pedido(s) - ${todayISO}`,
      drivers: [circuitDriverId], // El plan (la ruta) es solo para este conductor
    };

    console.log(`Circuit Controller: Creando un nuevo plan para el conductor ${circuitDriverId}...`);
    const response = await axios.post(`${CIRCUIT_API_URL}/plans`, planData, {
      headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
    });
    
    const planId = response.data.id;
    console.log(`✅ Circuit Controller: Nuevo plan creado con ID: ${planId}`);
    return planId;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Circuit Controller: Error creando el plan específico - ${errorMessage}`);
    throw new Error(`No se pudo crear el plan en Circuit: ${errorMessage}`);
  }
}

/**
 * Añade una parada (pedido) a un plan existente.
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
      driver: circuitDriverId,
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
      console.error('❌ Circuit Controller: Error al crear conductor:', error.response ? JSON.stringify(error.response.data) : error.message);
      return null;
    }
}
async function distributePlan(planId) {
  try {
    console.log(`   -> 🚀 Circuit: Iniciando distribución del plan ${planId}...`);
    await axios.post(`${CIRCUIT_API_URL}/operations`, {
      planDistribute: { planId: planId }
    }, {
      headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' },
    });
    console.log(`   -> ✅ Circuit: Orden de distribución para el plan ${planId} enviada.`);
    return true;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`   -> ❌ Circuit: Error al distribuir el plan ${planId}: ${errorMessage}`);
    return false;
  }
}
async function optimizePlan(planId) {
  try {
    const res = await axios.post(
      `${CIRCUIT_API_URL}/plans/${planId}:optimize`,
      {},
      { headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    console.log(`✅ Circuit: Plan ${planId} enviado a optimización.`);
    return res.data.operationId;
  } catch (err) {
    const msg = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Error optimizando plan ${planId}: ${msg}`);
  }
}

/**
 * Consulta el estado de una operación en Circuit.
 * @param {string} operationId
 */
async function getOperationStatus(operationId) {
  try {
    const res = await axios.get(
      `${CIRCUIT_API_URL}/operations/${operationId}`,
      { headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}` } }
    );
    return res.data;
  } catch (err) {
    const msg = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Error obteniendo estado de operación ${operationId}: ${msg}`);
  }
}

// Exportamos las funciones que nuestros otros archivos necesitan
module.exports = {
  createPlanForAssignment,
  addStopToPlan,
  createDriverInCircuit,
  distributePlan,
  optimizePlan,
  getOperationStatus,
};