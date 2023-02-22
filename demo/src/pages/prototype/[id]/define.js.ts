import type * as AstroT from 'astro'
import * as CEM from 'src:utils/Manifest.ts'

const { stringify } = JSON

const manifest = new CEM.Manifest(
	await import('src:data/custom-elements.json').then(module => module.default)
)

export const get: AstroT.APIRoute = ({ props }) => {
	const {
		name,
		tagName,
	} = Object(props) as CEM.ClassSource

	const importURL = `https://cdn.jsdelivr.net/npm/@astrouxds/astro-web-components@7.7.0/dist/components/${tagName}.js/+esm`
	const body = [
		`import{${name}}from${stringify(importURL)}`,
		`customElements.define(${stringify(tagName)},${name})`,
	].join(';')

	return { body }
}

export function getStaticPaths(): AstroT.GetStaticPathsResult {
	const items: AstroT.GetStaticPathsItem[] = []

	for (const klass of manifest.classes) {
		items.push(<AstroT.GetStaticPathsItem>{
			params: {
				id: klass.tagName,
			},
			props: {
				...klass.data
			}
		})
	}

	return items
}
