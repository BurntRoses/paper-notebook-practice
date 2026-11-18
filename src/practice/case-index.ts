import catalog from './real-cases.json';
import type {PracticeDocument} from './model';
import {summarizeCase,type CaseSummary} from './case-summary';

export type CaseIndex={sources:typeof catalog.sources;cases:CaseSummary[]};
export const caseIndex:CaseIndex={sources:catalog.sources,cases:(catalog.cases as unknown as PracticeDocument[]).map(summarizeCase)};
