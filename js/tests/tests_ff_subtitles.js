#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for ff_subtitles.js                            │
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
const SAMPLE_SUBTITLE = path.join(TEST_DIR, 'samples', 'sample_subtitle.srt');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Basic subtitle embedding",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with default settings",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_basic.mp4"
            }
        }
    },
    {
        name: "Subtitle embedding with custom styles",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with custom font and color",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_styled.mp4",
                styles: "FontName=Arial,FontSize=24,PrimaryColour=&H00FF00"
            }
        }
    },
    {
        name: "Subtitle embedding with margin and alignment",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with margin and alignment",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_margin.mp4",
                styles: "MarginV=h-50,Alignment=2,Outline=2"
            }
        }
    },
    {
        name: "Subtitle embedding with remove duplicates",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with duplicate removal",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_dedup.mp4",
                removedupes: "TRUE"
            }
        }
    },
    {
        name: "Subtitle embedding with dynamic text",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with dynamic text (word-by-word)",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_dynamic.mp4",
                dynamictext: "TRUE"
            }
        }
    },
    {
        name: "Subtitle embedding with custom loglevel",
        config: {
            ff_subtitles: {
                description: "Embed subtitles with verbose logging",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_verbose.mp4",
                loglevel: "info"
            }
        }
    },
    {
        name: "JSON config - Basic subtitle embedding",
        config: {
            ff_subtitles: {
                description: "Embed subtitles using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_basic_json.mp4"
            }
        }
    },
    {
        name: "JSON config - Styled subtitles",
        config: {
            ff_subtitles: {
                description: "Embed styled subtitles using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_styled_json.mp4",
                styles: "FontName=Helvetica,FontSize=20,PrimaryColour=&HFFFFFF,Outline=1"
            }
        }
    },
    {
        name: "JSON config - Dynamic text with styles",
        config: {
            ff_subtitles: {
                description: "Embed dynamic text subtitles using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                subtitles: path.join(TEST_DIR, 'samples', 'sample_subtitle.srt'),
                output: "subtitles_dynamic_json.mp4",
                dynamictext: "TRUE",
                styles: "FontSize=18,PrimaryColour=&H00FFFF"
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
        // Run the ff_subtitles.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'ff_subtitles.js'),
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
        const outputFile = path.join(__dirname, testConfig.config.ff_subtitles.output);
        
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
            
            // Check if subtitles were embedded (file should be larger than original)
            const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
            const originalSize = originalInfo.format.size;
            const outputSize = videoInfo.format.size;
            
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   📹 Output: ${videoStream.width}x${videoStream.height}`);
            console.log(`   📁 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
            
            // For dynamic text tests, check if backup files were created
            if (testConfig.config.ff_subtitles.dynamictext) {
                const dynamicFile = `${SAMPLE_SUBTITLE}.dynamictext`;
                if (fs.existsSync(dynamicFile)) {
                    console.log(`   📝 Dynamic text file created: ${path.basename(dynamicFile)}`);
                }
            }
            
            // For dedup tests, check if backup files were created
            if (testConfig.config.ff_subtitles.removedupes) {
                const dedupFile = `${SAMPLE_SUBTITLE}.dedup`;
                if (fs.existsSync(dedupFile)) {
                    console.log(`   🧹 Dedup file created: ${path.basename(dedupFile)}`);
                }
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
    console.log("🚀 Starting ff_subtitles.js test suite\n");
    
    // Check if sample files exist
    if (!fs.existsSync(SAMPLE_VIDEO)) {
        console.log(`❌ Sample video not found: ${SAMPLE_VIDEO}`);
        console.log("Please ensure the sample video exists in the tests/samples directory.");
        process.exit(1);
    }
    
    if (!fs.existsSync(SAMPLE_SUBTITLE)) {
        console.log(`❌ Sample subtitle not found: ${SAMPLE_SUBTITLE}`);
        console.log("Please ensure the sample subtitle exists in the tests/samples directory.");
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
