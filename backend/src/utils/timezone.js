// backend/src/utils/timezone.js
// Utilidad centralizada para manejo de fechas con timezone de Chile (UTC-3)

/**
 * Timezone de Chile: UTC-3 (sin considerar horario de verano por simplicidad)
 * Si necesitas DST (Daylight Saving Time), usar moment-timezone o luxon
 */
const CHILE_OFFSET_MINUTES = -3 * 60; // -180 minutos

/**
 * Obtiene la fecha actual en timezone de Chile
 */
function getChileNow() {
  const now = new Date();
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (localOffset - CHILE_OFFSET_MINUTES) * 60000);
}

/**
 * Convierte una fecha del frontend (que viene como string ISO) a Date ajustado para Chile
 * @param {string|Date} dateInput - Fecha del frontend (ej: "2025-09-02" o "2025-09-02T00:00:00.000Z")
 * @returns {Date} - Date object ajustado para queries en UTC
 */
function parseChileDate(dateInput) {
  if (!dateInput) return null;
  
  // Si ya es un Date, usarlo directamente
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // Si es string, parsearlo
  const date = new Date(dateInput);
  
  // Si la fecha viene sin timezone (ej: "2025-09-02"), asumimos que es Chile timezone
  // y ajustamos para que el query en UTC busque correctamente
  if (typeof dateInput === 'string' && !dateInput.includes('T')) {
    // Fecha sin hora, asumir 00:00:00 en Chile
    const [year, month, day] = dateInput.split('-').map(Number);
    const chileDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0)); // 03:00 UTC = 00:00 Chile
    return chileDate;
  }
  
  return date;
}

/**
 * Obtiene el inicio del día de hoy en Chile (00:00:00)
 */
function getChileToday() {
  const chileNow = getChileNow();
  return new Date(Date.UTC(
    chileNow.getFullYear(),
    chileNow.getMonth(),
    chileNow.getDate(),
    3, 0, 0, 0 // 03:00 UTC = 00:00 Chile
  ));
}

/**
 * Obtiene el inicio del mes actual en Chile
 */
function getChileThisMonthStart() {
  const chileNow = getChileNow();
  return new Date(Date.UTC(
    chileNow.getFullYear(),
    chileNow.getMonth(),
    1,
    3, 0, 0, 0 // 03:00 UTC = 00:00 Chile
  ));
}

/**
 * Obtiene una fecha X días atrás desde hoy en Chile
 */
function getChileDateDaysAgo(days) {
  const today = getChileToday();
  return new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Obtiene una fecha X meses atrás desde hoy en Chile
 */
function getChileDateMonthsAgo(months) {
  const chileNow = getChileNow();
  return new Date(Date.UTC(
    chileNow.getFullYear(),
    chileNow.getMonth() - months,
    chileNow.getDate(),
    3, 0, 0, 0
  ));
}

/**
 * Formatea una fecha para logging (muestra hora de Chile)
 */
function formatChileDate(date) {
  if (!date) return 'null';
  const chileDate = new Date(date.getTime() - CHILE_OFFSET_MINUTES * 60000);
  return chileDate.toISOString().replace('T', ' ').substring(0, 19) + ' (Chile)';
}

/**
 * Convierte un rango de fechas del frontend para usar en queries
 * @param {string} dateFrom - Fecha inicio del frontend
 * @param {string} dateTo - Fecha fin del frontend
 * @returns {object} - { $gte: Date, $lte: Date }
 */
function parseDateRangeForQuery(dateFrom, dateTo) {
  const filter = {};
  
  if (dateFrom) {
    filter.$gte = parseChileDate(dateFrom);
    console.log('📅 Fecha desde (Chile):', formatChileDate(filter.$gte));
  }
  
  if (dateTo) {
    // Para dateTo, agregar 23:59:59 del día seleccionado
    const endDate = parseChileDate(dateTo);
    endDate.setHours(26, 59, 59, 999); // 26:59 UTC = 23:59 Chile del día siguiente
    filter.$lte = endDate;
    console.log('📅 Fecha hasta (Chile):', formatChileDate(filter.$lte));
  }
  
  return filter;
}

module.exports = {
  CHILE_OFFSET_MINUTES,
  getChileNow,
  parseChileDate,
  getChileToday,
  getChileThisMonthStart,
  getChileDateDaysAgo,
  getChileDateMonthsAgo,
  formatChileDate,
  parseDateRangeForQuery
};