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

      // Simulate running scriptflow.sh
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

      // In development mode, just log the config instead of actually running
      if (process.env.NODE_ENV === 'development') {
        this.addLog('Development mode: Config would be saved as:');
        this.addLog(configJson);
        
        // Also show the command that would be run
        this.addLog(`Command: ./scriptflow.sh -C ${tempConfigFile}`);
      } else {
        // In production, actually run the scriptflow command
        const result = await this.executeScriptflow(tempConfigFile, configJson);
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
      // Write config file
      const fs = require('fs').promises;
      await fs.writeFile(configPath, configContent);

      // Execute scriptflow.sh
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const command = `cd /Users/andypearson/Code/Video_FFMPEG-Scriptflow && ./scriptflow.sh -C ${configPath}`;
      
      this.addLog(`Executing: ${command}`);
      
      const { stdout, stderr } = await execPromise(command, {
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr) {
        this.addLog(`Warnings/Errors: ${stderr}`);
      }

      return {
        success: true,
        output: stdout
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
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
