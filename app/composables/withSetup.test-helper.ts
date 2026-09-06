import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// onMounted / onUnmounted を持つ composable を呼ぶためだけのダミーコンポーネント。
// effectScope ではマウントのフックが走らないので、実際にマウントして破棄まで測れる形にする
export const withSetup = <T>(setup: () => T) => {
	let result: T | undefined

	const wrapper = mount(
		defineComponent({
			setup: () => {
				result = setup()
				return () => h('div')
			},
		}),
	)

	return {
		result: result as T,
		unmount: () => wrapper.unmount(),
	}
}
