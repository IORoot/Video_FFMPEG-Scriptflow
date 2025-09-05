#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │        Converts the video, ready for various social platforms                │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯


if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "";
let OUTPUT_FILENAME = "ff_social_media.mp4";
let LOGLEVEL = "error";
let INSTAGRAM = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> [-ig] [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Convert ready for Social Media (pix_fmt=yuv420p)\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -ig | --instagram");
        console.log("\tConvert ready for Instagram.\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");
        
        process.exit(0);
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
                
            case '-ig':
            case '--instagram':
                INSTAGRAM = "true";
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
                
            case '-h':
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
        
        // Extract ff_social_media config
        if (config.ff_social_media) {
            const socialMediaConfig = config.ff_social_media;
            
            if (socialMediaConfig.input) {
                // Handle relative paths from config file location
                if (path.isAbsolute(socialMediaConfig.input)) {
                    INPUT_FILENAME = socialMediaConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), socialMediaConfig.input);
                }
            }
            if (socialMediaConfig.output) OUTPUT_FILENAME = socialMediaConfig.output;
            if (socialMediaConfig.instagram) INSTAGRAM = socialMediaConfig.instagram;
            if (socialMediaConfig.loglevel) LOGLEVEL = socialMediaConfig.loglevel;
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
    console.log(`🤳 Instagram : ${INSTAGRAM}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    await preFlightChecks();
    
    printFlags();
    
    if (INSTAGRAM) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-v', LOGLEVEL,
                '-i', INPUT_FILENAME,
                '-pix_fmt', 'yuv420p',
                OUTPUT_FILENAME
            ]);
            
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
    } else {
        // If no Instagram flag, just copy the input to output
        try {
            fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
            console.log(`✅ Output : ${OUTPUT_FILENAME}`);
        } catch (error) {
            console.error('Error copying file:', error.message);
            throw error;
        }
    }
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
