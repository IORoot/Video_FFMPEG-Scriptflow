#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Sharpen a video using the unsharp mask                    │
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
let OUTPUT_FILENAME = "ff_unsharp.mp4";
let LX = "5";          // odd numbers only. 3 to 23
let LY = "5";          // odd numbers only. 3 to 23
let LA = "1.0";        // -1.5 and 1.5
let CX = "5";          // odd numbers only. 3 to 23
let CY = "5";          // odd numbers only. 3 to 23
let CA = "0.0";        // -1.5 and 1.5
let AX = "5";          // odd numbers only. 3 to 23
let AY = "5";          // odd numbers only. 3 to 23
let AA = "0.0";        // -1.5 and 1.5
let LOGLEVEL = "error";
let GREP = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> -t <LUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Uses an unsharp mask to alter the luma,chroma and alpha of a video.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -lx | --luma_x <SIZE>");
        console.log("\tSet the luma matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -ly | --luma_y <SIZE>");
        console.log("\tSet the luma matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -la | --luma_amount <AMOUNT>");
        console.log("\tSet the luma effect strength. It must be a floating point number. -2.0 to 5.0. Default value is 1.0.");
        console.log("\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n");
        
        console.log(" -cx | --chroma_x <SIZE>");
        console.log("\tSet the chroma matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -cy | --chroma_y <SIZE>");
        console.log("\tSet the chroma matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -ca | --chroma_amount <AMOUNT>");
        console.log("\tSet the chroma effect strength. It must be a floating point number. Default value is 0.0.");
        console.log("\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n");
        
        console.log(" -ax | --alpha_x <SIZE>");
        console.log("\tSet the alpha matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -ay | --alpha_y <SIZE>");
        console.log("\tSet the alpha matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n");
        
        console.log(" -aa | --alpha_amount <AMOUNT>");
        console.log("\tSet the alpha effect strength. It must be a floating point number. Default value is 0.0.");
        console.log("\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n");
        
        console.log("\tAll parameters are optional and default to the equivalent of the string '5:5:1.0:5:5:0.0'.\n");
        
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
                
            case '-lx':
            case '--luma_x':
                LX = args[i + 1];
                i += 2;
                break;
                
            case '-ly':
            case '--luma_y':
                LY = args[i + 1];
                i += 2;
                break;
                
            case '-la':
            case '--luma_amount':
                LA = args[i + 1];
                i += 2;
                break;
                
            case '-cx':
            case '--chroma_x':
                CX = args[i + 1];
                i += 2;
                break;
                
            case '-cy':
            case '--chroma_y':
                CY = args[i + 1];
                i += 2;
                break;
                
            case '-ca':
            case '--chroma_amount':
                CA = args[i + 1];
                i += 2;
                break;
                
            case '-ax':
            case '--alpha_x':
                AX = args[i + 1];
                i += 2;
                break;
                
            case '-ay':
            case '--alpha_y':
                AY = args[i + 1];
                i += 2;
                break;
                
            case '-aa':
            case '--alpha_amount':
                AA = args[i + 1];
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
        
        // Extract ff_unsharp config
        let unsharpConfig;
        if (config.ff_unsharp) {
            unsharpConfig = config.ff_unsharp;
        } else {
            // Direct config (from scriptflow)
            unsharpConfig = config;
        }
            
        if (unsharpConfig.input) {
            if (path.isAbsolute(unsharpConfig.input)) {
                INPUT_FILENAME = unsharpConfig.input;
            } else {
                if (process.env.SCRIPTFLOW_CONFIG_DIR) {
                    INPUT_FILENAME = path.resolve(process.env.SCRIPTFLOW_CONFIG_DIR, unsharpConfig.input);
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), unsharpConfig.input);
                }
            }
        }
        
        if (unsharpConfig.output) OUTPUT_FILENAME = unsharpConfig.output;
        if (unsharpConfig.lx) LX = unsharpConfig.lx;
        if (unsharpConfig.ly) LY = unsharpConfig.ly;
        if (unsharpConfig.la) LA = unsharpConfig.la;
        if (unsharpConfig.cx) CX = unsharpConfig.cx;
        if (unsharpConfig.cy) CY = unsharpConfig.cy;
        if (unsharpConfig.ca) CA = unsharpConfig.ca;
        if (unsharpConfig.ax) AX = unsharpConfig.ax;
        if (unsharpConfig.ay) AY = unsharpConfig.ay;
        if (unsharpConfig.aa) AA = unsharpConfig.aa;
        if (unsharpConfig.grep) GREP = unsharpConfig.grep;
        if (unsharpConfig.loglevel) LOGLEVEL = unsharpConfig.loglevel;
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

function printFlags() {
    console.log(`💡 lumaX : ${LX}`);
    console.log(`💡 lumaY : ${LY}`);
    console.log(`💡 lumaAMT : ${LA}`);
    console.log(`🎨 chromaX : ${CX}`);
    console.log(`🎨 chromaY : ${CY}`);
    console.log(`🎨 chromaAMT : ${CA}`);
    console.log(`🔲 alphaX : ${AX}`);
    console.log(`🔲 alphaY : ${AY}`);
    console.log(`🔲 alphaAMT : ${AA}`);
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
        
        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-y',
                '-v', LOGLEVEL,
                '-i', INPUT_FILENAME,
                '-vf', `unsharp=${LX}:${LY}:${LA}:${CX}:${CY}:${CA}:${AX}:${AY}:${AA}`,
                '-c:a', 'copy',
                OUTPUT_FILENAME
            ];
            
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
            
            await new Promise((resolve, reject) => {
                const ffmpegArgs = [
                    '-y',
                    '-v', LOGLEVEL,
                    '-i', file,
                    '-vf', `unsharp=${LX}:${LY}:${LA}:${CX}:${CY}:${CA}:${AX}:${AY}:${AA}`,
                    '-c:a', 'copy',
                    `${loop}_${OUTPUT_FILENAME}`
                ];
                
                const ffmpeg = spawn('ffmpeg', ffmpegArgs);
                
                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ Output : ${loop}_${OUTPUT_FILENAME}`);
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
