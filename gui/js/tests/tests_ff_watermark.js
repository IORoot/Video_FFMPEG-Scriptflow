#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_watermark.js                            │
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
const SAMPLE_IMAGE = path.join(TEST_DIR, 'samples', 'sample_image.png');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Basic watermark",
        config: {
            ff_watermark: {
                description: "Apply basic watermark with default settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_basic.mp4"
            }
        }
    },
    {
        name: "Custom position watermark",
        config: {
            ff_watermark: {
                description: "Apply watermark with custom position",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_position.mp4",
                xpixels: "50",
                ypixels: "50"
            }
        }
    },
    {
        name: "Custom scale watermark",
        config: {
            ff_watermark: {
                description: "Apply watermark with custom scale",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_scale.mp4",
                scale: "0.1"
            }
        }
    },
    {
        name: "Transparent watermark",
        config: {
            ff_watermark: {
                description: "Apply transparent watermark",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_transparent.mp4",
                alpha: "0.5"
            }
        }
    },
    {
        name: "Timed watermark",
        config: {
            ff_watermark: {
                description: "Apply watermark with custom timing",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_timed.mp4",
                start: "2",
                end: "8"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_watermark: {
                description: "Apply watermark with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic watermark",
        config: {
            ff_watermark: {
                description: "Apply basic watermark using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom settings",
        config: {
            ff_watermark: {
                description: "Apply watermark with custom settings using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_custom_json.mp4",
                xpixels: "100",
                ypixels: "100",
                scale: "0.3",
                alpha: "0.7"
            }
        }
    },
    {
        name: "JSON config - Centered watermark",
        config: {
            ff_watermark: {
                description: "Apply centered watermark using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                watermark: path.join(TEST_DIR, 'samples', 'sample_image.png'),
                output: "watermark_centered_json.mp4",
                xpixels: "(W-w)/2",
                ypixels: "(H-h)/2",
                scale: "0.4"
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
        // Run the ff_watermark.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_watermark.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_watermark.output);
        const fileInfo = getFileInfo(outputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file was not created: ${outputFile}`);
            return false;
        }
        
        // Get video properties to verify watermark processing
        const properties = await getVideoProperties(outputFile);
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📁 Output: ${path.basename(outputFile)}`);
        console.log(`   📐 Dimensions: ${properties.width}x${properties.height}`);
        console.log(`   🎬 Video codec: ${properties.videoCodec}`);
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
    console.log("🚀 Starting ff_watermark.js test suite\n");
    
    // Check if sample files exist
    if (!fs.existsSync(SAMPLE_VIDEO)) {
        console.log(`❌ Sample video not found: ${SAMPLE_VIDEO}`);
        console.log("Please ensure the sample video exists in the tests/samples directory.");
        process.exit(1);
    }
    
    if (!fs.existsSync(SAMPLE_IMAGE)) {
        console.log(`❌ Sample image not found: ${SAMPLE_IMAGE}`);
        console.log("Please ensure the sample image exists in the tests/samples directory.");
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
