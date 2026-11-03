import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminPortal from './AdminPortal.jsx';

let adminRoot = null;

export function mountAdminPortal(containerEl) {
  if (!containerEl) return;
  if (!adminRoot) {
    adminRoot = createRoot(containerEl);
  }
  adminRoot.render(
    <React.StrictMode>
      <AdminPortal />
    </React.StrictMode>
  );
}

export function unmountAdminPortal() {
  if (adminRoot) {
    adminRoot.unmount();
    adminRoot = null;
  }
}
