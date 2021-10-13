module.exports = {
  extends: 'unu',
  rules: {
    'no-console': 'off',
    'no-underscore-dangle': ["error", { "allow": ["_id", "_source", "_test"] }],
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'no-return-await': 'off'
  },
  // Allow es6 features
  "env": {
    "es6": true
  },
  // Allow features until roughly es2018
  // See https://node.green/ for a full list
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  }
};
