<template>
  <div>
    <input type="text" v-model="marker" >
    <div>
      <button @click="cancelEdit">Cancel</button>
      <button @click="addMarker">Add Marker</button>
    </div>
  </div>
</template>

<script setup>
const marker = '';
const emit = defineEmits(['close', 'add']);

function addMarker() {
  emit('add', marker);
}

function cancelEdit() {
  emit('close');
}
</script>

<style>
</style>