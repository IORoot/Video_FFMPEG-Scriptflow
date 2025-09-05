#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │          Trim a group of videos from the start / end proportionally          │
 * │                       to fit a specified video length.                       │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

const DEBUG = process.env.DEBUG === '1';

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "input.mp4";
let OUTPUT_FILENAME = "ff_grouptime.mp4";
let ARRANGEMENT = "standard";
let DURATION = "60";
let LOGLEVEL = "error";
let TMP_FILE = path.join(os.tmpdir(), "tmp_ffmpeg_grouptime_list.txt");
let TMP_SUFFIX = "trimmed";
let INTERMEDIATE_FILENAME = path.join(os.tmpdir(), "intermediate.mp4");
let PIPE = "concat:";
let GREP = "";
let inputFiles = [];

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
    console.log(" $0 -i <INPUT_FILE> [-d <DURATION>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Trim input videos by a percentage on start and end to get output video to correct duration.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_FILE>");
    console.log("\tThe name of an input file / folder. Multiple inputs supported.");
    console.log("\tUse --input1, --input2, etc. for multiple files.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -a | --arrangement <ORDER>");
    console.log("\tThe order to read the input files.");
    console.log("\tOptions:");
    console.log("\tstandard - standard first-to-last 1,2,3,4. (default)");
    console.log("\treversed - last-to-first 4,3,2,1.");
    console.log("\tskip1 - 2,3,4,1. You can use 'skipx', where x is any number.");
    console.log("\tskip1reversed - 1,4,3,2. Combination of keywords");
    console.log("\trandom - 4,1,3,2. Random order");
    console.log("\teven - 2,4,1,3. Evens first, then odds.");
    console.log("\todd - 1,3,2,4. Odds first, then evens.\n");

    console.log(" -d | --duration <DURATION>");
    console.log("\tThe final duration of the output file in seconds. Default is 60. \n");

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
            case '--input1':
            case '--input2':
            case '--input3':
            case '--input4':
                writeToTemp(path.resolve(nextArg));
                i++;
                break;

            case '-o':
            case '--output':
                OUTPUT_FILENAME = nextArg;
                i++;
                break;

            case '-a':
            case '--arrangement':
                ARRANGEMENT = nextArg;
                i++;
                break;

            case '-d':
            case '--duration':
                DURATION = nextArg;
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
        if (config.input) writeToTemp(path.resolve(config.input));
        if (config.input1) writeToTemp(path.resolve(config.input1));
        if (config.input2) writeToTemp(path.resolve(config.input2));
        if (config.input3) writeToTemp(path.resolve(config.input3));
        if (config.input4) writeToTemp(path.resolve(config.input4));
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.arrangement) ARRANGEMENT = config.arrangement;
        if (config.duration) DURATION = config.duration;
        if (config.grep) GREP = config.grep;
        if (config.loglevel) LOGLEVEL = config.loglevel;

    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Write the absolute path into the temporary file      │
// ╰──────────────────────────────────────────────────────────╯
function writeToTemp(file) {
    // if this is a folder
    if (fs.statSync(file).isDirectory()) {
        const files = fs.readdirSync(file)
            .filter(filename => {
                const ext = path.extname(filename).toLowerCase();
                return (ext === '.mp4' || ext === '.mov') && 
                       (!GREP || new RegExp(GREP).test(filename));
            })
            .sort()
            .map(filename => path.join(file, filename));

        files.forEach(filePath => {
            preFlightChecks(filePath);
            inputFiles.push(filePath);
        });
    } else {
        // check files
        preFlightChecks(file);
        inputFiles.push(file);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                         Cleanup                          │
// ╰──────────────────────────────────────────────────────────╯
function cleanup() {
    try {
        // Remove temporary files
        const tmpFiles = fs.readdirSync(os.tmpdir())
            .filter(file => file.startsWith(TMP_SUFFIX) || file.startsWith('intermediate'));
        
        tmpFiles.forEach(file => {
            fs.unlinkSync(path.join(os.tmpdir(), file));
        });

        // Remove temp file
        if (fs.existsSync(TMP_FILE)) {
            fs.unlinkSync(TMP_FILE);
        }

        // Remove intermediate file
        if (fs.existsSync(INTERMEDIATE_FILENAME)) {
            fs.unlinkSync(INTERMEDIATE_FILENAME);
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
        if (inputFiles.length > 0 && fs.existsSync(inputFiles[0])) {
            fs.copyFileSync(inputFiles[0], OUTPUT_FILENAME);
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

// ╭──────────────────────────────────────────────────────────────────────────────╮
// │     Rearrange the order of the file to group videos in different orders      │
// ╰──────────────────────────────────────────────────────────────────────────────╯
function rearrangeOrder() {
    if (ARRANGEMENT.includes('even')) {
        const evens = [];
        const odds = [];
        inputFiles.forEach((file, index) => {
            if (index % 2 === 1) evens.push(file);
            else odds.push(file);
        });
        inputFiles = [...evens, ...odds];
    }

    if (ARRANGEMENT.includes('odd')) {
        const evens = [];
        const odds = [];
        inputFiles.forEach((file, index) => {
            if (index % 2 === 0) odds.push(file);
            else evens.push(file);
        });
        inputFiles = [...odds, ...evens];
    }

    if (ARRANGEMENT.includes('skip')) {
        const skipMatch = ARRANGEMENT.match(/skip(\d+)/);
        if (skipMatch) {
            const skipNumber = parseInt(skipMatch[1]);
            const skipped = inputFiles.slice(0, skipNumber);
            const remaining = inputFiles.slice(skipNumber);
            inputFiles = [...remaining, ...skipped];
        }
    }

    if (ARRANGEMENT.includes('reversed')) {
        inputFiles.reverse();
    }

    if (ARRANGEMENT.includes('random')) {
        // Fisher-Yates shuffle
        for (let i = inputFiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [inputFiles[i], inputFiles[j]] = [inputFiles[j], inputFiles[i]];
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │       find full duration of all clips together.          │
// ╰──────────────────────────────────────────────────────────╯
function getFullDuration() {
    let totalDuration = 0;

    inputFiles.forEach(file => {
        try {
            const output = execSync(`ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            const fileDuration = parseFloat(output.trim());
            totalDuration += fileDuration;
        } catch (error) {
            console.error(`Error getting duration for ${file}:`, error.message);
        }
    });

    console.log(`⏳ ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Duration", totalDuration.toFixed(2));
    return totalDuration;
}

// ╭──────────────────────────────────────────────────────────────────────────────╮
// │ For each file calculate the percentage it takes up and the amount to remove  │
// ╰──────────────────────────────────────────────────────────────────────────────╯
async function trimIntermediates(totalDuration) {
    const oneSecondInPercent = 100 / totalDuration;
    const timeToRemove = totalDuration - parseFloat(DURATION);
    const onePercentToRemove = timeToRemove / 100;

    if (totalDuration >= parseFloat(DURATION)) {
        let loop = 1;

        for (const file of inputFiles) {
            try {
                const output = execSync(`ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                const fileDuration = parseFloat(output.trim());
                const percentageOfTotal = oneSecondInPercent * fileDuration;
                const amountToRemove = onePercentToRemove * percentageOfTotal;
                const halfAmountToRemove = amountToRemove / 2;

                console.log(`📥 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Input", file);
                console.log(`📏 ${colors.TEXT_BLUE_600}%-10s :${colors.TEXT_RESET} %s secs`, "Length", fileDuration.toFixed(2));
                console.log(`💯 ${colors.TEXT_YELLOW_500}%-10s :${colors.TEXT_RESET} %s %%`, "Percentage", percentageOfTotal.toFixed(2));
                console.log(`🔪 ${colors.TEXT_ORANGE_500}%-10s :${colors.TEXT_RESET} %s secs from start & end.`, "Removing", halfAmountToRemove.toFixed(2));
                console.log("---");

                const start = formatTime(halfAmountToRemove);
                const halfFromEnd = fileDuration - halfAmountToRemove;
                const end = formatTime(halfFromEnd);

                const newBasepath = path.dirname(file);
                const newBasename = path.basename(file);
                const trimmedFile = path.join(newBasepath, `${TMP_SUFFIX}_${newBasename}`);

                // Trim file to desired length
                await runFFMPEG([
                    '-y', '-v', LOGLEVEL, '-i', file, 
                    '-ss', start, '-to', end, trimmedFile
                ]);

                // Create intermediate file
                const intermediateFile = path.join(os.tmpdir(), `intermediate${loop}.ts`);
                await runFFMPEG([
                    '-y', '-v', LOGLEVEL, '-i', trimmedFile, 
                    '-c', 'copy', intermediateFile
                ]);

                // Remove the trimmed file
                fs.unlinkSync(trimmedFile);

                loop++;
            } catch (error) {
                console.error(`Error processing ${file}:`, error.message);
            }
        }
    }
}

// ╭──────────────────────────────────────────────────────────────────────────────╮
// │         Only run this if the clips are less than duration required.          │
// ╰──────────────────────────────────────────────────────────────────────────────╯
async function createIntermediates() {
    let loop = 1;
    for (const file of inputFiles) {
        try {
            const intermediateFile = path.join(os.tmpdir(), `intermediate${loop}.ts`);
            await runFFMPEG([
                '-y', '-v', LOGLEVEL, '-i', file, 
                '-c', 'copy', intermediateFile
            ]);
            loop++;
        } catch (error) {
            console.error(`Error creating intermediate for ${file}:`, error.message);
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │  Concat all files together to make approx output video.   │
// ╰──────────────────────────────────────────────────────────╯
async function concatAndTrim() {
    try {
        // Create a concat file for FFMPEG
        const concatFile = path.join(os.tmpdir(), 'concat.txt');
        let concatContent = '';
        
        // Find all intermediate files
        const tmpFiles = fs.readdirSync(os.tmpdir())
            .filter(file => file.startsWith('intermediate') && file.endsWith('.ts'))
            .sort((a, b) => {
                const aNum = parseInt(a.match(/intermediate(\d+)\.ts/)[1]);
                const bNum = parseInt(b.match(/intermediate(\d+)\.ts/)[1]);
                return aNum - bNum;
            });
        
        tmpFiles.forEach(file => {
            concatContent += `file '${path.join(os.tmpdir(), file)}'\n`;
        });
        
        fs.writeFileSync(concatFile, concatContent);
        
        if (DEBUG) {
            console.log('Concat file content:', concatContent);
        }

        // Concat files
        await runFFMPEG([
            '-y', '-v', LOGLEVEL, '-f', 'concat', '-safe', '0', 
            '-i', concatFile, '-c', 'copy', INTERMEDIATE_FILENAME
        ]);

        // Ensure output filename has .mp4 extension if not specified
        let outputWithExt = OUTPUT_FILENAME;
        if (!path.extname(OUTPUT_FILENAME)) {
            outputWithExt = `${OUTPUT_FILENAME}.mp4`;
        }

        // Only trim if the intermediate file is longer than the target duration
        const intermediateDuration = getVideoDuration(INTERMEDIATE_FILENAME);
        if (intermediateDuration > parseFloat(DURATION)) {
            // Trim to exact time
            const finalEnd = formatTime(parseFloat(DURATION));
            
            await runFFMPEG([
                '-y', '-v', LOGLEVEL, '-i', INTERMEDIATE_FILENAME, 
                '-ss', '00:00:00', '-to', finalEnd, outputWithExt
            ]);
        } else {
            // Just copy the intermediate file to output
            fs.copyFileSync(INTERMEDIATE_FILENAME, outputWithExt);
        }

        const output = execSync(`ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputWithExt}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        const newFileDuration = parseFloat(output.trim());

        console.log(`⏲️  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s secs`, "New Length", newFileDuration.toFixed(2));
        console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", outputWithExt);
        
        // Clean up concat file
        fs.unlinkSync(concatFile);
    } catch (error) {
        console.error('Error in concat and trim:', error.message);
        process.exit(1);
    }
}

// Helper function to run FFMPEG commands
function runFFMPEG(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`FFMPEG process exited with code ${code}: ${stderr}`));
            } else {
                resolve();
            }
        });

        ffmpeg.on('error', (error) => {
            reject(new Error(`Failed to start FFMPEG process: ${error.message}`));
        });
    });
}

// Helper function to format time
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Helper function to get video duration
function getVideoDuration(filePath) {
    try {
        const output = execSync(`ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return parseFloat(output.trim());
    } catch (error) {
        console.error(`Error getting duration for ${filePath}:`, error.message);
        return 0;
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    if (inputFiles.length === 0) {
        console.log("❌ No input file specified. Exiting.");
        exitGracefully();
    }

    rearrangeOrder();

    const totalDuration = getFullDuration();

    if (totalDuration >= parseFloat(DURATION)) {
        await trimIntermediates(totalDuration);
    } else {
        await createIntermediates();
    }
    
    await concatAndTrim();
}

// Setup cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
});
process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});

// Check if help is requested
if (process.argv.includes('--help')) {
    usage();
}

// Parse arguments and run
arguments();
main().catch(error => {
    console.error('Error:', error.message);
    cleanup();
    process.exit(1);
});
