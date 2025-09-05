#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                         JSON Template Config Runner                          │
// │        Takes a JSON config file and executes each command in sequence        │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯
// set -o errexit                                              // If a command fails bash exits.
// set -o pipefail                                             // pipeline fails on one command.
if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// ╭──────────────────────────────────────────────────────────╮
// │                         Variables                        │
// ╰──────────────────────────────────────────────────────────╯
let PWD = process.cwd();
let TEMP_FOLDER = "/tmp";
let OUTPUT_FILENAME = "output.mp4";
let CONFIG_FILE = "config.json";
let TIDY = true;

// ╭──────────────────────────────────────────────────────────╮
// │                     Colour Variables                     │
// ╰──────────────────────────────────────────────────────────╯
const LIGHT_COLOUR = "#fafafa";
const DARK_COLOUR = "#171717";
let CONTRAST_COLOUR = LIGHT_COLOUR;
const TAILWIND = "#f8fafc #f1f5f9 #e2e8f0 #cbd5e1 #94a3b8 #64748b #475569 #334155 #1e293b #0f172a #020617 #f9fafb #f3f4f6 #e5e7eb #d1d5db #9ca3af #6b7280 #4b5563 #374151 #1f2937 #111827 #030712 #fafafa #f4f4f5 #e4e4e7 #d4d4d8 #a1a1aa #71717a #52525b #3f3f46 #27272a #18181b #09090b #fafafa #f5f5f5 #e5e5e5 #d4d4d4 #a3a3a3 #737373 #525252 #404040 #262626 #171717 #0a0a0a #fafaf9 #f5f5f4 #e7e5e4 #d6d3d1 #a8a29e #78716c #57534e #44403c #292524 #1c1917 #0c0a09 #fef2f2 #fee2e2 #fecaca #fca5a5 #f87171 #ef4444 #dc2626 #b91c1c #991b1b #7f1d1d #450a0a #fff7ed #ffedd5 #fed7aa #fdba74 #fb923c #f97316 #ea580c #c2410c #9a3412 #7c2d12 #431407 #fffbeb #fef3c7 #fde68a #fcd34d #fbbf24 #f59e0b #d97706 #b45309 #92400e #78350f #451a03 #fefce8 #fef9c3 #fef08a #fde047 #facc15 #eab308 #ca8a04 #a16207 #854d0e #713f12 #422006 #f7fee7 #ecfccb #d9f99d #bef264 #a3e635 #84cc16 #65a30d #4d7c0f #3f6212 #365314 #1a2e05 #f0fdf4 #dcfce7 #bbf7d0 #86efac #4ade80 #22c55e #16a34a #15803d #166534 #14532d #052e16 #ecfdf5 #d1fae5 #a7f3d0 #6ee7b7 #34d399 #10b981 #059669 #047857 #065f46 #064e3b #022c22 #f0fdfa #ccfbf1 #99f6e4 #5eead4 #2dd4bf #14b8a6 #0d9488 #0f766e #115e59 #134e4a #042f2e #ecfeff #cffafe #a5f3fc #67e8f9 #22d3ee #06b6d4 #0891b2 #0e7490 #155e75 #164e63 #083344 #f0f9ff #e0f2fe #bae6fd #7dd3fc #38bdf8 #0ea5e9 #0284c7 #0369a1 #075985 #0c4a6e #082f49 #eff6ff #dbeafe #bfdbfe #93c5fd #60a5fa #3b82f6 #2563eb #1d4ed8 #1e40af #1e3a8a #172554 #eef2ff #e0e7ff #c7d2fe #a5b4fc #818cf8 #6366f1 #4f46e5 #4338ca #3730a3 #312e81 #1e1b4b #f5f3ff #ede9fe #ddd6fe #c4b5fd #a78bfa #8b5cf6 #7c3aed #6d28d9 #5b21b6 #4c1d95 #2e1065 #faf5ff #f3e8ff #e9d5ff #d8b4fe #c084fc #a855f7 #9333ea #7e22ce #6b21a8 #581c87 #3b0764 #fdf4ff #fae8ff #f5d0fe #f0abfc #e879f9 #d946ef #c026d3 #a21caf #86198f #701a75 #4a044e #fdf2f8 #fce7f3 #fbcfe8 #f9a8d4 #f472b6 #ec4899 #db2777 #be185d #9d174d #831843 #500724 #fff1f2 #ffe4e6 #fecdd3 #fda4af #fb7185 #f43f5e #e11d48 #be123c #9f1239 #881337 #4c0519";
const TAILWIND_ARRAY = TAILWIND.split(' ');

// Global variables for constant colors
let CONSTANT_RANDOM_COLOUR = "";
let CONSTANT_CONTRAST_COLOUR = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 2) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -c <CONFIG_FILE> [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Runs a config file to execute multiple ff_ scripts in sequence.");
        console.log("Requires JQ command.\n");
        
        console.log("Flags:");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tA JSON configuration file for all settings.");
        console.log("\tAll inputs/outputs should be relative to where this file is.\n");
        
        console.log(" -t | --notidy");
        console.log("\tDo not delete intermediate files.");
        
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │         Take the arguments from the command line         │
// ╰──────────────────────────────────────────────────────────╯
function parseArguments() {
    const args = process.argv.slice(2);
    let i = 0;
    
    while (i < args.length) {
        const arg = args[i];
        
        switch (arg) {
            case '-C':
            case '--config':
                CONFIG_FILE = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-t':
            case '--notidy':
                TIDY = false;
                i += 1;
                break;
                
            case '--description':              // IGNORED. used for descriptions in JSON 
                i += 2;
                break;
                
            case '--help':
                usage();
                break;
                
            default:
                if (arg.startsWith('-')) {
                    console.log(`Unknown option ${arg}`);
                    process.exit(1);
                }
                i += 1;
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │            Config file overrides any settings            │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) {
        console.log("❌ No config file specified. Exiting.");
        process.exit(1);
    }
    
    // Check dependencies
    try {
        spawn('jq', ['--version'], { stdio: 'pipe' });
    } catch (error) {
        console.log("JQ is a dependency and could not be found. Please install JQ for JSON parsing. Exiting.");
        process.exit(1);
    }
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Get a list of all the scripts - Any duplicates must have digits after their name. ff_scale1, ff_scale2, etc...
        const scriptNames = Object.keys(config).filter(key => key.startsWith('ff'));
        return scriptNames;
    } catch (error) {
        console.error("Error reading config file:", error.message);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │   Generate a random colour that stays constant through   │
// │   the whole scriptflow. This allows for multiple steps   │
// │    to use the same random colour and contrast colour.    │
// ╰──────────────────────────────────────────────────────────╯
function generateColours() {
    const randomSeed = process.pid + Date.now();
    const randomKey = randomSeed % TAILWIND_ARRAY.length;
    CONSTANT_RANDOM_COLOUR = TAILWIND_ARRAY[randomKey];
    contrastColour(CONSTANT_RANDOM_COLOUR);
    CONSTANT_CONTRAST_COLOUR = CONTRAST_COLOUR;
}

// ╭──────────────────────────────────────────────────────────╮
// │      Find a contrasting colour to the random colour      │
// ╰──────────────────────────────────────────────────────────╯
function contrastColour(input) {
    // Remove the '#' from the hex code and convert it to RGB
    const hex = input.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate the brightness of the color
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return "light" or "dark" depending on the brightness
    if (brightness > 128) {
        CONTRAST_COLOUR = DARK_COLOUR;
    } else {
        CONTRAST_COLOUR = LIGHT_COLOUR;
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │   Substitute specific keywords for their actual values   │
// ╰──────────────────────────────────────────────────────────╯
function keywordSubstitutions(scriptContents, configDirectory) {
    let contents = scriptContents;
    
    // <ENV_*>
    // Replace environment variables
    // Run `export VAR="123"` or add to front of scriptflow command
    // VAR="ABC" ./scriptflow.sh
    const envRegex = /<ENV_([^>]*)>/g;
    contents = contents.replace(envRegex, (match, envVar) => {
        const envValue = process.env[envVar] || '';
        return envValue.replace(/_/g, ' ');
    });
    
    // <FOLDER_NAME>
    // current folder
    const folderName = path.basename(configDirectory);
    contents = contents.replace(/<FOLDER_NAME>/g, folderName);
    
    // <FOLDER_TITLE>
    // This is the folder name, replacing _ for spaces.
    const folderTitle = folderName.replace(/_/g, ' ');
    contents = contents.replace(/<FOLDER_TITLE>/g, folderTitle);
    
    // <DATE_%d-%m-%y>
    // Format can be of any kind. see https://man7.org/linux/man-pages/man1/date.1.html
    // Formats like:
    // <DATE_%A %d %B. %Y> = Friday 31 March. 2023
    const dateRegex = /<DATE_([^>]*)>/g;
    contents = contents.replace(dateRegex, (match, dateFormat) => {
        const now = new Date();
        // Simple date formatting - in a real implementation you'd use a proper date library
        const formatMap = {
            '%d': now.getDate().toString().padStart(2, '0'),
            '%m': (now.getMonth() + 1).toString().padStart(2, '0'),
            '%y': now.getFullYear().toString().slice(-2),
            '%Y': now.getFullYear().toString(),
            '%A': now.toLocaleDateString('en-US', { weekday: 'long' }),
            '%B': now.toLocaleDateString('en-US', { month: 'long' }),
            '%H': now.getHours().toString().padStart(2, '0'),
            '%M': now.getMinutes().toString().padStart(2, '0'),
            '%S': now.getSeconds().toString().padStart(2, '0')
        };
        
        let formatted = dateFormat;
        for (const [key, value] of Object.entries(formatMap)) {
            formatted = formatted.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
        return formatted;
    });
    
    // <RANDOM_VIDEO>
    // Any random file in folder.
    // "../lib/luts/<RANDOM_FILE>"
    const randomVideoFiles = fs.readdirSync(configDirectory)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.mp4' || ext === '.mov';
        })
        .map(file => path.join(configDirectory, file));
    
    if (randomVideoFiles.length > 0) {
        const randomVideo = randomVideoFiles[Math.floor(Math.random() * randomVideoFiles.length)];
        contents = contents.replace(/<RANDOM_VIDEO>/g, randomVideo);
    }
    
    // <RANDOM_VIDEO_FILTER_youth>
    // Any random file in folder, filtered with specific string 'youth'
    // "../lib/overlays/<RANDOM_FILTER_blue>"
    const randomVideoFilterRegex = /<RANDOM_VIDEO_FILTER_([^>]*)>/g;
    contents = contents.replace(randomVideoFilterRegex, (match, filter) => {
        const filteredFiles = fs.readdirSync(configDirectory)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return (ext === '.mp4' || ext === '.mov') && file.includes(filter);
            })
            .map(file => path.join(configDirectory, file));
        
        if (filteredFiles.length > 0) {
            return filteredFiles[Math.floor(Math.random() * filteredFiles.length)];
        }
        return match; // Return original if no files found
    });
    
    // <RANDOM_COLOUR>
    // Replace with a random colour from the tailwind palette
    // This changes on every stage
    const randomSeed = process.pid + Date.now();
    const randomKey = randomSeed % TAILWIND_ARRAY.length;
    const randomColour = TAILWIND_ARRAY[randomKey];
    contents = contents.replace(/<RANDOM_COLOUR>/g, randomColour);
    
    // <RANDOM_CONTRAST_COLOUR>
    // This colour will either be a light or dark colour based
    // on the <RANDOM_COLOUR> generated above.
    // This changes on every stage
    contrastColour(randomColour);
    contents = contents.replace(/<RANDOM_CONTRAST_COLOUR>/g, CONTRAST_COLOUR);
    
    // <CONSTANT_RANDOM_COLOUR>
    // Set at the top of this script, this colour will
    // only randomise once and stay the same throughout
    // the whole scriptflow run.
    contents = contents.replace(/<CONSTANT_RANDOM_COLOUR>/g, CONSTANT_RANDOM_COLOUR);
    
    // <CONSTANT_CONTRAST_COLOUR>
    // Set at the top of this script, this colour will
    // only randomise once and stay the same throughout
    // the whole scriptflow run.
    // Generated using the <CONSTANT_RANDOM_COLOUR>
    contents = contents.replace(/<CONSTANT_CONTRAST_COLOUR>/g, CONSTANT_CONTRAST_COLOUR);
    
    return contents;
}

// ╭──────────────────────────────────────────────────────────╮
// │                Remove any temporary files                 │
// ╰──────────────────────────────────────────────────────────╯
function cleanup() {
    if (TIDY) {
        try {
            // Clean up temporary config files from /tmp
            const tempFiles = fs.readdirSync(TEMP_FOLDER);
            tempFiles.forEach(file => {
                if (file.startsWith('temp_config_ff')) {
                    fs.unlinkSync(path.join(TEMP_FOLDER, file));
                }
            });
            
            // Clean up intermediate video files from current working directory
            const currentDir = process.cwd();
            const files = fs.readdirSync(currentDir);
            files.forEach(file => {
                const filePath = path.join(currentDir, file);
                // Clean up intermediate video files but keep the final output
                if ((file.endsWith('.mp4') || 
                     file.endsWith('.mov') ||
                     file.endsWith('.avi') ||
                     file.endsWith('.mkv')) &&
                    file !== OUTPUT_FILENAME &&
                    fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 Cleaned up intermediate file: ${file}`);
                }
            });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Run the specific ff_script with correct settings     │
// ╰──────────────────────────────────────────────────────────╯
async function runFfScript(scriptName, scriptConfig, configDirectory) {
    const scriptFile = path.join(TEMP_FOLDER, `temp_config_${scriptName}.json`);
    
    console.log(`\n🚀 Running : ${scriptName} ${new Date().toLocaleString()}`);
    
    // Put config for this script into a new /tmp/temp_config_script.json file
    fs.writeFileSync(scriptFile, scriptConfig);
    
    let actualScriptName = scriptName;
    if (/\d$/.test(scriptName)) {
        actualScriptName = scriptName.slice(0, -1);
    }
    
    // Run script - try JavaScript version first, then fall back to bash
    // Handle different config directory locations
    let jsScriptPath, bashScriptPath;
    
    if (configDirectory.includes('scriptflow_tests')) {
        // Running from scriptflow_tests directory
        jsScriptPath = path.join(configDirectory, '..', '..', '..', '..', 'js', `${actualScriptName}.js`);
        bashScriptPath = path.join(configDirectory, '..', '..', '..', '..', '..', `${actualScriptName}.sh`);
    } else {
        // Running from regular tests directory
        jsScriptPath = path.join(configDirectory, '..', 'js', `${actualScriptName}.js`);
        bashScriptPath = path.join(configDirectory, '..', '..', `${actualScriptName}.sh`);
    }
    
    let scriptPath;
    let args;
    
    if (fs.existsSync(jsScriptPath)) {
        scriptPath = 'node';
        args = [jsScriptPath, '-C', scriptFile];
    } else if (fs.existsSync(bashScriptPath)) {
        scriptPath = 'bash';
        args = [bashScriptPath, '-C', scriptFile];
    } else {
        throw new Error(`Script not found: ${actualScriptName} (checked ${jsScriptPath} and ${bashScriptPath})`);
    }
    
    return new Promise((resolve, reject) => {
        const child = spawn(scriptPath, args, {
            cwd: configDirectory,
            stdio: 'inherit',
            env: {
                ...process.env,
                SCRIPTFLOW_CONFIG_DIR: configDirectory
            }
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │           Loop over each ff_script and run it            │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    // Check if config has been set.
    if (!CONFIG_FILE) {
        console.log("❌ No config file specified. Exiting.");
        process.exit(1);
    }
    
    // Move into the folder of the config.json file.
    // Every folder/file should be relative to that.
    const configDirectory = path.dirname(CONFIG_FILE);
    process.chdir(configDirectory);
    
    const scriptNames = readConfig();
    let lastSuccessfulOutput = null;
    
    // Loop scripts
    for (const ffScript of scriptNames) {
        try {
            // Get contents of the settings to run and trim any null values
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(configData);
            const scriptConfig = config[ffScript];
            
            // Remove null values
            const cleanedConfig = {};
            for (const [key, value] of Object.entries(scriptConfig)) {
                if (value !== null) {
                    cleanedConfig[key] = value;
                }
            }
            
            let scriptContents = JSON.stringify(cleanedConfig, null, 2);
            
            // Do any keyword substitutions
            scriptContents = keywordSubstitutions(scriptContents, configDirectory);
            
            // Run the ff_script
            await runFfScript(ffScript, scriptContents, configDirectory);
            
            // Track the last successful output (apply keyword substitution)
            const outputFilename = cleanedConfig.output || `${ffScript}.mp4`;
            lastSuccessfulOutput = keywordSubstitutions(outputFilename, configDirectory);
        } catch (error) {
            console.error(`Error running script ${ffScript}:`, error.message);
            // Continue with next script instead of throwing
            console.log(`Continuing with next script...`);
        }
    }
    
    // Copy the last successful output
    if (lastSuccessfulOutput) {
        const lastOutputFile = path.join(configDirectory, lastSuccessfulOutput);
        const finalOutputFile = path.join(configDirectory, OUTPUT_FILENAME);
        
        if (fs.existsSync(lastOutputFile)) {
            console.log(`Final: Copying ${path.basename(lastOutputFile)} to ${OUTPUT_FILENAME}`);
            fs.copyFileSync(lastOutputFile, finalOutputFile);
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                        Entry Point                       │
// ╰──────────────────────────────────────────────────────────╯
if (require.main === module) {
    generateColours();
    usage();
    parseArguments();
    
    main().catch(error => {
        console.error('Scriptflow error:', error.message);
        process.exit(1);
    }).finally(() => {
        cleanup();
        // Move back to where you were.
        process.chdir(PWD);
    });
}
