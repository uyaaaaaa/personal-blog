import { vi } from 'vitest'

// happy-dom の ResizeObserver はレイアウトを持たず発火しないので、テストから叩ける形に差し替える
export const stubResizeObserver = () => {
	const callbacks: Array<() => void> = []

	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(private readonly callback: () => void) {
				callbacks.push(callback)
			}

			observe() {
				this.callback()
			}

			disconnect() {}
		},
	)

	return {
		resize: () => {
			for (const callback of callbacks) callback()
		},
		restore: () => {
			callbacks.length = 0
			vi.unstubAllGlobals()
		},
	}
}
