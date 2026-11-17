import {CATALOG_CATEGORIES,type CatalogCategory} from './catalog-categories';

export const FEATURED_EXAMPLES = [
 ['hkeaa24-6MC1','小学数学'],['guangdong-2024-math','中考数学'],['neea-2024-math','高考数学'],
 ['pku-calculus-2013','北大高数'],['ecnu-linear-2023','大学线代'],['national-math24-1','考研数一'],
 ['civil24-3','申论'],['tw-civil-structure24','土木技师'],['igcse-math-2025-p2','IGCSE'],
 ['alevel-math-2024-p11','A Level'],['jlpt-n5-r','日语 N5'],['igcse-art','艺术设计'],
] as const;
export const INITIAL_EXAMPLE = 'neea-2024-math';

const stages = new Map<string, number>(CATALOG_CATEGORIES.map((category,index)=>[category,index]));
const types = {paper:0,bank:1,layout:2} as const;
const titles = new Intl.Collator('zh-CN',{numeric:true});
export type ExampleKind=keyof typeof types;
export function compareExamples(a:{id:string;category:CatalogCategory;kind:ExampleKind;title:string}, b:typeof a){
 return (stages.get(a.category)!-stages.get(b.category)!)||types[a.kind]-types[b.kind]||titles.compare(a.title,b.title)||a.id.localeCompare(b.id);
}
