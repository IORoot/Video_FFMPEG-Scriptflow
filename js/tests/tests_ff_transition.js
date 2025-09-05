#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_transition.js                            │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                        Test Setup                        │
// ╰──────────────────────────────────────────────────────────╯

const TEST_DIR = path.join(__dirname, '..', 'tests');
const SAMPLE_VIDEO1 = path.join(TEST_DIR, 'samples', 'sample_video.mp4');
const SAMPLE_VIDEO2 = path.join(TEST_DIR, 'samples', 'sample_video2.mp4');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Basic transition with fade",
        config: {
            ff_transition: {
                description: "Create transition between two videos with fade effect",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_basic.mp4"
            }
        }
    },
    {
        name: "Custom transition duration",
        config: {
            ff_transition: {
                description: "Create transition with custom duration",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_duration.mp4",
                duration: "2"
            }
        }
    },
    {
        name: "Multiple transition effects",
        config: {
            ff_transition: {
                description: "Create transitions with multiple effects",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_effects.mp4",
                effects: "fade,wipeleft"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_transition: {
                description: "Create transition with verbose logging",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic transition",
        config: {
            ff_transition: {
                description: "Create basic transition using JSON",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom effects and duration",
        config: {
            ff_transition: {
                description: "Create transition with custom effects and duration using JSON",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4')
                ],
                output: "transition_custom_json.mp4",
                effects: "fade,wipeleft,slideright",
                duration: "1.5"
            }
        }
    },
    {
        name: "JSON config - Multiple videos with transitions",
        config: {
            ff_transition: {
                description: "Create transitions between multiple videos using JSON",
                input: [
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                    path.join(TEST_DIR, 'samples', 'sample_video.mp4')
                ],
                output: "transition_multiple_json.mp4",
                effects: "fade,wipeleft",
                duration: "1"
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

// Utility function to get video duration using ffprobe
function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
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
        
        let videoData = '';
        
        widthProbe.stdout.on('data', (data) => {
            videoData += data.toString();
        });
        
        widthProbe.on('close', (code) => {
            if (code === 0) {
                const props = videoData.trim().split(',');
                resolve({
                    width: parseInt(props[0]),
                    height: parseInt(props[1]),
                    frameRate: props[2],
                    videoCodec: props[3]
                });
            } else {
                reject(new Error(`Failed to get video properties for ${filePath}`));
            }
        });
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
        // Run the ff_transition.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_transition.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_transition.output);
        const fileInfo = getFileInfo(outputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file was not created: ${outputFile}`);
            return false;
        }
        
        // Get video properties to verify transition
        const properties = await getVideoProperties(outputFile);
        const duration = await getVideoDuration(outputFile);
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📁 Output: ${path.basename(outputFile)}`);
        console.log(`   📐 Dimensions: ${properties.width}x${properties.height}`);
        console.log(`   🎬 Video codec: ${properties.videoCodec}`);
        console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
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
    console.log("🚀 Starting ff_transition.js test suite\n");
    
    // Check if sample files exist
    if (!fs.existsSync(SAMPLE_VIDEO1)) {
        console.log(`❌ Sample video 1 not found: ${SAMPLE_VIDEO1}`);
        console.log("Please ensure the sample videos exist in the tests/samples directory.");
        process.exit(1);
    }
    
    if (!fs.existsSync(SAMPLE_VIDEO2)) {
        console.log(`❌ Sample video 2 not found: ${SAMPLE_VIDEO2}`);
        console.log("Please ensure the sample videos exist in the tests/samples directory.");
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
