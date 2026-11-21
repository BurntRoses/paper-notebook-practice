import type {CatalogIdentity} from './catalog-identity';
import catalog from './topic-catalog.json';
export interface TopicCase {
 id:string;title:string;subject:string;level:string;
 family:'civil-service'|'postgraduate'|'engineering-course'|'engineering-qualification'|'primary-school';
 routeId?:string;description?:string;file:string;questionCount:number;
 catalog:CatalogIdentity;mode:'mock'|'bank';durationMinutes:number;totalScore:number;sha256:string;
}
/** Metadata only. Complete topic banks load from the installed Skill when selected. */
export const TOPIC_CASES=catalog.topics as TopicCase[];
export const getTopicCase=(id:string)=>TOPIC_CASES.find(item=>item.id===id);
