import { defineConfig } from '@nuxtjs/mdc/config'

const DIFF_LINE_CLASS: Record<string, string> = {
  '+': 'diff-add',
  '-': 'diff-remove',
}

// Shikiのdiff文法は追加行・削除行を1色に塗るだけでhastに印を残さないため、行頭の記号から起こす
export default defineConfig({
  shiki: {
    transformers: [
      {
        name: 'diff-line-kind',
        line(node, line) {
          if (this.options.lang !== 'diff') return

          const head = this.tokens[line - 1]?.[0]?.content.charAt(0) ?? ''
          const className = DIFF_LINE_CLASS[head]
          if (className) this.addClassToHast(node, className)
        },
      },
    ],
  },
})
