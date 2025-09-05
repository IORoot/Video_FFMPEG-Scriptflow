#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │              Overlay a video at specific time on the video                    │
// │              Allows for transparent videos and animations                    │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_overlay.mp4";
let RESIZED_OVERLAY = "ff_resized_overlay.mp4";
let OVERLAY = "";
let LOGLEVEL = "error";
let START = "0";
let END = "3";
let FIT = false;
let GREP = "";
let DEBUG = process.env.DEBUG === '1';

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
    console.log(" $0 -i <INPUT_FILE> -v <OVERLAY_FILE> [-S <START>] [-E <END>] [-x <PIXELS>] [-y <PIXELS>] [-s <SCALE>] [-a <ALPHA>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Overlay a watermark on the video.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -v | --overlay <OVERLAY_FILE>");
    console.log("\tNote that you CAN use videos as the overlay.");
    console.log("\tImage/Video to use for the overlay.\n");

    console.log(" -S | --start <SECONDS>");
    console.log("\tStart time in seconds of when to show overlay.\n");

    console.log(" -E | --end <SECONDS>");
    console.log("\tEnd time in seconds of when to show overlay.\n");

    console.log(" -f | --fit");
    console.log("\tScale the overlay to fit the input video.\n");

    console.log(" -g | --grep <STRING>");
    console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");

    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");

    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");

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

            case '-v':
            case '--overlay':
                OVERLAY = path.resolve(nextArg);
                i++;
                break;

            case '-S':
            case '--start':
                START = nextArg;
                i++;
                break;

            case '-E':
            case '--end':
                END = nextArg;
                i++;
                break;

            case '-f':
            case '--fit':
                FIT = true;
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

            case '--description':
                // IGNORED. used for descriptions in JSON
                i++;
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
// │        Read config-file if supplied. Requires JQ         │
// ╰──────────────────────────────────────────────────────────╯
function readConfig(configFile) {
    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);

        // Map JSON keys to command line arguments
        if (config.input) INPUT_FILENAME = path.resolve(config.input);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.overlay) OVERLAY = path.resolve(config.overlay);
        if (config.start) START = config.start;
        if (config.end) END = config.end;
        if (config.fit) FIT = config.fit;
        if (config.grep) GREP = config.grep;
        if (config.loglevel) LOGLEVEL = config.loglevel;

    } catch (error) {
        console.error('Error reading config file:', error.message);
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
        console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
    } catch (error) {
        console.error('Error copying file:', error.message);
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

    // Check input filename is a movie file.
    try {
        execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${inputFile}"`, { stdio: 'pipe' });
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
    console.log(`📑 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Overlay", OVERLAY);
    console.log(`🏁 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Start", START);
    console.log(`🎬 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "End", END);
}

async function resizeOverlayToFit() {
    try {
        // Get video info
        const videoInfo = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,sample_aspect_ratio,codec_name -of default=noprint_wrappers=1:nokey=1 "${INPUT_FILENAME}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        }).trim().split('\n');

        const width = videoInfo[1];
        const height = videoInfo[2];

        console.log(`📏 Resizing overlay to fit: ${width}x${height}`);

        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', OVERLAY,
            '-vf', `scale=${width}:${height}`,
            '-y',
            RESIZED_OVERLAY
        ];

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

        // Wait for FFMPEG to complete
        await new Promise((resolve, reject) => {
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    console.error('FFMPEG process exited with code:', code);
                    console.error('stderr:', stderr);
                    reject(new Error(`FFMPEG process exited with code: ${code}`));
                } else {
                    console.log('✅ Overlay resized successfully');
                    resolve();
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('Failed to start FFMPEG process:', error.message);
                reject(error);
            });
        });

        // Switch to use the new resized version
        OVERLAY = RESIZED_OVERLAY;

    } catch (error) {
        console.error('Error resizing overlay:', error.message);
        throw error;
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    preFlightChecks(INPUT_FILENAME);

    if (!OVERLAY) {
        console.log("❌ No overlay file specified. Exiting.");
        exitGracefully();
    }

    if (FIT) {
        await resizeOverlayToFit();
    }

    printFlags();

    // Ensure output filename has .mp4 extension if not specified
    let outputWithExt = OUTPUT_FILENAME;
    if (!path.extname(OUTPUT_FILENAME)) {
        outputWithExt = `${OUTPUT_FILENAME}.mp4`;
    }

    const ffmpegArgs = [
        '-v', LOGLEVEL,
        '-i', INPUT_FILENAME,
        '-i', OVERLAY,
        '-filter_complex', `[1:v]setpts=PTS-STARTPTS+${START}/TB[ovr];[0:v][ovr]overlay=enable='between(t,${START},${END})'`,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        '-y',
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

    // Wait for FFMPEG to complete
    await new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                console.error('FFMPEG process exited with code:', code);
                console.error('stderr:', stderr);
                reject(new Error(`FFMPEG process exited with code: ${code}`));
            } else {
                console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
                resolve();
            }
        });

        ffmpeg.on('error', (error) => {
            console.error('Failed to start FFMPEG process:', error.message);
            reject(error);
        });
    });

    // Clean up temporary resized overlay if it was created
    if (FIT && fs.existsSync(RESIZED_OVERLAY)) {
        fs.unlinkSync(RESIZED_OVERLAY);
    }
}

// Parse arguments and run
arguments();
main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
