#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │             Create thumbnails representative of the video                    │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

// https://ottverse.com/change-resolution-resize-scale-video-using-ffmpeg/

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
let OUTPUT_FILENAME = "ff_thumbnail.png";
let COUNT = "3";
let SAMPLE = "300";
let LOGLEVEL = "error";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Create thumbnails representative of the video.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output image file.\n");
        
        console.log(" -c | --count <COUNT>");
        console.log("\tThe number of thumbnails to create. The default value is 1.");
        console.log("\tUses a batch sample size of 300 frames. If there are less frames than the count, you will get less thumbnails.");
        
        console.log(" -s | --sample <SAMPLE>");
        console.log("\tThe batch sample size. The default value is 300.");
        console.log("\tSize of the number of frames to analyse to create a thumbnail from. Each thumbnail will use the next batch.");
        
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
                INPUT_FILENAME = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;
                
            case '-c':
            case '--count':
                COUNT = args[i + 1];
                i += 2;
                break;
                
            case '-s':
            case '--sample':
                SAMPLE = args[i + 1];
                i += 2;
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
        
        // Extract ff_thumbnail config
        if (config.ff_thumbnail) {
            const thumbnailConfig = config.ff_thumbnail;
            
            if (thumbnailConfig.input) {
                if (path.isAbsolute(thumbnailConfig.input)) {
                    INPUT_FILENAME = thumbnailConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), thumbnailConfig.input);
                }
            }
            
            if (thumbnailConfig.output) OUTPUT_FILENAME = thumbnailConfig.output;
            if (thumbnailConfig.count) COUNT = thumbnailConfig.count;
            if (thumbnailConfig.sample) SAMPLE = thumbnailConfig.sample;
            if (thumbnailConfig.loglevel) LOGLEVEL = thumbnailConfig.loglevel;
        }
    } catch (error) {
        console.error("Error reading config file:", error.message);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │   Exit the app by just skipping the ffmpeg processing.   │
// │            Then copy the input to the output.            │
// ╰──────────────────────────────────────────────────────────╯
function exitGracefully() {
    try {
        fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
        process.exit(0);
    } catch (error) {
        console.error("Error copying file:", error.message);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Run these checks before you run the main script      │
// ╰──────────────────────────────────────────────────────────╯
function preFlightChecks() {
    // Check input filename has been set.
    if (!INPUT_FILENAME) {
        console.log("\t❌ No input file specified. Exiting.");
        exitGracefully();
    }
    
    // Check input file exists.
    if (!fs.existsSync(INPUT_FILENAME)) {
        console.log("\t❌ Input file not found. Exiting.");
        exitGracefully();
    }
    
    // Check input filename is a movie file.
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name',
            '-print_format', 'csv=p=0',
            INPUT_FILENAME
        ]);
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log(`\t❌ Input file: '${INPUT_FILENAME}' not a movie file. Exiting.`);
                // Run ffprobe to show error details
                const errorProbe = spawn('ffprobe', [INPUT_FILENAME]);
                errorProbe.on('close', () => {
                    exitGracefully();
                });
            } else {
                resolve();
            }
        });
    });
}

function printFlags() {
    console.log(`🧮 Count : ${COUNT}`);
    console.log(`🧪 Sample : ${SAMPLE}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    await preFlightChecks();
    
    printFlags();
    
    // Parse output filename to extract directory, filename, and extension
    const DIRECTORY = path.dirname(OUTPUT_FILENAME);
    const FILENAME = path.basename(OUTPUT_FILENAME, path.extname(OUTPUT_FILENAME));
    const EXTENSION = path.extname(OUTPUT_FILENAME).substring(1); // Remove the dot
    
    const outputPattern = path.join(DIRECTORY, `${FILENAME}-%02d.${EXTENSION}`);
    
    return new Promise((resolve, reject) => {
        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `thumbnail=${SAMPLE}`,
            '-frames:v', COUNT,
            '-vsync', 'vfr',
            outputPattern
        ];
        
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${outputPattern}`);
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
