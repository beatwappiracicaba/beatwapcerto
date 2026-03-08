// Script to add React DOM initialization to the built JavaScript file
const fs = require('fs');
const path = require('path');

const jsFilePath = path.join(__dirname, 'assets', 'index-j3w_R8XB.js');

// Read the current file
let content = fs.readFileSync(jsFilePath, 'utf8');

// Add React DOM initialization at the end
const reactInitCode = `

// React DOM initialization
import { createRoot } from './vendor-BIzT66jz.js';
const root = createRoot(document.getElementById('root'));
root.render(e.jsx(ui.StrictMode, { children: e.jsx(App, {}) }));
`;

// Check if the initialization is already there
if (!content.includes('createRoot(document.getElementById')) {
  // Add the initialization code
  content += reactInitCode;
  
  // Write the updated content back
  fs.writeFileSync(jsFilePath, content, 'utf8');
  console.log('React DOM initialization added successfully');
} else {
  console.log('React DOM initialization already exists');
}