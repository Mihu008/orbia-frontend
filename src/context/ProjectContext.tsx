import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface FirmItem {
  id: string;
  firm_name: string;
  gstin?: string;
  company?: {
    name: string;
  };
}

interface ProjectContextType {
  activeFirm: FirmItem | null;
  firms: FirmItem[];
  isLoadingFirms: boolean;
  setActiveFirmId: (firmId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [activeFirm, setActiveFirm] = useState<FirmItem | null>(null);
  const [isLoadingFirms, setIsLoadingFirms] = useState(false);

  useEffect(() => {
    async function fetchFirms() {
      if (!user || !token) {
        setFirms([]);
        setActiveFirm(null);
        return;
      }

      setIsLoadingFirms(true);
      try {
        const response = await fetch('/api/firms', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && Array.isArray(resData.data)) {
            setFirms(resData.data);
            // Default to first permitted firm or saved firm
            const savedFirmId = localStorage.getItem('orbia_active_firm_id');
            const found = resData.data.find((f: FirmItem) => f.id === savedFirmId);
            setActiveFirm(found || resData.data[0] || null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch accessible firms:', err);
      } finally {
        setIsLoadingFirms(false);
      }
    }

    fetchFirms();
  }, [user, token]);

  const setActiveFirmId = (firmId: string) => {
    const target = firms.find((f) => f.id === firmId);
    if (target) {
      setActiveFirm(target);
      localStorage.setItem('orbia_active_firm_id', firmId);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeFirm,
        firms,
        isLoadingFirms,
        setActiveFirmId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
