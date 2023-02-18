{
	const { parent: upmostThis } = window
	const { prototype } = CustomElementRegistry
	const { define } = prototype
	const { stringify } = JSON

	Object.defineProperty(prototype, 'define', {
		configurable: true,
		writable: true,
		enumerable: true,
		value: {
			define(tagName, constructor, ...args) {
				if (typeof constructor === 'function') {
					const Class = constructor

					constructor = function CustomElement() {
						return Reflect.construct(Class, arguments, new.target)
					}

					constructor.prototype = new Proxy(Class.prototype, {
						set (target, key, value, proxy) {
							let returnState = Reflect.set(target, key, value, proxy)
							let returnValue = Reflect.get(target, key, proxy)

							if (returnValue === null || typeof returnValue !== 'function') {
								upmostThis.postMessage({
									action: 'NOTIFY_PROPERTY',
									params: [
										{
											tag: tagName,
											name: key,
											value: returnValue,
										},
									],
								})

								// globalThis.postMessage({
								// 	action: 'LIST_TOKENS',
								// 	params: [],
								// })
							}

							return returnState
						},
					})
				}

				return define.call(this, tagName, constructor, ...args)
			}
		}.define
	})

	// observe mutations on the Target Custom Element
	new MutationObserver((records) => {
		for (let record of records) {
			if (record.attributeName) {
				let { attributeName } = record

				if (attributeName) {
					upmostThis.postMessage({
						action: 'NOTIFY_ATTRIBUTE',
						params: [
							{
								tag: record.target.localName,
								name: attributeName,
								value: record.target.getAttribute(attributeName),
							},
						],
					})

					// globalThis.postMessage({
					// 	action: 'LIST_TOKENS',
					// 	params: [],
					// })
				}
			}
		}
	}).observe(document.body, { attributes: true, characterData: true, childList: true, subtree: true })

	upmostThis.addEventListener('message', ({ data }) => {
		console.debug(data.action, ...data.params)

		switch (data.action) {
			case 'SET_PROPERTY':
			case 'SET_ATTRIBUTE':
			case 'SET_CSS_STATE': {
				globalThis.postMessage(data)
			} break
		}
	})

	let internalsOfCSSRule = new WeakMap()
	let iterateCSSRules = (/** @type {CSSGroupingRule} */ group, /** @type {((cssRule: CSSStyleRule, selectorText: string)) => void} */ call) => {
		for (const cssRule of group.cssRules) {
			if ('selectorText' in cssRule) {
				if (!internalsOfCSSRule.has(cssRule)) {
					internalsOfCSSRule.set(cssRule, cssRule.selectorText)
				}

				call(cssRule, internalsOfCSSRule.get(cssRule))
			}

			if ('cssRules' in cssRule) {
				iterateCSSRules(cssRule, call)
			}
		}
	}

	const getShadowSheets = (/** @type {HTMLElement} */ element) => {
		const { shadowRoot } = element

		if (!shadowRoot) return []

		/** @type {CSSStyleSheet[]} */
		const adoptedStyleSheets = 'adoptedStyleSheets' in shadowRoot ? shadowRoot.adoptedStyleSheets : shadowRoot.styleSheets

		return adoptedStyleSheets
	}

	// handle messages that push updates to the element
	globalThis.addEventListener('message', event => {
		const { action, params } = event.data
		const param = Object(Object(params)[0])

		if (!param.tag) return

		const element = document.querySelector(param.tag)

		if (!element) return

		switch (action) {
			case 'SET_PROPERTY': {
				Reflect.set(element, param.name, param.value)

				globalThis.postMessage({
					action: 'GET_TOKENS',
					params: [{}],
				})
			} break

			case 'SET_ATTRIBUTE': {
				if (typeof param.value === 'boolean') {
					element.toggleAttribute(param.name, param.value)
				} else {
					element.setAttribute(param.name, param.value)
				}

				globalThis.postMessage({
					action: 'GET_TOKENS',
					params: [{}],
				})
			} break

			case 'SET_CSS_STATE': {
				const { shadowRoot } = element

				if (!shadowRoot) return

				const adoptedStyleSheets = 'adoptedStyleSheets' in shadowRoot ? shadowRoot.adoptedStyleSheets : shadowRoot.styleSheets

				if (!adoptedStyleSheets || adoptedStyleSheets.length === 0) return

				const children = shadowRoot.querySelectorAll('*')
				const stateMatcher = new RegExp(':' + param.name, 'g')

				for (const sheet of adoptedStyleSheets) {
					iterateCSSRules(sheet, (cssRule, selectorText) => {
						const hostSelectorText = selectorText.replace(stateMatcher, ':is(*)').replace(/:host\(/g, ':is(')
						const nodeSelectorText = selectorText.replace(stateMatcher, ':is(*)')

						if (element.matches(hostSelectorText) && stateMatcher.test(selectorText)) {
							cssRule.selectorText = param.value ? hostSelectorText : selectorText
						}

						for (const child of children) {
							if (child && child.matches(nodeSelectorText) && stateMatcher.test(selectorText)) {
								cssRule.selectorText = param.value ? nodeSelectorText : selectorText
							}
						}
					})
				}

				globalThis.postMessage({
					action: 'GET_TOKENS',
					params: [{}],
				})
			} break
		}
	})


	const updateSheet = () => {
		const tokens = new Set()

		for (let element of document.body.children) {
			for (const sheet of getShadowSheets(element)) {
				iterateCSSRules(sheet, (cssRule) => {
					for (const key of cssRule.style) {
						const value = cssRule.style.getPropertyValue(key)

						for (const [ $0, match ] of value.matchAll(/var\(([\w-]+)/g)) {
							tokens.add(match)
						}
					}
				})
			}
		}

		upmostThis.postMessage({
			action: 'LIST_TOKENS',
			params: [
				{
					value: [ ...tokens ].sort(),
				}
			],
		})
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(updateSheet)
	})

	upmostThis.addEventListener('message', ({ data }) => {
		data = Object(data)

		if (data.action === 'GET_TOKENS') {
			updateSheet()
		}
	})

	// new MutationObserver(updateSheet).observe(document.body, { childList: true })
}
