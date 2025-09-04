#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │          Overlay an audio track at specific time on the video                 │
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
let AUDIO_FILENAME = "";
let OUTPUT_FILENAME = "ff_audio.mp4";
let LOGLEVEL = "error";
let START = "0";
let SPEED = "1.0";
let SHORTEST = "";
let REMOVE = false;

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
    console.log(" $0 -i <INPUT_FILE> -a <AUDIO_FILE> [-S <START>] [-p <SPEED>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Overlay an audio file on the video.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -a | --audio <INPUT_FILE>");
    console.log("\tThe name of an audio file.\n");

    console.log(" -r | --remove");
    console.log("\tRemove the audio.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -s | --start <SECONDS>");
    console.log("\tStart time in seconds of when to play audio.\n");

    console.log(" -p | --speed <SPEED>");
    console.log("\tPlayback speed of the audio.\n");

    console.log(" -h | --shortest");
    console.log("\tUse shortest duration between video and audio.\n");

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

            case '-a':
            case '--audio':
                AUDIO_FILENAME = path.resolve(nextArg);
                i++;
                break;

            case '-o':
            case '--output':
                OUTPUT_FILENAME = nextArg;
                i++;
                break;

            case '-r':
            case '--remove':
                REMOVE = true;
                break;

            case '-s':
            case '--start':
                START = nextArg;
                i++;
                break;

            case '-p':
            case '--speed':
                SPEED = nextArg;
                i++;
                break;

            case '-h':
            case '--shortest':
                SHORTEST = "-shortest";
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
        if (config.audio) AUDIO_FILENAME = path.resolve(config.audio);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.start) START = config.start;
        if (config.speed) SPEED = config.speed;
        if (config.remove) REMOVE = config.remove;
        if (config.shortest) SHORTEST = "-shortest";
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
    process.exit(1);
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
    try {
        execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILENAME}"`, { stdio: 'pipe' });
    } catch (error) {
        console.log(`\t❌ Input file: '${INPUT_FILENAME}' not a movie file. Exiting.`);
        try {
            const output = execSync(`ffprobe "${INPUT_FILENAME}"`, { encoding: 'utf8' });
            console.log(output);
        } catch (e) {
            console.log("ffprobe error");
        }
        exitGracefully();
    }

    // Skip AUDIO FILE Checks if audio remove is selected.
    if (REMOVE) {
        return;
    }

    // Check audio filename has been set.
    if (!AUDIO_FILENAME) {
        console.log("\t❌ No audio file specified. Exiting.");
        exitGracefully();
    }

    // Check audio file exists.
    if (!fs.existsSync(AUDIO_FILENAME)) {
        console.log("\t❌ Audio file not found. Exiting.");
        exitGracefully();
    }
}

function printFlags() {
    console.log(`🔊 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Overlay", AUDIO_FILENAME);
    console.log(`🏁 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Start", START);
    console.log(`🏎️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Speed", SPEED);
    console.log(`🐜  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Shortest", SHORTEST);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    preFlightChecks();

    // If this is just a REMOVE AUDIO, skip everything else.
    if (REMOVE) {
        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-an',
            '-c:v', 'copy',
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

        return;
    }

    printFlags();

    const ffmpegArgs = [
        '-v', LOGLEVEL,
        '-i', INPUT_FILENAME,
        '-itsoffset', START,
        '-i', AUDIO_FILENAME,
        '-filter_complex', `[1:a]atempo=${SPEED}[aud]`,
        '-map', '0:v:0',
        '-map', '[aud]',
        '-c:v', 'copy'
    ];

    if (SHORTEST) {
        ffmpegArgs.push(SHORTEST);
    }

    ffmpegArgs.push(OUTPUT_FILENAME);

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

// Check if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
}

// Parse arguments and run
arguments();
main();
