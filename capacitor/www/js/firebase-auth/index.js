import { registerPlugin } from '@capacitor/core';
const FirebaseAuthentication = registerPlugin('FirebaseAuthentication', {
    web: () => import('./web.js').then(m => new m.FirebaseAuthenticationWeb()),
});
export * from './definitions.js';
export { FirebaseAuthentication };
//# sourceMappingURL=index.js.map