import type * as AstroT from 'astro'
import * as CEM from 'src:utils/Manifest.ts'

const { stringify } = JSON
const manifest = new CEM.Manifest(
	await import('src:data/custom-elements.json').then(module => module.default)
)

export const get: AstroT.APIRoute = ({ props }) => ({
	body: stringify(props, null, ''),
})

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
