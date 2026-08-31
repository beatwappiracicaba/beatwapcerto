import { usePWAInstall } from '../hooks/usePWAInstall';

function PWAInstallButton() {
  const { installPWA, canInstall } = usePWAInstall();

  return (
    canInstall ? (
      <button
        onClick={installPWA}
        className="pwa-install-btn focus:outline-none focus:ring-2 focus:ring-beatwap-gold focus:ring-offset-beatwap-black"
        aria-label="Instalar BeatWap"
        title="Instalar BeatWap"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19 13h-6v7h-2v-7H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2vz" />
        </svg>
        Instalar
      </button>
    ) : null
  );
}

export default PWAInstallButton;