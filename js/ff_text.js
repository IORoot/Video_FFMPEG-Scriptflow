#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                                Add text to video                             │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

// set -o errexit                                              // If a command fails bash exits.
// set -o pipefail                                             // pipeline fails on one command.
if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_text.mp4";
let LOGLEVEL = "error";

let TEMP_TEXTFILE = path.join(os.tmpdir(), "text.txt");
let PRUNED_CONFIG_FILE = path.join(os.tmpdir(), "pruned_text_config_file.json");
let FONT = "/System/Library/Fonts/HelveticaNeue.ttc";
let COLOUR = "WHITE";
let SIZE = "24";
let BOX = "1";
let BOXCOLOUR = "black";
let BOXBORDER = "5";
let XPIXELS = "(w-tw)/2";
let YPIXELS = "(h-th)/2";
let LINESPACING = "5";
let REDUCTION = "8";
let TEXTFILE = "";
let TEXT = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Add text overlay to video with customizable styling.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -t | --textfile <TEXTFILE>");
        console.log("\tFile containing Text to write over video. Default: ./text.txt\n");
        
        console.log(" -T | --text <TEXT>");
        console.log("\tText to write over video. Overrides --textfile\n");
        
        console.log(" -f | --font <FONT>");
        console.log("\tPath to font file to use. Default: /System/Library/Fonts/HelveticaNeue.ttc\n");
        
        console.log(" -c | --colour <FONTCOLOUR>");
        console.log("\tThe font colour to use. Can be Hex RRGGBB or name and include alpha with '@0.5' after. Default: white.\n");
        
        console.log(" -s | --size <FONTSIZE>");
        console.log("\tThe font size to use. Default: 24.\n");
        
        console.log(" -r | --reduction <POINTS>");
        console.log("\tEach line will reduce the font size by this much. Default 8.\n");
        
        console.log(" -b | --box <BOX>");
        console.log("\tShow the background box. Boolean. 1 or 0. Default: 1.\n");
        
        console.log(" -p | --boxcolour <PAINTCOLOUR>");
        console.log("\tThe background paint colour to use. Can be Hex RRGGBB or name and include alpha with '@0.5' after. Default: black.\n");
        
        console.log(" -B | --boxborder <BOXBORDER>");
        console.log("\tWidth of the border on the background box around the text. Default: 5.\n");
        
        console.log(" -x | --xpixels <PIXELS>");
        console.log("\tWhere to position the text in the frame on X-Axis from left. Default center: (w-tw)/2\n");
        
        console.log(" -y | --ypixels <PIXELS>");
        console.log("\tWhere to position the text in the frame on Y-Axis from top. Default center: (h-th)/2\n");
        console.log("\tThe x and y parameters also have access to the following variables:\n");
        console.log("\t- w : The input video's width.\n");
        console.log("\t- h : The input video's height.\n");
        console.log("\t- tw : The rendered text width.\n");
        console.log("\t- th : The rendered text height.\n");
        console.log("\t- lh : The line height.\n");
        console.log("\tThese can be used to calculate areas of the screen. For example:\n");
        console.log("\tThe center of the screen on x-axis is 'x=(ow-iw)/2\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");
        
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
                
            case '-t':
            case '--textfile':
                TEXTFILE = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-T':
            case '--text':
                TEXT = args[i + 1];
                i += 2;
                break;
                
            case '-f':
            case '--font':
                FONT = args[i + 1];
                i += 2;
                break;
                
            case '-c':
            case '--colour':
                COLOUR = args[i + 1];
                i += 2;
                break;
                
            case '-s':
            case '--size':
                SIZE = args[i + 1];
                i += 2;
                break;
                
            case '-r':
            case '--reduction':
                REDUCTION = args[i + 1];
                i += 2;
                break;
                
            case '-b':
            case '--box':
                BOX = args[i + 1];
                i += 2;
                break;
                
            case '-p':
            case '--boxcolour':
                BOXCOLOUR = args[i + 1];
                i += 2;
                break;
                
            case '-B':
            case '--boxborder':
                BOXBORDER = args[i + 1];
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

function cleanup() {
    try {
        if (fs.existsSync(TEMP_TEXTFILE)) {
            fs.unlinkSync(TEMP_TEXTFILE);
        }
        if (fs.existsSync(PRUNED_CONFIG_FILE)) {
            fs.unlinkSync(PRUNED_CONFIG_FILE);
        }
    } catch (error) {
        // Ignore cleanup errors
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
        
        // Extract ff_text config
        let textConfig;
        if (config.ff_text) {
            textConfig = config.ff_text;
        } else {
            // Direct config (from scriptflow)
            textConfig = config;
        }
            
        if (textConfig.input) {
            if (path.isAbsolute(textConfig.input)) {
                INPUT_FILENAME = textConfig.input;
            } else {
                if (process.env.SCRIPTFLOW_CONFIG_DIR) {
                    INPUT_FILENAME = path.resolve(process.env.SCRIPTFLOW_CONFIG_DIR, textConfig.input);
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), textConfig.input);
                }
            }
        }
        
        if (textConfig.output) OUTPUT_FILENAME = textConfig.output;
        if (textConfig.textfile) {
            if (path.isAbsolute(textConfig.textfile)) {
                TEXTFILE = textConfig.textfile;
            } else {
                TEXTFILE = path.resolve(path.dirname(CONFIG_FILE), textConfig.textfile);
            }
        }
        if (textConfig.text) TEXT = textConfig.text;
        if (textConfig.font) FONT = textConfig.font;
        if (textConfig.colour) COLOUR = textConfig.colour;
        if (textConfig.color) COLOUR = textConfig.color; // Support both British and American spelling
        if (textConfig.size) SIZE = textConfig.size;
        if (textConfig.reduction) REDUCTION = textConfig.reduction;
        if (textConfig.box) BOX = textConfig.box;
        if (textConfig.boxcolour) BOXCOLOUR = textConfig.boxcolour;
        if (textConfig.boxcolor) BOXCOLOUR = textConfig.boxcolor; // Support both British and American spelling
        if (textConfig.boxborder) BOXBORDER = textConfig.boxborder;
        if (textConfig.xpixels) XPIXELS = textConfig.xpixels;
        if (textConfig.ypixels) YPIXELS = textConfig.ypixels;
        if (textConfig.loglevel) LOGLEVEL = textConfig.loglevel;
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
    // If there is no input video, exit error
    if (!INPUT_FILENAME) {
        console.log("❌ No input file specified. Exiting.");
        process.exit(1);
    }
    
    // Check input file exists.
    if (!fs.existsSync(INPUT_FILENAME)) {
        console.log("\t❌ Input file not found. Exiting.");
        exitGracefully();
    }
    
    // Check input filename is a movie file.
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [INPUT_FILENAME]);
        
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

function printFlags() {
    console.log(`📝 TextFile : ${TEXTFILE}`);
    console.log(`🖊️  Text : ${TEXT}`);
    console.log(`🔡 Font : ${FONT}`);
    console.log(`🎨 Colour : ${COLOUR}`);
    console.log(`📏 Size : ${SIZE}`);
    console.log(`🗜️  Reduction : ${REDUCTION}`);
    console.log(`📦 Box : ${BOX}`);
    console.log(`🎁 BoxColour : ${BOXCOLOUR}`);
    console.log(`🔳 BoxBorder : ${BOXBORDER}`);
    console.log(`🔲 XPixels : ${XPIXELS}`);
    console.log(`🔲 YPixels : ${YPIXELS}`);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    await preFlightChecks();
    
    // If there in any inline TEXT been set, echo it into the TEMP_TEXTFILE
    if (TEXT) {
        fs.writeFileSync(TEMP_TEXTFILE, TEXT);
    }
    
    // If there IS a TEXTFILE, copy it to the TEMP_TEXTFILE (overwriting any inline text)
    if (TEXTFILE && fs.existsSync(TEXTFILE)) {
        fs.copyFileSync(TEXTFILE, TEMP_TEXTFILE);
    }
    
    // If the TEMP_TEXTFILE still doesn't exist, there's no text.
    if (!fs.existsSync(TEMP_TEXTFILE)) {
        console.log("❌ No text file. Exiting gracefully.");
        exitGracefully();
    }
    
    // If there IS a TEMP_TEXTFILE, but it's empty, there's no text.
    const tempFileContent = fs.readFileSync(TEMP_TEXTFILE, 'utf8');
    if (!tempFileContent.trim()) {
        console.log("❌ No text in text file specified. Exiting gracefully.");
        exitGracefully();
    }
    
    // Count Number of lines in TEMP_TEXTFILE
    const lines = tempFileContent.split('\n').filter(line => line.trim() !== '');
    const LINECOUNT = lines.length;
    
    // If there is no lines in the TEMP_TEXTFILE, there is no text, so exit nice.
    if (LINECOUNT === 0) {
        console.log("⚠️ exiting gracefully.");
        exitGracefully();
    }
    
    let COMMAND = "";
    let LOOP = 0;
    let currentSize = parseInt(SIZE);
    
    printFlags();
    
    // Process each line
    for (const LINE of lines) {
        if (LINE.trim()) {
            COMMAND += `drawtext=fontfile=${FONT}:text='${LINE.replace(/'/g, "\\'")}':line_spacing=30:fontcolor=${COLOUR}:fontsize=${currentSize}:box=${BOX}:boxcolor=${BOXCOLOUR}:boxborderw=${BOXBORDER}:x=${XPIXELS}:y=${YPIXELS} + (${LOOP} * ( lh + (2*${BOXBORDER}) ) ) - ((lh/2) * (${LINECOUNT}-1) + ${LINESPACING}) + (${LOOP} * ${LINESPACING}),`;
            currentSize -= parseInt(REDUCTION);
            LOOP++;
        }
    }
    
    return new Promise((resolve, reject) => {
        const ffmpegArgs = ['-y', '-v', LOGLEVEL, '-i', INPUT_FILENAME, '-vf', `[IN] ${COMMAND.slice(0, -1)} [OUT]`, OUTPUT_FILENAME];
        
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
    }).finally(() => {
        cleanup();
    });
}
