import mitt from 'mitt';

// Creamos una instancia única que toda la aplicación puede usar para comunicarse.
export const emitter = mitt();