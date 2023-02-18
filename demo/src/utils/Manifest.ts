import type * as CEMT from 'custom-elements-manifest'

export type ManifestSource = CEMT.Package
export type ClassSource = CEMT.CustomElementDeclaration
export type CustomElement = CEMT.CustomElement

let internals = new WeakMap<Value, unknown>()
let getInternals = <T>(instance: Value): T => internals.get(instance)! as unknown as T

export class Value<T = unknown> {
	constructor(value: T) {
		internals.set(this, value)
	}
}

export class Manifest<T extends ManifestSource> extends Value<T & any> {
	get exports() {
		let manifest = getInternals<ManifestSource & T>(this)

		const exports: CEMT.Export[] = []

		for (const module of manifest.modules) {
			if (module.kind !== 'javascript-module') continue
			if (!module.exports) continue

			for (const xxport of module.exports) {
				exports.push(xxport)
			}
		}

		return exports
	}

	get classes() {
		let manifest = getInternals<ManifestSource & T>(this)

		const classes: Class[] = []

		for (const module of manifest.modules) {
			if (module.kind !== 'javascript-module') continue
			if (!module.declarations) continue

			for (const declaration of module.declarations) {
				if (!('customElement' in declaration)) continue

				classes.push(
					new Class(
						declaration as ClassSource
					)
				)
			}
		}

		return classes
	}
}

export class Class<T extends ClassSource = ClassSource> extends Value<T> {
	get name(): string {
		return getInternals<T>(this).name
	}

	get tagName(): string {
		return getInternals<T>(this).tagName!
	}

	get data(): T {
		return getInternals<T>(this)
	}

	get properties(): CEMT.ClassField[] {
		return getPropertiesFromClass(getInternals<T>(this))
	}
}

export const getPropertiesFromClass = (klass: ClassSource) => {
	const properties: CEMT.ClassField[] = []

	for (const property of klass.members!) {
		if (property.kind === 'method') continue

		properties.push(property)
	}

	return properties
}
