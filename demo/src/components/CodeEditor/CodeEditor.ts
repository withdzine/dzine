import './prism.js'

declare var Prism: any

const plainTextEvents = {
	keydown(event: KeyboardEvent) {
		if (event.code === 'Enter') {
			document.execCommand('insertLineBreak')

			event.preventDefault()
		}

		if (event.code === 'Tab') {
			document.execCommand('insertHTML', false, '\t')

			event.preventDefault()
		}
	},
	paste(event: ClipboardEvent) {
		event.preventDefault()

		document.execCommand('insertHTML', false, event.clipboardData!.getData('text/plain').replace(/</g, '&lt;'))
	},
	beforeinput(event: InputEvent) {
		if (event.inputType === 'insertLink' || event.inputType.startsWith('format') && !event.inputType.endsWith('dent')) {
			event.preventDefault()
		}
	},
}

class CodeEditorElement extends HTMLElement {
	codeSyntaxed!: HTMLElement
	codeEditable!: HTMLElement
	currentCode!: string

	constructor() {
		let host: this = super()!
		let root: ShadowRoot = host.attachShadow({ mode: 'open' })

		host.currentCode = ''

		root.innerHTML = `<div><pre><code></code></pre><pre><code contenteditable="true" spellcheck="false"></code></pre></div><style>${cssText}</style>`

		this.codeSyntaxed = <HTMLElement>root.firstChild!.firstChild!.firstChild!
		this.codeEditable = <HTMLElement>root.firstChild!.firstChild!.nextSibling!.firstChild!

		const { tag = '' } = this.dataset
		let editableText = `<${tag}></${tag}>`

		this.codeEditable.textContent = editableText
		this.codeSyntaxed.innerHTML = Prism.highlight(editableText, Prism.languages.html, 'html')

		for (const [ name, listener ] of Object.entries(plainTextEvents)) {
			this.codeEditable.addEventListener(name, listener as EventListenerOrEventListenerObject, { capture: true })
		}

		const tagMatch = new RegExp(`^<${tag!}(?:\\s[\\W\\w]*?)?>[\\W\\w]*<\\/${tag}>$`, 'i')

		const onupdate = () => {
			let [ nextEditableText ] = this.codeEditable.textContent!.trim().match(tagMatch) || [ '' ]

			if (nextEditableText && nextEditableText !== editableText) {
				editableText = nextEditableText

				this.codeSyntaxed.innerHTML = Prism.highlight(editableText, Prism.languages.html, 'html')

				globalThis.postMessage({
					action: 'SET_HTML',
					params: [
						{
							tag,
							value: editableText,
						},
					]
				})
			}
		}

		host.codeEditable.addEventListener('input', onupdate)

		globalThis.addEventListener('message', (event) => {
			if (host.matches(':focus-within')) return

			const { action } = Object(event.data)

			switch (action) {
				case 'NOTIFY_HTML': {
					let [ nextEditableText ] = host.codeEditable.textContent!.trim().match(tagMatch) || [ '' ]

					if (nextEditableText && nextEditableText !== editableText) {
						host.codeEditable.textContent = nextEditableText

						onupdate()
					}
				} break
				case 'NOTIFY_ATTRIBUTE': {
					const originalElement = (<Window>event.source).document.querySelector<HTMLElement>(tag)

					if (!originalElement) return

					const nextEditableText = originalElement.outerHTML

					if (nextEditableText && nextEditableText !== editableText) {
						host.codeEditable.textContent = nextEditableText

						onupdate()
					}
				}
			}
		})
	}
}

const cssText = `@font-face {
	font-family: ui-monospace;
	src: local(".AppleSystemUIFontMonospaced-Regular"), local("Segoe UI Mono"), local("UbuntuMono"), local("Roboto-Mono"), local("Menlo");
}

@font-face {
	font-family: ui-monospace;
	font-style: italic;
	src: local(".AppleSystemUIFontMonospaced-RegularItalic"), local("Segoe UI Mono Italic"), local("UbuntuMono-Italic"), local("Roboto-Mono-Italic"), local("Menlo-Italic");
}

@font-face {
	font-family: ui-monospace;
	font-weight: bold;
	src: local(".AppleSystemUIFontMonospaced-Bold"), local("Segoe UI Mono Bold"), local("UbuntuMono-Bold"), local("Roboto-Mono-Bold"), local("Menlo-Bold");
}

@font-face {
	font-family: ui-monospace;
	font-style: italic;
	font-weight: bold;
	src: local(".AppleSystemUIFontMonospaced-BoldItalic"), local("Segoe UI Mono Bold Italic"), local("UbuntuMono-BoldItalic"), local("Roboto-Mono-BoldItalic"), local("Menlo-BoldItalic");
}

* {
	box-sizing: border-box;
}

:host {
	font: 100%/1.5 ui-monospace;
	tab-size: 4;
}

pre,
code {
	display: block;
	font: inherit;
	outline: none;
	white-space: pre-wrap;
}

pre {
	margin-block: 0;
}

div {
	display: grid;

	/* Appearance */
	color: hsl(0 0% 0%);
}

div > * {
	/* Layout */
	grid-area: 1 / 1 / 2 / 2;
	padding-block: 1em;
	padding-inline: 1.5em;
}

div > * + * {
	/* Appearance */
	color: hsl(0 0% 0% / 0%);
	caret-color: hsl(0 0% 0%);
}

.token.block-comment,
.token.cdata,
.token.comment,
.token.doctype,
.token.prolog {
	color: #7d8b99;
}

.token.punctuation {
	color: #5f6364;
}

.token.boolean,
.token.constant,
.token.deleted,
.token.function-name,
.token.number,
.token.property,
.token.symbol,
.token.tag {
	color: #c92c2c
}

.token.attr-name,
.token.builtin,
.token.char,
.token.function,
.token.inserted,
.token.selector,
.token.string {
	color: #2f9c0a
}

.token.entity,
.token.operator,
.token.url,
.token.variable {
	color: #a67f59;
	background: rgba(255, 255, 255, .5)
}

.token.atrule,
.token.attr-value,
.token.class-name,
.token.keyword {
	color: #1990b8
}

.token.important,
.token.regex {
	color: #e90
}

.language-css .token.string,
.style .token.string {
	color: #a67f59;
	background: rgba(255, 255, 255, .5)
}

.token.important {
	font-weight: 400
}

.token.bold {
	font-weight: 700
}

.token.italic {
	font-style: italic
}

.token.entity {
	cursor: help
}

.token.namespace {
	opacity: .7
}`

customElements.define('code-editor', CodeEditorElement)
