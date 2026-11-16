/** Direct theme action adapted from the prescription SiteHeader and focus policy. */
export type ThemePreference='system'|'light'|'dark';
const storageKey='paper-notebook-practice-theme';
const isPreference=(value:unknown):value is ThemePreference=>value==='system'||value==='light'||value==='dark';

export function mountThemeControl(container:HTMLElement):()=>void{
 const document=container.ownerDocument,win=document.defaultView!;
 const system=win.matchMedia('(prefers-color-scheme: dark)');
 let preference:ThemePreference='light';
 try{const saved=win.localStorage.getItem(storageKey);if(isPreference(saved))preference=saved;}catch{}
 container.classList.add('theme-control');
 container.innerHTML='<button id="theme-toggle" type="button" class="theme-toggle" aria-label="切换为深色"><span class="theme-symbol" aria-hidden="true"></span><span class="theme-label"></span></button>';
 const button=container.querySelector<HTMLButtonElement>('button')!,symbol=container.querySelector<HTMLElement>('.theme-symbol')!,label=container.querySelector<HTMLElement>('.theme-label')!;
 const resolved=()=>preference==='system'?(system.matches?'dark':'light'):preference;
 const apply=()=>{
  const theme=resolved();
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.style.colorScheme=theme;
  button.setAttribute('aria-label',theme==='dark'?'切换为浅色':'切换为深色');
  button.setAttribute('aria-pressed',String(theme==='dark'));
  button.title=theme==='dark'?'切换为浅色':'切换为深色';
  label.textContent=theme==='dark'?'深色':'浅色';
  symbol.innerHTML=theme==='dark'?'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.7 13.5A8.8 8.8 0 0 1 10.5 3.3 8.8 8.8 0 1 0 20.7 13.5Z"/></svg>':'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42M6.35 17.65l-1.42 1.42"/></svg>';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#1b211d':'#f7f8f5');
 };
 const toggle=()=>{preference=resolved()==='dark'?'light':'dark';try{win.localStorage.setItem(storageKey,preference);}catch{}apply();};
 const systemChange=()=>{if(preference==='system')apply();};
 const storageChange=(event:StorageEvent)=>{if(event.key!==storageKey&&event.key!==null)return;preference=isPreference(event.newValue)?event.newValue:'light';apply();};
 button.addEventListener('click',toggle);system.addEventListener('change',systemChange);win.addEventListener('storage',storageChange);apply();
 return ()=>{button.removeEventListener('click',toggle);system.removeEventListener('change',systemChange);win.removeEventListener('storage',storageChange);};
}
