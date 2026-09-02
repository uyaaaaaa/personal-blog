import { onMounted, onUnmounted, watch, type Ref } from 'vue'

export const useScrollSubscription = (handler: () => void, enabled: Ref<boolean>) => {
  const subscribe = () => {
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler, { passive: true })
  }

  const unsubscribe = () => {
    window.removeEventListener('scroll', handler)
    window.removeEventListener('resize', handler)
  }

  onMounted(() => {
    watch(enabled, (on) => (on ? subscribe() : unsubscribe()), { immediate: true })
  })

  onUnmounted(unsubscribe)
}
