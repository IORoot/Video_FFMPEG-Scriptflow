#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_social_media.js                        │
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
        name: "Basic Instagram conversion",
        config: {
            ff_social_media: {
                description: "Convert video for Instagram",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_instagram.mp4",
                instagram: "true"
            }
        }
    },
    {
        name: "Instagram conversion with custom loglevel",
        config: {
            ff_social_media: {
                description: "Convert video for Instagram with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_instagram_verbose.mp4",
                instagram: "true",
                loglevel: "info"
            }
        }
    },
    {
        name: "Social media conversion without Instagram flag",
        config: {
            ff_social_media: {
                description: "Basic social media conversion",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_basic.mp4"
            }
        }
    },
    {
        name: "Social media conversion with custom output",
        config: {
            ff_social_media: {
                description: "Social media conversion with custom output name",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "custom_social_output.mp4",
                instagram: "true"
            }
        }
    },
    {
        name: "JSON config - Instagram conversion",
        config: {
            ff_social_media: {
                description: "Instagram conversion using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_instagram_json.mp4",
                instagram: "true"
            }
        }
    },
    {
        name: "JSON config - Basic social media",
        config: {
            ff_social_media: {
                description: "Basic social media conversion using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Custom loglevel",
        config: {
            ff_social_media: {
                description: "Social media conversion with custom loglevel using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "social_custom_loglevel_json.mp4",
                instagram: "true",
                loglevel: "warning"
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
        // Run the ff_social_media.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_social_media.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_social_media.output);
        
        // Check if output file was created
        const fileInfo = getFileInfo(outputFile);
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Output file not created: ${outputFile}`);
            return false;
        }
        
        // For Instagram conversions, verify the video properties
        if (testConfig.config.ff_social_media.instagram) {
            try {
                const videoInfo = await getVideoInfo(outputFile);
                const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
                
                if (!videoStream) {
                    console.log(`❌ Test failed: ${testConfig.name}`);
                    console.log(`   No video stream found in output`);
                    return false;
                }
                
                // Check pixel format (should be yuv420p for Instagram)
                if (videoStream.pix_fmt !== 'yuv420p') {
                    console.log(`❌ Test failed: ${testConfig.name}`);
                    console.log(`   Expected pixel format yuv420p, got ${videoStream.pix_fmt}`);
                    return false;
                }
                
                console.log(`✅ Test passed: ${testConfig.name}`);
                console.log(`   📹 Output: ${videoStream.width}x${videoStream.height}, ${videoStream.pix_fmt}`);
                console.log(`   📁 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
                
            } catch (error) {
                console.log(`❌ Test failed: ${testConfig.name}`);
                console.log(`   Error analyzing video: ${error.message}`);
                return false;
            }
        } else {
            // For non-Instagram conversions, just check file was created
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   📁 File created: ${fileInfo.size} bytes`);
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
    console.log("🚀 Starting ff_social_media.js test suite\n");
    
    // Check if sample video exists
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
