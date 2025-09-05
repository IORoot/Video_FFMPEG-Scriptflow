#!/usr/bin/env node
// ╭───────────────────────────────────────────────────────────────────────────╮
// │                                                                           │
// │          This is similar to a concat, but you can use an effect           │
// │                            between each video.                            │
// │                                                                           │
// ╰───────────────────────────────────────────────────────────────────────────╯

// Explanation:
// More than one video needs to be specified. You can also specify a folder.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯


if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_transition.mp4";
let TMP_FILE = "/tmp/tmp_ffmpeg_transition_list.txt";
let GREP = "";
let SORT_FLAGS = "";
let FX_CSV = "fade";
let DURATION = "1";
let LOGLEVEL = "error";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> [-d <DURATION>] [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Concat videos with a transition effect between each.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file(s) / folder.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -g | --grep <STRING>");
        console.log("\tSupply a grep string for filtering the inputs if a folder is specified.\n");
        
        console.log(" -s | --sort <SORT_FLAGS>");
        console.log("\tSupply flags to sort command for order of file input.");
        console.log("\tAdd in quotes. e.g. \"--reverse --random-sort\"\n");
        
        console.log(" -e | --effects <CSV_STRING>");
        console.log("\tA csv string of each effect to use. If the effect list is shorter than");
        console.log("\tvideo list, then the effects will be repeated. [default 'fade'] (https://trac.ffmpeg.org/wiki/Xfade)\n");
        
        console.log(" -d | --duration <STRING>");
        console.log("\tHow long each transition should take.\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace");
        
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
            case '--input?':
            case '--input??':
            case '--input???':
                writeToTemp(path.resolve(args[i + 1]));
                i += 2;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
                i += 2;
                break;
                
            case '-g':
            case '--grep':
                GREP = args[i + 1];
                i += 2;
                break;
                
            case '-s':
            case '--sort':
                SORT_FLAGS = args[i + 1];
                i += 2;
                break;
                
            case '-e':
            case '--effects':
                FX_CSV = args[i + 1];
                i += 2;
                break;
                
            case '-d':
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
// │        Read config-file if supplied. Requires JQ           │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_transition config
        if (config.ff_transition) {
            const transitionConfig = config.ff_transition;
            
            if (transitionConfig.input) {
                if (Array.isArray(transitionConfig.input)) {
                    // Multiple inputs
                    transitionConfig.input.forEach(input => {
                        if (path.isAbsolute(input)) {
                            writeToTemp(input);
                        } else {
                            writeToTemp(path.resolve(path.dirname(CONFIG_FILE), input));
                        }
                    });
                } else {
                    // Single input
                    if (path.isAbsolute(transitionConfig.input)) {
                        writeToTemp(transitionConfig.input);
                    } else {
                        writeToTemp(path.resolve(path.dirname(CONFIG_FILE), transitionConfig.input));
                    }
                }
            }
            
            if (transitionConfig.output) OUTPUT_FILENAME = transitionConfig.output;
            if (transitionConfig.grep) GREP = transitionConfig.grep;
            if (transitionConfig.sort) SORT_FLAGS = transitionConfig.sort;
            if (transitionConfig.effects) FX_CSV = transitionConfig.effects;
            if (transitionConfig.duration) DURATION = transitionConfig.duration;
            if (transitionConfig.loglevel) LOGLEVEL = transitionConfig.loglevel;
        }
    } catch (error) {
        console.error("Error reading config file:", error.message);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Write the absolute path into the temporary file       │
// ╰──────────────────────────────────────────────────────────╯
function writeToTemp(file) {
    console.log("Processing Files:");
    
    // if this is a folder
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        const files = fs.readdirSync(file)
            .filter(fileName => {
                const ext = path.extname(fileName).toLowerCase();
                return ext === '.mp4' || ext === '.mov';
            })
            .filter(fileName => GREP ? fileName.includes(GREP) : true)
            .sort()
            .map(fileName => path.join(file, fileName));
        
        files.forEach(filePath => {
            preFlightChecks(filePath);
            console.log(` - ${filePath}`);
            fs.appendFileSync(TMP_FILE, `${filePath}\n`);
        });
        return;
    }
    
    // check files
    preFlightChecks(file);
    
    // print line into temp file.
    fs.appendFileSync(TMP_FILE, `${file}\n`);
}

// ╭──────────────────────────────────────────────────────────╮
// │ If the GREP is set AFTER the input, we need to grep file. │
// │ Add sort too.                                            │
// ╰──────────────────────────────────────────────────────────╯
function grepFileAndSort() {
    if (!fs.existsSync(TMP_FILE)) return;
    
    let content = fs.readFileSync(TMP_FILE, 'utf8');
    let lines = content.split('\n').filter(line => line.trim());
    
    if (GREP) {
        lines = lines.filter(line => line.includes(GREP));
    }
    
    if (SORT_FLAGS) {
        // Simple sort implementation - in real scenario you might want to use child_process for complex sort flags
        lines.sort();
    }
    
    fs.writeFileSync(TMP_FILE, lines.join('\n') + '\n');
}

// ╭──────────────────────────────────────────────────────────╮
// │                         Cleanup                          │
// ╰──────────────────────────────────────────────────────────╯
function cleanup() {
    try {
        if (fs.existsSync(TMP_FILE)) {
            fs.unlinkSync(TMP_FILE);
        }
    } catch (error) {
        // Ignore cleanup errors
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
function preFlightChecks(inputFile) {
    // Check input file exists.
    if (!fs.existsSync(inputFile)) {
        console.log("\t❌ Input file not found. Exiting.");
        exitGracefully();
    }
    
    // Check input filename is a movie file.
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [inputFile]);
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log(`\t❌ Input file: '${inputFile}' not a movie file. Exiting.`);
                // Run ffprobe to show error details
                const errorProbe = spawn('ffprobe', [inputFile]);
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
// │         Concat all files together with xfade fx.          │
// ╰──────────────────────────────────────────────────────────╯
function effectsCsvToArray() {
    return FX_CSV.split(',');
}

// ╭───────────────────────────────────────────────────────╮
// │        Convert list of files in file to array           │
// ╰───────────────────────────────────────────────────────╯
function createArrayOfFiles() {
    if (!fs.existsSync(TMP_FILE)) {
        return { files: [], numFiles: 0, numFx: 0 };
    }
    
    const content = fs.readFileSync(TMP_FILE, 'utf8');
    const files = content.split('\n').filter(line => line.trim());
    const fx = effectsCsvToArray();
    
    return {
        files: files,
        numFiles: files.length,
        numFx: fx.length,
        fx: fx
    };
}

function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]);
        
        let duration = '';
        
        ffprobe.stdout.on('data', (data) => {
            duration += data.toString();
        });
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                resolve(parseFloat(duration.trim()));
            } else {
                reject(new Error(`Failed to get duration for ${filePath}`));
            }
        });
    });
}

// ╭───────────────────────────────────────────────────────╮
// │               Build the FFMPEG Command                │
// ╰───────────────────────────────────────────────────────╯
async function createCommand(files, fx, numFiles, numFx) {
    // For simplicity, let's handle the basic case of 2 videos first
    if (numFiles === 2) {
        // Get duration of first video
        const videoDuration = await getDuration(files[0]);
        const offset = videoDuration - parseFloat(DURATION);
        
        // Simple xfade between two videos with frame rate normalization
        const filterComplex = `[0:v]fps=25[0v];[1:v]fps=25[1v];[0v][1v]xfade=transition=${fx[0]}:duration=${DURATION}:offset=${offset}[outv]`;
        
        const ffmpegArgs = [
            '-v', LOGLEVEL,
            '-i', files[0],
            '-i', files[1],
            '-filter_complex', filterComplex,
            '-map', '[outv]',
            OUTPUT_FILENAME
        ];
        
        return ffmpegArgs;
    }
    
    // For more than 2 videos, we need a more complex filter chain
    // This is a simplified version - the original JavaScript script handles this more complexly
    let filterComplex = "";
    let offset = 0;
    
    for (let i = 0; i < numFiles; i++) {
        if (i > 0) {
            // Select the xfade effect, wrapping around the FX list
            const fxIndex = (i - 1) % numFx;
            const fxEffect = fx[fxIndex];
            
            // Get duration of previous video
            const videoDuration = await getDuration(files[i - 1]);
            
            // Calculate the offset for the xfade transition
            offset = videoDuration - parseFloat(DURATION);
            
            let videoOut = `v${i}`;
            // If its the last out-video, change to 'outv' instead.
            if (i === numFiles - 1) {
                videoOut = "outv";
            }
            
            // Add xfade transition
            let videoInput = `v${i - 1}`;
            if (i === 1) {
                videoInput = "0:v";
            }
            
            filterComplex += `[${videoInput}][${i}:v]xfade=transition=${fxEffect}:duration=${DURATION}:offset=${offset}[${videoOut}]`;
        }
    }
    
    // Construct the FFmpeg command
    const ffmpegArgs = ['-v', LOGLEVEL];
    
    // Add input files to the FFmpeg command
    files.forEach(file => {
        ffmpegArgs.push('-i', file);
    });
    
    // Add the filter_complex and output mapping to the FFmpeg command
    ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[outv]', OUTPUT_FILENAME);
    
    return ffmpegArgs;
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯

async function main() {
    if (!fs.existsSync(TMP_FILE)) {
        console.log("❌ No input file specified. Exiting.");
        exitGracefully();
    }
    
    await Promise.all([
        // Process all pre-flight checks for files in temp file
        new Promise(async (resolve) => {
            const content = fs.readFileSync(TMP_FILE, 'utf8');
            const files = content.split('\n').filter(line => line.trim());
            for (const file of files) {
                await preFlightChecks(file);
            }
            resolve();
        })
    ]);
    
    grepFileAndSort();
    
    const { files, numFiles, numFx, fx } = createArrayOfFiles();
    
    if (numFiles < 2) {
        console.log("❌ At least 2 input files are required for transitions. Exiting.");
        exitGracefully();
    }
    
    const ffmpegArgs = await createCommand(files, fx, numFiles, numFx);
    
    return new Promise((resolve, reject) => {
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
    cleanup(); // Clean up any existing temp files
    usage();
    parseArguments();
    readConfig();
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    }).finally(() => {
        cleanup(); // Clean up temp files
    });
}
