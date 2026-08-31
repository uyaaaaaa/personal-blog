<template>
  <div class="error-container">
    <div class="error-content">
      <h1 class="error-code">{{ code }}</h1>
      <p class="error-message">{{ message }}</p>
      <p class="error-description">{{ description }}</p>
      <button @click="handleError" class="back-button">
        Back to Top
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  code: number | string
  message: string
  description: string
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--color-main);
  font-family: var(--font-sans);
  text-align: center;
  padding: 1rem;
}

.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 600px;
}

.error-code {
  font-size: 8rem;
  font-weight: 700;
  font-family: var(--font-mono);
  margin: 0;
  line-height: 1;
  letter-spacing: -5px;
}

.error-message {
  font-size: 2rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.error-description {
  font-size: 1rem;
  color: var(--color-sub);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.back-button {
  background-color: var(--color-accent);
  color: #FFFFFF;
  border: none;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: var(--color-accent-hover);
}
</style>
