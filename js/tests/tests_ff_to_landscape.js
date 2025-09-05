#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_to_landscape.js                         │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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
        name: "Basic landscape conversion",
        config: {
            ff_to_landscape: {
                description: "Convert video to landscape orientation",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_basic.mp4"
            }
        }
    },
    {
        name: "Custom rotation (90 clockwise)",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape with 90 degree clockwise rotation",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_rotate1.mp4",
                rotate: "1"
            }
        }
    },
    {
        name: "Custom rotation (90 counter-clockwise)",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape with 90 degree counter-clockwise rotation",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_rotate2.mp4",
                rotate: "2"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic landscape",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom rotation",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape with custom rotation using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_custom_json.mp4",
                rotate: "1"
            }
        }
    },
    {
        name: "JSON config - Verbose logging",
        config: {
            ff_to_landscape: {
                description: "Convert to landscape with verbose logging using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "landscape_verbose_json.mp4",
                loglevel: "warning"
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

// Utility function to get video dimensions using ffprobe
function getVideoDimensions(filePath) {
    return new Promise((resolve, reject) => {
        const widthProbe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width',
            '-of', 'csv=p=0',
            filePath
        ]);
        
        const heightProbe = spawn('ffprobe', [
            '-v', 'quiet',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=height',
            '-of', 'csv=p=0',
            filePath
        ]);
        
        let width = '';
        let height = '';
        
        widthProbe.stdout.on('data', (data) => {
            width += data.toString();
        });
        
        heightProbe.stdout.on('data', (data) => {
            height += data.toString();
        });
        
        Promise.all([
            new Promise((resolve) => widthProbe.on('close', resolve)),
            new Promise((resolve) => heightProbe.on('close', resolve))
        ]).then(() => {
            const parsedWidth = parseInt(width.trim());
            const parsedHeight = parseInt(height.trim());
            resolve({ width: parsedWidth, height: parsedHeight });
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
        // Run the ff_to_landscape.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_to_landscape.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_to_landscape.output);
        const fileInfo = getFileInfo(outputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file was not created: ${outputFile}`);
            return false;
        }
        
        // Get video dimensions to verify orientation
        const dimensions = await getVideoDimensions(outputFile);
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📁 Output: ${path.basename(outputFile)}`);
        console.log(`   📐 Dimensions: ${dimensions.width}x${dimensions.height}`);
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
    console.log("🚀 Starting ff_to_landscape.js test suite\n");
    
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
