#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                       Create a stack or grid of videos                       │
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
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_stack.mp4";
let VERTICAL = '';
let HORIZONTAL = '';
let GRID = '';
let TMP_FILE = "/tmp/tmp_ffmpeg_stack_list.txt";
let LOGLEVEL = "error";
let CONFIG_FILE = "";
let inputFiles = [];

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -v -h -g -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Stack or grid multiple videos together. Videos have to be same dimensions.\n");
        
        console.log("Flags:");
        
        console.log(" -v | --vertical");
        console.log("\tCreates a vertical stack of 2 inputs, one video on top of the other.\n");
        
        console.log(" -h | --horizontal");
        console.log("\tCreates a horizontal stack of 2 inputs, one video next to the other.\n");
        
        console.log(" -g | --grid");
        console.log("\tCreates a 2x2 stack of four input videos.\n");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of any input files.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace");
        
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
            case '-i':
            case '--input':
            case '--input1':
            case '--input2':
            case '--input3':
            case '--input4':
                writeToTemp(args[i + 1]);
                i += 2;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;
                
            case '-v':
            case '--vertical':
                VERTICAL = "TRUE";
                i += 1;
                break;
                
            case '-h':
            case '--horizontal':
                HORIZONTAL = "TRUE";
                i += 1;
                break;
                
            case '-g':
            case '--grid':
                GRID = "TRUE";
                i += 1;
                break;
                
            case '-C':
            case '--config':
                CONFIG_FILE = args[i + 1];
                i += 2;
                break;
                
            case '-l':
            case '--loglevel':
                LOGLEVEL = args[i + 1];
                i += 2;
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
// │         Read config-file if supplied. Requires JQ          │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_stack config
        if (config.ff_stack) {
            const stackConfig = config.ff_stack;
            
            if (stackConfig.input) {
                // Handle single input or array of inputs
                if (Array.isArray(stackConfig.input)) {
                    stackConfig.input.forEach(input => {
                        if (path.isAbsolute(input)) {
                            writeToTemp(input);
                        } else {
                            writeToTemp(path.resolve(path.dirname(CONFIG_FILE), input));
                        }
                    });
                } else {
                    if (path.isAbsolute(stackConfig.input)) {
                        writeToTemp(stackConfig.input);
                    } else {
                        writeToTemp(path.resolve(path.dirname(CONFIG_FILE), stackConfig.input));
                    }
                }
            }
            
            if (stackConfig.input1) writeToTemp(path.resolve(path.dirname(CONFIG_FILE), stackConfig.input1));
            if (stackConfig.input2) writeToTemp(path.resolve(path.dirname(CONFIG_FILE), stackConfig.input2));
            if (stackConfig.input3) writeToTemp(path.resolve(path.dirname(CONFIG_FILE), stackConfig.input3));
            if (stackConfig.input4) writeToTemp(path.resolve(path.dirname(CONFIG_FILE), stackConfig.input4));
            
            if (stackConfig.output) OUTPUT_FILENAME = stackConfig.output;
            if (stackConfig.vertical) VERTICAL = stackConfig.vertical;
            if (stackConfig.horizontal) HORIZONTAL = stackConfig.horizontal;
            if (stackConfig.grid) GRID = stackConfig.grid;
            if (stackConfig.loglevel) LOGLEVEL = stackConfig.loglevel;
        }
    } catch (error) {
        console.error("Error reading config file:", error.message);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Write the absolute path into the temporary file      │
// ╰──────────────────────────────────────────────────────────╯
function writeToTemp(file) {
    if (!file) return;
    
    // Exclude folders
    try {
        const stats = fs.statSync(file);
        if (stats.isDirectory()) {
            return;
        }
    } catch (error) {
        // File doesn't exist, skip
        return;
    }
    
    // Get absolute path of file
    const realPath = path.resolve(file);
    
    // Add to input files array
    inputFiles.push(realPath);
}

// ╭──────────────────────────────────────────────────────────╮
// │   Exit the app by just skipping the ffmpeg processing.   │
// │            Then copy the input to the output.            │
// ╰──────────────────────────────────────────────────────────╯
function exitGracefully() {
    if (inputFiles.length > 0) {
        try {
            fs.copyFileSync(inputFiles[0], OUTPUT_FILENAME);
            process.exit(0);
        } catch (error) {
            console.error("Error copying file:", error.message);
            process.exit(1);
        }
    }
    process.exit(0);
}

function printFlags() {
    console.log(`📐 Vertical : ${VERTICAL}`);
    console.log(`📐 Horizontal : ${HORIZONTAL}`);
    console.log(`#️⃣  Grid : ${GRID}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    if (inputFiles.length === 0) {
        console.log("❌ No inputs specified. Exiting.");
        exitGracefully();
    }
    
    printFlags();
    
    const numberOfInputs = inputFiles.length;
    
    if (VERTICAL === "TRUE") {
        if (numberOfInputs < 2) {
            console.log(`❌ Not enough inputs, need 2, got ${numberOfInputs}. exiting.`);
            exitGracefully();
        }
        
        return new Promise((resolve, reject) => {
            const ffmpegArgs = ['-y', '-v', LOGLEVEL];
            
            // Add input files
            for (const inputFile of inputFiles.slice(0, 2)) {
                ffmpegArgs.push('-i', inputFile);
            }
            
            ffmpegArgs.push('-filter_complex', 'vstack=inputs=2', OUTPUT_FILENAME);
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Output : ${OUTPUT_FILENAME}`);
                    resolve();
                } else {
                    console.error(`FFmpeg failed with exit code ${code}`);
                    reject(new Error(`FFmpeg failed with exit code ${code}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                console.error('FFmpeg error:', error);
                reject(error);
            });
        });
    }
    
    if (HORIZONTAL === "TRUE") {
        if (numberOfInputs < 2) {
            console.log(`❌ Not enough inputs, need 2, got ${numberOfInputs}. exiting.`);
            exitGracefully();
        }
        
        return new Promise((resolve, reject) => {
            const ffmpegArgs = ['-y', '-v', LOGLEVEL];
            
            // Add input files
            for (const inputFile of inputFiles.slice(0, 2)) {
                ffmpegArgs.push('-i', inputFile);
            }
            
            ffmpegArgs.push('-filter_complex', 'hstack=inputs=2', OUTPUT_FILENAME);
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Output : ${OUTPUT_FILENAME}`);
                    resolve();
                } else {
                    console.error(`FFmpeg failed with exit code ${code}`);
                    reject(new Error(`FFmpeg failed with exit code ${code}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                console.error('FFmpeg error:', error);
                reject(error);
            });
        });
    }
    
    if (GRID === "TRUE") {
        if (numberOfInputs < 4) {
            console.log(`❌ Not enough inputs, need 4, got ${numberOfInputs}. exiting.`);
            exitGracefully();
        }
        
        return new Promise((resolve, reject) => {
            const ffmpegArgs = ['-y', '-v', LOGLEVEL];
            
            // Add input files
            for (const inputFile of inputFiles.slice(0, 4)) {
                ffmpegArgs.push('-i', inputFile);
            }
            
            ffmpegArgs.push('-filter_complex', '[0:v][1:v][2:v][3:v]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]', '-map', '[v]', OUTPUT_FILENAME);
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Output : ${OUTPUT_FILENAME}`);
                    resolve();
                } else {
                    console.error(`FFmpeg failed with exit code ${code}`);
                    reject(new Error(`FFmpeg failed with exit code ${code}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                console.error('FFmpeg error:', error);
                reject(error);
            });
        });
    }
    
    console.log(`✅ Output : ${OUTPUT_FILENAME}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                        Entry Point                       │
// ╰──────────────────────────────────────────────────────────╯
if (require.main === module) {
    usage();
    parseArguments();
    readConfig();
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}
