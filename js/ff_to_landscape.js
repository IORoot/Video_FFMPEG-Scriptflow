#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │             Determine video orientation and rotate to landscape              │
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
let OUTPUT_FILENAME = "ff_to_landscape.mp4";
let ROTATE = "2";
let LOGLEVEL = "error";
let GREP = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE/FOLDER> -o <OUTPUT_FILE> [-r ROTATION] [-l loglevel]\n");
        
        console.log(" -i | --input <INPUT_FILE / FOLDER>");
        console.log("\tThe name of an input file or folder (for batch processing).\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -r | --rotate <ROTATION>");
        console.log("\t0 = 90CounterCLockwise and Vertical Flip");
        console.log("\t1 = 90Clockwise");
        console.log("\t2 = 90CounterClockwise (default)");
        console.log("\t3 = 90Clockwise and Vertical Flip\n");
        
        console.log(" -g | --grep <STRING>");
        console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");
        
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
                
            case '-r':
            case '--rotate':
                ROTATE = args[i + 1];
                i += 2;
                break;
                
            case '-g':
            case '--grep':
                GREP = args[i + 1];
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
// │        Read config-file if supplied. Requires JQ         │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_to_landscape config
        if (config.ff_to_landscape) {
            const landscapeConfig = config.ff_to_landscape;
            
            if (landscapeConfig.input) {
                if (path.isAbsolute(landscapeConfig.input)) {
                    INPUT_FILENAME = landscapeConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), landscapeConfig.input);
                }
            }
            
            if (landscapeConfig.output) OUTPUT_FILENAME = landscapeConfig.output;
            if (landscapeConfig.rotate) ROTATE = landscapeConfig.rotate;
            if (landscapeConfig.grep) GREP = landscapeConfig.grep;
            if (landscapeConfig.loglevel) LOGLEVEL = landscapeConfig.loglevel;
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
function preFlightChecks(inputFile) {
    // Check input filename has been set.
    if (!inputFile) {
        console.log("\t❌ No input file specified. Exiting.");
        exitGracefully();
    }
    
    // Check input file exists.
    if (!fs.existsSync(inputFile)) {
        console.log("\t❌ Input file not found. Exiting.");
        exitGracefully();
    }
    
    // Check input filename is a movie file.
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [inputFile]);
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
                // Run ffprobe to show error details
                const errorProbe = spawn('ffprobe', [inputFile]);
                errorProbe.on('close', () => {
                    exitGracefully();
                });
            } else {
                resolve();
            }
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │           Step 1. Detect orientation of video.           │
// ╰──────────────────────────────────────────────────────────╯
function detectOrientation(inputFile) {
    return new Promise((resolve, reject) => {
        const widthProbe = spawn('ffprobe', [
            '-v', LOGLEVEL,
            '-select_streams', 'v',
            '-show_entries', 'stream=width',
            '-of', 'csv=p=0',
            inputFile
        ]);
        
        const heightProbe = spawn('ffprobe', [
            '-v', LOGLEVEL,
            '-select_streams', 'v',
            '-show_entries', 'stream=height',
            '-of', 'csv=p=0',
            inputFile
        ]);
        
        let width = '';
        let height = '';
        
        widthProbe.stdout.on('data', (data) => {
            width += data.toString();
        });
        
        heightProbe.stdout.on('data', (data) => {
            height += data.toString();
        });
        
        Promise.all([
            new Promise((resolve) => widthProbe.on('close', resolve)),
            new Promise((resolve) => heightProbe.on('close', resolve))
        ]).then(() => {
            // Parse width and height (take first value if multiple streams)
            const parsedWidth = parseInt(width.split('\n')[0].split(',')[0]);
            const parsedHeight = parseInt(height.split('\n')[0].split(',')[0]);
            
            resolve({ width: parsedWidth, height: parsedHeight });
        }).catch(reject);
    });
}

function printFlags() {
    console.log(`🛞  Rotate : ${ROTATE}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    printFlags();
    
    // If this is a file
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isFile()) {
        await preFlightChecks(INPUT_FILENAME);
        
        const { width, height } = await detectOrientation(INPUT_FILENAME);
        
        if (width > height) {
            console.log(`❌ ${INPUT_FILENAME} Already landscape (${width}x${height})`);
            exitGracefully();
        }
        
        return new Promise((resolve, reject) => {
            const ffmpegArgs = ['-y', '-v', LOGLEVEL, '-i', INPUT_FILENAME, '-vf', `transpose=${ROTATE}`, OUTPUT_FILENAME];
            
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
    
    // If this is a directory
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ext === '.mp4' || ext === '.mov';
            })
            .filter(file => GREP ? file.includes(GREP) : true)
            .map(file => path.join(INPUT_FILENAME, file));
        
        let loop = 0;
        
        for (const file of files) {
            await preFlightChecks(file);
            
            const { width, height } = await detectOrientation(file);
            
            if (width > height) {
                console.log(`❌ ${file} Already landscape (${width}x${height})`);
                fs.copyFileSync(file, `${loop}_${OUTPUT_FILENAME}`);
                loop++;
                continue;
            }
            
            await new Promise((resolve, reject) => {
                const ffmpegArgs = ['-y', '-v', LOGLEVEL, '-i', file, '-vf', `transpose=${ROTATE}`, `${loop}_${OUTPUT_FILENAME}`];
                
                const ffmpeg = spawn('ffmpeg', ffmpegArgs);
                
                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ ${loop}_${OUTPUT_FILENAME}`);
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg failed with exit code ${code}`));
                    }
                });
                
                ffmpeg.on('error', (error) => {
                    reject(error);
                });
            });
            
            loop++;
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
