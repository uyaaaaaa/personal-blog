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

export const readOnScrollFrame = (read: Read) => {
	read()
	reads.add(read)
	listen()

	return () => {
		reads.delete(read)
		unlisten()
	}
}

export const useScrollFrame = (read: Read, enabled: Ref<boolean>) => {
	let stop: (() => void) | undefined

	const remove = () => {
		stop?.()
		stop = undefined
	}

	onMounted(() => {
		watch(
			enabled,
			(on) => {
				if (on) stop = readOnScrollFrame(read)
				else remove()
			},
			{ immediate: true },
		)
	})

	onUnmounted(remove)
}
