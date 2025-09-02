import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { layoutService, SavedLayout } from '../services/layoutService';

interface LayoutManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLayout: (layout: any) => void;
  onSaveLayout: () => any;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({ 
  isOpen, 
  onClose, 
  onLoadLayout, 
  onSaveLayout 
}) => {
  const { isAuthenticated, user } = useAuth();
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadLayouts();
    }
  }, [isOpen, isAuthenticated]);

  const loadLayouts = async () => {
    setIsLoading(true);
    try {
      const savedLayouts = await layoutService.getLayouts();
      setLayouts(savedLayouts);
    } catch (error) {
      console.error('Failed to load layouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!saveName.trim()) return;

    try {
      const layoutData = onSaveLayout();
      await layoutService.saveLayout(saveName, layoutData);
      setSaveName('');
      setShowSaveForm(false);
      loadLayouts();
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  const handleLoadLayout = async (layoutId: string) => {
    try {
      const layoutData = await layoutService.loadLayout(layoutId);
      onLoadLayout(layoutData.layout);
      onClose();
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  };

  const handleDeleteLayout = async (layoutId: string) => {
    if (!window.confirm('Are you sure you want to delete this layout?')) return;

    try {
      await layoutService.deleteLayout(layoutId);
      loadLayouts();
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Layout Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Please sign in to manage your layouts</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Welcome, {user?.name}
              </p>
              <button
                onClick={() => setShowSaveForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Save Current Layout
              </button>
            </div>

            {showSaveForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Layout name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveLayout()}
                  />
                  <button
                    onClick={handleSaveLayout}
                    disabled={!saveName.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveForm(false);
                      setSaveName('');
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">Loading layouts...</div>
              ) : layouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No saved layouts yet
                </div>
              ) : (
                <div className="space-y-2">
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{layout.name}</h3>
                        <p className="text-sm text-gray-500">
                          Updated: {new Date(layout.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLoadLayout(layout.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteLayout(layout.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
