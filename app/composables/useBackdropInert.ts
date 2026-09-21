import { useScrollFrame } from '~/composables/useScrollFrame'

// 被せている間、背面を支援技術のツリーと Tab の行き先から外す。aria-hidden と tabindex を
// 別々に付け替えると片方だけ残るが、inert は両方を一度に外す。
// 付ける先は被せたものの祖先の兄弟。被せたものがヘッダーの中にあっても、ヘッダーの残りと
// 本文・フッターが同じ一巡で外れる
const cover = (host: HTMLElement) => {
	for (
		let node: HTMLElement = host;
		node !== document.body && node.parentElement;
		node = node.parentElement
	) {
		for (const sibling of node.parentElement.children) {
			if (sibling === node || sibling.hasAttribute('inert')) continue

			sibling.setAttribute('inert', '')
		}
	}
}

// inert の要素は focus を黙って落とす。閉じた後に背面へフォーカスを戻す側は、戻す前に
// これを呼ぶ。prop が伝わるのを待つと、戻し先が inert のままの瞬間に focus() が出る
export const releaseBackdrop = () => {
	for (const element of document.querySelectorAll('[inert]')) element.removeAttribute('inert')
}

export const useBackdropInert = (isOpen: Ref<boolean>, host: Ref<HTMLElement | null>) => {
	// 幅を跨いで被せたものが display で消えても isOpen は残る。外したままにすると行き先の
	// 無い画面になるので、覆えているかは箱が取れるかで見る
	const read = () => {
		const element = host.value
		if (isOpen.value && element && element.getClientRects().length > 0) cover(element)
		else releaseBackdrop()
	}

	useScrollFrame(read, isOpen)

	// useScrollFrame は購読を外すだけで、外した後の read は走らない
	watch(isOpen, (open) => {
		if (!open) releaseBackdrop()
	})

	onBeforeUnmount(releaseBackdrop)
}
