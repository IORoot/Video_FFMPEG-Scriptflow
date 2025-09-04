#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │            Append two files together with a re-encoding of codecs            │
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
let OUTPUT_FILENAME = "ff_append.mp4";
let LOGLEVEL = "error";
let FIRST_FILENAME = null;
let SECOND_FILENAME = null;
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
    console.log(" node ff_append.js -f <INPUT_FILE> -s <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("This will append two files together while re-encoding them to be the same codec.\n");

    console.log("Flags:");
    console.log(" -f | --first <FIRST_INPUT_FILE>");
    console.log("\tThe name of the first input file.\n");

    console.log(" -s | --second <SECOND_INPUT_FILE>");
    console.log("\tThe name of the second input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

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
            case '-f':
            case '--first':
                FIRST_FILENAME = path.resolve(args[i + 1]);
                i += 2;
                break;

            case '-s':
            case '--second':
                SECOND_FILENAME = path.resolve(args[i + 1]);
                i += 2;
                break;

            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;

            case '-l':
            case '--loglevel':
                LOGLEVEL = args[i + 1];
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
    if (FIRST_FILENAME && fs.existsSync(FIRST_FILENAME)) {
        fs.copyFileSync(FIRST_FILENAME, OUTPUT_FILENAME);
    }
    process.exit(1);
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
                    case 'first':
                        FIRST_FILENAME = path.resolve(value);
                        break;
                    case 'second':
                        SECOND_FILENAME = path.resolve(value);
                        break;
                    case 'output':
                        OUTPUT_FILENAME = value;
                        break;
                    case 'loglevel':
                        LOGLEVEL = value;
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
function preFlightChecks() {
    // Check input filename has been set.
    if (!FIRST_FILENAME) {
        console.log("\t❌ No first file specified. Exiting.");
        exitGracefully();
    }
    if (!SECOND_FILENAME) {
        console.log("\t❌ No second file specified. Exiting.");
        exitGracefully();
    }

    // Check input file exists.
    if (!fs.existsSync(FIRST_FILENAME)) {
        console.log("\t❌ First file not found. Exiting.");
        exitGracefully();
    }

    if (!fs.existsSync(SECOND_FILENAME)) {
        console.log("\t❌ Second file not found. Exiting.");
        exitGracefully();
    }

    // Check first input filename is a movie file.
    try {
        execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FIRST_FILENAME}"`, { stdio: 'pipe' });
    } catch (error) {
        console.log(`\t❌ First Input file: '${FIRST_FILENAME}' not a movie file. Exiting.`);
        try {
            const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FIRST_FILENAME}"`, { encoding: 'utf8' });
            console.log(output);
        } catch (e) {
            console.log("ffprobe error");
        }
        exitGracefully();
    }

    // Check second input filename is a movie file.
    try {
        execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${SECOND_FILENAME}"`, { stdio: 'pipe' });
    } catch (error) {
        console.log(`\t❌ Second Input file: '${SECOND_FILENAME}' not a movie file. Exiting.`);
        try {
            const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${SECOND_FILENAME}"`, { encoding: 'utf8' });
            console.log(output);
        } catch (e) {
            console.log("ffprobe error");
        }
        exitGracefully();
    }
}

function printFlags() {
    console.log(`1️⃣  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "FileOne", FIRST_FILENAME);
    console.log(`2️⃣  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "FileTwo", SECOND_FILENAME);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    preFlightChecks();
    printFlags();

    // FFMPEG command explanation:
    // -i ${FILE0}                   input file1 as index 0
    // -i ${FILE1}                   input file1 as index 1
    // -filter_complex               run filters
    // [0:v]                         use input 0's (v)ideo
    // [0:a]                         use input 0's (a)udio
    // [1:v]                         use input 1's (v)ideo
    // [1:a]                         use input 1's (a)udio
    //
    // concat=n=2                    concatenate with number of segments (2)
    // :v=1:a=1                      specify the number of video & audio streams (from 0) (default 1)
    //
    // [v]                           set ouput of filter-complex video as variable [v]
    // [a]                           set ouput of filter-complex audio as variable [a]
    //
    // -map "[v]"                    map variable [v] to output
    // -map "[a]"                    map variable [a] to output

    const ffmpegArgs = [
        '-v', LOGLEVEL,
        '-i', FIRST_FILENAME,
        '-i', SECOND_FILENAME,
        '-filter_complex', '[0:v] [0:a] [1:v] [1:a] concat=n=2:v=1:a=1 [v] [a]',
        '-map', '[v]',
        '-map', '[a]',
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

// Main execution
if (process.argv.length < 3) {
    usage();
}

parseArguments();
readConfig();
main();
