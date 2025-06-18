import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

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
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      
      // Dead code detection rules
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }],
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      
      // Vue-specific dead code rules
      'vue/no-unused-vars': 'error',
      'vue/no-unused-components': 'error',
      'vue/no-useless-template-attributes': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/no-useless-mustaches': 'error',
      
      // Import/export dead code
      'no-duplicate-imports': 'error',
    },
  },
]