#!/usr/bin/env node

/**
 * Test suite for ff_scale.js
 * Tests video scaling functionality with various width/height combinations
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'samples', 'sample_video.mp4');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Test configurations
const testConfigs = [
    {
        name: "Basic scaling to 1280x720",
        config: {
            ff_scale: {
                description: "Scale video to 1280x720",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_1280x720.mp4",
                width: "1280",
                height: "720"
            }
        }
    },
    {
        name: "Scale to 4K resolution",
        config: {
            ff_scale: {
                description: "Scale video to 4K",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_4k.mp4",
                width: "3840",
                height: "2160"
            }
        }
    },
    {
        name: "Scale with aspect ratio preservation",
        config: {
            ff_scale: {
                description: "Scale with aspect ratio preservation",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_aspect.mp4",
                width: "-1",
                height: "480"
            }
        }
    },
    {
        name: "Scale with custom DAR and SAR",
        config: {
            ff_scale: {
                description: "Scale with custom aspect ratios",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_custom_ratios.mp4",
                width: "1920",
                height: "1080",
                dar: "16/9",
                sar: "1/1"
            }
        }
    },
    {
        name: "Scale using input dimensions",
        config: {
            ff_scale: {
                description: "Scale using input width and half height",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_input_dims.mp4",
                width: "iw",
                height: "ih/2"
            }
        }
    },
    {
        name: "Scale to even dimensions",
        config: {
            ff_scale: {
                description: "Scale to even dimensions",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_even.mp4",
                width: "-2",
                height: "-2"
            }
        }
    },
    {
        name: "JSON config - HD scaling",
        config: {
            ff_scale: {
                description: "Scale video to HD resolution using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_hd_json.mp4",
                width: "1280",
                height: "720"
            }
        }
    },
    {
        name: "JSON config - Aspect ratio preservation",
        config: {
            ff_scale: {
                description: "Scale with aspect ratio preservation using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_aspect_json.mp4",
                width: "-1",
                height: "480"
            }
        }
    },
    {
        name: "JSON config - Custom DAR/SAR",
        config: {
            ff_scale: {
                description: "Scale with custom aspect ratios using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "scale_custom_json.mp4",
                width: "1920",
                height: "1080",
                dar: "16/9",
                sar: "1/1"
            }
        }
    }
];

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
        
        let output = '';
        let error = '';
        
        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ffprobe.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(output);
                    resolve(info);
                } catch (e) {
                    reject(new Error('Failed to parse ffprobe output'));
                }
            } else {
                reject(new Error(`ffprobe failed: ${error}`));
            }
        });
        
        ffprobe.on('error', (error) => {
            reject(error);
        });
    });
}

// Run a single test
async function runTest(testConfig) {
    console.log(`\n🧪 Running test: ${testConfig.name}`);
    
    const configPath = path.join(OUTPUT_DIR, `test_scale_config_${Date.now()}.json`);
    const outputPath = path.join(OUTPUT_DIR, testConfig.config.ff_scale.output);
    
    try {
        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(testConfig.config, null, 2));
        
        // Get original video info
        const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
        const originalStream = originalInfo.streams.find(s => s.codec_type === 'video');
        const originalWidth = originalStream.width;
        const originalHeight = originalStream.height;
        
        console.log(`📹 Original: ${originalWidth}x${originalHeight}`);
        
        // Run ff_scale.js
        const ffScale = spawn('node', [path.join(__dirname, '..', 'ff_scale.js'), '-C', configPath], {
            cwd: OUTPUT_DIR
        });
        
        let ffScaleOutput = '';
        let ffScaleError = '';
        
        ffScale.stdout.on('data', (data) => {
            ffScaleOutput += data.toString();
        });
        
        ffScale.stderr.on('data', (data) => {
            ffScaleError += data.toString();
        });
        
        await new Promise((resolve, reject) => {
            ffScale.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ff_scale.js failed with code ${code}: ${ffScaleError}`));
                }
            });
            
            ffScale.on('error', (error) => {
                reject(error);
            });
        });
        
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Output file was not created');
        }
        
        // Get output video info
        const outputInfo = await getVideoInfo(outputPath);
        const outputStream = outputInfo.streams.find(s => s.codec_type === 'video');
        const outputWidth = outputStream.width;
        const outputHeight = outputStream.height;
        
        console.log(`📐 Output: ${outputWidth}x${outputHeight}`);
        
        // Verify scaling worked
        const expectedWidth = testConfig.config.ff_scale.width;
        const expectedHeight = testConfig.config.ff_scale.height;
        
        let testPassed = true;
        let verificationMessage = '';
        
        if (expectedWidth !== '-1' && expectedWidth !== '-2' && !expectedWidth.includes('iw') && !expectedWidth.includes('ih')) {
            if (parseInt(expectedWidth) !== outputWidth) {
                testPassed = false;
                verificationMessage += `Width mismatch: expected ${expectedWidth}, got ${outputWidth}. `;
            }
        }
        
        if (expectedHeight !== '-1' && expectedHeight !== '-2' && !expectedHeight.includes('iw') && !expectedHeight.includes('ih')) {
            if (parseInt(expectedHeight) !== outputHeight) {
                testPassed = false;
                verificationMessage += `Height mismatch: expected ${expectedHeight}, got ${outputHeight}. `;
            }
        }
        
        // Check aspect ratio preservation for -1 cases
        if (expectedWidth === '-1' || expectedHeight === '-1') {
            const originalAspectRatio = originalWidth / originalHeight;
            const outputAspectRatio = outputWidth / outputHeight;
            const aspectRatioDiff = Math.abs(originalAspectRatio - outputAspectRatio);
            
            if (aspectRatioDiff > 0.01) { // Allow small floating point differences
                testPassed = false;
                verificationMessage += `Aspect ratio not preserved: original ${originalAspectRatio.toFixed(3)}, output ${outputAspectRatio.toFixed(3)}. `;
            }
        }
        
        if (testPassed) {
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   ${verificationMessage || 'Scaling completed successfully'}`);
        } else {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   ${verificationMessage}`);
        }
        
        // Clean up
        fs.unlinkSync(configPath);
        
        return testPassed;
        
    } catch (error) {
        console.log(`❌ Test failed: ${testConfig.name}`);
        console.log(`   Error: ${error.message}`);
        
        // Clean up
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
        }
        
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting ff_scale.js test suite\n');
    
    // Check if sample video exists
    if (!fs.existsSync(SAMPLE_VIDEO)) {
        console.error(`❌ Sample video not found: ${SAMPLE_VIDEO}`);
        console.error('Please ensure the test video file exists.');
        process.exit(1);
    }
    
    let passedTests = 0;
    let totalTests = testConfigs.length;
    
    for (const testConfig of testConfigs) {
        const passed = await runTest(testConfig);
        if (passed) passedTests++;
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed.');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, runTest, testConfigs };
