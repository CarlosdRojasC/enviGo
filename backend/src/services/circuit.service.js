const axios = require('axios');

const CIRCUIT_API_KEY = process.env.CIRCUIT_API_KEY;
const CIRCUIT_API_URL = 'https://api.getcircuit.com/public/v0.2b';

// Caché para no llamar a la API de Circuit a cada rato
const cache = {
  drivers: null,
  lastFetch: 0,
  cacheDuration: 3600 * 1000, // 1 hora
};

async function getCircuitDrivers() {
  const now = Date.now();
  if (cache.drivers && now - cache.lastFetch < cache.cacheDuration) {
    return cache.drivers;
  }
  try {
    const response = await axios.get(`${CIRCUIT_API_URL}/drivers`, {
      headers: { Authorization: `Bearer ${CIRCUIT_API_KEY}` },
    });
    const drivers = response.data.drivers || [];
    cache.drivers = drivers;
    cache.lastFetch = now;
    return drivers;
  } catch (error) {
    console.error('Circuit Service: Error al obtener conductores.', error.message);
    return [];
  }
}

/**
 * Busca el ID de un conductor de Circuit usando su correo electrónico.
 * @param {string} email - El correo del conductor a buscar.
 * @returns {Promise<string|null>} El ID del conductor de Circuit o null si no se encuentra.
 */
async function getDriverIdByEmail(email) {
  if (!email) return null;
  const drivers = await getCircuitDrivers();
  const driver = drivers.find(d => d.email && d.email.toLowerCase() === email.toLowerCase());
  if (driver) {
    console.log(`Circuit Service: Conductor encontrado para ${email}. ID: ${driver.id}`);
    return driver.id;
  } else {
    console.warn(`Circuit Service: No se encontró un conductor en Circuit con el email: ${email}`);
    return null;
  }
}

module.exports = { getDriverIdByEmail };