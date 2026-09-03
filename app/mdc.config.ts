import { defineConfig } from '@nuxtjs/mdc/config'
import type { Element, ElementContent } from 'hast'

const textOf = (nodes: ElementContent[]): string =>
  nodes.map(node => (node.type === 'text' ? node.value : node.type === 'element' ? textOf(node.children) : '')).join('')

// shikiのdiff文法は行を1色に塗るだけでhast側に追加/削除の目印を残さないため、行頭の記号から起こす
export default defineConfig({
  shiki: {
    transformers: [
      {
        name: 'diff-line-kind',
        line(this: { options: { lang?: string } }, node: Element) {
          if (this.options.lang !== 'diff') return

          const head = textOf(node.children).charAt(0)
          if (head !== '+' && head !== '-') return

          const classes = (node.properties.class ??= '')
          node.properties.class = `${classes} ${head === '+' ? 'diff-add' : 'diff-remove'}`.trim()
        },
      },
    ],
  },
})
