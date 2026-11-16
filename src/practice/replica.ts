/** Exact facsimiles preserve page images. Editable measured layout stays separate. */
export interface ReplicaRegion {id:string;type:'text'|'image'|'line';bounds:[number,number,number,number];text?:string;font?:string;fontSize?:number;confidence?:number}
export interface ReplicaPage {page:number;widthPt:number;heightPt:number;imageData:string;imageSha256:string;physicalSizeAssumed?:boolean;regions?:ReplicaRegion[]}
export interface ReplicaSource {id:string;name:string;sha256:string;originalData?:string;pages:ReplicaPage[]}
export interface ReplicaDocument {title?:string;sources:ReplicaSource[]}
export {renderReplica,validateReplicaLayout} from './replica.mjs';
