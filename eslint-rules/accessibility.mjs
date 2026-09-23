const NAME_MESSAGE =
	'操作部品にアクセシブルな名前が無い。中に読める文字を置くか、aria-label / aria-labelledby で名前を付ける。アイコンだけのボタンとリンクは aria-label を付ける。'
const LABEL_MESSAGE =
	'入力欄にラベルが無い。<label> で包むか、for と id で結ぶか、aria-label / aria-labelledby で名前を付ける。placeholder は名前の代わりにならない。'
const HIDDEN_MESSAGE =
	'aria-hidden で支援技術から隠した中に、フォーカスできる要素を置かない。フォーカスは届くのに読み上げられない。隠すなら inert を添えるか、v-if で描かない。'
const TABINDEX_MESSAGE =
	'tabindex に正の値を書かない。フォーカス順が DOM の並びから外れる。順序は DOM の並びで決め、フォーカスさせるなら 0、スクリプトからだけなら -1 にする。'
const DECORATIVE_MESSAGE =
	'名前が Icon で終わるコンポーネントは飾りとして数える。ルートを aria-hidden="true" の要素か、別の Icon コンポーネントにする。名前を持たせる図は Icon で終わらない名前にする。'

const UNNAMED_DECORATIVE_MESSAGE =
	'ルートを支援技術から隠したコンポーネントは、名前を Icon で終わらせる。名前の判定は Icon で終わるものだけを飾りとして数えるので、他の名前だと中身として数えられ、名前の無いボタンやリンクが通る。'

const UNKNOWN = Symbol('unknown')

const LINK_COMPONENTS = new Set(['nuxtlink', 'routerlink'])
const NAMED_ROLES = new Set([
	'button',
	'link',
	'checkbox',
	'radio',
	'switch',
	'tab',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'combobox',
	'slider',
	'spinbutton',
	'searchbox',
	'textbox',
	'treeitem',
])
const FIELDS = new Set(['select', 'textarea'])
const DISABLEABLE = new Set(['button', 'input', 'select', 'textarea'])
const FOCUSABLE_NATIVES = new Set(['button', 'select', 'textarea', 'summary', 'iframe'])
const DEFAULT_NAMED_INPUTS = new Set(['submit', 'reset'])

const asName = (name) => name.toLowerCase().replaceAll('-', '')

const isNative = (element) =>
	element.rawName === element.rawName.toLowerCase() && !element.rawName.includes('-')

const isDecorative = (element) => !isNative(element) && /(?:^|-)icon$|Icon$/.test(element.rawName)

const isLinkComponent = (element) => LINK_COMPONENTS.has(asName(element.rawName))

const possibleValues = (expression) => {
	if (!expression) return [UNKNOWN]
	switch (expression.type) {
		case 'Literal':
			return [expression.value]
		case 'TemplateLiteral':
			return expression.expressions.length === 0
				? [expression.quasis[0].value.cooked]
				: [UNKNOWN]
		case 'Identifier':
			return expression.name === 'undefined' ? [undefined] : [UNKNOWN]
		case 'ConditionalExpression':
			return [
				...possibleValues(expression.consequent),
				...possibleValues(expression.alternate),
			]
		default:
			return [UNKNOWN]
	}
}

const SPREAD = Symbol('spread')
const OPAQUE = Symbol('opaque')

const attributeName = (attribute) => {
	if (!attribute.directive) return asName(attribute.key.rawName)
	if (attribute.key.name.name !== 'bind') return null
	const argument = attribute.key.argument
	return argument?.type === 'VIdentifier' ? asName(argument.rawName) : SPREAD
}

const read = (element, name) => {
	let spread = false
	for (const attribute of element.startTag.attributes) {
		const key = attributeName(attribute)
		if (key === SPREAD) spread = true
		if (key !== asName(name)) continue
		return attribute.directive
			? possibleValues(attribute.value?.expression)
			: [attribute.value?.value ?? '']
	}
	return spread ? [OPAQUE] : null
}

const isPresent = (element, name) => {
	const values = read(element, name)
	return values !== null && values.some((value) => value !== false && value != null)
}

const hasDirective = (element, names) =>
	element.startTag.attributes.some(
		(attribute) => attribute.directive && names.includes(attribute.key.name.name),
	)

const isJudgeable = (value) => value !== UNKNOWN && value !== OPAQUE

const isNonEmpty = (value) =>
	!isJudgeable(value) || (value != null && value !== false && String(value).trim() !== '')

const hasAttributeName = (element, names) =>
	names.some((name) => {
		const values = read(element, name)
		return values !== null && values.every(isNonEmpty)
	})

const isLabelled = (element) =>
	hasAttributeName(element, ['aria-label', 'aria-labelledby', 'title'])

const mayBeHidden = (element) =>
	read(element, 'aria-hidden')?.some((value) => value === UNKNOWN || String(value) === 'true') ??
	false

const isHidden = (element) =>
	read(element, 'aria-hidden')?.every((value) => String(value) === 'true') ?? false

const hasContent = (element) => {
	if (hasDirective(element, ['text', 'html'])) return true
	for (const child of element.children) {
		if (child.type === 'VText' && child.value.trim() !== '') return true
		if (child.type === 'VExpressionContainer' && child.expression) return true
		if (child.type !== 'VElement' || isHidden(child) || isDecorative(child)) continue
		if (!isNative(child) || child.rawName === 'slot' || child.rawName === 'component')
			return true
		if (child.rawName === 'img' && hasAttributeName(child, ['alt'])) return true
		if (isLabelled(child) || hasContent(child)) return true
	}
	return false
}

const inputType = (element) => {
	const values = read(element, 'type')
	if (values === null) return 'text'
	return values.length === 1 && typeof values[0] === 'string' ? values[0].toLowerCase() : UNKNOWN
}

const nameSource = (element) => {
	if (isLinkComponent(element)) return isPresent(element, 'custom') ? null : 'content'
	if (!isNative(element)) return null
	const role = read(element, 'role')
	if (role !== null && role.some((value) => NAMED_ROLES.has(value))) return 'content'
	switch (element.rawName) {
		case 'button':
		case 'summary':
			return 'content'
		case 'a':
			return read(element, 'href') === null ? null : 'content'
		case 'input': {
			const type = inputType(element)
			if (type === UNKNOWN || type === 'hidden' || DEFAULT_NAMED_INPUTS.has(type)) return null
			if (type === 'button') return 'value'
			if (type === 'image') return 'alt'
			return 'field'
		}
		default:
			return FIELDS.has(element.rawName) ? 'field' : null
	}
}

const isInsideLabel = (element) => {
	for (let it = element.parent; it?.type === 'VElement'; it = it.parent)
		if (it.rawName === 'label') return isNamed(it, 'content')
	return false
}

const elementsOf = (root) => {
	const elements = []
	const visit = (node) => {
		for (const child of node.children) {
			if (child.type !== 'VElement') continue
			elements.push(child)
			visit(child)
		}
	}
	visit(root)
	return elements
}

const labelTargets = (elements) => {
	const targets = new Set()
	for (const element of elements) {
		if (element.rawName !== 'label' || !isNamed(element, 'content')) continue
		for (const value of read(element, 'for') ?? [])
			targets.add(isJudgeable(value) ? value : UNKNOWN)
	}
	return targets
}

const isFieldLabelled = (element, targets) => {
	if (isLabelled(element) || isInsideLabel(element)) return true
	const ids = read(element, 'id')
	return (
		ids !== null &&
		ids.some((id) => !isJudgeable(id) || targets.has(id) || targets.has(UNKNOWN))
	)
}

const isNamed = (element, source, targets) => {
	switch (source) {
		case 'content':
			return isLabelled(element) || hasContent(element)
		case 'value':
			return isLabelled(element) || hasAttributeName(element, ['value'])
		case 'alt':
			return isLabelled(element) || hasAttributeName(element, ['alt'])
		default:
			return isFieldLabelled(element, targets)
	}
}

const tabindexValues = (element) =>
	(read(element, 'tabindex') ?? []).filter((value) => isJudgeable(value) && value !== null)

const isFocusable = (element) => {
	const tabindex = tabindexValues(element)
	if (tabindex.length > 0) return tabindex.some((value) => Number(value) >= 0)
	if (read(element, 'tabindex') !== null) return false
	if (isLinkComponent(element)) return !isPresent(element, 'custom')
	if (!isNative(element)) return false
	if (DISABLEABLE.has(element.rawName) && isPresent(element, 'disabled')) return false
	if (isPresent(element, 'contenteditable'))
		return !read(element, 'contenteditable').every((value) => String(value) === 'false')
	if (element.rawName === 'a' || element.rawName === 'area') return read(element, 'href') !== null
	if (element.rawName === 'input') return inputType(element) !== 'hidden'
	if (element.rawName === 'audio' || element.rawName === 'video')
		return read(element, 'controls') !== null
	return FOCUSABLE_NATIVES.has(element.rawName)
}

const templateRule = (message, check) => ({
	meta: {
		type: 'problem',
		schema: [],
		messages: { violation: message },
	},
	create(context) {
		return {
			'Program:exit'(program) {
				if (!program.templateBody) return
				for (const node of check(program.templateBody))
					context.report({ loc: node.loc, messageId: 'violation' })
			},
		}
	},
})

const accessibleName = templateRule(NAME_MESSAGE, (template) => {
	const elements = elementsOf(template)
	const targets = labelTargets(elements)
	return elements.filter((element) => {
		const source = nameSource(element)
		return source !== null && source !== 'field' && !isNamed(element, source, targets)
	})
})

const fieldLabel = templateRule(LABEL_MESSAGE, (template) => {
	const elements = elementsOf(template)
	const targets = labelTargets(elements)
	return elements.filter(
		(element) => nameSource(element) === 'field' && !isNamed(element, 'field', targets),
	)
})

const noFocusableInHidden = templateRule(HIDDEN_MESSAGE, (template) => {
	const found = []
	const visit = (node, hidden) => {
		for (const child of node.children) {
			if (child.type !== 'VElement' || isPresent(child, 'inert')) continue
			const inside = hidden || mayBeHidden(child)
			if (inside && isFocusable(child)) found.push(child)
			visit(child, inside)
		}
	}
	visit(template, false)
	return found
})

const noPositiveTabindex = templateRule(TABINDEX_MESSAGE, (template) =>
	elementsOf(template).filter((element) =>
		tabindexValues(element).some((value) => Number(value) > 0),
	),
)

const DECORATIVE_FILE = /Icon\.vue$/

const decorativeRoot = {
	meta: {
		type: 'problem',
		schema: [],
		messages: { visible: DECORATIVE_MESSAGE, unnamed: UNNAMED_DECORATIVE_MESSAGE },
	},
	create(context) {
		return {
			'Program:exit'(program) {
				if (!program.templateBody) return
				const template = program.templateBody
				const roots = template.children.filter(
					(child) =>
						child.type === 'VElement' ||
						(child.type === 'VText' && child.value.trim() !== ''),
				)
				const hiddenRoot =
					roots.length === 1 &&
					roots[0].type === 'VElement' &&
					(isDecorative(roots[0]) || isHidden(roots[0]))
				const named = DECORATIVE_FILE.test(context.filename)
				if (named && !hiddenRoot)
					context.report({
						loc: (roots.length === 1 ? roots[0] : template).loc,
						messageId: 'visible',
					})
				if (!named && hiddenRoot)
					context.report({ loc: roots[0].loc, messageId: 'unnamed' })
			},
		}
	},
}

export default {
	rules: {
		'accessible-name': accessibleName,
		'field-label': fieldLabel,
		'no-focusable-in-hidden': noFocusableInHidden,
		'no-positive-tabindex': noPositiveTabindex,
		'decorative-root': decorativeRoot,
	},
}
