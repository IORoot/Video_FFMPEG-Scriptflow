#!/usr/bin/env node

/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                    Sharpen a video using the unsharp mask                    │
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
let OUTPUT_FILENAME = "ff_sharpen.mp4";
let PIXEL = "5.0";      // 3 and 23
let SHARPEN = "1.0";   // -2.0 and 5.0
let LOGLEVEL = "error";
let GREP = "";
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
    console.log(`ℹ️ Usage: node ff_sharpen.js -i <INPUT_FILE> [-p <PIXEL>] [-s <SHARPEN>] [-o <OUTPUT_FILE>] [-l loglevel] [-g <GREP>] [-C <CONFIG_FILE>]\n`);
    
    console.log("Summary:");
    console.log("Simple version of unsharp mask.\n");
    
    console.log("Flags:");
    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");
    
    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");
    
    console.log(" -p | --pixel <AMOUNT>");
    console.log("\tBoth the X and Y matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n");
    
    console.log(" -s | --sharpen <AMOUNT>");
    console.log("\tSet the sharpen strength. It must be a floating point number. -2.0 to 5.0. Default value is 1.0.");
    console.log("\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n");
    
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
                
            case '-p':
            case '--pixel':
                PIXEL = args[++i];
                break;
                
            case '-s':
            case '--sharpen':
                SHARPEN = args[++i];
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
        
        // Handle nested structure (e.g., {"ff_sharpen": {...}})
        let config = configData;
        if (Object.keys(configData).length === 1 && typeof configData[Object.keys(configData)[0]] === 'object') {
            config = configData[Object.keys(configData)[0]];
        }
        
        // Apply config values
        if (config.input) INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), config.input);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.pixel) PIXEL = config.pixel;
        if (config.sharpen) SHARPEN = config.sharpen;
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
    
    // Validate pixel value
    const pixelNum = parseFloat(PIXEL);
    if (isNaN(pixelNum) || pixelNum < 3 || pixelNum > 23 || pixelNum % 2 === 0) {
        console.log(`\t❌ Invalid pixel value: '${PIXEL}'. Must be an odd integer between 3 and 23. Exiting.`);
        exitGracefully();
    }
    
    // Validate sharpen value
    const sharpenNum = parseFloat(SHARPEN);
    if (isNaN(sharpenNum) || sharpenNum < -2.0 || sharpenNum > 5.0) {
        console.log(`\t❌ Invalid sharpen value: '${SHARPEN}'. Must be between -2.0 and 5.0. Exiting.`);
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
    console.log(`🔳 ${styles.green}Pixel${styles.reset} : ${PIXEL}`);
    console.log(`🗡️  ${styles.green}Sharpen${styles.reset} : ${SHARPEN}`);
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
            '-vf', `unsharp=${PIXEL}:${PIXEL}:${SHARPEN}`,
            '-c:a', 'copy',
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
                '-vf', `unsharp=${PIXEL}:${PIXEL}:${SHARPEN}`,
                '-c:a', 'copy',
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
