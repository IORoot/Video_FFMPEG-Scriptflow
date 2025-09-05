#!/usr/bin/env node

/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │            This is a wrapper script to enable scriptflow to execute           │
 * │            any shell script, like yt_dlp or rclone, etc...                   │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let CONFIG_FILE = null;
let SCRIPT = null;
let PARAMS = null;
let OUTPUT = null;

// ╭──────────────────────────────────────────────────────────╮
// │                        STYLESHEET                        │
// ╰──────────────────────────────────────────────────────────╯
const styles = {
    green: '\x1b[38;2;74;222;128m',
    orange: '\x1b[38;2;249;115;22m',
    red: '\x1b[38;2;248;113;113m',
    blue: '\x1b[38;2;37;99;235m',
    yellow: '\x1b[38;2;234;179;8m',
    purple: '\x1b[38;2;168;85;247m',
    reset: '\x1b[39m'
};

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯
function usage() {
    console.log(`ℹ️ Usage: node ff_sh_runner.js -C <CONFIG_FILE>\n`);
    
    console.log("Summary:");
    console.log("This is a wrapper to run any script on the machine.\n");
    
    console.log("Flags:");
    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");
    
    process.exit(1);
}

// ╭──────────────────────────────────────────────────────────╮
// │         Take the arguments from the command line         │
// ╰──────────────────────────────────────────────────────────╯
function parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-C':
            case '--config':
                CONFIG_FILE = args[++i];
                break;
                
            case '--description':
                i++; // Skip description value
                break;
                
            case '--help':
                usage();
                break;
                
            default:
                if (args[i].startsWith('-')) {
                    console.error(`Unknown option ${args[i]}`);
                    process.exit(1);
                }
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │        Read config-file if supplied. Requires JQ         │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    if (!CONFIG_FILE) {
        console.error("❌ No config file specified. Use -C <CONFIG_FILE>");
        usage();
    }
    
    try {
        const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        
        // Handle nested structure (e.g., {"ff_sh_runner": {...}})
        let config = configData;
        if (Object.keys(configData).length === 1 && typeof configData[Object.keys(configData)[0]] === 'object') {
            config = configData[Object.keys(configData)[0]];
        }
        
        // Apply config values
        if (config.script) SCRIPT = config.script;
        if (config.parameters) PARAMS = config.parameters;
        if (config.output) OUTPUT = config.output;
        
        // Print to screen
        console.log(`🎛️  ${styles.green}Command${styles.reset} : ${styles.orange}${SCRIPT}${styles.reset} ${styles.yellow}${PARAMS}${styles.reset} ${styles.purple}${OUTPUT}${styles.reset}`);
        
    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    if (!SCRIPT) {
        console.error("❌ No script specified in config file");
        process.exit(1);
    }
    
    // Parse the command and arguments
    const commandParts = SCRIPT.split(' ');
    const command = commandParts[0];
    const scriptArgs = commandParts.slice(1);
    
    // Add parameters and output if they exist
    if (PARAMS && PARAMS !== 'null' && PARAMS.trim() !== '') {
        scriptArgs.push(...PARAMS.split(' '));
    }
    if (OUTPUT && OUTPUT !== 'null' && OUTPUT.trim() !== '') {
        scriptArgs.push(OUTPUT);
    }
    
    console.log(`🚀 Running: ${command} ${scriptArgs.join(' ')}`);
    
    // Run the script
    return new Promise((resolve, reject) => {
        const child = spawn(command, scriptArgs, {
            stdio: 'inherit' // Pass through stdin, stdout, stderr
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${styles.purple}Exit${styles.reset} : ${code}`);
                resolve(code);
            } else {
                console.log(`❌ ${styles.red}Exit${styles.reset} : ${code}`);
                reject(new Error(`Script exited with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`Error running script: ${error.message}`);
            reject(error);
        });
    });
}

// Check if help is requested or no arguments provided
if (process.argv.length < 3 || process.argv.includes('--help')) {
    usage();
}

parseArguments();
readConfig();
main().catch(error => {
    console.error(`Script execution failed: ${error.message}`);
    process.exit(1);
});
