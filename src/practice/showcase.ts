import {getTopicCase} from './topics';
import images from './topic-showcase-pages.json';

/** Captures come from the same physical paper renderer used by exported papers. */
export const TOPIC_SHOWCASES=[
 {id:'civil-aptitude-01',label:'行测'},
 {id:'civil-essay-01',label:'申论'},
 {id:'postgraduate-math1-01',label:'考研数一'},
 {id:'postgraduate-english1-01',label:'考研英一'},
 {id:'postgraduate-computing408-01',label:'计算机 408'},
 {id:'computer-engineering-course-01',label:'计算机工程'},
 {id:'materials-engineering-course-01',label:'材料工程'},
 {id:'constructor-1-economics-full-01',label:'一建经济'},
].map(item=>({...getTopicCase(item.id)!,label:item.label,pages:(images as Record<string,string[]>)[item.id]??[]}));
