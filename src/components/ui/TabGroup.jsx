export default function TabGroup({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex gap-1 border-b border-surface-border">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative
              ${
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}
