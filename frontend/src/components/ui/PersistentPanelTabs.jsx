export const PersistentPanelTabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? 'bg-beatwap-gold text-black border-beatwap-gold shadow-[0_0_24px_rgba(245,197,66,0.15)]'
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-beatwap-gold/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-extrabold">{tab.label}</div>
                {tab.count !== undefined ? (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isActive ? 'bg-black/10 text-black' : 'bg-white/10 text-beatwap-gold'}`}>
                    {tab.count}
                  </span>
                ) : null}
              </div>
              {tab.helper ? (
                <div className={`text-xs mt-2 ${isActive ? 'text-black/80' : 'text-gray-400'}`}>{tab.helper}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
