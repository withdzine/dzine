import type * as AstroType from 'astro'
import * as CEM from 'src:utils/Manifest'

export const manifest = new CEM.Manifest(await import('src:data/custom-elements.json').then(module => module.default))

export function getStaticPathsFromManifest(): AstroType.GetStaticPathsResult {
	const items: AstroType.GetStaticPathsItem[] = []

	for (const klass of manifest.classes) {
		items.push(<AstroType.GetStaticPathsItem>{
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
