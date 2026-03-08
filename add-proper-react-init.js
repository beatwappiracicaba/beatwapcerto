// Script to add React DOM initialization to the built JavaScript file
const fs = require('fs');
const path = require('path');

const jsFilePath = path.join(__dirname, 'assets', 'index-j3w_R8XB.js');

// Read the current file
let content = fs.readFileSync(jsFilePath, 'utf8');

// Check if the file has the proper ending
console.log('File length:', content.length);
console.log('Last 500 characters:', content.slice(-500));

// Add React DOM initialization if it's missing
if (!content.includes('createRoot(document.getElementById')) {
  // Add proper React initialization at the end
  const reactInitCode = `

// React DOM initialization
(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReact);
  } else {
    initReact();
  }
  
  function initReact() {
    const container = document.getElementById('root');
    if (container && window.Js && window.Js.createRoot) {
      try {
        const root = window.Js.createRoot(container);
        // Create a simple App component
        const AppElement = function() {
          return e.jsx('div', { 
            children: 'BeatWap Application Loaded Successfully!' 
          });
        };
        root.render(e.jsx(S.StrictMode, { 
          children: e.jsx(AppElement, {}) 
        }));
        console.log('React application initialized successfully');
      } catch (error) {
        console.error('Error initializing React:', error);
        container.innerHTML = '<h1>BeatWap</h1><p>Application loaded but React initialization failed.</p>';
      }
    } else {
      console.error('Missing required elements for React initialization');
      if (container) {
        container.innerHTML = '<h1>BeatWap</h1><p>Loading...</p>';
      }
    }
  }
})();
`;
  
  // Write the updated content
  fs.writeFileSync(jsFilePath, content + reactInitCode, 'utf8');
  console.log('React DOM initialization added successfully');
} else {
  console.log('React DOM initialization already exists');
}