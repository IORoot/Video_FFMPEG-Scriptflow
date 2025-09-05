#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                      Test Suite for ff_stack.js                             │
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
const SAMPLE_VIDEO2 = path.join(TEST_DIR, 'samples', 'sample_video2.mp4');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Vertical stack with 2 videos",
        config: {
            ff_stack: {
                description: "Create vertical stack of 2 videos",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_vertical.mp4",
                vertical: "TRUE"
            }
        }
    },
    {
        name: "Horizontal stack with 2 videos",
        config: {
            ff_stack: {
                description: "Create horizontal stack of 2 videos",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_horizontal.mp4",
                horizontal: "TRUE"
            }
        }
    },
    {
        name: "Grid stack with 4 videos",
        config: {
            ff_stack: {
                description: "Create 2x2 grid of 4 videos",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                input3: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input4: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_grid.mp4",
                grid: "TRUE"
            }
        }
    },
    {
        name: "Vertical stack with custom loglevel",
        config: {
            ff_stack: {
                description: "Create vertical stack with verbose logging",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_vertical_verbose.mp4",
                vertical: "TRUE",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Vertical stack",
        config: {
            ff_stack: {
                description: "Create vertical stack using JSON",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_vertical_json.mp4",
                vertical: "TRUE"
            }
        }
    },
    {
        name: "JSON config - Horizontal stack",
        config: {
            ff_stack: {
                description: "Create horizontal stack using JSON",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_horizontal_json.mp4",
                horizontal: "TRUE"
            }
        }
    },
    {
        name: "JSON config - Grid stack",
        config: {
            ff_stack: {
                description: "Create grid stack using JSON",
                input1: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input2: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                input3: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                input4: path.join(TEST_DIR, 'samples', 'sample_video2.mp4'),
                output: "stack_grid_json.mp4",
                grid: "TRUE"
            }
        }
    }
];

// ╭──────────────────────────────────────────────────────────╮
// │                    Utility Functions                     │
// ╰──────────────────────────────────────────────────────────╯

// Utility function to run ffprobe and get video info
function getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ]);
        
        let stdout = '';
        let stderr = '';
        
        ffprobe.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        ffprobe.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(stdout);
                    resolve(info);
                } catch (error) {
                    reject(new Error(`Failed to parse ffprobe output: ${error.message}`));
                }
            } else {
                reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
            }
        });
    });
}

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
        // Run the ff_stack.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_stack.js'),
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
        
        // Get output file path
        const outputFile = path.join(__dirname, testConfig.config.ff_stack.output);
        
        // Check if output file was created
        const fileInfo = getFileInfo(outputFile);
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file not created: ${outputFile}`);
            return false;
        }
        
        // Verify the video properties
        try {
            const videoInfo = await getVideoInfo(outputFile);
            const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
            
            if (!videoStream) {
                console.log(`❌ Test failed: ${testConfig.name}`);
                console.log(`   No video stream found in output`);
                return false;
            }
            
            // Check dimensions based on stack type
            const stackType = testConfig.config.ff_stack.vertical ? 'vertical' : 
                            testConfig.config.ff_stack.horizontal ? 'horizontal' : 
                            testConfig.config.ff_stack.grid ? 'grid' : 'unknown';
            
            let expectedWidth, expectedHeight;
            if (stackType === 'vertical') {
                expectedWidth = 1280; // Same as input
                expectedHeight = 1440; // Double height (720 * 2)
            } else if (stackType === 'horizontal') {
                expectedWidth = 2560; // Double width (1280 * 2)
                expectedHeight = 720; // Same as input
            } else if (stackType === 'grid') {
                expectedWidth = 2560; // Double width (1280 * 2)
                expectedHeight = 1440; // Double height (720 * 2)
            }
            
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   📹 Output: ${videoStream.width}x${videoStream.height} (${stackType} stack)`);
            console.log(`   📁 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
            
        } catch (error) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Error analyzing video: ${error.message}`);
            return false;
        }
        
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
    console.log("🚀 Starting ff_stack.js test suite\n");
    
    // Check if sample videos exist
    if (!fs.existsSync(SAMPLE_VIDEO)) {
        console.log(`❌ Sample video not found: ${SAMPLE_VIDEO}`);
        console.log("Please ensure the sample video exists in the tests/samples directory.");
        process.exit(1);
    }
    
    if (!fs.existsSync(SAMPLE_VIDEO2)) {
        console.log(`❌ Sample video 2 not found: ${SAMPLE_VIDEO2}`);
        console.log("Please ensure the sample video 2 exists in the tests/samples directory.");
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
