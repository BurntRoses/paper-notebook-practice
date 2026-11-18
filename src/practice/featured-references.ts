import {FEATURED_EXAMPLES} from './example-order';
import {getReferencePaper} from './reference-papers';

/** The site build serializes just this shelf into the homepage chunk. */
export const featuredReferences=FEATURED_EXAMPLES.flatMap(([id,quickLabel])=>{
 const source=getReferencePaper(id);
 return source?[{id,title:source.title,quickLabel,source,templateId:source.templateIds[0]}]:[];
});
