#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                       Overlay a watermark on the video                       │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

// https://www.bannerbear.com/blog/how-to-add-watermark-to-videos-using-ffmpeg/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

// set -o errexit                                              // If a command fails bash exits.
// set -o pipefail                                             // pipeline fails on one command.
if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// DIAGRAM
//
//                   | 'OVERLAY_START_TIME' = start overlay at 0.  
//                   |
//                   |                                             | 'DURATION' = 5 seconds.
//                   |                                             |
//                   |                                             |
//                   |                                             |
//                   ╭─────────────────────────────────────────────╮
//                   │ OVERLAY (5 seconds long)                    │
//                   0────────1────────2────────3────────4────────5╯
//                   |                                             |
//                   | 'START' = 2 seconds in on input video       | 'END' = 7 seconds.
//                   |                                             |
//                   |                                             |
//                   |                                             |
//                   |                                             |
// ╭────────────────────────────────────────────────────────────────────────╮
// │ INPUT VIDEO (8 seconds long)                                           │
// 0────────1────────2────────3────────4────────5────────6────────7────────8╯

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_watermark.mp4";
let WATERMARK_FILE = "";
let XPIXELS = "10";
let YPIXELS = "10";
let LOGLEVEL = "error";
let SCALE = "0.2";
let ALPHA = "1";
let OVERLAY_START_TIME = "0";      // Where the overlay video should start playing from. Default is from the start (0).
let START = "0";
let END = "100%";
let DURATION = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> -w <WATERMARK_FILE> [-x <PIXELS>] [-y <PIXELS>] [-s <SCALE>] [-a <ALPHA>] [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Overlay a watermark on the video.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -w | --watermark <WATERMARK_FILE>");
        console.log("\tNote that you CAN use videos as the watermark.");
        console.log("\tImage to use for the watermark.\n");
        
        console.log(" -x | --xpixels <PIXELS>");
        console.log("\tPosition of the watermark. Number of pixels on X-Axis. Default 10.");
        console.log("\tThere are variables that also can be used:");
        console.log("\t- (W) is the width of the video");
        console.log("\t- (H) is the height of the video");
        console.log("\t- (w) is the width of the watermark");
        console.log("\t- (h) is the height of the watermark");
        console.log("\tThe following example will center the watermark:");
        console.log("\tff_watermark -i input.mp4 -w watermark.png -x \"(W-w)/2\" -y \"(H-h)/2\" \n");
        
        console.log(" -y | --ypixels <PIXELS>");
        console.log("\tPosition of the watermark. Number of pixels on Y-Axis. Default 10.\n");
        
        console.log(" -s | --scale <SCALE>");
        console.log("\tSize of the watermark in relation to the height of the video. Default is 0.2 (1/5th height)\n");
        
        console.log(" -a | --alpha <ALPHA>");
        console.log("\tTransparency (alpha channel) of the watermark. From 0 to 1. Default is 1.\n");
        
        console.log(" -S | --start <SECONDS>");
        console.log("\tStart time in seconds of when to show overlay. Default 0.");
        console.log("\tYou can also express with basic maths and percentage values.");
        console.log("\tExamples:");
        console.log("\t\"10\" : Start 10 seconds into the input video. ");
        console.log("\t\"50%\" : Start half way through the input video. ");
        console.log("\t\"100%-5\" : Start 5 seconds before the end of the input video. ");
        console.log("\t\"10%+12\" : Start 12 seconds after the 10% mark of the input video. ");
        console.log("\t\"-5\" : Start 5 seconds before the beginning of the input video. ");
        
        console.log(" -E | --end <SECONDS>");
        console.log("\nEnd time in seconds of when to show overlay. Default 100%");
        console.log("\nYou can also use basic maths and percentage values the same as the --start flag.");
        
        console.log(" -D | --duration <SECONDS>");
        console.log("\nOverride the --end time with a duration instead. Default is unset (null)");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");
        
        console.log("Examples:\n");
        
        console.log("Center large watermark:");
        console.log("ff_watermark -i input.mp4 -w watermark.png -s 0.4 -x \"(W-w)/2\" -y \"(H-h)/2\"\n");
        
        console.log("Small bottom right watermark:");
        console.log("ff_watermark -i input.mp4 -w watermark.png -s 0.1 -x \"(W-w)\" -y \"(H-h)\"\n");
        
        console.log("Full-size watermark:");
        console.log("ff_watermark -i input.mp4 -w watermark.png -s 1\n");
        
        console.log("Full-size semi-transparent watermark:");
        console.log("ff_watermark -i input.mp4 -w watermark.png -s 1 -a 0.5\n");
        
        console.log("Small, transparent bottom-right positioned Video as a watermark:");
        console.log("ff_watermark -i input.mp4 -w watermark_video.mp4 -s 0.3 -x \"(W-w)\" -y \"(H-h)\" -a 0.5\n");
        
        process.exit(1);
    }
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
            case '-i':
            case '--input':
                INPUT_FILENAME = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;
                
            case '-w':
            case '--watermark':
                WATERMARK_FILE = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-x':
            case '--xpixels':
                XPIXELS = args[i + 1];
                i += 2;
                break;
                
            case '-y':
            case '--ypixels':
                YPIXELS = args[i + 1];
                i += 2;
                break;
                
            case '-s':
            case '--scale':
                SCALE = args[i + 1];
                i += 2;
                break;
                
            case '-a':
            case '--alpha':
                ALPHA = args[i + 1];
                i += 2;
                break;
                
            case '-S':
            case '--start':
                START = args[i + 1];
                i += 2;
                break;
                
            case '-E':
            case '--end':
                END = args[i + 1];
                i += 2;
                break;
                
            case '-D':
            case '--duration':
                DURATION = args[i + 1];
                i += 2;
                break;
                
            case '-C':
            case '--config':
                CONFIG_FILE = args[i + 1];
                i += 2;
                break;
                
            case '-l':
            case '--loglevel':
                LOGLEVEL = args[i + 1];
                i += 2;
                break;
                
            case '--description':              // IGNORED. used for descriptions in JSON 
                i += 2;
                break;
                
            case '--help':
                usage();
                break;
                
            default:
                if (arg.startsWith('-')) {
                    console.log(`Unknown option ${arg}`);
                    process.exit(1);
                }
                i += 1;
                break;
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │        Read config-file if supplied. Requires JQ         │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_watermark config
        if (config.ff_watermark) {
            const watermarkConfig = config.ff_watermark;
            
            if (watermarkConfig.input) {
                if (path.isAbsolute(watermarkConfig.input)) {
                    INPUT_FILENAME = watermarkConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), watermarkConfig.input);
                }
            }
            
            if (watermarkConfig.watermark) {
                if (path.isAbsolute(watermarkConfig.watermark)) {
                    WATERMARK_FILE = watermarkConfig.watermark;
                } else {
                    WATERMARK_FILE = path.resolve(path.dirname(CONFIG_FILE), watermarkConfig.watermark);
                }
            }
            
            if (watermarkConfig.output) OUTPUT_FILENAME = watermarkConfig.output;
            if (watermarkConfig.xpixels) XPIXELS = watermarkConfig.xpixels;
            if (watermarkConfig.ypixels) YPIXELS = watermarkConfig.ypixels;
            if (watermarkConfig.scale) SCALE = watermarkConfig.scale;
            if (watermarkConfig.alpha) ALPHA = watermarkConfig.alpha;
            if (watermarkConfig.start) START = watermarkConfig.start;
            if (watermarkConfig.end) END = watermarkConfig.end;
            if (watermarkConfig.duration) DURATION = watermarkConfig.duration;
            if (watermarkConfig.loglevel) LOGLEVEL = watermarkConfig.loglevel;
        }
    } catch (error) {
        console.error("Error reading config file:", error.message);
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
        console.error("Error copying file:", error.message);
        process.exit(1);
    }
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
    
    // Check watermark filename has been set.
    if (!WATERMARK_FILE) {
        console.log("\t❌ No watermark file specified. Exiting.");
        exitGracefully();
    }
    
    // Check watermark file exists.
    if (!fs.existsSync(WATERMARK_FILE)) {
        console.log("\t❌ Watermark file not found. Exiting.");
        exitGracefully();
    }
    
    // Check input filename is a movie file.
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name',
            '-print_format', 'csv=p=0',
            INPUT_FILENAME
        ]);
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log(`\t❌ Input file: '${INPUT_FILENAME}' not a movie file. Exiting.`);
                // Run ffprobe to show error details
                const errorProbe = spawn('ffprobe', [INPUT_FILENAME]);
                errorProbe.on('close', () => {
                    exitGracefully();
                });
            } else {
                resolve();
            }
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │           Start and end times for the overlay            │
// ╰──────────────────────────────────────────────────────────╯
async function calculateTimes() {
    // detect the length of the main input video
    // will be in seconds and milliseconds. e.g. 32.23442
    const lengthOfInputVideo = await new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            INPUT_FILENAME
        ]);
        
        let duration = '';
        
        ffprobe.stdout.on('data', (data) => {
            duration += data.toString();
        });
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                resolve(parseFloat(duration.trim()));
            } else {
                reject(new Error(`Failed to get duration for ${INPUT_FILENAME}`));
            }
        });
    });
    
    const inputLength = Math.floor(lengthOfInputVideo);
    
    // If contains a % symbol
    const percentRegex = /([0-9]|[1-9][0-9]|100)%/;
    
    if (percentRegex.test(START)) {
        const percentMatch = START.match(percentRegex);
        const percent = percentMatch[0];
        const percentNoSymbol = percent.slice(0, -1); // remove the % symbol
        const percentTime = Math.floor((inputLength * parseInt(percentNoSymbol)) / 100);
        const substitutePercentForRealTime = START.replace(percentMatch[1] + '%', percentTime.toString());
        // calculate any maths (including -5, +5%, /2, etc...)
        START = eval(substitutePercentForRealTime).toString();
    }
    
    // Repeat for the END entry.
    if (percentRegex.test(END)) {
        const percentMatch = END.match(percentRegex);
        const percent = percentMatch[0];
        const percentNoSymbol = percent.slice(0, -1); // remove the % symbol
        const percentResult = Math.floor((inputLength * parseInt(percentNoSymbol)) / 100);
        const substitutePercentForRealTime = END.replace(percentMatch[1] + '%', percentResult.toString());
        END = eval(substitutePercentForRealTime).toString();
    }
    
    // duration of the overlay video to play (if not already set)
    if (!DURATION) {
        DURATION = (parseFloat(END) - parseFloat(START)).toString();
    }
    
    // Set the overlay playing duration.
    const enable = `:enable='between(t,${OVERLAY_START_TIME},${END})'`;
    
    return { start: START, end: END, duration: DURATION, enable: enable };
}

function printFlags() {
    console.log(`🌁 Watermark : ${WATERMARK_FILE}`);
    console.log(`🔳 XPixels : ${XPIXELS}`);
    console.log(`🔳 YPixels : ${YPIXELS}`);
    console.log(`🏋️ Scale : ${SCALE}`);
    console.log(`🔲 Alpha : ${ALPHA}`);
    console.log(`🏁 Start : ${START}`);
    console.log(`🎬 End : ${END}`);
    console.log(`⏲️ Duration : ${DURATION}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    await preFlightChecks();
    
    // If a wildcard is used get a random result
    // "./lib/watermarks/youth_box_RANDOM.png"
    if (WATERMARK_FILE.includes('RANDOM')) {
        const wildcardPattern = WATERMARK_FILE.replace('RANDOM', '*');
        const files = fs.readdirSync(path.dirname(wildcardPattern))
            .filter(file => file.match(new RegExp(path.basename(wildcardPattern).replace(/\*/g, '.*'))))
            .map(file => path.join(path.dirname(wildcardPattern), file));
        
        if (files.length > 0) {
            WATERMARK_FILE = files[Math.floor(Math.random() * files.length)];
        }
    }
    
    const times = await calculateTimes();
    
    printFlags();
    
    return new Promise((resolve, reject) => {
        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', INPUT_FILENAME,
            '-i', WATERMARK_FILE,
            '-filter_complex', `[1]format=rgba,colorchannelmixer=aa=${ALPHA},scale=iw*${SCALE}:ih*${SCALE}[logo];[0][logo]overlay=${XPIXELS}:${YPIXELS}${times.enable}`,
            OUTPUT_FILENAME
        ];
        
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Output : ${OUTPUT_FILENAME}`);
                resolve();
            } else {
                console.error(`FFmpeg failed with exit code ${code}`);
                reject(new Error(`FFmpeg failed with exit code ${code}`));
            }
        });
        
        ffmpeg.on('error', (error) => {
            console.error('FFmpeg error:', error);
            reject(error);
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │                        Entry Point                       │
// ╰──────────────────────────────────────────────────────────╯
if (require.main === module) {
    usage();
    parseArguments();
    readConfig();
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}
