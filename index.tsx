import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from "@clerk/clerk-react";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Retrieves the Clerk Publishable Key.
 * In this environment, we rely on process.env for injected variables.
 */
const getPublishableKey = (): string => {
  const key = process.env.VITE_CLERK_PUBLISHABLE_KEY || 
              process.env.CLERK_PUBLISHABLE_KEY || 
              "pk_test_bG92ZWQtY291Z2FyLTYuY2xlcmsuYWNjb3VudHMuZGV2JA";

  if (!key) {
    console.warn("Clerk Publishable Key is missing. Authentication features may not work.");
  }
  
  return key;
};

const PUBLISHABLE_KEY = getPublishableKey();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 
      We provide custom router handlers to the ClerkProvider. 
      This is crucial for preventing Clerk's internal "virtual router" from attempting 
      to construct URLs using internal virtual paths (like /CLERK-ROUTER/VIRTUAL/...), 
      which can fail in environments where the URL constructor requires absolute paths.
    */}
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => {
        // Ignore internal virtual routing paths to prevent URL constructor crashes
        if (to.startsWith('/CLERK-ROUTER/')) return;
        
        // Only handle real external navigations
        if (to.startsWith('http')) {
          window.location.href = to;
        }
      }}
      routerReplace={(to) => {
        // Ignore internal virtual routing paths
        if (to.startsWith('/CLERK-ROUTER/')) return;

        if (to.startsWith('http')) {
          window.location.replace(to);
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);