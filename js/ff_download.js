#!/usr/bin/env node
/**
 * ╭──────────────────────────────────────────────────────────────────────────────╮
 * │                                                                              │
 * │              Download a video or file to use in the scriptflow                 │
 * │                                                                              │
 * ╰──────────────────────────────────────────────────────────────────────────────╯
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const https = require('https');
const http = require('http');
const url = require('url');

// ╭──────────────────────────────────────────────────────────╮
// │                       Set Defaults                       │
// ╰──────────────────────────────────────────────────────────╯

const DEBUG = process.env.DEBUG === '1';

// ╭──────────────────────────────────────────────────────────╮
// │                        VARIABLES                         │
// ╰──────────────────────────────────────────────────────────╯
let INPUT_URL = "";
let OUTPUT_FILENAME = "ff_download.mp4";
let STRATEGY = "1";
let LOGLEVEL = "error";
let URL_SOURCE = "";
let TMP_FILE = "/tmp/tmp_ff_download_list";
let FILELIST = "./filelist.txt";
let INPUT_URLS = [];

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
    console.log(" $0 -i <INPUT_URL> [-s <STRATEGY>] [-o <OUTPUT_FILE>] [-l loglevel]\n");

    console.log("Summary:");
    console.log("Download videos.\n");

    console.log("Flags:");

    console.log(" -i | --input <INPUT_URL>");
    console.log("\tThe input url to download.\n");

    console.log(" -o | --output <OUTPUT_FILE>");
    console.log(`\tDefault is ${OUTPUT_FILENAME}`);
    console.log("\tThe name of the output file.\n");

    console.log(" -u | --urlsource <FILE_WITH_LIST>");
    console.log("\tA URL of a txt file with a list of all files to use as inputs. Separated one per line.\n");

    console.log(" -s | --strategy <STRATEGY>");
    console.log("\t5\t A number. First 5 videos from inputs. Prefix number on output filename. Default 1.");
    console.log("\t~5\t Tilde(~) followed by a number. Random 5 videos from inputs. Prefix number on output filename.\n");

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
            case '--input?':
            case '--input??':
            case '--input???':
                writeToTemp(nextArg);
                i++;
                break;

            case '-u':
            case '--urlsource':
                URL_SOURCE = nextArg;
                i++;
                break;

            case '-o':
            case '--output':
                OUTPUT_FILENAME = nextArg;
                i++;
                break;

            case '-s':
            case '--strategy':
                STRATEGY = nextArg;
                i++;
                break;

            case '-l':
            case '--loglevel':
                LOGLEVEL = nextArg;
                i++;
                break;

            case '-C':
            case '--config':
                readConfig(nextArg);
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
// │         Read config-file if supplied.                   │
// ╰──────────────────────────────────────────────────────────╯
function readConfig(configFile) {
    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);

        // Apply config values
        if (config.input) writeToTemp(config.input);
        if (config.output) OUTPUT_FILENAME = config.output;
        if (config.strategy) STRATEGY = config.strategy;
        if (config.urlsource) URL_SOURCE = config.urlsource;
        if (config.loglevel) LOGLEVEL = config.loglevel;

    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │         Reads the URL txt file and creates inputs        │
// ╰──────────────────────────────────────────────────────────╯
async function readUrlInputList() {
    if (!URL_SOURCE) return;

    try {
        // Download txt file
        await downloadFile(URL_SOURCE, FILELIST);

        // Check if file exists
        if (!fs.existsSync(FILELIST)) return;

        // Get the directory URL
        const dirName = path.dirname(URL_SOURCE);

        // Read file and append inputs
        const fileContent = fs.readFileSync(FILELIST, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());

        for (const line of lines) {
            writeToTemp(`${dirName}/${line}`);
        }

    } catch (error) {
        console.error(`Error reading URL input list: ${error.message}`);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │     Write the absolute path into the temporary file       │
// ╰──────────────────────────────────────────────────────────╯
function writeToTemp(file) {
    fs.appendFileSync(TMP_FILE, `${file}\n`);
    INPUT_URLS.push(file);
}

// ╭──────────────────────────────────────────────────────────╮
// │   Exit the app by just skipping the ffmpeg processing.   │
// │            Then copy the input to the output.            │
// ╰──────────────────────────────────────────────────────────╯
function exitGracefully() {
    try {
        if (fs.existsSync(INPUT_URL)) {
            fs.copyFileSync(INPUT_URL, OUTPUT_FILENAME);
        }
    } catch (error) {
        console.error(`Error copying file: ${error.message}`);
    }
    process.exit(0);
}

// ╭──────────────────────────────────────────────────────────╮
// │                    Download File Function                │
// ╰──────────────────────────────────────────────────────────╯
function downloadFile(urlString, outputPath) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(urlString);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const request = protocol.get(urlString, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(outputPath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });

            file.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Delete the file async
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │                    Configure Strategy                    │
// ╰──────────────────────────────────────────────────────────╯
function configureStrategy() {
    // If it's a number, take top X
    if (/^\d+$/.test(STRATEGY)) {
        const limit = parseInt(STRATEGY);
        INPUT_URLS = INPUT_URLS.slice(0, limit);
    }

    // If it's a tilde ~ followed by a number, randomize and take top X
    if (/^~\d+$/.test(STRATEGY)) {
        const limit = parseInt(STRATEGY.substring(1));
        // Shuffle array
        for (let i = INPUT_URLS.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [INPUT_URLS[i], INPUT_URLS[j]] = [INPUT_URLS[j], INPUT_URLS[i]];
        }
        INPUT_URLS = INPUT_URLS.slice(0, limit);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                         Cleanup                          │
// ╰──────────────────────────────────────────────────────────╯
function cleanup() {
    try {
        if (fs.existsSync(TMP_FILE)) {
            fs.unlinkSync(TMP_FILE);
        }
        if (fs.existsSync(FILELIST)) {
            fs.unlinkSync(FILELIST);
        }
    } catch (error) {
        // Ignore cleanup errors
    }
}

function printFlags() {
    console.log(`1️⃣  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Strategy", STRATEGY);
    console.log(`2️⃣  ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "URL Src", URL_SOURCE);
}

// ╭──────────────────────────────────────────────────────────╮
// │                                                          │
// │                      Main Function                       │
// │                                                          │
// ╰──────────────────────────────────────────────────────────╯
async function main() {
    printFlags();

    configureStrategy();

    let loop = 1;
    for (const fileUrl of INPUT_URLS) {
        // Filename
        const outputFile = `${loop}_${OUTPUT_FILENAME}`;

        // Print to screen
        console.log(`📥 ${colors.TEXT_GREEN_400}%-10s :${colors.TEXT_RESET} %s`, "Input", fileUrl);

        try {
            // Download
            await downloadFile(fileUrl, outputFile);
            console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Downloaded", outputFile);
        } catch (error) {
            console.error(`❌ Failed to download ${fileUrl}: ${error.message}`);
        }

        // Iterate
        loop++;
    }

    console.log(`✅ ${colors.TEXT_PURPLE_500}%-10s :${colors.TEXT_RESET} %s`, "Output", OUTPUT_FILENAME);
}

// Check if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
}

// Set up cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Parse arguments and run
arguments();
(async () => {
    await readUrlInputList();
    await main();
    cleanup();
})();
