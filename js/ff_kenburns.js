#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────╮
 * │                                                                          │░
 * │        Create a Ken-burns effect with an image to generate video         │░
 * │                                                                          │░
 * ╰░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
let OUTPUT_FILENAME = "ff_kenburns.mp4";
let LOGLEVEL = "error";
let FPS = "30";
let DURATION = "5";
let ZOOM_SPEED = "0.0005";
let BITRATE = "5000k";
let TARGET = "TopLeft";
let GREP = "";
let WIDTH = null;
let HEIGHT = null;

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
    console.log(" $0 -i <INPUT_FILE> [SETTINGS] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("This will generate a video from an image with a ken-burns effect.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_STRING>");
    console.log("\tThe name of the single file or folder.\n");

    console.log(" -g | --grep <GREP_STRING>");
    console.log("\tIf an input folder is provided, filter input files with grep.\n");

    console.log(" -t | --target <TARGET>");
    console.log("\tThe target of the zoom.");
    console.log("\tTopLeft    | TopRight.");
    console.log("\tBottomLeft | BottomRight.");
    console.log("\tRandom\n");

    console.log(" -f | --fps <FPS>");
    console.log(`\tDefault is ${FPS}`);
    console.log("\tThe Output Frames Per Second.\n");

    console.log(" -w | --width <PIXELS>");
    console.log("\tThe output width.\n");

    console.log(" -h | --height <PIXELS>");
    console.log("\tThe output height.\n");

    console.log(" -d | --duration <SECS>");
    console.log(`\tDefault is ${DURATION}`);
    console.log("\tThe output duration in seconds.\n");

    console.log(" -s | --speed <FLOAT>");
    console.log(`\tDefault is ${ZOOM_SPEED}`);
    console.log("\tThe speed of the zoom.\n");

    console.log(" -b | --bitrate <BITRATE>");
    console.log(`\tDefault is ${BITRATE}`);
    console.log("\tThe bitrate of the output file.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

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

            case '-g':
            case '--grep':
                GREP = nextArg;
                i++;
                break;

            case '-t':
            case '--target':
                TARGET = nextArg;
                i++;
                break;

            case '-f':
            case '--fps':
                FPS = nextArg;
                i++;
                break;

            case '-w':
            case '--width':
                WIDTH = nextArg;
                i++;
                break;

            case '-h':
            case '--height':
                HEIGHT = nextArg;
                i++;
                break;

            case '-d':
            case '--duration':
                DURATION = nextArg;
                i++;
                break;

            case '-s':
            case '--speed':
                ZOOM_SPEED = nextArg;
                i++;
                break;

            case '-b':
            case '--bitrate':
                BITRATE = nextArg;
                i++;
                break;

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
        if (config.target) TARGET = config.target;
        if (config.fps) FPS = config.fps;
        if (config.width) WIDTH = config.width;
        if (config.height) HEIGHT = config.height;
        if (config.duration) DURATION = config.duration;
        if (config.speed) ZOOM_SPEED = config.speed;
        if (config.bitrate) BITRATE = config.bitrate;
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
    process.exit(1);
}

// ╭──────────────────────────────────────────────────────────╮
// │     Run these checks before you run the main script      │
// ╰──────────────────────────────────────────────────────────╯
function preFlightChecks(inputFile) {
    // Check input file exists.
    if (!fs.existsSync(inputFile)) {
        console.log("\t❌ File not found. Exiting.");
        exitGracefully();
    }
}

function calculateVariables(inputFile) {
    // If no width set, default to the image width
    if (!WIDTH) {
        try {
            WIDTH = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "${inputFile}"`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();
        } catch (error) {
            console.error(`Error getting width: ${error.message}`);
            process.exit(1);
        }
    }

    // If no height set, default to the image height
    if (!HEIGHT) {
        try {
            HEIGHT = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${inputFile}"`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();
        } catch (error) {
            console.error(`Error getting height: ${error.message}`);
            process.exit(1);
        }
    }
    
    // Determine Random
    if (TARGET === "Random") {
        const targets = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"];
        TARGET = targets[Math.floor(Math.random() * targets.length)];
    }

    // Determine x and y values based on the position
    let X, Y;
    switch (TARGET) {
        case "TopLeft":
            X = 0;
            Y = 0;
            break;
        case "TopRight":
            X = WIDTH;
            Y = 0;
            break;
        case "BottomLeft":
            X = 0;
            Y = HEIGHT;
            break;
        case "BottomRight":
            X = WIDTH;
            Y = HEIGHT;
            break;
        default:
            console.error(`Invalid position: ${TARGET}`);
            console.error("Valid positions are: TopLeft, TopRight, BottomLeft, BottomRight, Random");
            process.exit(1);
    }

    // ╭───────────────────────────────────────────────────────╮
    // │     STEP 1 - Scale Image to specified START size       │
    // ╰───────────────────────────────────────────────────────╯
    const SCALE_FILTER = `scale=${WIDTH}:${HEIGHT},setsar=1:1`;

    // ╭───────────────────────────────────────────────────────╮
    // │         STEP 2 - Crop image to the same size          │
    // ╰───────────────────────────────────────────────────────╯
    const CROP_FILTER = `crop=${WIDTH}:${HEIGHT}`;

    // ╭───────────────────────────────────────────────────────╮
    // │               STEP 3 - UPSCALE TO 8000!               │
    // ╰───────────────────────────────────────────────────────╯
    const SMOOTH_SCALE = "scale=8000:-1";

    // ╭───────────────────────────────────────────────────────╮
    // │                STEP 4 - Build ZoomPan                 │
    // ╰───────────────────────────────────────────────────────╯
    const ZOOM = `z=zoom+${ZOOM_SPEED}`;
    const XCOORD = `x=${X}`;
    const YCOORD = `y=${Y}`;
    const FRAMES = `d=${parseInt(DURATION) * parseInt(FPS)}`;
    const SIZE = `s=${WIDTH}x${HEIGHT}`;
    const FRAMESPERSECOND = `fps=${FPS}`;
    const ZOOMPAN_FILTER = `zoompan=${ZOOM}:${XCOORD}:${YCOORD}:${FRAMES}:${SIZE}:${FRAMESPERSECOND}`;

    // ╭───────────────────────────────────────────────────────╮
    // │   STEP 5 - Combine all filters into filter_complex      │
    // ╰───────────────────────────────────────────────────────╯
    const FILTER_COMPLEX = `[0]${SCALE_FILTER}[out];[out]${CROP_FILTER}[out];[out]${SMOOTH_SCALE},${ZOOMPAN_FILTER}[out]`;

    return {
        WIDTH, HEIGHT, X, Y, SCALE_FILTER, CROP_FILTER, SMOOTH_SCALE,
        ZOOM, XCOORD, YCOORD, FRAMES, SIZE, FRAMESPERSECOND, ZOOMPAN_FILTER, FILTER_COMPLEX
    };
}

function printFlags(vars) {
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Input File", INPUT_FILENAME);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Target", TARGET);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "FPS", FPS);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Duration", DURATION);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Zoom Speed", ZOOM_SPEED);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Bitrate", BITRATE);
    console.log(`🏞️  ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
    console.log(`🌆 ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "WIDTH", vars.WIDTH);
    console.log(`🌆 ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "HEIGHT", vars.HEIGHT);
    console.log(`🌆 ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "X", vars.X);
    console.log(`🌆 ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Y", vars.Y);
    console.log(`🌆 ${colors.TEXT_GREEN_400}%-20s :${colors.TEXT_RESET} %s`, "Filter Complex", vars.FILTER_COMPLEX);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    // If this is a file
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isFile()) {
        preFlightChecks(INPUT_FILENAME);
        const vars = calculateVariables(INPUT_FILENAME);
        printFlags(vars);

        // Ensure output filename has .mp4 extension if not specified
        let outputWithExt = OUTPUT_FILENAME;
        if (!path.extname(OUTPUT_FILENAME)) {
            outputWithExt = `${OUTPUT_FILENAME}.mp4`;
        }

        const ffmpegArgs = [
            '-loop', '1',
            '-i', INPUT_FILENAME,
            '-y',
            '-filter_complex', vars.FILTER_COMPLEX,
            '-acodec', 'aac',
            '-vcodec', 'libx264',
            '-b:v', BITRATE,
            '-map', '[out]',
            '-map', '0:a?',
            '-pix_fmt', 'yuv420p',
            '-r', FPS,
            '-t', DURATION,
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
                    console.log(`✅ ${colors.TEXT_PURPLE_500}%-20s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
                    resolve();
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('Failed to start FFMPEG process:', error.message);
                reject(error);
            });
        });
    }
    
    // If a directory
    if (fs.existsSync(INPUT_FILENAME) && fs.statSync(INPUT_FILENAME).isDirectory()) {
        const files = fs.readdirSync(INPUT_FILENAME)
            .filter(file => /\.(png|jpg|jpeg)$/i.test(file))
            .filter(file => !GREP || file.includes(GREP))
            .map(file => path.join(INPUT_FILENAME, file));

        files.forEach((inputFile, index) => {
            preFlightChecks(inputFile);
            const vars = calculateVariables(inputFile);
            printFlags(vars);
            
            const outputFile = `${index}_${OUTPUT_FILENAME}`;
            let outputWithExt = outputFile;
            if (!path.extname(outputFile)) {
                outputWithExt = `${outputFile}.mp4`;
            }

            const ffmpegArgs = [
                '-loop', '1',
                '-i', inputFile,
                '-y',
                '-filter_complex', vars.FILTER_COMPLEX,
                '-acodec', 'aac',
                '-vcodec', 'libx264',
                '-b:v', BITRATE,
                '-map', '[out]',
                '-map', '0:a?',
                '-pix_fmt', 'yuv420p',
                '-r', FPS,
                '-t', DURATION,
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
                    console.log(`✅ ${colors.TEXT_PURPLE_500}%-20s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
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
main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
