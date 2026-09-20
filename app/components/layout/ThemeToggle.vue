<template>
	<div
		ref="rootRef"
		class="theme-toggle"
		@pointerenter="openPanelOnHover"
		@pointerleave="scheduleClosePanelOnHover"
		@focusout="onPanelFocusout"
		@keydown.escape="dismissPanel"
	>
		<button
			ref="triggerRef"
			type="button"
			class="theme-trigger"
			aria-label="Theme"
			aria-controls="theme-menu-panel"
			:aria-expanded="isPanelOpen"
			@click="togglePanel"
		>
			<MoonIcon
				size="large"
				class="dark:hidden"
			/>
			<SunIcon
				size="large"
				class="hidden dark:block"
			/>
		</button>

		<div
			id="theme-menu-panel"
			class="theme-panel shadow-lg"
			:class="{ 'is-open': isPanelOpen }"
			role="group"
			aria-label="Theme"
		>
			<button
				type="button"
				class="theme-option"
				:class="{ 'is-selected': isSelected('light') }"
				:aria-pressed="isSelected('light')"
				@click="select('light')"
			>
				<SunIcon class="theme-option-icon" />
				<span class="theme-option-label">Light</span>
			</button>

			<button
				type="button"
				class="theme-option"
				:class="{ 'is-selected': isSelected('dark') }"
				:aria-pressed="isSelected('dark')"
				@click="select('dark')"
			>
				<MoonIcon class="theme-option-icon" />
				<span class="theme-option-label">Dark</span>
			</button>

			<button
				type="button"
				class="theme-option"
				:class="{ 'is-selected': isSelected('system') }"
				:aria-pressed="isSelected('system')"
				@click="select('system')"
			>
				<MonitorIcon class="theme-option-icon" />
				<span class="theme-option-label">System</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
	import MonitorIcon from '~/components/ui/MonitorIcon.vue'
	import MoonIcon from '~/components/ui/MoonIcon.vue'
	import SunIcon from '~/components/ui/SunIcon.vue'
	import { useHoverPanel } from '~/composables/useHoverPanel'

	type ThemePreference = 'light' | 'dark' | 'system'

	const colorMode = useColorMode()

	const {
		isOpen: isPanelOpen,
		rootRef,
		triggerRef,
		toggle: togglePanel,
		openOnHover: openPanelOnHover,
		scheduleCloseOnHover: scheduleClosePanelOnHover,
		dismiss: dismissPanel,
		onFocusout: onPanelFocusout,
	} = useHoverPanel()

	const isMounted = ref(false)

	const isSelected = (preference: ThemePreference) =>
		isMounted.value && colorMode.preference === preference

	const select = (preference: ThemePreference) => {
		colorMode.preference = preference
		dismissPanel()
	}

	onMounted(() => {
		isMounted.value = true
	})
</script>

<style scoped>
	.theme-toggle {
		position: relative;
		display: flex;
		align-items: center;
	}

	.theme-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-sub);
		cursor: pointer;
		transition: color 0.15s;
	}

	.theme-trigger:hover,
	.theme-trigger[aria-expanded='true'] {
		color: var(--color-accent);
	}

	.theme-panel {
		position: absolute;
		top: 100%;
		right: 0;
		width: 10rem;
		padding: 0.5rem;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		transition:
			opacity 0.2s ease-out,
			transform 0.2s ease-out,
			visibility 0.2s;
	}

	.theme-panel.is-open {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: none;
		border-radius: 0.375rem;
		background: none;
		font-family: inherit;
		font-size: 0.875rem;
		text-align: left;
		color: var(--color-main);
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.theme-option:hover {
		background-color: var(--color-surface-subtle);
	}

	.theme-option.is-selected {
		background-color: var(--color-surface-subtle);
		font-weight: 600;
	}

	.theme-option-icon {
		flex: none;
		color: var(--color-sub);
	}

	.theme-option-label {
		flex: 1;
		min-width: 0;
	}
</style>
