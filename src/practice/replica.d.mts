import type {ReplicaDocument} from './replica';
export function renderReplica(document:ReplicaDocument,options?:{preview?:boolean}):string;
export function validateReplicaLayout(layout:unknown):{valid:boolean;errors:string[]};
