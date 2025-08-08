import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
// import pluginVueA11y from 'eslint-plugin-vuejs-accessibility' // Denne linje er nu fjernet

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/public/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  // ...pluginVueA11y.configs['flat/recommended'], // Denne linje er nu fjernet
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      
      // Dead code detection rules (eksisterende)
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }],
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      
      // Vue-specific dead code rules (eksisterende)
      'vue/no-unused-vars': 'error',
      'vue/no-unused-components': 'error',
      'vue/no-useless-template-attributes': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/no-useless-mustaches': 'error',
      
      // Import/export dead code (eksisterende)
      'no-duplicate-imports': 'error',

      // --- NYE REGLER HERUNDER (fra tidligere forslag, men uden A11y) ---
      
      // Generelle JavaScript/TypeScript Forbedringer
      'eqeqeq': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      
      // Vue Specifikke Forbedringer
      'vue/require-explicit-emits': 'error',
      'vue/no-v-html': 'warn',
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/prefer-import-from-vue': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',

      // De specifikke A11y-regler er også fjernet herfra, f.eks. 'vuejs-accessibility/alt-text': 'error',
    },
  },
]
