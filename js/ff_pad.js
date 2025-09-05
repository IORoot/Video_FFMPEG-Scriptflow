#!/usr/bin/env node

/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │             Add padding around the video with a specific colour               │
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
let OUTPUT_FILENAME = "ff_pad.mp4";
let LOGLEVEL = "error";
let WIDTH = "iw";
let HEIGHT = "ih*2";
let XPIXELS = "(ow-iw)/2";
let YPIXELS = "(oh-ih)/2";
let COLOUR = "#fb923c";
let DAR = "16/9";
let GREP = "";

// ╭──────────────────────────────────────────────────────────╮
// │                        Stylesheet                        │
// ╰──────────────────────────────────────────────────────────╯
const styles = {
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
    console.log(" node ff_pad.js -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Create padding around the edges of the video.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -w | --width <WIDTH>");
    console.log("\tWidth of the output video. Default: Same as input video.");
    console.log("\t0 : use the input value.\n");

    console.log(" -h | --height <HEIGHT>");
    console.log("\tHeight of the output video. Default: double input video height.");
    console.log("\t0 : use the input value.\n");

    console.log(" -x | --xpixels <PIXELS>");
    console.log("\tWhere to position the video in the frame on X-Axis from left.\n");

    console.log(" -y | --ypixels <PIXELS>");
    console.log("\tWhere to position the video in the frame on Y-Axis from top.\n");
    console.log("\tThe width, height, x and y parameters also have access to the following variables:");
    console.log("\t- iw : The input video's width.");
    console.log("\t- ih : The input video's height.");
    console.log("\t- ow : The output video's width.");
    console.log("\t- oh : The output video's height.");
    console.log("\tThese can be used to calculate areas of the screen. For example:");
    console.log("\tThe center of the screen on x-axis is 'x=(ow-iw)/2\n");

    console.log(" -c | --colour <COLOUR>");
    console.log("\tColour to use for the padding. See https://ffmpeg.org/ffmpeg-utils.html#color-syntax");
    console.log("\tCan use a word 'Aqua, Beige, Cyan, etc...', the word 'random' or hex code : RRGGBB[AA] \n");

    console.log(" -g | --grep <STRING>");
    console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");

    console.log(" -C | --config <CONFIG_FILE>");
    console.log("\tSupply a config.json file with settings instead of command-line.\n");

    console.log(" -l | --loglevel <LOGLEVEL>");
    console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
    console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");

    console.log("Examples:\n");
    console.log("\tPadding all around the video.");
    console.log("\tnode ff_pad.js -i input.mp4 -h 'ih*2' -w 'iw*2'\n");

    console.log("\tVideo Pad white background.");
    console.log("\tnode ff_pad.js -i input.mp4 -h 'ih*2' -c white\n");

    console.log("\tMake black bars..");
    console.log("\tnode ff_pad.js -i input.mp4 -w iw -h ih+100 -y '(oh-ih)/2' -x '(ow-iw)/2' -c #000000");

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

            case '-w':
            case '--width':
                WIDTH = args[++i];
                break;

            case '-h':
            case '--height':
                HEIGHT = args[++i];
                break;

            case '-x':
            case '--xpixels':
                XPIXELS = args[++i];
                break;

            case '-y':
            case '--ypixels':
                YPIXELS = args[++i];
                break;

            case '-c':
            case '--colour':
                COLOUR = args[++i];
                break;

            case '-C':
            case '--config':
                readConfig(args[++i]);
                break;

            case '-g':
            case '--grep':
                GREP = args[++i];
                break;

            case '-l':
            case '--loglevel':
                LOGLEVEL = args[++i];
                break;

            case '--description':
                // IGNORED. used for descriptions in JSON
                i++;
                break;

            case '--help':
                usage();
                break;

            default:
                if (args[i].startsWith('-')) {
                    console.log(`Unknown option ${args[i]}`);
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
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        // Apply config values
        if (config.input) INPUT_FILENAME = path.resolve(config.input);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.width) WIDTH = config.width;
        if (config.height) HEIGHT = config.height;
        if (config.xpixels) XPIXELS = config.xpixels;
        if (config.ypixels) YPIXELS = config.ypixels;
        if (config.colour) COLOUR = config.colour;
        if (config.loglevel) LOGLEVEL = config.loglevel;
        if (config.grep) GREP = config.grep;
        
    } catch (error) {
        console.log("Error reading config file:", error.message);
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
    } catch (error) {
        console.log("Error copying file:", error.message);
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
            console.log("\t❌ ffprobe not found. Please install ffmpeg. Exiting.");
            process.exit(1);
        });
    });
}

function printFlags() {
    console.log(`📏 ${styles.TEXT_GREEN_400}Width      :${styles.TEXT_RESET} ${WIDTH}`);
    console.log(`📐 ${styles.TEXT_GREEN_400}Height     :${styles.TEXT_RESET} ${HEIGHT}`);
    console.log(`⏩ ${styles.TEXT_GREEN_400}XPixels    :${styles.TEXT_RESET} ${XPIXELS}`);
    console.log(`⏫ ${styles.TEXT_GREEN_400}YPixels    :${styles.TEXT_RESET} ${YPIXELS}`);
    console.log(`🌈 ${styles.TEXT_GREEN_400}Colour     :${styles.TEXT_RESET} ${COLOUR}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    printFlags();

    const stats = fs.statSync(INPUT_FILENAME);

    if (stats.isFile()) {
        await preFlightChecks(INPUT_FILENAME);

        const ffmpegArgs = [
            '-y',
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `pad=width=${WIDTH}:height=${HEIGHT}:x=${XPIXELS}:y=${YPIXELS}:color=${COLOUR}`,
            OUTPUT_FILENAME
        ];

        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        ffmpeg.stderr.on('data', (data) => {
            console.log(data.toString());
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${styles.TEXT_PURPLE_500}Output     :${styles.TEXT_RESET} ${OUTPUT_FILENAME}`);
            } else {
                console.log(`❌ FFmpeg process exited with code ${code}`);
            }
        });

        ffmpeg.on('error', (error) => {
            console.log("\t❌ ffmpeg not found. Please install ffmpeg. Exiting.");
            process.exit(1);
        });
    }

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
            const ffmpegArgs = [
                '-y',
                '-v', LOGLEVEL,
                '-i', inputFile,
                '-vf', `pad=width=${WIDTH}:height=${HEIGHT}:x=${XPIXELS}:y=${YPIXELS}:color=${COLOUR}`,
                outputFile
            ];

            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            ffmpeg.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${styles.TEXT_PURPLE_500}Output     :${styles.TEXT_RESET} ${outputFile}`);
                } else {
                    console.log(`❌ FFmpeg process exited with code ${code}`);
                }
            });

            ffmpeg.on('error', (error) => {
                console.log("\t❌ ffmpeg not found. Please install ffmpeg. Exiting.");
                process.exit(1);
            });
        }
    }
}

// Check if help is requested
if (process.argv.includes('-h') || process.argv.includes('--help')) {
    usage();
}

parseArguments();
main().catch(console.error);
