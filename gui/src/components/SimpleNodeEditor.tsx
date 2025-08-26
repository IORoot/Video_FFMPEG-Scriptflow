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
}> = ({ node, onMove, onSelect, onParameterChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const nodeDefinition = getNodeDefinition(node.type);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
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
      onMouseDown={handleMouseDown}
    >
      <div className="text-sm font-medium text-card-foreground mb-2">
        {nodeDefinition?.name || node.name}
      </div>
      
      {nodeDefinition?.description && (
        <div className="text-xs text-muted-foreground mb-3">
          {nodeDefinition.description}
        </div>
      )}

      {/* Input sockets */}
      <div className="space-y-1 mb-2">
        {node.inputs.map((input) => (
          <div key={input.id} className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-accent rounded-full border-2 border-background" />
            <span className="text-xs">{input.name}</span>
          </div>
        ))}
      </div>

      {/* Parameters */}
      {nodeDefinition?.inputs.map((inputDef: any) => (
        inputDef.type !== 'file' && (
          <div key={inputDef.name} className="mb-2">
            <label className="text-xs text-muted-foreground block mb-1">
              {inputDef.name}
            </label>
            {inputDef.type === 'select' ? (
              <select
                value={node.parameters[inputDef.name] || inputDef.default || ''}
                onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
              >
                {inputDef.options?.map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type={inputDef.type === 'number' ? 'number' : 'text'}
                value={node.parameters[inputDef.name] || inputDef.default || ''}
                onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                placeholder={inputDef.description}
              />
            )}
          </div>
        )
      ))}

      {/* Output sockets */}
      <div className="space-y-1 mt-2">
        {node.outputs.map((output) => (
          <div key={output.id} className="flex items-center justify-end space-x-2">
            <span className="text-xs">{output.name}</span>
            <div className="w-3 h-3 bg-primary rounded-full border-2 border-background" />
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      editor.clearSelection();
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

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    editor.moveNode(nodeId, { x, y });
  };

  const handleNodeSelect = (nodeId: string) => {
    editor.selectNode(nodeId);
  };

  const handleParameterChange = (nodeId: string, param: string, value: any) => {
    editor.updateNodeParameter(nodeId, param, value);
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
        />
      ))}

      {/* Connections - simplified for now */}
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {editorState.connections.map((connection) => {
          const fromNode = editorState.nodes.find(n => n.id === connection.from.nodeId);
          const toNode = editorState.nodes.find(n => n.id === connection.to.nodeId);
          
          if (!fromNode || !toNode) return null;

          const fromX = fromNode.position.x + 192; // node width
          const fromY = fromNode.position.y + 40;
          const toX = toNode.position.x;
          const toY = toNode.position.y + 40;

          return (
            <path
              key={connection.id}
              d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY} ${toX - 50} ${toY} ${toX} ${toY}`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
            />
          );
        })}
      </svg>

      {/* Help text */}
      {editorState.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Drag nodes from the sidebar to get started</p>
            <p className="text-sm">Create your video processing pipeline visually</p>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded px-3 py-2">
        <div>Nodes: {editorState.nodes.length} | Connections: {editorState.connections.length}</div>
        {editorState.selectedNodes.length > 0 && (
          <div>Selected: {editorState.selectedNodes.length}</div>
        )}
      </div>
    </div>
  );
});

SimpleNodeEditorComponent.displayName = 'SimpleNodeEditorComponent';

export default SimpleNodeEditorComponent;
