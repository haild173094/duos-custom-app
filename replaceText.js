/* eslint-disable no-undef */
const replace = require('replace-in-file');
require('dotenv').config();

const NAMESPACE = process.env.APP_METAFIELD_NAMESPACE;
console.log('NAMESPACE:', NAMESPACE);

const options = {
  // Include all files in the folder and subfolders, then exclude specific files
  ignore: [
    '.env*',
    './node_modules/**',
    './extensions/delivery*',
    './extensions/payment*',
  ],
  files: [
    '**/*', // This matches all files in the folder and subfolders
  ],

  // Specify the text or regex to find and the replacement text
  from: /app--\d+--qikify_checkout/g, // Use a regex to match all instances of "oldText"
  to: NAMESPACE,

  // Log how many replacements were made in each file
  countMatches: true,
};

replace(options)
  .then(results => {
    results.forEach(result => {
      if (result.hasChanged) {
        console.log(`Modified: ${result.file}`);
      }
    });
  })
  .catch(error => {
    console.error('Error occurred:', error);
  });
