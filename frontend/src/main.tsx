import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

console.log('Main.tsx: Starting app initialization...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  // Use textContent instead of innerHTML to prevent XSS
  const errorDiv = document.createElement('div');
  errorDiv.textContent = 'Error: Root element not found!';
  errorDiv.style.padding = '20px';
  errorDiv.style.color = 'red';
  document.body.appendChild(errorDiv);
} else {
  console.log('Root element found, rendering app...');
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>,
    );
    console.log('App rendered successfully!');
  } catch (error) {
    console.error('Error rendering app:', error);
    // Use textContent instead of innerHTML to prevent XSS
    const errorDiv = document.createElement('div');
    errorDiv.textContent = `Error rendering app: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errorDiv.style.padding = '20px';
    errorDiv.style.color = 'red';
    rootElement.appendChild(errorDiv);
  }
}

