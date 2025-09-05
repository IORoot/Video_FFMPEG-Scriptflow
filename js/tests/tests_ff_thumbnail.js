#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_thumbnail.js                             │
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
        name: "Basic thumbnail generation",
        config: {
            ff_thumbnail: {
                description: "Generate basic thumbnails with default settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_basic.png"
            }
        }
    },
    {
        name: "Multiple thumbnails",
        config: {
            ff_thumbnail: {
                description: "Generate multiple thumbnails",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_multiple.png",
                count: "5"
            }
        }
    },
    {
        name: "Custom sample size",
        config: {
            ff_thumbnail: {
                description: "Generate thumbnails with custom sample size",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_sample.png",
                sample: "150"
            }
        }
    },
    {
        name: "JPEG output format",
        config: {
            ff_thumbnail: {
                description: "Generate thumbnails in JPEG format",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_jpeg.jpg",
                count: "3"
            }
        }
    },
    {
        name: "Custom loglevel",
        config: {
            ff_thumbnail: {
                description: "Generate thumbnails with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_verbose.png",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic thumbnail",
        config: {
            ff_thumbnail: {
                description: "Generate basic thumbnail using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_basic_json.png"
            }
        }
    },
    {
        name: "JSON config - Multiple thumbnails",
        config: {
            ff_thumbnail: {
                description: "Generate multiple thumbnails using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_multiple_json.png",
                count: "4",
                sample: "200"
            }
        }
    },
    {
        name: "JSON config - Custom format and settings",
        config: {
            ff_thumbnail: {
                description: "Generate thumbnails with custom settings using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "thumbnail_custom_json.jpg",
                count: "6",
                sample: "100"
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

// Utility function to check for thumbnail files with pattern
function checkThumbnailFiles(outputPattern, expectedCount) {
    const directory = path.dirname(outputPattern);
    const filename = path.basename(outputPattern, path.extname(outputPattern));
    const extension = path.extname(outputPattern);
    
    const files = [];
    for (let i = 1; i <= expectedCount; i++) {
        const paddedNumber = i.toString().padStart(2, '0');
        const filePath = path.join(directory, `${filename}-${paddedNumber}${extension}`);
        const fileInfo = getFileInfo(filePath);
        if (fileInfo.exists) {
            files.push({
                path: filePath,
                size: fileInfo.size
            });
        }
    }
    
    return files;
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
        // Run the ff_thumbnail.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_thumbnail.js'),
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
        
        // Get expected count from config
        const expectedCount = parseInt(testConfig.config.ff_thumbnail.count || "3");
        
        // Check for thumbnail files
        const outputPattern = path.join(__dirname, testConfig.config.ff_thumbnail.output);
        const thumbnailFiles = checkThumbnailFiles(outputPattern, expectedCount);
        
        if (thumbnailFiles.length === 0) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   No thumbnail files created`);
            return false;
        }
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📸 Thumbnails created: ${thumbnailFiles.length}/${expectedCount}`);
        
        // Display file info for each thumbnail
        thumbnailFiles.forEach((file, index) => {
            console.log(`   📁 ${path.basename(file.path)}: ${(file.size / 1024).toFixed(2)} KB`);
        });
        
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
    console.log("🚀 Starting ff_thumbnail.js test suite\n");
    
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
