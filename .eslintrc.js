// eslint-disable-next-line no-undef
module.exports = {
	'env': {
		'browser': true,
		'es2021': true
	},
	'extends': [
		'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
	],
	'parserOptions': {
		'ecmaFeatures': {
			'jsx': true
		},
		'ecmaVersion': 'latest',
		'sourceType': 'module'
	},
	'plugins': [
		'react'
	],
  'rules': {
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'max-len': [
			'error',
			{ 'code': 120 }
		],
		'no-multi-spaces': ['error'],
    'no-multiple-empty-lines': ['error', { max: 1 }],
		'no-trailing-spaces': ['error'],
    'no-whitespace-before-property': ['error'],
	}
};
