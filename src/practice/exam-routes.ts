import registry from '../../skills/paper-notebook-practice/references/exam-routes.json';

export type ExamRouteFamily='school-assessment'|'civil-service'|'postgraduate'|'engineering-course'|'engineering-qualification'|'international-school'|'international-admissions'|'language-certification'|'citizenship'|'arts-performance';
export interface ExamRoute {
 id:string;name:string;family:ExamRouteFamily;aliases:string[];subject:string;templateId?:string;
 profileIds:string[];referenceFiles:string[];sourceGuidance:string[];checks:string[];exclusions?:string[];
}
export interface ExamRouteContext {
 subject?:string;routeId?:string;examName?:string;examCode?:string|number;
 knowledge?:string;specialty?:string;year?:number;region?:string;
}
export const EXAM_ROUTES=registry.routes as ExamRoute[];
export const EXAM_ROUTE_FAMILIES=registry.families as {id:ExamRouteFamily;name:string}[];
export function getExamRoute(id:string):ExamRoute|undefined {return EXAM_ROUTES.find(route=>route.id===id);}
/** Shared fallback for route-driven setup and authentic reference discovery. */
export function examRouteTemplateId(route:ExamRoute):string {
 return route.templateId??(route.family==='civil-service'?(route.id==='civil-essay'?'shenlun':'civil-service'):route.family==='postgraduate'?(/english/.test(route.id)?'postgraduate-english':/math/.test(route.id)?'postgraduate-math':'university-a4'):route.family==='engineering-course'?'engineering-course':route.family==='engineering-qualification'?'engineering-professional':'standard');
}

const normalise=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s·•]+/g,' ').trim();
const numericAlias=(alias:string)=>/^\d+$/.test(alias);
function aliasMatches(text:string,alias:string):boolean {
 const needle=normalise(alias);
 const compact=text.replace(/\s/g,'');
 if(numericAlias(needle)){
  // A page number, year, phone number or question number is not an exam code.
  return compact===needle||new RegExp(`(?:考研|统考|科目|代码|课程)[:：-]?${needle}(?!\\d)`).test(compact)||new RegExp(`^${needle}(?:数学|英语|思想政治|管理|经济|计算机)`).test(compact);
 }
 if(/^[a-z ]+$/i.test(alias))return new RegExp(`(?:^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s*')}(?:$|[^a-z])`,'i').test(text);
 return compact.includes(needle.replace(/\s/g,''));
}

/** A route chooses authoring methods. It is never proof of a verified full exam specification. */
export function resolveExamRoute(context:ExamRouteContext):ExamRoute|undefined {
 if(context.routeId)return getExamRoute(context.routeId);
 const code=context.examCode===undefined?'':String(context.examCode).trim();
 if(code){const route=EXAM_ROUTES.find(route=>route.aliases.some(alias=>numericAlias(alias)&&alias===code));if(route)return route;}
 // Deliberately exclude knowledge: an uploaded citation to “408” must not change a subject.
 const text=normalise([context.examName,context.subject,context.specialty].filter(Boolean).join(' '));
 if(!text)return undefined;
 const matches=EXAM_ROUTES.map(route=>({route,score:Math.max(0,...route.aliases.filter(alias=>aliasMatches(text,alias)).map(alias=>normalise(alias).length))})).filter(match=>match.score>0);
 const targeted=matches.filter(match=>match.route.family!=='engineering-course');
 if(targeted.length===1)return targeted[0].route;
 if(targeted.length>1)return undefined; // e.g. 数一与数二 or 行测与申论 needs explicit routing.
 matches.sort((a,b)=>b.score-a.score);
 return matches.length&&matches[0].score!==matches[1]?.score?matches[0].route:undefined;
}
