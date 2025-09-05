#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                  Transcode multiple files to same format                      │
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
let OUTPUT_FILENAME = "ff_transcode.mp4";
let VIDEO_CODEC = "libx264";
let AUDIO_CODEC = "aac";
let FPS = "30";
let SAR = "1/1";
let GREP = "";
let TARGET_WIDTH = "1920";
let TARGET_HEIGHT = "1080";
let LOGLEVEL = "error";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -o <OUTPUT_FILE> -i <INPUT_FILE> -i <INPUT_FILE> [ -i <INPUT_FILE3>...] [-l loglevel]\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log("\tThe name of the output file. Specify only one.\n");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file or folder.\n");
        
        console.log(" -g | --grep <GREP>");
        console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");
        
        console.log(" -v | --video <VIDEO_CODEC>");
        console.log("\tThe video codec to convert all files to. [default libx264]\n");
        
        console.log(" -a | --audio <AUDIO_CODEC>");
        console.log("\tThe audio codec to convert all files to. [default aac]\n");
        
        console.log(" -f | --fps <FPS>");
        console.log("\tThe Frames Per Second to convert all files to. [default 30]\n");
        
        console.log(" -s | --sar <SAR>");
        console.log("\tThe Sample Aspect Ratio to convert all files to.\n");
        
        console.log(" -w | --width <WIDTH>");
        console.log("\tThe width to convert all files to. [default 1920]\n");
        
        console.log(" -h | --height <HEIGHT>");
        console.log("\tThe height to convert all files to. [default 1080]\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace");
        
        process.exit(1);
    }
}

function setup() {
    // Clean up any existing temp files if needed
    // This function is kept for compatibility but doesn't need to do anything in JS
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
                
            case '-g':
            case '--grep':
                GREP = args[i + 1];
                i += 2;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;
                
            case '-v':
            case '--video':
                VIDEO_CODEC = args[i + 1];
                i += 2;
                break;
                
            case '-a':
            case '--audio':
                AUDIO_CODEC = args[i + 1];
                i += 2;
                break;
                
            case '-f':
            case '--fps':
                FPS = args[i + 1];
                i += 2;
                break;
                
            case '-s':
            case '--sar':
                SAR = args[i + 1];
                i += 2;
                break;
                
            case '-w':
            case '--width':
                TARGET_WIDTH = args[i + 1];
                i += 2;
                break;
                
            case '-h':
            case '--height':
                TARGET_HEIGHT = args[i + 1];
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
// │     Run these checks before you run the main script      │
// ╰──────────────────────────────────────────────────────────╯
function preFlightChecks(inputFile) {
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
// │        Read config-file if supplied. Requires JQ           │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_transcode config
        if (config.ff_transcode) {
            const transcodeConfig = config.ff_transcode;
            
            if (transcodeConfig.input) {
                if (path.isAbsolute(transcodeConfig.input)) {
                    INPUT_FILENAME = transcodeConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), transcodeConfig.input);
                }
            }
            
            if (transcodeConfig.output) OUTPUT_FILENAME = transcodeConfig.output;
            if (transcodeConfig.video) VIDEO_CODEC = transcodeConfig.video;
            if (transcodeConfig.audio) AUDIO_CODEC = transcodeConfig.audio;
            if (transcodeConfig.fps) FPS = transcodeConfig.fps;
            if (transcodeConfig.sar) SAR = transcodeConfig.sar;
            if (transcodeConfig.width) TARGET_WIDTH = transcodeConfig.width;
            if (transcodeConfig.height) TARGET_HEIGHT = transcodeConfig.height;
            if (transcodeConfig.grep) GREP = transcodeConfig.grep;
            if (transcodeConfig.loglevel) LOGLEVEL = transcodeConfig.loglevel;
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
    process.exit(0);
}

// ╭───────────────────────────────────────────────────────╮
// │             Transcode to common filetype               │
// ╰───────────────────────────────────────────────────────╯
function transcodeFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        // Get video dimensions
        const dimensionsProbe = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=s=x:p=0',
            inputFile
        ]);
        
        let dimensions = '';
        
        dimensionsProbe.stdout.on('data', (data) => {
            dimensions += data.toString();
        });
        
        dimensionsProbe.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Failed to get video dimensions'));
                return;
            }
            
            // Parse dimensions
            const [width, height] = dimensions.trim().split('x').map(Number);
            
            // Calculate aspect ratio and scaling
            const scale = `scale=w=min(${TARGET_WIDTH}\\,iw*(${TARGET_HEIGHT}/ih*${SAR})):h=min(${TARGET_HEIGHT}\\,ih*(${TARGET_WIDTH}/iw/${SAR})):force_original_aspect_ratio=decrease`;
            const pad = `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2`;
            
            // Transcode with scaling and padding
            const ffmpegArgs = [
                '-v', LOGLEVEL,
                '-i', inputFile,
                '-vf', `${scale},${pad},setsar=1`,
                '-c:v', VIDEO_CODEC,
                '-c:a', AUDIO_CODEC,
                '-r', FPS,
                outputFile
            ];
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg failed with exit code ${code}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isFile()) {
        await preFlightChecks(INPUT_FILENAME);
        await transcodeFile(INPUT_FILENAME, OUTPUT_FILENAME);
        console.log(`✅ Output : ${OUTPUT_FILENAME}`);
        
    } else if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ext === '.mp4' || ext === '.mov';
            })
            .filter(file => GREP ? file.includes(GREP) : true)
            .map(file => path.join(INPUT_FILENAME, file));
        
        let loop = 0;
        
        for (const inputFile of files) {
            const outputBasename = path.basename(OUTPUT_FILENAME);
            const outputPath = path.dirname(OUTPUT_FILENAME);
            const outputFullPath = path.resolve(outputPath);
            const outputFilePath = path.join(outputFullPath, `${loop}_${outputBasename}`);
            
            await preFlightChecks(inputFile);
            await transcodeFile(inputFile, outputFilePath);
            console.log(`✅ Output : ${outputFilePath}`);
            loop++;
        }
        
    } else {
        console.log(`Input path is neither a file nor a directory: ${INPUT_FILENAME}`);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                        Entry Point                       │
// ╰──────────────────────────────────────────────────────────╯
if (require.main === module) {
    usage();
    setup();
    parseArguments();
    readConfig();
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}
