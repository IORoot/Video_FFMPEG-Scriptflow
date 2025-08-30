import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridSnapEnabled: boolean;
  onToggleGridSnap: () => void;
  simulationMode: boolean;
  onToggleSimulationMode: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gridSnapEnabled,
  onToggleGridSnap,
  simulationMode,
  onToggleSimulationMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Grid Snap Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Grid Snapping</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Snap nodes and comments to a 32px grid for organized layouts
                </p>
              </div>
              <button
                onClick={onToggleGridSnap}
                className={`relative inline-flex h-6 w-16 items-center rounded-full transition-colors ${
                  gridSnapEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    gridSnapEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Simulation Mode Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Execution Mode</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {simulationMode 
                    ? 'Simulation mode: Commands are logged but not executed'
                    : 'Execution mode: Commands will be run on your system'
                  }
                </p>
              </div>
              <button
                onClick={onToggleSimulationMode}
                className={`relative inline-flex h-6 w-16 items-center rounded-full transition-colors ${
                  simulationMode ? 'bg-yellow-600' : 'bg-green-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    simulationMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
