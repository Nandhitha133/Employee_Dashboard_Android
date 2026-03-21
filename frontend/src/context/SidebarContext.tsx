// src/context/SidebarContext.tsx
import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  slideAnim: Animated.Value;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width)).current;

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsSidebarOpen(false));
    } else {
      setIsSidebarOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, slideAnim }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
