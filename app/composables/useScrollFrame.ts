import { onMounted, onUnmounted, watch, type Ref } from 'vue'

type Read = () => void

const reads = new Set<Read>()

let frame: number | undefined
let listening = false

const runReads = () => {
  frame = undefined
  for (const read of reads) read()
}

const schedule = () => {
  if (frame !== undefined) return
  frame = requestAnimationFrame(runReads)
}

const listen = () => {
  if (listening) return

  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
}

const unlisten = () => {
  if (!listening || reads.size > 0) return

  listening = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)

  if (frame !== undefined) {
    cancelAnimationFrame(frame)
    frame = undefined
  }
}

export const useScrollFrame = (read: Read, enabled: Ref<boolean>) => {
  const add = () => {
    read()
    reads.add(read)
    listen()
  }

  const remove = () => {
    reads.delete(read)
    unlisten()
  }

  onMounted(() => {
    watch(enabled, (on) => (on ? add() : remove()), { immediate: true })
  })

  onUnmounted(remove)
}
