#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                        Change the video Aspect Ratio                         │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

// Enable debug mode if DEBUG=1
const DEBUG = process.env.DEBUG === '1';

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_aspect_ratio.mp4";
let ASPECT_RATIO = "1:1";
let LOGLEVEL = "error";
let GREP = "";
let CONFIG_FILE = null;

// ╭──────────────────────────────────────────────────────────╮
// │                        Stylesheet                        │
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
    console.log(" node ff_aspect_ratio.js -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-a <ASPECT_RATIO>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("This will alter the container metadata (DAR) of the video to the new aspect ratio.\n");

    console.log("Flags:");
    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -a | --aspect <ASPECTRATIO>");
    console.log("\tTarget aspect ratio should be expressed as X:Y");
    console.log("\tDefault is 1:1\n");

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

            case '-a':
            case '--aspect':
                ASPECT_RATIO = args[i + 1];
                i += 2;
                break;

            case '-l':
            case '--loglevel':
                LOGLEVEL = args[i + 1];
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

            case '--description':
                // IGNORED. used for descriptions in JSON
                i += 2;
                break;

            case '-h':
            case '--help':
                usage();
                break;

            default:
                if (arg.startsWith('-')) {
                    console.error(`Unknown option ${arg}`);
                    process.exit(1);
                }
                i++;
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │   Exit the app by just skipping the ffmpeg processing.   │
// │            Then copy the input to the output.            │
// ╰──────────────────────────────────────────────────────────╯
function exitGracefully() {
    if (INPUT_FILENAME && fs.existsSync(INPUT_FILENAME)) {
        fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
    }
    process.exit(0);
}

// ╭──────────────────────────────────────────────────────────╮
// │        Read config-file if supplied. Requires JQ         │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    if (!CONFIG_FILE) return;

    try {
        const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        
        // Convert config to command line arguments
        for (const [key, value] of Object.entries(configData)) {
            if (value !== null && value !== undefined) {
                switch (key) {
                    case 'input':
                        INPUT_FILENAME = path.resolve(value);
                        break;
                    case 'output':
                        OUTPUT_FILENAME = value;
                        break;
                    case 'aspect':
                        ASPECT_RATIO = value;
                        break;
                    case 'loglevel':
                        LOGLEVEL = value;
                        break;
                    case 'grep':
                        GREP = value;
                        break;
                }
            }
        }
    } catch (error) {
        console.error("Error reading config file:", error.message);
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
    console.log(`1️⃣  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Input", INPUT_FILENAME);
    console.log(`🆚 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Ratio", ASPECT_RATIO);
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

        // This only changes the container file metadata (Display Aspect Ratio (DAR)) 
        // and does NOT transcode the video file.
        // see https://superuser.com/questions/907933/correct-aspect-ratio-without-re-encoding-video-file
        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-aspect', ASPECT_RATIO,
            OUTPUT_FILENAME
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
                console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
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
                return (ext === '.mp4' || ext === '.mov') && 
                       (!GREP || new RegExp(GREP).test(file));
            });

        files.forEach((file, index) => {
            const inputFile = path.join(INPUT_FILENAME, file);
            const outputFile = `${index}_${OUTPUT_FILENAME}`;
            
            preFlightChecks(inputFile);
            
            const ffmpegArgs = [
                '-v', LOGLEVEL,
                '-i', inputFile,
                '-aspect', ASPECT_RATIO,
                outputFile
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
                    console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputFile);
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('Failed to start FFMPEG process:', error.message);
                process.exit(1);
            });
        });
    }
}

// Main execution
if (process.argv.length < 3) {
    usage();
}

parseArguments();
readConfig();
main();
