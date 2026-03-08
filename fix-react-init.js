// Script to add React DOM initialization to the built JavaScript file
const fs = require('fs');
const path = require('path');

const jsFilePath = path.join(__dirname, 'assets', 'index-j3w_R8XB.js');

// Read the current file
let content = fs.readFileSync(jsFilePath, 'utf8');

// Check if the file ends properly or if it's truncated
const lines = content.split('\n');
const lastLine = lines[lines.length - 1];

console.log('Last line:', lastLine);
console.log('File length:', content.length);

// Add React DOM initialization if it's missing
if (!content.includes('createRoot(document.getElementById')) {
  // Add proper React initialization
  const reactInitCode = `

// React DOM initialization
(function() {
  const container = document.getElementById('root');
  if (container && Js.createRoot) {
    const root = Js.createRoot(container);
    root.render(e.jsx(S.StrictMode, { 
      children: e.jsx(ui, {}) 
    }));
  }
})();
`;
  
  // Write the updated content
  fs.writeFileSync(jsFilePath, content + reactInitCode, 'utf8');
  console.log('React DOM initialization added successfully');
} else {
  console.log('React DOM initialization already exists');
}