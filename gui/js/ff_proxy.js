#!/usr/bin/env node

/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │           Downgrade large videos to a more manageable file size              │
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
let OUTPUT_FILENAME = "ff_proxy.mp4";
let SCALE_X = "1280";
let SCALE_Y = "-2";
let FPS = "30";
let CRF = "25";
let CODEC = "libx264";
let LOGLEVEL = "panic";
let GREP = "";
let RECURSIVE = false;
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
    console.log(" node ff_proxy.js -i <INPUT_FILE> [-w <WIDTH>] [-h <HEIGHT>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Change the scale (Width/Height) of a video.\n");

    console.log("Flags:");
    console.log(" -i | --input <INPUT_FILE / INPUT_FOLDER>");
    console.log("\tThe name of an input file.");
    console.log("\tIf a FOLDER, then it is recursive.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -r | --recursive");
    console.log("\tIf a FOLDER, then recurse to deeper folders.\n");

    console.log(" -x | --scalex");
    console.log("\tWidth of the output proxy. can use -2 to keep aspect ratio to scaley. Default 1280.\n");

    console.log(" -y | --scaley");
    console.log("\tHeight of the output proxy. can use -2 to keep aspect ratio to scalex. Default -2.\n");

    console.log(" -f | --fps");
    console.log("\tFrames Per Second to reduce the proxy down to. Default 30.\n");

    console.log(" -c | --CRF");
    console.log("\tConstant Rate Factor. 0-51. Controls the quality of the output. Default 25.\n");

    console.log(" -d | --codec");
    console.log("\tCodec library to use. libxwebp / libx264 / libx265 /etc... Default libx264.\n");

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

            case '-r':
            case '--recursive':
                RECURSIVE = true;
                break;

            case '-x':
            case '--scalex':
                SCALE_X = nextArg;
                i++;
                break;

            case '-y':
            case '--scaley':
                SCALE_Y = nextArg;
                i++;
                break;

            case '-f':
            case '--fps':
                FPS = nextArg;
                i++;
                break;

            case '-c':
            case '--crf':
                CRF = nextArg;
                i++;
                break;

            case '-d':
            case '--codec':
                CODEC = nextArg;
                i++;
                break;

            case '-g':
            case '--grep':
                GREP = nextArg;
                i++;
                break;

            case '-C':
            case '--config':
                CONFIG_FILE = nextArg;
                i++;
                break;

            case '--description':
                // IGNORED. used for descriptions in JSON
                i++;
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
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │        Read config-file if supplied.                    │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    if (!CONFIG_FILE) return;

    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Apply config values
        Object.keys(config).forEach(key => {
            switch (key) {
                case 'input':
                    INPUT_FILENAME = path.resolve(config[key]);
                    break;
                case 'output':
                    OUTPUT_FILENAME = config[key];
                    break;
                case 'scalex':
                    SCALE_X = config[key];
                    break;
                case 'scaley':
                    SCALE_Y = config[key];
                    break;
                case 'fps':
                    FPS = config[key];
                    break;
                case 'crf':
                    CRF = config[key];
                    break;
                case 'codec':
                    CODEC = config[key];
                    break;
                case 'grep':
                    GREP = config[key];
                    break;
                case 'loglevel':
                    LOGLEVEL = config[key];
                    break;
                case 'recursive':
                    RECURSIVE = config[key];
                    break;
            }
        });
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
        fs.copyFileSync(INPUT_FILENAME, OUTPUT_FILENAME);
        process.exit(0);
    } catch (error) {
        console.error(`Error copying file: ${error.message}`);
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

    // Check input file/folder exists.
    if (!fs.existsSync(inputFile)) {
        console.log("\t❌ Input file not found. Exiting.");
        exitGracefully();
    }

    // Check input filename is a movie file.
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [inputFile], { stdio: 'pipe' });
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
                exitGracefully();
            }
        });

        ffprobe.on('error', (error) => {
            console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
            exitGracefully();
        });
    });
}

function printFlags() {
    console.log(`📐 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "ScaleX", SCALE_X);
    console.log(`📐 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "ScaleY", SCALE_Y);
    console.log(`🎞️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "FPS", FPS);
    console.log(`📈 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "CRF", CRF);
    console.log(`📽️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Codec", CODEC);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    printFlags();

    const stats = fs.statSync(INPUT_FILENAME);

    // If input is a file
    if (stats.isFile()) {
        await preFlightChecks(INPUT_FILENAME);
        
        const ffmpegArgs = [
            '-y',
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-vf', `scale=${SCALE_X}:${SCALE_Y},setsar=1:1,fps=${FPS}`,
            '-vcodec', CODEC,
            '-crf', CRF,
            '-c:a', 'aac',
            '-q:a', '5',
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
                console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
            } else {
                console.error(`FFmpeg process exited with code ${code}`);
            }
        });
    }

    // If input is a folder
    if (stats.isDirectory()) {
        const findFiles = (dir) => {
            const files = [];
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && RECURSIVE) {
                    files.push(...findFiles(fullPath));
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (ext === '.mp4' || ext === '.mov') {
                        if (!GREP || item.toLowerCase().includes(GREP.toLowerCase())) {
                            files.push(fullPath);
                        }
                    }
                }
            }
            
            return files;
        };

        const files = findFiles(INPUT_FILENAME);
        
        for (const file of files) {
            await preFlightChecks(file);
            
            const directory = path.dirname(file);
            const basename = path.basename(file, path.extname(file));
            const outputFile = path.join(directory, `proxy_${basename}.mp4`);
            
            console.log(`%-80s`, `processing ${file}`);
            
            const ffmpegArgs = [
                '-y',
                '-v', LOGLEVEL,
                '-i', file,
                '-vf', `scale=${SCALE_X}:${SCALE_Y},setsar=1:1,fps=${FPS}`,
                '-vcodec', CODEC,
                '-crf', CRF,
                '-c:a', 'aac',
                '-q:a', '5',
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
                    console.log(`✅ %-20s`, outputFile);
                } else {
                    console.error(`FFmpeg process exited with code ${code} for file ${file}`);
                }
            });
        }
    }
}

// Main execution
if (process.argv.length < 3) {
    usage();
}

parseArguments();
readConfig();
main().catch(console.error);
