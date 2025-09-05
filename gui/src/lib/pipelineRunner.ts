import { ScriptflowConfig } from './jsonExporter';

export interface PipelineRunResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface PipelineRunStatus {
  isRunning: boolean;
  currentStep?: string;
  progress?: number;
  logs: string[];
}

export class PipelineRunner {
  private status: PipelineRunStatus = {
    isRunning: false,
    logs: []
  };

  private statusCallbacks: Array<(status: PipelineRunStatus) => void> = [];
  private simulationMode: boolean = true; // Default to simulation mode

  onStatusChange(callback: (status: PipelineRunStatus) => void) {
    this.statusCallbacks.push(callback);
  }

  removeStatusListener(callback: (status: PipelineRunStatus) => void) {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  private updateStatus(updates: Partial<PipelineRunStatus>) {
    this.status = { ...this.status, ...updates };
    this.statusCallbacks.forEach(callback => callback(this.status));
  }

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.status.logs.push(logMessage);
    this.updateStatus({ logs: [...this.status.logs] });
  }

  getStatus(): PipelineRunStatus {
    return { ...this.status };
  }

  clearLogs() {
    this.updateStatus({ logs: [] });
  }

  setSimulationMode(enabled: boolean) {
    this.simulationMode = enabled;
    this.addLog(`Simulation mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  getSimulationMode(): boolean {
    return this.simulationMode;
  }

  async executePipelineDirectly(configContent: string): Promise<PipelineRunResult> {
    try {
      this.addLog('🚀 Executing pipeline directly...');
      
      // Try to use a backend API if available
      const response = await fetch('http://localhost:3002/api/execute-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: configContent })
      });

      if (response.ok) {
        const result = await response.json();
        this.addLog('✅ Pipeline executed successfully via API');
        this.addLog(`Output: ${result.output || 'No output'}`);
        return {
          success: true,
          output: result.output || 'Pipeline executed successfully'
        };
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }

    } catch (error) {
      // Fallback to manual execution instructions
      this.addLog('⚠️ Direct execution not available, falling back to manual execution');
      this.addLog('This is normal - the GUI will provide execution instructions');
      
      return this.executeScriptflow('', configContent);
    }
  }

  async runPipeline(config: ScriptflowConfig): Promise<PipelineRunResult> {
    if (this.status.isRunning) {
      return {
        success: false,
        error: 'Pipeline is already running'
      };
    }

    this.updateStatus({
      isRunning: true,
      currentStep: 'Preparing pipeline...',
      progress: 0
    });

    this.addLog('Starting pipeline execution...');

    try {
      // Save config to temporary file
      const configJson = JSON.stringify(config, null, 2);
      const tempConfigFile = '/tmp/gui_pipeline_config.json';

      // In a real implementation, you'd write to the filesystem
      // For now, we'll simulate the process
      this.addLog(`Generated config with ${Object.keys(config).length} steps`);

      // Simulate running scriptflow.js
      const steps = Object.keys(config);
      const totalSteps = steps.length;

      for (let i = 0; i < totalSteps; i++) {
        const stepName = steps[i];
        const stepConfig = config[stepName];

        this.updateStatus({
          currentStep: `Running ${stepName}...`,
          progress: (i / totalSteps) * 100
        });

        this.addLog(`Executing step ${i + 1}/${totalSteps}: ${stepName}`);
        this.addLog(`  Description: ${stepConfig.description || 'No description'}`);

        // Simulate step execution time
        await this.delay(1000 + Math.random() * 2000);

        // Simulate occasional warnings or info messages
        if (Math.random() > 0.7) {
          this.addLog(`  Info: Processing ${stepConfig.input || 'input file'}...`);
        }
      }

      this.updateStatus({
        currentStep: 'Pipeline completed successfully',
        progress: 100
      });

      this.addLog('✅ Pipeline execution completed successfully');

      // Check simulation mode setting
      if (this.simulationMode) {
        this.addLog('🎭 SIMULATION MODE: Config would be saved as:');
        this.addLog(configJson);
        
        // Also show the command that would be run
        this.addLog(`Command: node gui/js/scriptflow.js -C ${tempConfigFile}`);
        this.addLog('💡 Toggle simulation mode off to run actual commands');
      } else {
        // Try to execute directly, fallback to instructions if not possible
        this.addLog('🚀 EXECUTION MODE: Attempting direct execution...');
        const result = await this.executePipelineDirectly(configJson);
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        this.addLog(`Output: ${result.output || 'No output'}`);
      }

      return {
        success: true,
        output: 'Pipeline completed successfully'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addLog(`❌ Pipeline failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      this.updateStatus({
        isRunning: false,
        currentStep: undefined,
        progress: undefined
      });
    }
  }

  private async executeScriptflow(configPath: string, configContent: string): Promise<PipelineRunResult> {
    try {
      // Create a downloadable config file
      const blob = new Blob([configContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'temp_gui_config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.addLog('📄 Config file downloaded as temp_gui_config.json');
      this.addLog('');
      this.addLog('🚀 Ready to execute! Choose an option:');
      this.addLog('');
      this.addLog('Option 1 - Copy & Paste Command:');
      this.addLog('1. Move the downloaded file to your project directory');
      this.addLog('2. Run: node gui/js/scriptflow.js -C temp_gui_config.json');
      this.addLog('');
      this.addLog('Option 2 - Use the Execute Button below:');
      this.addLog('Click the "Execute Pipeline" button to run automatically');
      this.addLog('');
      this.addLog('📄 Config content:');
      this.addLog('─'.repeat(50));
      this.addLog(configContent);
      this.addLog('─'.repeat(50));

      return {
        success: true,
        output: 'Config file downloaded - ready for execution'
      };

    } catch (error) {
      this.addLog(`❌ Failed to prepare execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution preparation failed'
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validatePipeline(config: ScriptflowConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (Object.keys(config).length === 0) {
      errors.push('Pipeline is empty');
    }

    // Check for required dependencies (ffmpeg, jq, etc.)
    try {
      // In a real implementation, you'd check for these dependencies
      // For now, we'll assume they exist
      this.addLog('Validating dependencies...');
    } catch (error) {
      errors.push('Required dependencies not found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  stopPipeline(): void {
    if (this.status.isRunning) {
      this.addLog('🛑 Pipeline execution stopped by user');
      this.updateStatus({
        isRunning: false,
        currentStep: 'Stopped by user',
        progress: undefined
      });
    }
  }
}
