#!/usr/bin/env node

/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │             Change the scale (physical dimensions) of the video              │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_scale.mp4";
let WIDTH = "1920";
let HEIGHT = "1080";
let LOGLEVEL = "error";
let GREP = "";
let DAR = "16/9";
let SAR = "1/1";
let CONFIG_FILE = null;

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
    console.log(`ℹ️ Usage: node ff_scale.js -i <INPUT_FILE> [-w <WIDTH>] [-h <HEIGHT>] [-o <OUTPUT_FILE>] [-l loglevel] [-g <GREP>] [-C <CONFIG_FILE>]\n`);
    
    console.log("Summary:");
    console.log("Change the scale (Width/Height) of a video.\n");
    
    console.log("Flags:");
    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file. Default: input.mp4\n");
    
    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");
    
    console.log(" -w | --width <PIXELS>");
    console.log("\tThe width of the video. The default value is 1920.");
    console.log("\t-1 : keep aspect ratio.\n");
    console.log("\t-n : aspect ratio a multiple of n. (-2 is even numbers)");
    console.log("\tiw : input width.");
    console.log("\tih : input height.");
    console.log("\tiw*.5 : input width divided by 0.5 (half width).\n");
    
    console.log(" -h | --height <PIXELS>");
    console.log("\tThe height of the video. The default value is 1080.");
    console.log("\t-1 : keep aspect ratio.\n");
    console.log("\t-n : aspect ratio a multiple of n.");
    console.log("\tiw : input width.");
    console.log("\tih : input height.");
    console.log("\tih*.5 : input height divided by 0.5 (half height).\n");
    
    console.log(" -d | --dar <DAR>");
    console.log("\tSet the DAR. (Display Aspect Ratio - dimensions of a pixel) Default is 16/9.\n");
    
    console.log(" -s | --sar <SAR>");
    console.log("\tSet the SAR. (Sample Aspect Ratio - dimensions of the image) Default is 1/1.\n");
    
    console.log(" -g | --grep <STRING>");
    console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");
    
    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");
    
    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace");
    
    process.exit(1);
}

// ╭──────────────────────────────────────────────────────────╮
// │         Take the arguments from the command line         │
// ╰──────────────────────────────────────────────────────────╯
function parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-i':
            case '--input':
                INPUT_FILENAME = path.resolve(args[++i]);
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[++i];
                break;
                
            case '-w':
            case '--width':
                WIDTH = args[++i];
                break;
                
            case '-h':
            case '--height':
                HEIGHT = args[++i];
                break;
                
            case '-d':
            case '--dar':
                DAR = args[++i];
                break;
                
            case '-s':
            case '--sar':
                SAR = args[++i];
                break;
                
            case '-l':
            case '--loglevel':
                LOGLEVEL = args[++i];
                break;
                
            case '-g':
            case '--grep':
                GREP = args[++i];
                break;
                
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
    if (!CONFIG_FILE) return;
    
    try {
        const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        
        // Handle nested structure (e.g., {"ff_scale": {...}})
        let config = configData;
        if (Object.keys(configData).length === 1 && typeof configData[Object.keys(configData)[0]] === 'object') {
            config = configData[Object.keys(configData)[0]];
        }
        
        // Apply config values
        if (config.input) {
            if (process.env.SCRIPTFLOW_CONFIG_DIR) {
                INPUT_FILENAME = path.resolve(process.env.SCRIPTFLOW_CONFIG_DIR, config.input);
            } else {
                INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), config.input);
            }
        }
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.width) WIDTH = config.width;
        if (config.height) HEIGHT = config.height;
        if (config.dar) DAR = config.dar;
        if (config.sar) SAR = config.sar;
        if (config.loglevel) LOGLEVEL = config.loglevel;
        if (config.grep) GREP = config.grep;
        
    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
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
        console.log(`✅ Copied ${INPUT_FILENAME} to ${OUTPUT_FILENAME}`);
    } catch (error) {
        console.error(`Error copying file: ${error.message}`);
    }
    process.exit(0);
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
    
    // Check input filename is a movie file using ffprobe
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [inputFile]);
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
                exitGracefully();
            }
        });
        
        ffprobe.on('error', (error) => {
            console.error(`Error running ffprobe: ${error.message}`);
            exitGracefully();
        });
    });
}

function printFlags() {
    console.log(`📐 ${styles.green}Width${styles.reset} : ${WIDTH}`);
    console.log(`📐 ${styles.green}Height${styles.reset} : ${HEIGHT}`);
    console.log(`📺 ${styles.green}SAR${styles.reset} : ${SAR}`);
    console.log(`🖥️  ${styles.green}DAR${styles.reset} : ${DAR}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    printFlags();
    
    const stats = fs.statSync(INPUT_FILENAME);
    
    // If this is a file
    if (stats.isFile()) {
        await preFlightChecks(INPUT_FILENAME);
        
        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2,setdar=${DAR},setsar=${SAR}`,
            OUTPUT_FILENAME
        ]);
        
        ffmpeg.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        
        ffmpeg.stderr.on('data', (data) => {
            console.log(data.toString());
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${styles.purple}Output${styles.reset} : ${OUTPUT_FILENAME}`);
            } else {
                console.error(`FFmpeg process exited with code ${code}`);
            }
        });
        
        ffmpeg.on('error', (error) => {
            console.error(`Error running FFmpeg: ${error.message}`);
        });
    }
    
    // If this is a directory
    if (stats.isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return (ext === '.mp4' || ext === '.mov') && 
                       (GREP === '' || file.includes(GREP));
            });
        
        for (let i = 0; i < files.length; i++) {
            const inputFile = path.join(INPUT_FILENAME, files[i]);
            await preFlightChecks(inputFile);
            
            const outputFile = `${i}_${OUTPUT_FILENAME}`;
            
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-v', LOGLEVEL,
                '-i', inputFile,
                '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2,setdar=${DAR},setsar=${SAR}`,
                outputFile
            ]);
            
            ffmpeg.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            
            ffmpeg.stderr.on('data', (data) => {
                console.log(data.toString());
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${styles.purple}Output${styles.reset} : ${outputFile}`);
                } else {
                    console.error(`FFmpeg process exited with code ${code}`);
                }
            });
            
            ffmpeg.on('error', (error) => {
                console.error(`Error running FFmpeg: ${error.message}`);
            });
        }
    }
}

// Check if help is requested or no arguments provided
if (process.argv.length < 3 || process.argv.includes('--help')) {
    usage();
}

parseArguments();
readConfig();
main();
