#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_text.js                                 │
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
        name: "Basic text overlay",
        config: {
            ff_text: {
                description: "Add basic text overlay to video",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_basic.mp4",
                text: "Hello World!"
            }
        }
    },
    {
        name: "Text overlay with custom styling",
        config: {
            ff_text: {
                description: "Add text with custom font, color, and size",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_styled.mp4",
                text: "Styled Text",
                font: "/System/Library/Fonts/Arial.ttf",
                colour: "red",
                size: "32"
            }
        }
    },
    {
        name: "Text overlay with background box",
        config: {
            ff_text: {
                description: "Add text with background box",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_box.mp4",
                text: "Boxed Text",
                box: "1",
                boxcolour: "blue",
                boxborder: "10"
            }
        }
    },
    {
        name: "Multi-line text with size reduction",
        config: {
            ff_text: {
                description: "Add multi-line text with decreasing font size",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_multiline.mp4",
                text: "Line 1\nLine 2\nLine 3",
                size: "28",
                reduction: "6"
            }
        }
    },
    {
        name: "Text overlay with custom positioning",
        config: {
            ff_text: {
                description: "Add text with custom positioning",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_positioned.mp4",
                text: "Top Left Text",
                xpixels: "50",
                ypixels: "50"
            }
        }
    },
    {
        name: "Text overlay with custom loglevel",
        config: {
            ff_text: {
                description: "Add text with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_verbose.mp4",
                text: "Verbose Text",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic text overlay",
        config: {
            ff_text: {
                description: "Add basic text overlay using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_basic_json.mp4",
                text: "JSON Text Overlay"
            }
        }
    },
    {
        name: "JSON config - Styled text with box",
        config: {
            ff_text: {
                description: "Add styled text with box using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_styled_json.mp4",
                text: "Styled JSON Text",
                colour: "yellow",
                size: "30",
                box: "1",
                boxcolour: "green",
                boxborder: "8"
            }
        }
    },
    {
        name: "JSON config - Multi-line text",
        config: {
            ff_text: {
                description: "Add multi-line text using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "text_multiline_json.mp4",
                text: "First Line\nSecond Line\nThird Line",
                size: "26",
                reduction: "4"
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
        // Run the ff_text.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_text.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_text.output);
        
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
            
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   📹 Output: ${videoStream.width}x${videoStream.height}`);
            console.log(`   📁 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
            
            // Check if text was added (file should be larger than original)
            const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
            const originalSize = originalInfo.format.size;
            const outputSize = videoInfo.format.size;
            
            if (outputSize > originalSize) {
                console.log(`   📝 Text overlay added successfully`);
            }
            
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
    console.log("🚀 Starting ff_text.js test suite\n");
    
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
