#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_transcode.js                             │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { comprehensiveCleanup } = require('./test_cleanup');

// ╭──────────────────────────────────────────────────────────╮
// │                        Test Setup                        │
// ╰──────────────────────────────────────────────────────────╯

const TEST_DIR = path.join(__dirname, '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'samples', 'sample_video.mp4');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Basic transcode",
        config: {
            ff_transcode: {
                description: "Basic video transcoding with default settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_basic.mp4"
            }
        }
    },
    {
        name: "Custom video codec",
        config: {
            ff_transcode: {
                description: "Transcode with custom video codec",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_video.mp4",
                video: "libx265"
            }
        }
    },
    {
        name: "Custom audio codec",
        config: {
            ff_transcode: {
                description: "Transcode with custom audio codec",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_audio.mp4",
                audio: "mp3"
            }
        }
    },
    {
        name: "Custom FPS",
        config: {
            ff_transcode: {
                description: "Transcode with custom frame rate",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_fps.mp4",
                fps: "24"
            }
        }
    },
    {
        name: "Custom dimensions",
        config: {
            ff_transcode: {
                description: "Transcode with custom dimensions",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_dimensions.mp4",
                width: "1280",
                height: "720"
            }
        }
    },
    {
        name: "Custom SAR",
        config: {
            ff_transcode: {
                description: "Transcode with custom sample aspect ratio",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_sar.mp4",
                sar: "16/9"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_transcode: {
                description: "Transcode with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic transcode",
        config: {
            ff_transcode: {
                description: "Basic transcode using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom settings",
        config: {
            ff_transcode: {
                description: "Transcode with custom settings using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_custom_json.mp4",
                video: "libx265",
                audio: "aac",
                fps: "25",
                width: "1920",
                height: "1080"
            }
        }
    },
    {
        name: "JSON config - HD settings",
        config: {
            ff_transcode: {
                description: "Transcode to HD with custom settings using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "transcode_hd_json.mp4",
                video: "libx264",
                audio: "aac",
                fps: "30",
                width: "1920",
                height: "1080",
                sar: "1/1"
            }
        }
    }
];

// ╭──────────────────────────────────────────────────────────╮
// │                    Utility Functions                     │
// ╰──────────────────────────────────────────────────────────╯

// Utility function to check if file exists and get size
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

// Utility function to get video properties using ffprobe
function getVideoProperties(filePath) {
    return new Promise((resolve, reject) => {
        const widthProbe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
            '-of', 'csv=p=0',
            filePath
        ]);
        
        const audioProbe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'a:0',
            '-show_entries', 'stream=codec_name',
            '-of', 'csv=p=0',
            filePath
        ]);
        
        let videoData = '';
        let audioData = '';
        
        widthProbe.stdout.on('data', (data) => {
            videoData += data.toString();
        });
        
        audioProbe.stdout.on('data', (data) => {
            audioData += data.toString();
        });
        
        Promise.all([
            new Promise((resolve) => widthProbe.on('close', resolve)),
            new Promise((resolve) => audioProbe.on('close', resolve))
        ]).then(() => {
            const videoProps = videoData.trim().split(',');
            const audioProps = audioData.trim();
            
            resolve({
                width: parseInt(videoProps[0]),
                height: parseInt(videoProps[1]),
                frameRate: videoProps[2],
                videoCodec: videoProps[3],
                audioCodec: audioProps
            });
        }).catch(reject);
    });
}

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Execution                       │
// ╰──────────────────────────────────────────────────────────╯

// Run a single test
async function runTest(testConfig) {
    console.log(`\n🧪 Running test: ${testConfig.name}`);
    
    // Create temporary config file
    const configPath = path.join(__dirname, `temp_config_${Date.now()}.json`);
    fs.writeFileSync(configPath, JSON.stringify(testConfig.config, null, 2));
    
    try {
        // Run the ff_transcode.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_transcode.js'),
                '-C', configPath
            ], {
                cwd: __dirname,
                stdio: 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
        
        // Check if script executed successfully
        if (result.code !== 0) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Exit code: ${result.code}`);
            console.log(`   Error: ${result.stderr}`);
            return false;
        }
        
        // Check if output file was created
        const outputFile = path.join(__dirname, testConfig.config.ff_transcode.output);
        const fileInfo = getFileInfo(outputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file was not created: ${outputFile}`);
            return false;
        }
        
        // Get video properties to verify transcoding
        const properties = await getVideoProperties(outputFile);
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📁 Output: ${path.basename(outputFile)}`);
        console.log(`   📐 Dimensions: ${properties.width}x${properties.height}`);
        console.log(`   🎬 Video codec: ${properties.videoCodec}`);
        console.log(`   🎵 Audio codec: ${properties.audioCodec}`);
        console.log(`   📊 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Test failed: ${testConfig.name}`);
        console.log(`   Error: ${error.message}`);
        return false;
    } finally {
        // Clean up temporary config file
        try {
            fs.unlinkSync(configPath);
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Runner                         │
// ╰──────────────────────────────────────────────────────────╯

async function runAllTests() {
    console.log("🚀 Starting ff_transcode.js test suite\n");
    
    // Check if sample files exist
    if (!fs.existsSync(SAMPLE_VIDEO)) {
        console.log(`❌ Sample video not found: ${SAMPLE_VIDEO}`);
        console.log("Please ensure the sample video exists in the tests/samples directory.");
        process.exit(1);
    }
    
    let passedTests = 0;
    let totalTests = testConfigs.length;
    
    for (const testConfig of testConfigs) {
        const passed = await runTest(testConfig);
        if (passed) {
            passedTests++;
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    // Final cleanup - remove all test output files
    const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
    
    if (totalCleaned > 0) {
        console.log(`\n🧹 Final cleanup completed: ${totalCleaned} files removed`);
    }
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed!");
    } else {
        console.log("❌ Some tests failed!");
        process.exit(1);
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                        Entry Point                       │
// ╰──────────────────────────────────────────────────────────╯

if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, runTest, testConfigs };
