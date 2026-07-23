import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '@/scss/main.scss';
import { createRoot } from 'react-dom/client';
import App from './App';
import { mockUser } from '@/fixtures';

// Mock-sandbox-only: App.jsx's AuthGuard/RootRedirect read `loggedinUser` straight out of
// localStorage (independent of AppContext) to decide whether to bounce to /login.html.
// The dashboard widgets in src/dashboard-widgets/*.html separately look for
// `ngStorage-loggedinUser` / `loggedinUserIndex` to resolve a site id. Seeding all three
// means the intern never has to deal with auth — the app just opens.
if (!localStorage.getItem('loggedinUser')) {
  const seed = JSON.stringify(mockUser);
  localStorage.setItem('loggedinUser', seed);
  localStorage.setItem('loggedinUserIndex', seed);
  localStorage.setItem('ngStorage-loggedinUser', seed);
}

createRoot(document.getElementById('root')).render(<App />);
