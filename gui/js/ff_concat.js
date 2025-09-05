#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │                     Concatenate multiple files together                       │
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
let OUTPUT_FILENAME = "ff_concat.mp4";
let TMP_FILE = path.join(require('os').tmpdir(), "tmp_ffmpeg_concat_list.txt");
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
    console.log(" $0 -o <OUTPUT_FILE> -i <INPUT_FILE> -i <INPUT_FILE> [ -i <INPUT_FILE3>...] [-l loglevel]\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log("\tThe name of the output file. Specify only one.\n");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file or folder. Specify as many as you wish.\n");

    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");

    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");

    process.exit(1);
}

function setup() {
    // delete any existing temp file.
    if (fs.existsSync(TMP_FILE)) {
        fs.unlinkSync(TMP_FILE);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │         Take the arguments from the command line         │
// ╰──────────────────────────────────────────────────────────╯
function arguments() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        // Check for input arguments (allowing input1, input2, etc.)
        if (arg.startsWith('-i') || arg.startsWith('--input')) {
            writeToTemp(nextArg);
            i++;
            continue;
        }

        switch (arg) {
            case '-o':
            case '--output':
                OUTPUT_FILENAME = nextArg;
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
// │     Write the absolute path into the temporary file      │
// ╰──────────────────────────────────────────────────────────╯
function writeToTemp(filePath) {
    // If this is a file
    if (fs.statSync(filePath).isFile()) {
        // get absolute path of file.
        const realPath = path.resolve(filePath);

        // print to screen
        console.log(`📥 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Input", realPath);

        // check files
        preFlightChecks(filePath);
        
        // print line into temp file.
        fs.appendFileSync(TMP_FILE, `file '${realPath}'\n`);
    }

    // if this a folder
    if (fs.statSync(filePath).isDirectory()) {
        const files = fs.readdirSync(filePath)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return (ext === '.mp4' || ext === '.mov') && 
                       (!GREP || new RegExp(GREP).test(file));
            })
            .sort();

        files.forEach(file => {
            const fullFilePath = path.join(filePath, file);
            preFlightChecks(fullFilePath);
            const absolutePath = path.resolve(fullFilePath);
            fs.appendFileSync(TMP_FILE, `file '${absolutePath}'\n`);
        });
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │        Read config-file if supplied.                   │
// ╰──────────────────────────────────────────────────────────╯
function readConfig(configFile) {
    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);

        // Apply config values
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.loglevel) LOGLEVEL = config.loglevel;
        if (config.grep) GREP = config.grep;

        // Handle input files (can be array or single value)
        if (config.input) {
            if (Array.isArray(config.input)) {
                config.input.forEach(input => writeToTemp(input));
            } else {
                writeToTemp(config.input);
            }
        }

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
    process.exit(0);
}

// ╭──────────────────────────────────────────────────────────╮
// │     Run these checks before you run the main script      │
// ╰──────────────────────────────────────────────────────────╯
function preFlightChecks(inputFile) {
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

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
// ╭──────────────────────────────────────────────────────────╮
// │          Run FFMPEG against the temporary file            │
// ╰──────────────────────────────────────────────────────────╯
function main() {
    // Check if temp file exists and has content
    if (!fs.existsSync(TMP_FILE) || fs.statSync(TMP_FILE).size === 0) {
        console.log("❌ No input files specified or temp file is empty. Exiting.");
        process.exit(1);
    }

    // -v error      : Only show errors
    // -f concat     : use filter 'concat'
    // -safe         : enable safe mode 0 (possible values: -1 0 1)
    // -i file        : input file
    // -c copy       : codec to use is 'copy' original.
    // file           : output filename
    const ffmpegArgs = [
        '-v', LOGLEVEL,
        '-f', 'concat',
        '-safe', '0',
        '-i', TMP_FILE,
        '-c', 'copy',
        OUTPUT_FILENAME
    ];

    if (DEBUG) {
        console.log('FFMPEG command:', 'ffmpeg', ffmpegArgs.join(' '));
        console.log('Temp file contents:');
        console.log(fs.readFileSync(TMP_FILE, 'utf8'));
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
        // cleanup
        if (fs.existsSync(TMP_FILE)) {
            fs.unlinkSync(TMP_FILE);
        }

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
setup();
arguments();
main();
