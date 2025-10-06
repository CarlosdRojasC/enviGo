<template>
  <transition name="modal-fade">
    <div 
      v-if="modelValue" 
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]" 
      @click.self="close"
    >
      <div 
        class="bg-white rounded-xl shadow-2xl w-[90%] max-h-[90vh] flex flex-col" 
        :style="{ maxWidth: width }"
      >
        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 class="m-0 text-lg font-semibold text-gray-800">{{ title }}</h3>
          <button 
            class="bg-transparent border-none text-2xl cursor-pointer text-gray-500 leading-none hover:text-gray-700 transition-colors" 
            @click="close"
          >
            &times;
          </button>
        </div>
        <div class="p-6 overflow-y-auto text-gray-700">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: 'Ventana Modal' },
  width: { type: String, default: '600px' }
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
/* Animaciones de transición */
.modal-fade-enter-active, 
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from, 
.modal-fade-leave-to {
  opacity: 0;
}
</style>