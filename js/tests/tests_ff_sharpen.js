#!/usr/bin/env node

/**
 * Test suite for ff_sharpen.js
 * Tests video sharpening functionality with various pixel and sharpen values
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'samples', 'sample_video.mp4');

// Test configurations
const testConfigs = [
    {
        name: "Basic sharpening with default values",
        config: {
            ff_sharpen: {
                description: "Sharpen video with default pixel and sharpen values",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_default.mp4",
                pixel: "5.0",
                sharpen: "1.0"
            }
        }
    },
    {
        name: "Light sharpening",
        config: {
            ff_sharpen: {
                description: "Light sharpening effect",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_light.mp4",
                pixel: "3.0",
                sharpen: "0.5"
            }
        }
    },
    {
        name: "Strong sharpening",
        config: {
            ff_sharpen: {
                description: "Strong sharpening effect",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_strong.mp4",
                pixel: "7.0",
                sharpen: "2.5"
            }
        }
    },
    {
        name: "Maximum sharpening",
        config: {
            ff_sharpen: {
                description: "Maximum sharpening effect",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_max.mp4",
                pixel: "11.0",
                sharpen: "3.0"
            }
        }
    },
    {
        name: "Blur effect (negative sharpen)",
        config: {
            ff_sharpen: {
                description: "Blur effect using negative sharpen value",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_blur.mp4",
                pixel: "5.0",
                sharpen: "-1.0"
            }
        }
    },
    {
        name: "No effect (zero sharpen)",
        config: {
            ff_sharpen: {
                description: "No effect with zero sharpen value",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_zero.mp4",
                pixel: "5.0",
                sharpen: "0.0"
            }
        }
    },
    {
        name: "JSON config - Default sharpening",
        config: {
            ff_sharpen: {
                description: "Basic sharpening using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_default_json.mp4",
                pixel: "5.0",
                sharpen: "1.0"
            }
        }
    },
    {
        name: "JSON config - Light sharpening",
        config: {
            ff_sharpen: {
                description: "Light sharpening using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_light_json.mp4",
                pixel: "3.0",
                sharpen: "0.5"
            }
        }
    },
    {
        name: "JSON config - Blur effect",
        config: {
            ff_sharpen: {
                description: "Blur effect using JSON",
                input: path.join(TEST_DIR, 'samples', 'sample_video.mp4'),
                output: "sharpen_blur_json.mp4",
                pixel: "5.0",
                sharpen: "-1.0"
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
    
    const configPath = path.join(__dirname, `test_sharpen_config_${Date.now()}.json`);
    const outputPath = path.join(__dirname, testConfig.config.ff_sharpen.output);
    
    try {
        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(testConfig.config, null, 2));
        
        // Get original video info
        const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
        const originalStream = originalInfo.streams.find(s => s.codec_type === 'video');
        const originalWidth = originalStream.width;
        const originalHeight = originalStream.height;
        const originalDuration = parseFloat(originalInfo.format.duration);
        
        console.log(`📹 Original: ${originalWidth}x${originalHeight}, ${originalDuration.toFixed(2)}s`);
        
        // Run ff_sharpen.js
        const ffSharpen = spawn('node', [path.join(__dirname, '..', 'ff_sharpen.js'), '-C', configPath], {
            cwd: __dirname
        });
        
        let ffSharpenOutput = '';
        let ffSharpenError = '';
        
        ffSharpen.stdout.on('data', (data) => {
            ffSharpenOutput += data.toString();
        });
        
        ffSharpen.stderr.on('data', (data) => {
            ffSharpenError += data.toString();
        });
        
        await new Promise((resolve, reject) => {
            ffSharpen.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ff_sharpen.js failed with code ${code}: ${ffSharpenError}`));
                }
            });
            
            ffSharpen.on('error', (error) => {
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
        const outputDuration = parseFloat(outputInfo.format.duration);
        
        console.log(`🔳 Output: ${outputWidth}x${outputHeight}, ${outputDuration.toFixed(2)}s`);
        
        // Verify sharpening worked
        let testPassed = true;
        let verificationMessage = '';
        
        // Check dimensions are preserved
        if (originalWidth !== outputWidth || originalHeight !== outputHeight) {
            testPassed = false;
            verificationMessage += `Dimensions changed: ${originalWidth}x${originalHeight} → ${outputWidth}x${outputHeight}. `;
        }
        
        // Check duration is preserved (within 1 second tolerance)
        const durationDiff = Math.abs(originalDuration - outputDuration);
        if (durationDiff > 1.0) {
            testPassed = false;
            verificationMessage += `Duration changed significantly: ${originalDuration.toFixed(2)}s → ${outputDuration.toFixed(2)}s. `;
        }
        
        // Check file size changed (sharpening should affect file size)
        const originalSize = fs.statSync(SAMPLE_VIDEO).size;
        const outputSize = fs.statSync(outputPath).size;
        const sizeDiff = Math.abs(originalSize - outputSize);
        const sizeChangePercent = (sizeDiff / originalSize) * 100;
        
        if (sizeChangePercent < 1) {
            // For zero sharpen, file size should be very similar
            if (parseFloat(testConfig.config.ff_sharpen.sharpen) === 0.0) {
                verificationMessage += 'File size preserved (zero sharpen effect). ';
            } else {
                verificationMessage += 'File size barely changed (may indicate processing issue). ';
            }
        } else {
            verificationMessage += `File size changed by ${sizeChangePercent.toFixed(1)}% (expected for sharpening). `;
        }
        
        if (testPassed) {
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   ${verificationMessage || 'Sharpening completed successfully'}`);
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
    console.log('🚀 Starting ff_sharpen.js test suite\n');
    
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
