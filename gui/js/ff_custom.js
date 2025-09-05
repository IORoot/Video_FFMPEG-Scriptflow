#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                           Custom FFMPEG Processing                           │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

const DEBUG = process.env.DEBUG === '1';

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "";
let OUTPUT_FILENAME = "ff_custom.mp4";
let FFMPEG_PARAMS = "";
let DESCRIPTION = "Custom FFMPEG processing";
let LOGLEVEL = "error";
let GREP = "";

// ╭──────────────────────────────────────────────────────────╮
// │                        Colors                            │
// ╰──────────────────────────────────────────────────────────╯
const colors = {
    TEXT_GREEN_400: "\x1b[38;2;74;222;128m",
    TEXT_ORANGE_500: "\x1b[38;2;249;115;22m",
    TEXT_RED_400: "\x1b[38;2;248;113;113m",
    TEXT_BLUE_600: "\x1b[38;2;37;99;235m",
    TEXT_YELLOW_500: "\x1b[38;2;234;179;8m",
    TEXT_PURPLE_500: "\x1b[38;2;168;85;247m",
    TEXT_RESET: "\x1b[39m"
};

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯
function usage() {
    console.log("ℹ️ Usage:");
    console.log(" $0 -i <INPUT_FILE> -p <FFMPEG_PARAMS> [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Custom FFMPEG processing with user-defined parameters.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -p | --params <FFMPEG_PARAMS>");
    console.log("\tFFMPEG parameters string (required).");
    console.log("\tExample: \"-c:v libx264 -c:a aac -strict experimental\"");
    console.log("\tExample: \"-vf \\\"drawtext=text='hello':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2\\\" -c:v libx264\"\n");

    console.log(" -d | --description <DESCRIPTION>");
    console.log("\tDescription of the operation.\n");

    console.log(" -g | --grep <STRING>");
    console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");

    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");

    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");

    console.log("Examples:");
    console.log(" $0 -i input.mov -p \"-c:v libx264 -c:a aac -strict experimental\"");
    console.log(" $0 -i input.mov -p \"-vf \\\"drawtext=text='hello':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2\\\" -c:v libx264\"");
    console.log(" $0 -C config.json");

    process.exit(1);
}

// ╭──────────────────────────────────────────────────────────╮
// │         Take the arguments from the command line         │
// ╰──────────────────────────────────────────────────────────╯
function arguments() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '-i':
            case '--input':
                INPUT_FILENAME = path.resolve(nextArg);
                i++;
                break;

            case '-o':
            case '--output':
                OUTPUT_FILENAME = nextArg;
                i++;
                break;

            case '-p':
            case '--params':
                FFMPEG_PARAMS = nextArg;
                i++;
                break;

            case '-d':
            case '--description':
                DESCRIPTION = nextArg;
                i++;
                break;

            case '-g':
            case '--grep':
                GREP = nextArg;
                i++;
                break;

            case '-C':
            case '--config':
                readConfig(nextArg);
                i++;
                break;

            case '-l':
            case '--loglevel':
                LOGLEVEL = nextArg;
                i++;
                break;

            case '--help':
            case '-h':
                usage();
                break;

            default:
                if (arg.startsWith('-')) {
                    console.error(`Unknown option ${arg}`);
                    process.exit(1);
                }
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │         Read config-file if supplied.                   │
// ╰──────────────────────────────────────────────────────────╯
function readConfig(configFile) {
    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);

        // Apply config values
        if (config.input) INPUT_FILENAME = path.resolve(config.input);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.params) FFMPEG_PARAMS = config.params;
        if (config.description) DESCRIPTION = config.description;
        if (config.grep) GREP = config.grep;
        if (config.loglevel) LOGLEVEL = config.loglevel;

    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                    Parse FFMPEG Parameters               │
// ╰──────────────────────────────────────────────────────────╯
function parseFFMPEGParams(paramsString) {
    const params = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < paramsString.length; i++) {
        const char = paramsString[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
            continue;
        }
        
        if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = '';
            continue;
        }
        
        if (char === ' ' && !inQuotes) {
            if (current.trim()) {
                params.push(current.trim());
                current = '';
            }
            continue;
        }
        
        current += char;
    }
    
    if (current.trim()) {
        params.push(current.trim());
    }
    
    return params.filter(param => param !== '');
}

// ╭──────────────────────────────────────────────────────────╮
// │   Exit the app by just skipping the ffmpeg processing.   │
// │            Then copy the input to the output.            │
// ╰──────────────────────────────────────────────────────────╯
function exitGracefully() {
    try {
        if (fs.existsSync(INPUT_FILENAME)) {
            fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
        }
    } catch (error) {
        console.error(`Error copying file: ${error.message}`);
    }
    process.exit(1);
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

    // Check FFMPEG parameters are provided
    if (!FFMPEG_PARAMS) {
        console.log("\t❌ FFMPEG parameters are required. Exiting.");
        exitGracefully();
    }

    // Check input filename is a movie file.
    try {
        execSync(`ffprobe "${inputFile}"`, { stdio: 'pipe' });
    } catch (error) {
        console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
        try {
            const output = execSync(`ffprobe "${inputFile}"`, { encoding: 'utf8' });
            console.log(output);
        } catch (e) {
            console.log("ffprobe error");
        }
        exitGracefully();
    }
}

function printFlags() {
    // Ensure output filename has .mp4 extension if not specified
    let outputWithExt = OUTPUT_FILENAME;
    if (!path.extname(OUTPUT_FILENAME)) {
        outputWithExt = `${OUTPUT_FILENAME}.mp4`;
    }
    
    console.log(`📥  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Input", INPUT_FILENAME);
    console.log(`📤  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
    console.log(`🔧  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Description", DESCRIPTION);
    console.log(`⚙️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Parameters", FFMPEG_PARAMS);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    printFlags();

    // If this is a file
    if (fs.statSync(INPUT_FILENAME).isFile()) {
        preFlightChecks(INPUT_FILENAME);

        // Parse FFMPEG parameters into array, handling quoted strings properly
        const paramsArray = parseFFMPEGParams(FFMPEG_PARAMS);

        // Ensure output filename has .mp4 extension if not specified
        let outputWithExt = OUTPUT_FILENAME;
        if (!path.extname(OUTPUT_FILENAME)) {
            outputWithExt = `${OUTPUT_FILENAME}.mp4`;
        }

        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            ...paramsArray,
            outputWithExt
        ];

        if (DEBUG) {
            console.log('FFMPEG command:', 'ffmpeg', ffmpegArgs.join(' '));
        }

        const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        ffmpeg.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                console.error('FFMPEG process exited with code:', code);
                console.error('stderr:', stderr);
                process.exit(code);
            } else {
                // Ensure output filename has .mp4 extension if not specified
                let outputWithExt = OUTPUT_FILENAME;
                if (!path.extname(OUTPUT_FILENAME)) {
                    outputWithExt = `${OUTPUT_FILENAME}.mp4`;
                }
                console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
            }
        });

        ffmpeg.on('error', (error) => {
            console.error('Failed to start FFMPEG process:', error.message);
            process.exit(1);
        });
    }

    // If this is a directory
    if (fs.statSync(INPUT_FILENAME).isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return (ext === '.mp4' || ext === '.mov' || ext === '.avi' || ext === '.mkv' || ext === '.webm') && 
                       (!GREP || new RegExp(GREP).test(file));
            });

        files.forEach((file, index) => {
            const inputFile = path.join(INPUT_FILENAME, file);
            const basename = path.basename(file, path.extname(file));
            const outputFile = `${basename}_${OUTPUT_FILENAME}`;

            preFlightChecks(inputFile);

            // Parse FFMPEG parameters into array, handling quoted strings properly
            const paramsArray = parseFFMPEGParams(FFMPEG_PARAMS);

            // Ensure output filename has .mp4 extension if not specified
            let outputWithExt = outputFile;
            if (!path.extname(outputFile)) {
                outputWithExt = `${outputFile}.mp4`;
            }

            const ffmpegArgs = [
                '-v', LOGLEVEL,
                '-i', inputFile,
                ...paramsArray,
                outputWithExt
            ];

            if (DEBUG) {
                console.log('FFMPEG command:', 'ffmpeg', ffmpegArgs.join(' '));
            }

            const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ffmpeg.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    console.error('FFMPEG process exited with code:', code);
                    console.error('stderr:', stderr);
                    process.exit(code);
                } else {
                    // Ensure output filename has .mp4 extension if not specified
                    let outputWithExt = outputFile;
                    if (!path.extname(outputFile)) {
                        outputWithExt = `${outputFile}.mp4`;
                    }
                    console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('Failed to start FFMPEG process:', error.message);
                process.exit(1);
            });
        });
    }
}

// Check if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
}

// Parse arguments and run
arguments();
main();
