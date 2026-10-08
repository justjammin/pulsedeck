import {validateSource} from './sources/cava.js';
export const PREFERENCE_KEY='pulsedeck.preferences.v1';
export const defaults=()=>({version:1,preset:'spectrum',motion:'full',layout:'compact',source:{method:'pulse',source:'default.monitor'}});
function sanitize(value) {
  if(!value || typeof value!=='object' || Array.isArray(value))throw Error('Invalid preferences.');
  const result=defaults();
  for(const [key,values] of Object.entries({preset:['spectrum','ocean','grid'],motion:['full','reduced'],layout:['compact','expanded']})) {
    if(value[key]!==undefined){if(!values.includes(value[key]))throw Error(`Invalid ${key}.`);result[key]=value[key];}
  }
  if(value.source!==undefined)result.source=validateSource(value.source);
  return result;
}
const size=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function createPreferences(store) {
  return {
    async load(){try{const value=await store.get(PREFERENCE_KEY);if(value?.version!==1 || size(value)>2048)return defaults();return sanitize(value);}catch{return defaults();}},
    async save(value){const clean=sanitize(value);if(size(clean)>2048)throw Error('Preferences exceed 2048 bytes.');await store.set(PREFERENCE_KEY,clean);return clean;},
    async reset(){await store.delete(PREFERENCE_KEY);return defaults();}
  };
}
