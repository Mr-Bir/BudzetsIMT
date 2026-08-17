import { registerPlugin } from '@capacitor/core';
const FirebaseAppCheck = registerPlugin('FirebaseAppCheck', {
    web: () => import('./web.js').then(m => new m.FirebaseAppCheckWeb()),
});
export * from './definitions.js';
export { FirebaseAppCheck };
//# sourceMappingURL=index.js.map
