
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings } from '@/app/(app)/settings/page';

interface AppSettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  loading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'JS Glow',
    logoUrlLight: '',
    logoUrlDark: '',
    authLogoUrlLight: '',
    authLogoUrlDark: '',
    faviconUrl: '',
    currency: 'USD',
    signupVisible: true,
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const docRef = doc(db, "settings", "app");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const fetchedSettings = docSnap.data() as AppSettings;
            setSettings(prev => ({ ...prev, ...fetchedSettings }));

            if (fetchedSettings.faviconUrl) {
                let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                link.href = fetchedSettings.faviconUrl;
            }
            if (fetchedSettings.appName) {
                document.title = fetchedSettings.appName;
            }
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching settings in real-time:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, setSettings, loading }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
