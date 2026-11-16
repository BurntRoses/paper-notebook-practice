/** Native DOM adaptation of the prescription SiteHeader theme action and focus policy. */
export type ThemePreference='system'|'light'|'dark';
const storageKey='paper-notebook-practice-theme';
const isPreference=(value:unknown):value is ThemePreference=>value==='system'||value==='light'||value==='dark';

export function mountThemeControl(container:HTMLElement):()=>void{
 const document=container.ownerDocument,win=document.defaultView!;
 const system=win.matchMedia('(prefers-color-scheme: dark)');
 let preference:ThemePreference='light';
 try{const saved=win.localStorage.getItem(storageKey);if(isPreference(saved))preference=saved;}catch{}
 container.classList.add('theme-control');
 container.innerHTML='<span class="theme-symbol" aria-hidden="true"></span><select id="theme-select" aria-label="界面外观" title="界面外观"><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select>';
 const select=container.querySelector<HTMLSelectElement>('select')!,symbol=container.querySelector<HTMLElement>('.theme-symbol')!;
 const apply=()=>{
  const resolved=preference==='system'?(system.matches?'dark':'light'):preference;
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.style.colorScheme=resolved;
  select.value=preference;
  select.dispatchEvent(new Event('input'));
  symbol.innerHTML=resolved==='dark'?'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.7 13.5A8.8 8.8 0 0 1 10.5 3.3 8.8 8.8 0 1 0 20.7 13.5Z"/></svg>':'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42M6.35 17.65l-1.42 1.42"/></svg>';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content',resolved==='dark'?'#1d2220':'#f6f5f1');
 };
 const change=()=>{if(!isPreference(select.value))return;preference=select.value;try{win.localStorage.setItem(storageKey,preference);}catch{}apply();};
 const systemChange=()=>{if(preference==='system')apply();};
 const storageChange=(event:StorageEvent)=>{if(event.key!==storageKey&&event.key!==null)return;preference=isPreference(event.newValue)?event.newValue:'light';apply();};
 select.addEventListener('change',change);system.addEventListener('change',systemChange);win.addEventListener('storage',storageChange);apply();
 return ()=>{select.removeEventListener('change',change);system.removeEventListener('change',systemChange);win.removeEventListener('storage',storageChange);};
}
