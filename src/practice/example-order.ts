import {CATALOG_CATEGORIES,type CatalogCategory} from './catalog-categories';

const stages = new Map<string, number>(CATALOG_CATEGORIES.map((category,index)=>[category,index]));
const types = {paper:0,bank:1,layout:2} as const;
const titles = new Intl.Collator('zh-CN',{numeric:true});
export type ExampleKind=keyof typeof types;
export function compareExamples(a:{id:string;category:CatalogCategory;kind:ExampleKind;title:string}, b:typeof a){
 return (stages.get(a.category)!-stages.get(b.category)!)||types[a.kind]-types[b.kind]||titles.compare(a.title,b.title)||a.id.localeCompare(b.id);
}
