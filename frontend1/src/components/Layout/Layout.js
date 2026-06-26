import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Chatbot from '../Chatbot/Chatbot';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    const TIMEOUT_DURATION = 20 * 60 * 1000;

    const handleLogout = () => {
      sessionStorage.clear();
      navigate('/login');
    };

    const resetTimer = () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      logoutTimerRef.current = setTimeout(handleLogout, TIMEOUT_DURATION);
    };

    // Events that reset the timer
    const events = ['mousedown', 'keypress', 'scroll', 'mousemove', 'touchstart', 'click'];
    
    // Throttle mousemove to avoid excessive resetting
    let lastReset = 0;
    const handleActivity = (e) => {
        const now = Date.now();
        if (e.type === 'mousemove') {
            if (now - lastReset > 1000) { // Only reset once per second for mousemove
                resetTimer();
                lastReset = now;
            }
        } else {
            resetTimer();
            lastReset = now;
        }
    };

    // Set initial timer
    resetTimer();

    // Add listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [navigate]);

  // Close sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes (for mobile)
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Full Height Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={handleCloseSidebar} 
        isDesktopOpen={isDesktopSidebarOpen}
        toggleDesktopSidebar={toggleDesktopSidebar}
      />
      
      {/* Main Content Area - includes Header and Outlet */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Header positioned after sidebar */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content with Outlet */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-none w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default Layout;
