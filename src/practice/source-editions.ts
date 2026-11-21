import ks2 from './ks2-2024.json';
import additional from './source-editions.json';
import type {CatalogIdentity} from './catalog-identity';

interface SourceVolume {
 id:string;
 role:'exam'|'answers'|'administration';
 code:string;
 label:string;
 title:string;
 pages:number;
 openingPage?:number;
 rasterPages?:number[];
 url:string;
 sha256:string;
}

interface SourceEdition {
 id:string;
 title:string;
 assetDirectory:string;
 publisher:string;
 publication:string;
 copyrightReport:string;
 licence:string;
 attribution:string;
 notice?:string;
 identity:Pick<CatalogIdentity,'category'|'region'|'language'|'paperLanguage'|'subject'|'grade'|'year'|'system'|'aliases'>;
 volumes:SourceVolume[];
}

export const sourceEditions=[ks2,...additional] as SourceEdition[];
const sourceIndex=new Map(sourceEditions.map(edition=>[edition.id,edition]));
export const sourceEdition=(id:string)=>sourceIndex.get(id);
