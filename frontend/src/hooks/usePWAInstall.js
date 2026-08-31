import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button as the app is now installed
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      // Clear the deferred prompt since it can only be used once.
      setDeferredPrompt(null);
      setCanInstall(false);
      return outcome;
    }
    return null;
  };

  return { installPWA, canInstall };
};