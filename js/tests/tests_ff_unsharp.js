#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_unsharp.js                              │
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
        name: "Basic unsharp mask",
        config: {
            ff_unsharp: {
                description: "Apply basic unsharp mask with default settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_basic.mp4"
            }
        }
    },
    {
        name: "Custom luma settings",
        config: {
            ff_unsharp: {
                description: "Apply unsharp mask with custom luma settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_luma.mp4",
                lx: "7",
                ly: "7",
                la: "1.5"
            }
        }
    },
    {
        name: "Custom chroma settings",
        config: {
            ff_unsharp: {
                description: "Apply unsharp mask with custom chroma settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_chroma.mp4",
                cx: "3",
                cy: "3",
                ca: "0.5"
            }
        }
    },
    {
        name: "Custom alpha settings",
        config: {
            ff_unsharp: {
                description: "Apply unsharp mask with custom alpha settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_alpha.mp4",
                ax: "9",
                ay: "9",
                aa: "0.3"
            }
        }
    },
    {
        name: "Blur effect (negative values)",
        config: {
            ff_unsharp: {
                description: "Apply blur effect using negative unsharp values",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_blur.mp4",
                la: "-0.5",
                ca: "-0.2"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_unsharp: {
                description: "Apply unsharp mask with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic unsharp",
        config: {
            ff_unsharp: {
                description: "Apply basic unsharp mask using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom settings",
        config: {
            ff_unsharp: {
                description: "Apply unsharp mask with custom settings using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_custom_json.mp4",
                lx: "5",
                ly: "5",
                la: "2.0",
                cx: "3",
                cy: "3",
                ca: "0.5"
            }
        }
    },
    {
        name: "JSON config - Maximum sharpening",
        config: {
            ff_unsharp: {
                description: "Apply maximum sharpening using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "unsharp_max_json.mp4",
                lx: "11",
                ly: "11",
                la: "3.0",
                cx: "5",
                cy: "5",
                ca: "1.0"
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
        // Run the ff_unsharp.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_unsharp.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_unsharp.output);
        const fileInfo = getFileInfo(outputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file was not created: ${outputFile}`);
            return false;
        }
        
        // Get video properties to verify unsharp processing
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
    console.log("🚀 Starting ff_unsharp.js test suite\n");
    
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
