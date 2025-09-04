#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                      Apply a 3DL LUT file to the video.                      │
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
let OUTPUT_FILENAME = "ff_lut.mp4";
let LUT = "../../lib/luts/Andromeda.cube";
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
    console.log(" $0 -i <INPUT_FILE> -t <LUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Apply a 3DL/Cube Look-Up Table (LUT) file to a video.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -t | --lut <LUT_FILE>");
    console.log("\tThe Look-Up-Table (LUT) should be in a 3DL/Cube format.");
    console.log(`\tDefault ${LUT}.\n`);

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

            case '-t':
            case '--lut':
                LUT = path.resolve(nextArg);
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
        if (config.lut) LUT = path.resolve(config.lut);
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

    // Check lut filename has been set.
    if (!LUT) {
        console.log("\t❌ No LUT file specified. Exiting.");
        exitGracefully();
    }

    // Check lut file exists.
    if (!fs.existsSync(LUT)) {
        console.log(`\t❌ LUT file not found: ${LUT}. Exiting.`);
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
    console.log(`🌈 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Lut", LUT);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    printFlags();

    // If this is a file
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isFile()) {
        console.log('Processing file:', INPUT_FILENAME);
        preFlightChecks(INPUT_FILENAME);

        // Ensure output filename has .mp4 extension if not specified
        let outputWithExt = OUTPUT_FILENAME;
        if (!path.extname(OUTPUT_FILENAME)) {
            outputWithExt = `${OUTPUT_FILENAME}.mp4`;
        }

        // Convert LUT path to be relative to the root directory
        let lutPath = LUT;
        if (path.isAbsolute(LUT)) {
            // If it's an absolute path, make it relative to the root
            const rootDir = path.resolve('../../');
            lutPath = path.relative(rootDir, LUT);
        } else {
            // If it's already relative, check if it starts with ../
            if (lutPath.startsWith('../../')) {
                // Remove the first ../../ to make it relative to root
                lutPath = lutPath.replace(/^\.\.\/\.\.\//, '');
            } else if (lutPath.startsWith('../')) {
                // Remove the first ../ to make it relative to root
                lutPath = lutPath.replace(/^\.\.\//, '');
            } else {
                // If it's already relative, adjust it for the root directory
                lutPath = path.join('..', '..', LUT);
            }
        }

        const ffmpegArgs = [
            '-y',
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `lut3d=${lutPath}`,
            '-shortest',
            outputWithExt
        ];

        if (DEBUG) {
            console.log('FFMPEG command:', 'ffmpeg', ffmpegArgs.join(' '));
            console.log('Current working directory:', process.cwd());
        }

        const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.resolve('../../')
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

    // If this is a directory
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => /\.(mp4|mov)$/i.test(file))
            .filter(file => !GREP || file.includes(GREP))
            .map(file => path.join(INPUT_FILENAME, file));

        files.forEach((inputFile, index) => {
            preFlightChecks(inputFile);

            const outputFile = `${index}_${OUTPUT_FILENAME}`;
            let outputWithExt = outputFile;
            if (!path.extname(outputFile)) {
                outputWithExt = `${outputFile}.mp4`;
            }

            const ffmpegArgs = [
                '-y',
                '-v', LOGLEVEL,
                '-i', inputFile,
                '-vf', `lut3d="${LUT}"`,
                '-shortest',
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
if (process.argv.includes('--help')) {
    usage();
}

// Parse arguments and run
arguments();
main();
