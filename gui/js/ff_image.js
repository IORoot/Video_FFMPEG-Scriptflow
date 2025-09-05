#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │      Create a video from an image for a specific amount of time              │
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
let INPUT_FILENAME = "input.png";
let OUTPUT_FILENAME = "ff_image.mp4";
let LOGLEVEL = "error";
let DURATION = "3";

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
    console.log(" $0 -i <INPUT_IMAGE_FILE> [-d <DURATION>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Create a video from an image.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -d | --duration <SECONDS>");
    console.log("\tTime in seconds of how long the video should be.\n");

    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");

    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");

    process.exit(0);
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

            case '-d':
            case '--duration':
                DURATION = nextArg;
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

            case '--description':
                // IGNORED. used for descriptions in JSON
                i++;
                break;

            case '--help':
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
        if (config.duration) DURATION = config.duration;
        if (config.loglevel) LOGLEVEL = config.loglevel;

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
        if (fs.existsSync(INPUT_FILENAME)) {
            fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
        }
    } catch (error) {
        console.error(`Error copying file: ${error.message}`);
    }
    process.exit(0);
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

    // Check input filename is an image file by checking if ffprobe can read it
    try {
        execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILENAME}"`, { stdio: 'pipe' });
    } catch (error) {
        console.log(`\t❌ Input file: '${INPUT_FILENAME}' not a valid image file. Exiting.`);
        try {
            const output = execSync(`ffprobe "${INPUT_FILENAME}"`, { encoding: 'utf8' });
            console.log(output);
        } catch (e) {
            console.log("ffprobe error");
        }
        exitGracefully();
    }
}

function printFlags() {
    console.log(`⏲️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Duration", DURATION);
    console.log(`📁 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    preFlightChecks();

    printFlags();

    // Build FFMPEG command
    const inputExtension = path.extname(INPUT_FILENAME).toLowerCase();
    const isGif = inputExtension === '.gif';
    
    const ffmpegArgs = [
        '-v', LOGLEVEL
    ];
    
    // Add loop option for different file types
    if (isGif) {
        ffmpegArgs.push('-stream_loop', '-1');
    } else {
        ffmpegArgs.push('-loop', '1');
    }
    
    ffmpegArgs.push(
        '-i', INPUT_FILENAME,
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=29.97',
        '-c:v', 'libx264',
        '-t', DURATION,
        '-pix_fmt', 'yuv420p'
    );

    // Ensure output filename has .mp4 extension if not specified
    let outputWithExt = OUTPUT_FILENAME;
    if (!path.extname(OUTPUT_FILENAME)) {
        outputWithExt = `${OUTPUT_FILENAME}.mp4`;
    }

    ffmpegArgs.push(outputWithExt);

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
            console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
        }
    });

    ffmpeg.on('error', (error) => {
        console.error('Failed to start FFMPEG process:', error.message);
        process.exit(1);
    });
}

// Check if help is requested
if (process.argv.includes('--help')) {
    usage();
}

// Parse arguments and run
arguments();
main();
