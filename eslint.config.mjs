import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const recommended = firebaseRulesPlugin.configs['flat/recommended'];

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  ...(Array.isArray(recommended) ? recommended : [recommended]),
];
