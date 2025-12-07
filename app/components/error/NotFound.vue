<template>
  <div class="error-container">
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <p class="error-message">Page Not Found</p>
      <p class="error-description">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <button @click="handleError" class="back-button">
        Back to Top
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const handleError = () => clearError({ redirect: '/' })
</script>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #1A1A1A;
  font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
  color: #888888;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.back-button {
  background-color: #007AFF;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: #0066CC;
}

</style>
