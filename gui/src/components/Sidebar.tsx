import React, { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// Using simple text icons instead of lucide-react for now
// import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { nodeDefinitions, nodeCategories, getNodesByCategory, NodeDefinition } from '../lib/nodeDefinitions';

// Function to get node color based on category
const getNodeColor = (category: string): { bg: string; dot: string } => {
  switch (category) {
    case 'input':
      return { bg: 'bg-green-100', dot: 'bg-green-500' }; // Green for inputs
    case 'size':
      return { bg: 'bg-blue-100', dot: 'bg-blue-500' }; // Blue for size operations
    case 'effects':
      return { bg: 'bg-purple-100', dot: 'bg-purple-500' }; // Purple for effects
    case 'composition':
      return { bg: 'bg-yellow-100', dot: 'bg-yellow-500' }; // Yellow for composition
    case 'format':
      return { bg: 'bg-red-100', dot: 'bg-red-500' }; // Red for format operations
    case 'timing':
      return { bg: 'bg-cyan-100', dot: 'bg-cyan-500' }; // Cyan for timing operations
    case 'assembly':
      return { bg: 'bg-lime-100', dot: 'bg-lime-500' }; // Lime green for assembly
    case 'utilities':
      return { bg: 'bg-gray-100', dot: 'bg-gray-500' }; // Gray for utilities
    case 'custom':
      return { bg: 'bg-pink-100', dot: 'bg-pink-500' }; // Pink for custom operations
    default:
      return { bg: 'bg-gray-100', dot: 'bg-gray-500' }; // Gray for unknown
  }
};

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NodeItem: React.FC<{
  node: NodeDefinition;
  onDragStart: (event: React.DragEvent, node: NodeDefinition) => void;
}> = ({ node, onDragStart }) => {
  const colors = getNodeColor(node.category);
  
  return (
    <div
      className="p-3 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
      draggable
      onDragStart={(e) => onDragStart(e, node)}
    >
      <div className="flex items-start space-x-3">
        <div className={`w-8 h-8 ${colors.bg} rounded-md flex items-center justify-center flex-shrink-0`}>
          <div className={`w-3 h-3 ${colors.dot} rounded-sm`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-card-foreground truncate">
            {node.name}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {node.description}
          </p>
          <div className="flex items-center space-x-1 mt-2">
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
              {node.inputs.length} inputs
            </span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
              {node.outputs.length} outputs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategorySection: React.FC<{
  category: typeof nodeCategories[0];
  nodes: NodeDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  onNodeDragStart: (event: React.DragEvent, node: NodeDefinition) => void;
}> = ({ category, nodes, isExpanded, onToggle, onNodeDragStart }) => {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-medium text-sm">{category.name}</span>
          <span className="text-xs text-muted-foreground">({nodes.length})</span>
        </div>
        {isExpanded ? (
          <span className="text-muted-foreground">▼</span>
        ) : (
          <span className="text-muted-foreground">▶</span>
        )}
      </button>
      
      {isExpanded && (
        <div className="space-y-2 pl-2">
            {nodes.map((node) => (
              <NodeItem
                key={node.id}
                node={node}
                onDragStart={onNodeDragStart}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['input', 'size']) // Default expanded categories
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleNodeDragStart = (event: React.DragEvent, node: NodeDefinition) => {
    console.log('Starting drag for node:', node.id);
    // Store the node definition ID in the drag data
    event.dataTransfer.setData('application/node-definition', node.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const filteredNodes = searchTerm
    ? nodeDefinitions.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : nodeDefinitions;

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">FFmpeg Nodes</h2>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🔍</span>
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-accent rounded transition-colors"
                >
                  <span className="text-sm">×</span>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {searchTerm ? (
              // Search results
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Search Results ({filteredNodes.length})
                </h3>
                {filteredNodes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No nodes found</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  filteredNodes.map((node) => (
                    <NodeItem
                      key={node.id}
                      node={node}
                      onDragStart={handleNodeDragStart}
                    />
                  ))
                )}
              </div>
            ) : (
              // Categories
              nodeCategories.map((category) => {
                const categoryNodes = getNodesByCategory(category.id);
                if (categoryNodes.length === 0) return null;

                return (
                  <CategorySection
                    key={category.id}
                    category={category}
                    nodes={categoryNodes}
                    isExpanded={expandedCategories.has(category.id)}
                    onToggle={() => toggleCategory(category.id)}
                    onNodeDragStart={handleNodeDragStart}
                  />
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>Drag nodes to the canvas to create your pipeline</p>
              <p className="mt-1">Total: {nodeDefinitions.length} nodes available</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
