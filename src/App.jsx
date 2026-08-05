import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import SiteLayout from '@/components/layout/SiteLayout';
import Dashboard from '@/pages/Dashboard';
import GetStarted from '@/pages/GetStarted';
import WorkPermitList from '@/pages/WorkPermitList';
import NewWorkPermit from '@/pages/NewWorkPermit';
import WorkPermitDetail from '@/pages/WorkPermitDetail';
import Setup from '@/pages/Setup';

const LOGIN_URL = '/login.html';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('loggedinUser') || localStorage.getItem('loggedinUserIndex');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  window.location.replace(LOGIN_URL);
}

function PageLoader() {
  return (
    <div className="page-loader-wrapper">
      <div className="text-center">
        <i className="fa fa-cog fa-spin fa-3x" style={{ color: '#17a2b8' }} />
        <div className="loader-text mt-3">Loading...</div>
      </div>
    </div>
  );
}

function RootRedirect() {
  const navigate = useNavigate();
  const { setupChecked, workPermitSetupRequired } = useApp();

  useEffect(() => {
    const windowUser = window.loggedinUser;
    if (windowUser) {
      localStorage.setItem('loggedinUserIndex', JSON.stringify(windowUser));
      localStorage.setItem('loggedinUser', JSON.stringify(windowUser));
    }
    const user = getStoredUser();
    if (!user) {
      redirectToLogin();
      return;
    }

    const id = user.societyId;
    if (!setupChecked) return;

    navigate(`/site/${id}/${workPermitSetupRequired ? 'get-started' : 'dashboard'}`, { replace: true });
  }, [navigate, setupChecked, workPermitSetupRequired]);

  return <PageLoader />;
}

function SiteIndexRedirect() {
  const { siteId } = useParams();
  const { setupChecked, workPermitSetupRequired } = useApp();

  if (!setupChecked) return <PageLoader />;

  return <Navigate to={`/site/${siteId}/${workPermitSetupRequired ? 'get-started' : 'dashboard'}`} replace />;
}

function AuthGuard({ children }) {
  useEffect(() => {
    if (!getStoredUser()) redirectToLogin();
  }, []);

  if (!getStoredUser()) return <PageLoader />;

  return children;
}

// Corrects stale siteId in the URL to match the currently logged-in user's site.
function SiteGuard({ children }) {
  const { siteId } = useParams();
  const user = getStoredUser();

  if (user && siteId && String(siteId) !== String(user.societyId)) {
    return <Navigate to={`/site/${user.societyId}/dashboard`} replace />;
  }

  return children;
}

function SetupGuard({ children }) {
  const { siteId } = useParams();
  const { setupChecked, workPermitSetupRequired } = useApp();

  if (!setupChecked) return <PageLoader />;
  if (workPermitSetupRequired) return <Navigate to={`/site/${siteId}/get-started`} replace />;

  return children;
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/site/:siteId" element={<AuthGuard><SiteGuard><SiteLayout /></SiteGuard></AuthGuard>}>
            <Route index element={<SiteIndexRedirect />} />
            <Route path="dashboard" element={<SetupGuard><Dashboard /></SetupGuard>} />
            <Route path="get-started" element={<GetStarted />} />
            <Route path="work-permit" element={<SetupGuard><WorkPermitList /></SetupGuard>} />
            <Route path="work-permit/new" element={<SetupGuard><NewWorkPermit /></SetupGuard>} />
            <Route path="work-permit/:sequence/edit" element={<SetupGuard><NewWorkPermit /></SetupGuard>} />
            <Route path="work-permit/:sequence" element={<SetupGuard><WorkPermitDetail /></SetupGuard>} />
            <Route path="setup" element={<Setup />} />
          </Route>
        </Routes>
      </AppProvider>
    </HashRouter>
  );
}
