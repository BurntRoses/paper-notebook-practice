import catalog from './real-cases.json';
import examples from './template-examples.json';
import type {PracticeDocument} from './model';

export const embeddedCase=(id:string)=>(catalog.cases as unknown as PracticeDocument[]).find(p=>p.practiceId===id);
export const embeddedTemplate=(id:string)=>(examples as unknown as Record<string,PracticeDocument>)[id];
export const hasEmbeddedTemplate=(id:string)=>Object.hasOwn(examples,id);
