// FAKE scaffolding for the UI mock sandbox — not part of the real repo.
// Same exports as the real src/context/AppContext.jsx, but pre-populated from
// fixtures instead of reading localStorage/hitting the forms API. Do NOT copy
// this file back — the real repo has the real version.

import { createContext, useContext, useState } from 'react';
import { mockUser, mockSite, mockPermitTypes, mockStatuses } from '@/fixtures';

const AppContext = createContext(null);

export function savePermitTypesCache() {}
export function clearPermitTypesCache() {}

export function AppProvider({ children }) {
  const [loading, setLoading]           = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(mockUser);
  const [site, setSite]                 = useState(mockSite);
  const [permitTypes, setPermitTypes]   = useState(mockPermitTypes);
  const [statuses]                      = useState(mockStatuses);
  const [setupChecked]                  = useState(true);
  const [workPermitSetupRequired, setWorkPermitSetupRequired] = useState(false);

  return (
    <AppContext.Provider value={{
      loading,
      setLoading,
      loggedInUser,
      setLoggedInUser,
      site,
      setSite,
      permitTypes,
      setPermitTypes,
      statuses,
      setupChecked,
      workPermitSetupRequired,
      setWorkPermitSetupRequired,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
