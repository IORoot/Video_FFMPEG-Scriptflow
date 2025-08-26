import { NodeDefinition, getNodeDefinition } from './nodeDefinitions';

export interface ScriptflowConfig {
  [key: string]: {
    [parameter: string]: any;
  };
}

export interface NodeData {
  id: string;
  name: string;
  data: { [key: string]: any };
}

export class JsonExporter {
  private nodes: NodeData[] = [];
  private connections: Array<{ from: string; to: string; output: string; input: string }> = [];

  setNodes(nodes: NodeData[]) {
    this.nodes = nodes;
  }

  setConnections(connections: Array<{ from: string; to: string; output: string; input: string }>) {
    this.connections = connections;
  }

  private buildExecutionOrder(): NodeData[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: NodeData[] = [];

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node ${nodeId}`);
      }
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);

      // Find all dependencies (nodes that provide input to this node)
      const dependencies = this.connections
        .filter(conn => conn.to === nodeId)
        .map(conn => conn.from);

      // Visit all dependencies first
      for (const depId of dependencies) {
        visit(depId);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);

      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        ordered.push(node);
      }
    };

    // Visit all nodes
    for (const node of this.nodes) {
      visit(node.id);
    }

    return ordered;
  }

  private resolveInputMappings(node: NodeData, orderedNodes: NodeData[]): { [key: string]: any } {
    const nodeDefinition = getNodeDefinition(node.name);
    if (!nodeDefinition) return node.data;

    const resolvedData = { ...node.data };

    // Find connections where this node is the target
    const inputConnections = this.connections.filter(conn => conn.to === node.id);

    for (const connection of inputConnections) {
      // Find the source node
      const sourceNode = orderedNodes.find(n => n.id === connection.from);
      if (sourceNode) {
        // Map the output from source node to input of target node
        const outputFilename = this.getOutputFilename(sourceNode, connection.output);
        if (outputFilename) {
          resolvedData[connection.input] = outputFilename;
        }
      }
    }

    return resolvedData;
  }

  private getOutputFilename(node: NodeData, outputName: string): string | null {
    const nodeDefinition = getNodeDefinition(node.name);
    if (!nodeDefinition) return null;

    // For most nodes, the output filename is stored in the 'output' parameter
    // Some nodes might have different output parameters
    if (node.data.output) {
      return node.data.output;
    }

    // Generate default output filename based on node type
    return `${node.name}.mp4`;
  }

  private mapNodeDataToScriptParameters(nodeData: { [key: string]: any }, nodeDefinition: NodeDefinition): { [key: string]: any } {
    const scriptParams: { [key: string]: any } = {};

    // Map GUI parameter names to script parameter names
    for (const param of nodeDefinition.inputs) {
      const value = nodeData[param.name];
      if (value !== undefined && value !== null && value !== '') {
        // Map parameter names to match script expectations
        switch (param.name) {
          case 'xpixels':
            scriptParams.x = value;
            break;
          case 'ypixels':
            scriptParams.y = value;
            break;
          case 'input1':
          case 'input2':
          case 'input3':
            scriptParams[param.name] = value;
            break;
          default:
            scriptParams[param.name] = value;
        }
      }
    }

    return scriptParams;
  }

  export(): ScriptflowConfig {
    try {
      const orderedNodes = this.buildExecutionOrder();
      const config: ScriptflowConfig = {};

      // Track script names to handle duplicates
      const scriptCounts: { [key: string]: number } = {};

      for (const node of orderedNodes) {
        const nodeDefinition = getNodeDefinition(node.name);
        if (!nodeDefinition) {
          console.warn(`Unknown node type: ${node.name}`);
          continue;
        }

        // Resolve input mappings from connections
        const resolvedData = this.resolveInputMappings(node, orderedNodes);

        // Map to script parameters
        const scriptParams = this.mapNodeDataToScriptParameters(resolvedData, nodeDefinition);

        // Generate unique script key
        const baseScriptName = node.name;
        let scriptKey = baseScriptName;

        if (scriptCounts[baseScriptName]) {
          scriptCounts[baseScriptName]++;
          scriptKey = `${baseScriptName}${scriptCounts[baseScriptName]}`;
        } else {
          scriptCounts[baseScriptName] = 1;
        }

        // Add description for clarity
        config[scriptKey] = {
          description: nodeDefinition.description,
          ...scriptParams
        };
      }

      return config;
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  exportAsString(): string {
    const config = this.export();
    return JSON.stringify(config, null, 2);
  }

  // Validate the pipeline before export
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required inputs
    for (const node of this.nodes) {
      const nodeDefinition = getNodeDefinition(node.name);
      if (!nodeDefinition) {
        errors.push(`Unknown node type: ${node.name}`);
        continue;
      }

      for (const param of nodeDefinition.inputs) {
        if (param.required) {
          const hasValue = node.data[param.name] !== undefined && 
                          node.data[param.name] !== null && 
                          node.data[param.name] !== '';

          const hasConnection = this.connections.some(conn => 
            conn.to === node.id && conn.input === param.name
          );

          if (!hasValue && !hasConnection) {
            errors.push(`Node "${node.name}" (${node.id}) missing required parameter: ${param.name}`);
          }
        }
      }
    }

    // Check for circular dependencies
    try {
      this.buildExecutionOrder();
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
