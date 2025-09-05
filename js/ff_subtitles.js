#!/usr/bin/env node
// ╭───────────────────────────────────────────────────────────────────────────╮
// │                                                                           │
// │                       Embed subtitles over a video                        │
// │                                                                           │
// ╰───────────────────────────────────────────────────────────────────────────╯

// More information : https://aegisub.org/docs/3.2/ASS_Tags/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

// set -o errexit                                              // If a command fails bash exits.
// set -o pipefail                                             // pipeline fails on one command.
if (process.env.DEBUG === "1") { console.trace(); }        // DEBUG=1 will show debugging.

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_FILENAME = "";
let SUBTITLE_FILENAME = "";
let OUTPUT_FILENAME = "ff_subtitle.mp4";
let LOGLEVEL = "error";
let ASS_FILE = "subtitles.ass";
let STYLE = "";
let REMOVEDUPES = "";
let DYNAMICTEXT = "";
let CONFIG_FILE = "";

// ╭──────────────────────────────────────────────────────────╮
// │                          Usage.                          │
// ╰──────────────────────────────────────────────────────────╯

function usage() {
    if (process.argv.length < 3) {
        console.log("ℹ️ Usage:");
        console.log(" $0 -i <INPUT_FILE> -s <SUBTITLE_FILENAME> -f <FORCED_STYLE> [-o <OUTPUT_FILE>] [-l loglevel]\n");
        
        console.log("Summary:");
        console.log("Hard embed subtitles on the video. Change styles and features.\n");
        
        console.log("Flags:");
        
        console.log(" -i | --input <INPUT_FILE>");
        console.log("\tThe name of an input file.\n");
        
        console.log(" -s | --subtitles <INPUT_FILE>");
        console.log("\tThe name of an subtitle SRT file.\n");
        
        console.log(" -f | --styles <FORCE_STYLE>");
        console.log("\tThe Forced Style for the subtitles.\n");
        
        console.log(" -r | --removedupes");
        console.log("\tRemove any duplicate lines in the subtitles file.\n");
        
        console.log(" -d | --dynamictext");
        console.log("\tConvert subtitles into dynamic text. Splits all lines into single words.\n");
        
        console.log(" -o | --output <OUTPUT_FILE>");
        console.log(`\tDefault is ${OUTPUT_FILENAME}`);
        console.log("\tThe name of the output file.\n");
        
        console.log(" -C | --config <CONFIG_FILE>");
        console.log("\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n");
        
        console.log(" -l | --loglevel <LOGLEVEL>");
        console.log("\tThe FFMPEG loglevel to use. Default is 'error' only.");
        console.log("\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n");
        
        process.exit(0);
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
                
            case '-s':
            case '--subtitles':
                SUBTITLE_FILENAME = path.resolve(args[i + 1]);
                i += 2;
                break;
                
            case '-f':
            case '--styles':
                STYLE = args[i + 1];
                i += 2;
                break;
                
            case '-r':
            case '--removedupes':
                REMOVEDUPES = "TRUE";
                i += 1;
                break;
                
            case '-d':
            case '--dynamictext':
                DYNAMICTEXT = "TRUE";
                i += 1;
                break;
                
            case '-o':
            case '--output':
                OUTPUT_FILENAME = args[i + 1];
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
// │         Read config-file if supplied. Requires JQ          │
// ╰──────────────────────────────────────────────────────────╯
function readConfig() {
    // Check if config has been set.
    if (!CONFIG_FILE) return;
    
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract ff_subtitles config
        if (config.ff_subtitles) {
            const subtitlesConfig = config.ff_subtitles;
            
            if (subtitlesConfig.input) {
                // Handle relative paths from config file location
                if (path.isAbsolute(subtitlesConfig.input)) {
                    INPUT_FILENAME = subtitlesConfig.input;
                } else {
                    INPUT_FILENAME = path.resolve(path.dirname(CONFIG_FILE), subtitlesConfig.input);
                }
            }
            
            if (subtitlesConfig.subtitles) {
                if (path.isAbsolute(subtitlesConfig.subtitles)) {
                    SUBTITLE_FILENAME = subtitlesConfig.subtitles;
                } else {
                    SUBTITLE_FILENAME = path.resolve(path.dirname(CONFIG_FILE), subtitlesConfig.subtitles);
                }
            }
            
            if (subtitlesConfig.output) OUTPUT_FILENAME = subtitlesConfig.output;
            if (subtitlesConfig.styles) STYLE = subtitlesConfig.styles;
            if (subtitlesConfig.removedupes) REMOVEDUPES = subtitlesConfig.removedupes;
            if (subtitlesConfig.dynamictext) DYNAMICTEXT = subtitlesConfig.dynamictext;
            if (subtitlesConfig.loglevel) LOGLEVEL = subtitlesConfig.loglevel;
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

function printFlags() {
    console.log(`💬 Subtitle File : ${SUBTITLE_FILENAME}`);
    console.log(`🎨 Styles : ${STYLE}`);
}

function getHeightWidth() {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=height',
            '-of', 'csv=s=x:p=0',
            INPUT_FILENAME
        ]);
        
        let height = '';
        ffprobe.stdout.on('data', (data) => {
            height += data.toString();
        });
        
        ffprobe.on('close', () => {
            const HEIGHT = parseInt(height.trim());
            const HALF_HEIGHT = Math.floor(HEIGHT / 2);
            
            // If MarginV contains "h-", calculate the actual MarginV
            if (STYLE && STYLE.includes('MarginV=h-')) {
                // Extract the value after "h-" from MarginV
                const marginMatch = STYLE.match(/MarginV=h-(\d+)/);
                if (marginMatch) {
                    const marginValue = parseInt(marginMatch[1]);
                    const marginV = HALF_HEIGHT - marginValue;
                    STYLE = STYLE.replace(`MarginV=h-${marginValue}`, `MarginV=${marginV}`);
                }
            }
            
            resolve();
        });
    });
}

// ╭───────────────────────────────────────────────────────╮
// │                                                       │
// │     ASS Files have more ability to change styles      │
// │                                                       │
// ╰───────────────────────────────────────────────────────╯
function convertToAssFile() {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-i', SUBTITLE_FILENAME, ASS_FILE]);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Failed to convert to ASS file: ${code}`));
            }
        });
        
        ffmpeg.on('error', (error) => {
            reject(error);
        });
    });
}

// ╭──────────────────────────────────────────────────────────────────────────╮
// │                                                                          │░
// │             REMOVE DUPLICATE LINES AND CLEANUP SUBTITLE FILE             │░
// │                                                                          │░
// ╰░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function removeDupes() {
    try {
        const content = fs.readFileSync(SUBTITLE_FILENAME, 'utf8');
        const lines = content.split('\n');
        const seen = new Set();
        const cleanedLines = [];
        
        // Remove duplicate lines
        for (const line of lines) {
            if (!seen.has(line)) {
                seen.add(line);
                cleanedLines.push(line);
            }
        }
        
        // Remove empty lines
        const noEmptyLines = cleanedLines.filter(line => line.trim() !== '');
        
        // Add newlines above each block number
        const withNewlines = [];
        for (let i = 0; i < noEmptyLines.length; i++) {
            const line = noEmptyLines[i];
            if (/^\d+$/.test(line)) {
                withNewlines.push(''); // Add empty line before block number
            }
            withNewlines.push(line);
        }
        
        // Remove blank blocks (simplified version)
        const finalLines = [];
        for (let i = 0; i < withNewlines.length; i++) {
            const line = withNewlines[i];
            if (/^\d+$/.test(line)) {
                // This is a block number
                const timeLine = withNewlines[i + 1];
                const textLine = withNewlines[i + 2];
                
                if (timeLine && timeLine.includes('-->') && textLine && textLine.trim() !== '') {
                    finalLines.push('');
                    finalLines.push(line);
                    finalLines.push(timeLine);
                    finalLines.push(textLine);
                    i += 2; // Skip the processed lines
                }
            } else if (line.trim() !== '') {
                finalLines.push(line);
            }
        }
        
        // Add newlines above each block
        const result = [];
        for (let i = 0; i < finalLines.length; i++) {
            const line = finalLines[i];
            if (/^\d+$/.test(line)) {
                result.push('');
            }
            result.push(line);
        }
        
        fs.writeFileSync(SUBTITLE_FILENAME, result.join('\n'));
        fs.copyFileSync(SUBTITLE_FILENAME, `${SUBTITLE_FILENAME}.dedup`);
        
    } catch (error) {
        console.error('Error removing duplicates:', error.message);
        throw error;
    }
}

// ╭──────────────────────────────────────────────────────────────────────────╮
// │                                                                          │░
// │                         CONVERT TO DYNAMIC TEXT                          │░
// │                 CONVERTS LINES TO ONE-WORD PER SUBTITLE                  │░
// │                                                                          │░
// ╰░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function timestampToSeconds(timestamp) {
    const parts = timestamp.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const sParts = parts[2].split(',');
    const s = parseInt(sParts[0]);
    const ms = parseInt(sParts[1]);
    
    return (h * 3600) + (m * 60) + s + (ms / 1000);
}

function secondsToTimestamp(totalSeconds) {
    if (totalSeconds === 0) {
        return "00:00:00,000";
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const remainder = totalSeconds % 3600;
    const minutes = Math.floor(remainder / 60);
    const seconds = remainder % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function dynamicText() {
    try {
        const content = fs.readFileSync(SUBTITLE_FILENAME, 'utf8');
        const lines = content.split('\n');
        const output = [];
        let loop = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (/^\d+$/.test(line)) {
                // This is a block number
                const blockNumber = line;
                
                // Find the timestamp line
                let j = i + 1;
                while (j < lines.length && !lines[j].includes('-->')) {
                    j++;
                }
                
                if (j < lines.length) {
                    const timeLine = lines[j];
                    const startTime = timeLine.split(' --> ')[0];
                    const endTime = timeLine.split(' --> ')[1];
                    
                    // Find the text line
                    let k = j + 1;
                    while (k < lines.length && lines[k].trim() === '') {
                        k++;
                    }
                    
                    if (k < lines.length) {
                        const textLine = lines[k];
                        const words = textLine.split(' ').filter(word => word.trim() !== '');
                        
                        if (words.length > 0) {
                            const startSeconds = timestampToSeconds(startTime);
                            const endSeconds = timestampToSeconds(endTime);
                            const totalDuration = endSeconds - startSeconds;
                            const timePerWord = totalDuration / words.length;
                            
                            let currentTime = startSeconds;
                            
                            for (const word of words) {
                                const nextTime = currentTime + timePerWord;
                                
                                const currentTimeTimestamp = secondsToTimestamp(currentTime);
                                const nextTimeTimestamp = secondsToTimestamp(nextTime);
                                
                                output.push(loop.toString());
                                output.push(`${currentTimeTimestamp} --> ${nextTimeTimestamp}`);
                                output.push(word);
                                output.push('');
                                
                                currentTime = nextTime;
                                loop++;
                            }
                        }
                    }
                }
                
                // Skip processed lines
                i = j + 1;
                while (i < lines.length && lines[i].trim() !== '') {
                    i++;
                }
            }
        }
        
        fs.writeFileSync(SUBTITLE_FILENAME, output.join('\n'));
        fs.copyFileSync(SUBTITLE_FILENAME, `${SUBTITLE_FILENAME}.dynamictext`);
        
    } catch (error) {
        console.error('Error creating dynamic text:', error.message);
        throw error;
    }
}

// ╭──────────────────────────────────────────────────────────────────────────╮
// │                                                                          │░
// │                              MAIN FUNCTION                               │░
// │                                                                          │░
// ╰░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

async function main() {
    await preFlightChecks();
    
    // Check subtitle filename has been set.
    if (!SUBTITLE_FILENAME) {
        console.log("\t❌ No subtitle file specified. Exiting.");
        exitGracefully();
    }
    
    // Check subtitle file exists.
    if (!fs.existsSync(SUBTITLE_FILENAME)) {
        console.log("\t❌ subtitle file not found. Exiting.");
        exitGracefully();
    }
    
    // Create a working copy of the subtitle file to avoid modifying the original
    const workingSubtitleFile = `${SUBTITLE_FILENAME}.working`;
    fs.copyFileSync(SUBTITLE_FILENAME, workingSubtitleFile);
    
    // Create backup of original subtitle file
    fs.copyFileSync(SUBTITLE_FILENAME, `${SUBTITLE_FILENAME}.original`);
    
    // Update SUBTITLE_FILENAME to point to the working copy
    const originalSubtitleFilename = SUBTITLE_FILENAME;
    SUBTITLE_FILENAME = workingSubtitleFile;
    
    if (REMOVEDUPES) {
        removeDupes();
    }
    
    if (DYNAMICTEXT) {
        removeDupes();
        dynamicText();
    }
    
    await convertToAssFile();
    await getHeightWidth();
    
    printFlags();
    
    return new Promise((resolve, reject) => {
        const ffmpegArgs = ['-v', LOGLEVEL, '-i', INPUT_FILENAME];
        
        if (STYLE) {
            ffmpegArgs.push('-vf', `subtitles=${ASS_FILE}:force_style='${STYLE}'`);
        } else {
            ffmpegArgs.push('-vf', `subtitles=${ASS_FILE}`);
        }
        
        ffmpegArgs.push(OUTPUT_FILENAME);
        
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Output : ${OUTPUT_FILENAME}`);
                // Clean up temporary files
                try {
                    fs.unlinkSync(ASS_FILE);
                    fs.unlinkSync(workingSubtitleFile);
                } catch (error) {
                    // Ignore cleanup errors
                }
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
