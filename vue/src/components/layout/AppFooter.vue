<!-- vue/src/components/layout/AppFooter.vue -->
<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer>
    <p>&copy; {{ currentYear }} GameTrack. Alle rettigheder forbeholdes.</p>
  </footer>
</template>

<style scoped>
footer {
  margin-top: 2rem;
  padding: 1rem;
  background-color: var(--header-bg);
  color: var(--text-color);
  text-align: center;
  font-size: 0.9rem;
}

footer p {
  margin: 0;
}
</style>