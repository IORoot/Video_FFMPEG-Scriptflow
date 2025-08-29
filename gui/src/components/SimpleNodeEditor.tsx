import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SimpleNodeEditor, EditorState, EditorNode } from '../lib/simpleNodeEditor';
import { NodeDefinition, getNodeDefinition } from '../lib/nodeDefinitions';
import { JsonExporter, NodeData } from '../lib/jsonExporter';

interface SimpleNodeEditorProps {
  onNodesChange?: (nodes: NodeData[]) => void;
  onConnectionsChange?: (connections: Array<{ from: string; to: string; output: string; input: string }>) => void;
  onExportReady?: (exporter: JsonExporter) => void;
}

const NodeComponent: React.FC<{
  node: EditorNode;
  onMove: (nodeId: string, x: number, y: number) => void;
  onSelect: (nodeId: string) => void;
  onParameterChange: (nodeId: string, param: string, value: any) => void;
  onSocketMouseDown: (nodeId: string, socketId: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  onDeleteNode: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onAddDynamicInput: (nodeId: string, baseInputName: string) => void;
  onRemoveDynamicInput: (nodeId: string, inputName: string) => void;
}> = ({ node, onMove, onSelect, onParameterChange, onSocketMouseDown, onDeleteNode, onContextMenu, onAddDynamicInput, onRemoveDynamicInput }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const nodeDefinition = getNodeDefinition(node.type);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't prevent default for input fields - let them handle focus/selection
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    e.preventDefault();
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
    setIsDragging(true);
    onSelect(node.id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onMove(node.id, newX, newY);
    }
  }, [isDragging, dragOffset, node.id, onMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`absolute bg-card border rounded-lg p-3 min-w-48 cursor-move select-none ${
        node.selected ? 'border-primary shadow-lg' : 'border-border'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        zIndex: node.selected ? 10 : 1
      }}
      data-node-id={node.id}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(node.id, e.clientX, e.clientY);
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-card-foreground">
          {nodeDefinition?.name || node.name}
        </div>
        {node.selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded p-1 transition-colors"
            title="Delete node (or press Delete key)"
          >
            ✕
          </button>
        )}
      </div>
      
      {nodeDefinition?.description && (
        <div className="text-xs text-muted-foreground mb-3">
          {nodeDefinition.description}
        </div>
      )}

      {/* All Input Parameters */}
      {(() => {
        // Get all inputs (static + dynamic)
        const allInputs = [...(nodeDefinition?.inputs || [])];
        
        // Add dynamic inputs that exist in the node
        const dynamicInputs = Object.keys(node.parameters).filter(key => {
          const baseInput = nodeDefinition?.inputs.find(input => input.dynamic && key.startsWith(input.name.replace(/\d+$/, '')));
          return baseInput && !allInputs.find(input => input.name === key);
        });
        
        dynamicInputs.forEach(inputName => {
          const baseInput = nodeDefinition?.inputs.find(input => input.dynamic && inputName.startsWith(input.name.replace(/\d+$/, '')));
          if (baseInput) {
            allInputs.push({
              ...baseInput,
              name: inputName,
              required: false // Dynamic inputs are never required
            });
          }
        });

        return allInputs.map((inputDef: any) => {
          const isDynamic = inputDef.dynamic && inputDef.name !== nodeDefinition?.inputs.find(input => input.dynamic && inputDef.name.startsWith(input.name.replace(/\d+$/, '')))?.name;
          const baseInputName = nodeDefinition?.inputs.find(input => input.dynamic && inputDef.name.startsWith(input.name.replace(/\d+$/, '')))?.name;
          
          return (
            <div key={inputDef.name} className="mb-2">
              <div className="flex items-center space-x-2 mb-1">
                {inputDef.type === 'file' && (
                  <div 
                    className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white cursor-pointer hover:bg-orange-400 transition-colors shadow-sm flex-shrink-0"
                    data-socket-type="input"
                    data-node-id={node.id}
                    data-socket-id={inputDef.name}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSocketMouseDown(node.id, inputDef.name, 'input', e);
                    }}
                    title={`Connect to: ${inputDef.name}`}
                  />
                )}
                <label className="text-xs text-muted-foreground flex-1">
                  {inputDef.name}
                  {inputDef.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                
                {/* Dynamic input controls */}
                {inputDef.dynamic && baseInputName && (
                  <div className="flex items-center space-x-1">
                    {isDynamic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDynamicInput(node.id, inputDef.name);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded p-1 transition-colors"
                        title="Remove input"
                      >
                        −
                      </button>
                    )}
                    {inputDef.name === baseInputName && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddDynamicInput(node.id, baseInputName);
                        }}
                        className="text-green-500 hover:text-green-700 hover:bg-green-500/10 rounded p-1 transition-colors"
                        title="Add input"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {inputDef.type === 'select' ? (
                <select
                  value={node.parameters[inputDef.name] || inputDef.default || ''}
                  onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                >
                  {inputDef.options?.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : inputDef.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={node.parameters[inputDef.name] || inputDef.default || false}
                    onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.checked)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                  <span className="text-xs text-muted-foreground">
                    {node.parameters[inputDef.name] || inputDef.default ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ) : (
                <input
                  type={inputDef.type === 'number' ? 'number' : 'text'}
                  value={node.parameters[inputDef.name] || inputDef.default || ''}
                  onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                  placeholder={inputDef.description || `Enter ${inputDef.name}`}
                />
              )}
              
              {inputDef.description && (
                <div className="text-xs text-muted-foreground mt-1 opacity-75">
                  {inputDef.description}
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* Output sockets */}
      <div className="space-y-1 mt-2">
        {node.outputs.map((output) => (
          <div key={output.id} className="flex items-center justify-end space-x-2">
            <span className="text-xs">{output.name}</span>
            <div 
              className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:bg-blue-400 transition-colors shadow-sm"
              data-socket-type="output"
              data-node-id={node.id}
              data-socket-id={output.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSocketMouseDown(node.id, output.id, 'output', e);
              }}
              title={`Output: ${output.name}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export interface SimpleNodeEditorHandle {
  addNode: (nodeDefinition: NodeDefinition, position?: { x: number; y: number }) => string;
  removeSelectedNodes: () => void;
  clearAll: () => void;
  getEditor: () => SimpleNodeEditor;
}

export const SimpleNodeEditorComponent = forwardRef<SimpleNodeEditorHandle, SimpleNodeEditorProps>(({
  onNodesChange,
  onConnectionsChange,
  onExportReady
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editor] = useState(() => new SimpleNodeEditor());
  const [editorState, setEditorState] = useState<EditorState>(editor.getState());
  const [connectionDrag, setConnectionDrag] = useState<{
    from: { nodeId: string; socketId: string; type: 'input' | 'output' };
    fromPos: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  useEffect(() => {
    const handleStateChange = (state: EditorState) => {
      setEditorState(state);
      
      // Update parent components
      if (onNodesChange) {
        const nodes = state.nodes.map(node => ({
          id: node.id,
          name: node.type,
          data: node.parameters
        }));
        onNodesChange(nodes);
      }

      if (onConnectionsChange) {
        const connections = state.connections.map(conn => ({
          from: conn.from.nodeId,
          to: conn.to.nodeId,
          output: conn.from.socketId,
          input: conn.to.socketId
        }));
        onConnectionsChange(connections);
      }

      if (onExportReady) {
        const exportData = editor.exportData();
        const exporter = new JsonExporter();
        exporter.setNodes(exportData.nodes);
        exporter.setConnections(exportData.connections);
        onExportReady(exporter);
      }
    };

    editor.onStateChange(handleStateChange);
    return () => editor.removeListener(handleStateChange);
  }, [editor, onNodesChange, onConnectionsChange, onExportReady]);

  // Handle keyboard events for node deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle delete if we're not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection) {
          e.preventDefault();
          editor.removeConnection(selectedConnection);
          setSelectedConnection(null);
        } else if (editorState.selectedNodes.length > 0) {
          e.preventDefault();
          editorState.selectedNodes.forEach(nodeId => {
            editor.removeNode(nodeId);
          });
        }
      }

      // Close context menu on Escape
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editor, editorState.selectedNodes, selectedConnection]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      editor.clearSelection();
      setContextMenu(null);
      setSelectedConnection(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeDefinitionId = e.dataTransfer.getData('application/node-definition');
    if (!nodeDefinitionId || !canvasRef.current) {
      console.log('Drop failed: no node ID or canvas ref');
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left - 100, // Offset so node appears where cursor is
      y: e.clientY - rect.top - 50
    };

    console.log('Dropping node:', nodeDefinitionId, 'at position:', position);
    editor.addNode(nodeDefinitionId, position);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleSocketMouseDown = (nodeId: string, socketId: string, type: 'input' | 'output', e: React.MouseEvent) => {
    console.log('Socket mouse down:', { nodeId, socketId, type });
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'output') {
      // Start connection drag from output socket - use dynamic positioning
      const fromNode = editorState.nodes.find(n => n.id === nodeId);
      if (fromNode && canvasRef.current) {
        // Use the same socket element-based calculation as connection lines
        const calculateSocketPosition = (node: EditorNode, socketType: 'input' | 'output', socketId: string) => {
          if (socketType === 'output') {
            const canvasElement = canvasRef.current;
            
            if (canvasElement) {
              // Try to find the actual socket element
              const socketElement = document.querySelector(`[data-node-id="${node.id}"][data-socket-id="${socketId}"][data-socket-type="${socketType}"]`);
              
              if (socketElement) {
                const socketRect = socketElement.getBoundingClientRect();
                const canvasRect = canvasElement.getBoundingClientRect();
                
                // Get the center of the socket element
                return {
                  x: socketRect.left - canvasRect.left + socketRect.width / 2,
                  y: socketRect.top - canvasRect.top + socketRect.height / 2
                };
              }
            }
            
            // Fallback to calculated position if socket element not found
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            
            if (nodeElement && canvasElement) {
              const nodeRect = nodeElement.getBoundingClientRect();
              const canvasRect = canvasElement.getBoundingClientRect();
              
              // Convert to canvas-relative coordinates
              const relativeX = nodeRect.left - canvasRect.left;
              const relativeY = nodeRect.top - canvasRect.top;
              const nodeWidth = nodeRect.width;
              const nodeHeight = nodeRect.height;
              
              return {
                x: relativeX + nodeWidth - 16, // 16px from right edge
                y: relativeY + nodeHeight - 16 // 16px from bottom edge
              };
            }
          }
          return { x: 0, y: 0 };
        };
        
        const socketPos = calculateSocketPosition(fromNode, 'output', socketId);
        
        const dragData = {
          from: { nodeId, socketId, type },
          fromPos: { x: socketPos.x, y: socketPos.y }, // Store the original socket position
          to: { x: socketPos.x, y: socketPos.y } // Start at the same position
        };
        console.log('Starting connection drag from calculated socket position:', dragData);
        setConnectionDrag(dragData);
      }
    } else {
      console.log('Clicked on input socket - connections start from outputs');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectionDrag && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      console.log('Canvas mouse move - updating drag to:', newPos);
      setConnectionDrag({
        ...connectionDrag,
        to: newPos
      });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    console.log('Canvas mouse up, connectionDrag:', connectionDrag);
    if (connectionDrag) {
      // Check if we're over an input socket
      const target = e.target as HTMLElement;
      console.log('Mouse up target:', target);
      const socketElement = target.closest('[data-socket-type="input"]');
      console.log('Found socket element:', socketElement);
      
      if (socketElement) {
        const targetNodeId = socketElement.getAttribute('data-node-id');
        const targetSocketId = socketElement.getAttribute('data-socket-id');
        console.log('Target socket:', { targetNodeId, targetSocketId });
        
        if (targetNodeId && targetSocketId) {
          console.log('Creating connection:', {
            from: connectionDrag.from,
            to: { nodeId: targetNodeId, socketId: targetSocketId }
          });
          // Create connection
          editor.addConnection(
            connectionDrag.from.nodeId,
            connectionDrag.from.socketId,
            targetNodeId,
            targetSocketId
          );
        }
      } else {
        console.log('No input socket found at drop location');
      }
      
      console.log('Clearing connection drag');
      setConnectionDrag(null);
    }
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    editor.moveNode(nodeId, { x, y });
  };

  const handleNodeSelect = (nodeId: string) => {
    editor.selectNode(nodeId);
  };

  const handleParameterChange = (nodeId: string, param: string, value: any) => {
    editor.updateNodeParameter(nodeId, param, value);
  };

  const handleDeleteNode = (nodeId: string) => {
    editor.removeNode(nodeId);
  };

  const handleNodeContextMenu = (nodeId: string, x: number, y: number) => {
    setContextMenu({ x, y, nodeId });
  };

  const handleAddDynamicInput = (nodeId: string, baseInputName: string) => {
    editor.addDynamicInput(nodeId, baseInputName);
  };

  const handleRemoveDynamicInput = (nodeId: string, inputName: string) => {
    editor.removeDynamicInput(nodeId, inputName);
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addNode: (nodeDefinition: NodeDefinition, position?: { x: number; y: number }) => {
      const pos = position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 };
      return editor.addNode(nodeDefinition.id, pos);
    },
    removeSelectedNodes: () => {
      editorState.selectedNodes.forEach(nodeId => {
        editor.removeNode(nodeId);
      });
    },
    clearAll: () => {
      editor.clearAll();
    },
    getEditor: () => editor
  }), [editor, editorState.selectedNodes]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-background border border-border rounded-lg overflow-hidden"
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={(e) => {
        e.preventDefault();
        console.log('Drag enter canvas');
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      style={{ minHeight: '600px' }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      {/* Nodes */}
      {editorState.nodes.map((node) => (
        <NodeComponent
          key={node.id}
          node={node}
          onMove={handleNodeMove}
          onSelect={handleNodeSelect}
          onParameterChange={handleParameterChange}
          onSocketMouseDown={handleSocketMouseDown}
          onDeleteNode={handleDeleteNode}
          onContextMenu={handleNodeContextMenu}
          onAddDynamicInput={handleAddDynamicInput}
          onRemoveDynamicInput={handleRemoveDynamicInput}
        />
      ))}

      {/* Connections - Simple and Visible */}
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ zIndex: 10, width: '100%', height: '100%' }}
        viewBox={`0 0 ${canvasRef.current?.offsetWidth || 1200} ${canvasRef.current?.offsetHeight || 800}`}
      >
        {/* Test line to verify SVG is working */}
        <line x1="50" y1="50" x2="150" y2="50" stroke="red" strokeWidth="2" />
        <text x="50" y="40" fill="red" fontSize="12">SVG Test Line</text>
        
        {editorState.connections.map((connection, index) => {
          console.log(`Rendering connection ${index}:`, connection);
          const fromNode = editorState.nodes.find(n => n.id === connection.from.nodeId);
          const toNode = editorState.nodes.find(n => n.id === connection.to.nodeId);
          
          if (!fromNode || !toNode) {
            console.log('Missing nodes for connection:', { fromNode, toNode, connection });
            return null;
          }

          // Calculate socket positions using actual socket element positions
          const calculateSocketPosition = (node: EditorNode, socketType: 'input' | 'output', socketId: string) => {
            const canvasElement = canvasRef.current;
            
            if (canvasElement) {
              // Try to find the actual socket element
              const socketElement = document.querySelector(`[data-node-id="${node.id}"][data-socket-id="${socketId}"][data-socket-type="${socketType}"]`);
              
              if (socketElement) {
                const socketRect = socketElement.getBoundingClientRect();
                const canvasRect = canvasElement.getBoundingClientRect();
                
                // Get the center of the socket element
                return {
                  x: socketRect.left - canvasRect.left + socketRect.width / 2,
                  y: socketRect.top - canvasRect.top + socketRect.height / 2
                };
              }
            }
            
            // Fallback to calculated position if socket element not found
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            
            if (nodeElement && canvasElement) {
              const nodeRect = nodeElement.getBoundingClientRect();
              const canvasRect = canvasElement.getBoundingClientRect();
              
              // Convert to canvas-relative coordinates
              const relativeX = nodeRect.left - canvasRect.left;
              const relativeY = nodeRect.top - canvasRect.top;
              const nodeWidth = nodeRect.width;
              const nodeHeight = nodeRect.height;
              
              if (socketType === 'input') {
                // Input sockets are now positioned next to their input fields
                const nodeDefinition = getNodeDefinition(node.type);
                if (!nodeDefinition) return { x: 0, y: 0 };
                
                // Find the input parameter index
                const inputIndex = nodeDefinition.inputs.findIndex(input => input.name === socketId);
                
                if (inputIndex >= 0) {
                  // Calculate position based on the new layout
                  const titleHeight = 20; // Node title height
                  const descHeight = nodeDefinition.description ? 40 : 0; // Description height
                  const paramSpacing = 30; // Spacing between parameters
                  const paramStartY = relativeY + titleHeight + descHeight + 20; // Start of parameters
                  
                  return {
                    x: relativeX + 16, // 16px from left edge
                    y: paramStartY + (inputIndex * paramSpacing) + 8 // Center of the parameter row
                  };
                }
              } else {
                // Output sockets are at the bottom right corner
                return {
                  x: relativeX + nodeWidth - 16, // 16px from right edge
                  y: relativeY + nodeHeight - 16 // 16px from bottom edge
                };
              }
            }
            
            return { x: 0, y: 0 };
          };
          
          // Calculate exact positions for both sockets
          const fromPos = calculateSocketPosition(fromNode, 'output', connection.from.socketId);
          const toPos = calculateSocketPosition(toNode, 'input', connection.to.socketId);
          
          const fromX = fromPos.x;
          const fromY = fromPos.y;
          const toX = toPos.x;
          const toY = toPos.y;

          console.log(`Connection ${index} coordinates:`, { fromX, fromY, toX, toY });

          return (
            <g key={connection.id || `conn-${index}`}>
              {/* Clickable connection line with wider hit area */}
              <path
                d={`M ${fromX} ${fromY} C ${fromX + 80} ${fromY} ${toX - 80} ${toY} ${toX} ${toY}`}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
                className="cursor-pointer hover:stroke-red-500 hover:stroke-2 transition-colors"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedConnection(connection.id);
                  setContextMenu(null); // Close any open context menu
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm('Delete this connection?')) {
                    editor.removeConnection(connection.id);
                  }
                }}
              />
              {/* Visible connection line */}
              <path
                d={`M ${fromX} ${fromY} C ${fromX + 80} ${fromY} ${toX - 80} ${toY} ${toX} ${toY}`}
                stroke={selectedConnection === connection.id ? "#ef4444" : "#3b82f6"}
                strokeWidth={selectedConnection === connection.id ? "4" : "3"}
                fill="none"
                opacity="0.9"
                className="pointer-events-none"
              />
              {/* Socket connection points - larger for debugging */}
              <circle cx={fromX} cy={fromY} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <circle cx={toX} cy={toY} r="6" fill="#f97316" stroke="#fff" strokeWidth="2" />
              
              {/* Debug labels */}
              <text x={fromX + 10} y={fromY - 10} fill="#3b82f6" fontSize="10" fontWeight="bold">
                OUT
              </text>
              <text x={toX + 10} y={toY - 10} fill="#f97316" fontSize="10" fontWeight="bold">
                IN
              </text>
            </g>
          );
        })}
        
        {/* Connection drag line */}
        {connectionDrag && (() => {
          const fromNode = editorState.nodes.find(n => n.id === connectionDrag.from.nodeId);
          if (!fromNode) return null;
          
          // Use the actual socket position that was calculated in onSocketMouseDown
          const fromX = connectionDrag.fromPos.x;
          const fromY = connectionDrag.fromPos.y;
          
          return (
            <path
              d={`M ${fromX} ${fromY} Q ${(fromX + connectionDrag.to.x) / 2} ${fromY} ${connectionDrag.to.x} ${connectionDrag.to.y}`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          );
        })()}
      </svg>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-32"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              editor.removeNode(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            🗑️ Delete Node
          </button>
          <button
            onClick={() => {
              editor.selectNode(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
          >
            ✅ Select Node
          </button>
        </div>
      )}

      {/* Help text */}
      {editorState.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Drag nodes from the sidebar to get started</p>
            <p className="text-sm mb-4">Create your video processing pipeline visually</p>
            {/* Test buttons to create a demo pipeline */}
            <div className="space-x-2">
              <button
                onClick={() => {
                  // Create a demo pipeline: Download -> Scale -> Crop
                  const downloadId = editor.addNode('ff_download', { x: 100, y: 200 });
                  const scaleId = editor.addNode('ff_scale', { x: 400, y: 200 });
                  const cropId = editor.addNode('ff_crop', { x: 700, y: 200 });
                  
                  // Add connections after a small delay to ensure nodes are created
                  setTimeout(() => {
                    editor.addConnection(downloadId, 'video', scaleId, 'input');
                    editor.addConnection(scaleId, 'video', cropId, 'input');
                  }, 100);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                🎬 Create Demo Pipeline
              </button>
              <button
                onClick={() => {
                  // Create just two nodes for manual connection testing
                  editor.addNode('ff_download', { x: 150, y: 150 });
                  editor.addNode('ff_scale', { x: 450, y: 150 });
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm"
              >
                ⚡ Create Test Nodes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded px-3 py-2">
        <div>Nodes: {editorState.nodes.length} | Connections: {editorState.connections.length}</div>
        {connectionDrag && (
          <div className="text-blue-400">🔗 Dragging connection from {connectionDrag.from.nodeId}...</div>
        )}
        {editorState.selectedNodes.length > 0 && (
          <div className="text-yellow-400">Selected: {editorState.selectedNodes.length} (Press Delete to remove)</div>
        )}
        {selectedConnection && (
          <div className="text-red-400">Connection selected (Press Delete to remove)</div>
        )}
        <div className="mt-1 text-xs opacity-75">
          💡 Drag from 🔵 blue (output) to 🟠 orange (input) | Click connections to delete | Right-click nodes for menu
        </div>
      </div>
    </div>
  );
});

SimpleNodeEditorComponent.displayName = 'SimpleNodeEditorComponent';

export default SimpleNodeEditorComponent;
