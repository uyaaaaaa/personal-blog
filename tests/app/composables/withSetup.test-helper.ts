import { mount } from '@vue/test-utils'

// effectScope ではマウントのフックが走らないので、実際にマウントする
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
