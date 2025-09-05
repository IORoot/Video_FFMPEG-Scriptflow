#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                       Blur video with a Gaussian blur                        │
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
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_blur.mp4";
let STRENGTH = "0.5";
let STEPS = "1";
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
    console.log(" $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Simple version of unsharp mask.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -s | --strength <AMOUNT>");
    console.log("\tSet horizontal sigma, standard deviation of Gaussian blur (strength). The default value is 0.5.\n");

    console.log(" -t | --steps <AMOUNT>");
    console.log("\tSet the number of times to apply blur. Default value is 1.\n");

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

            case '-s':
            case '--strength':
                STRENGTH = nextArg;
                i++;
                break;

            case '-t':
            case '--steps':
                STEPS = nextArg;
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
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.strength) STRENGTH = config.strength;
        if (config.steps) STEPS = config.steps;
        if (config.grep) GREP = config.grep;
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
    console.log(`💪 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Strength", STRENGTH);
    console.log(`🪜  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Steps", STEPS);
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

        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `gblur=sigma=${STRENGTH}:steps=${STEPS}`,
            '-c:a', 'copy',
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
                '-vf', `gblur=sigma=${STRENGTH}:steps=${STEPS}`,
                '-c:a', 'copy',
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

// Check if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
}

// Parse arguments and run
arguments();
main();
