#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Suite for scriptflow.js                              │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                        Test Setup                        │
// ╰──────────────────────────────────────────────────────────╯

const TEST_DIR = path.join(__dirname, '..', 'tests');
const SCRIPTFLOW_TESTS_DIR = path.join(__dirname, 'json', 'scriptflow_tests');

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Configurations                 │
// ╰──────────────────────────────────────────────────────────╯

const testConfigs = [
    {
        name: "Environment variables test",
        configFile: "test_env_variables.json",
        envVars: { TEST_VAR: "environment_test" },
        description: "Tests <ENV_*> keyword substitution"
    },
    {
        name: "Folder variables test",
        configFile: "test_folder_variables.json",
        envVars: {},
        description: "Tests <FOLDER_NAME> and <FOLDER_TITLE> substitutions"
    },
    {
        name: "Date variables test",
        configFile: "test_date_variables.json",
        envVars: {},
        description: "Tests <DATE_*> keyword substitution"
    },
    {
        name: "Color variables test",
        configFile: "test_color_variables.json",
        envVars: {},
        description: "Tests <RANDOM_COLOUR> and <RANDOM_CONTRAST_COLOUR> substitutions"
    },
    {
        name: "Constant colors test",
        configFile: "test_constant_colors.json",
        envVars: {},
        description: "Tests <CONSTANT_RANDOM_COLOUR> and <CONSTANT_CONTRAST_COLOUR> substitutions"
    },
    {
        name: "Random video test",
        configFile: "test_random_video.json",
        envVars: {},
        description: "Tests <RANDOM_VIDEO> substitution"
    },
    {
        name: "Multi-step pipeline test",
        configFile: "test_multi_step.json",
        envVars: {},
        description: "Tests complex multi-step pipeline with multiple scripts"
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
    console.log(`   Description: ${testConfig.description}`);
    
    const configPath = path.join(SCRIPTFLOW_TESTS_DIR, testConfig.configFile);
    
    try {
        // Set environment variables for this test
        const originalEnv = {};
        for (const [key, value] of Object.entries(testConfig.envVars)) {
            originalEnv[key] = process.env[key];
            process.env[key] = value;
        }
        
        // Run the scriptflow.js script
        const result = await new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '..', 'scriptflow.js'),
                '-C', configPath
            ], {
                cwd: SCRIPTFLOW_TESTS_DIR,
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
        
        // Restore original environment variables
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
        
        // Check if script executed successfully
        if (result.code !== 0) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Exit code: ${result.code}`);
            console.log(`   Error: ${result.stderr}`);
            return false;
        }
        
        // Check if final output file was created
        const finalOutputFile = path.join(SCRIPTFLOW_TESTS_DIR, 'output.mp4');
        const fileInfo = getFileInfo(finalOutputFile);
        
        if (!fileInfo.exists) {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   Final output file was not created: ${finalOutputFile}`);
            return false;
        }
        
        // Get video properties to verify processing
        const properties = await getVideoProperties(finalOutputFile);
        
        console.log(`✅ Test passed: ${testConfig.name}`);
        console.log(`   📁 Output: ${path.basename(finalOutputFile)}`);
        console.log(`   📐 Dimensions: ${properties.width}x${properties.height}`);
        console.log(`   🎬 Video codec: ${properties.videoCodec}`);
        console.log(`   📊 File size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Test failed: ${testConfig.name}`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// ╭──────────────────────────────────────────────────────────╮
// │                      Test Runner                         │
// ╰──────────────────────────────────────────────────────────╯

async function runAllTests() {
    console.log("🚀 Starting scriptflow.js test suite\n");
    
    // Check if sample files exist
    if (!fs.existsSync(path.join(TEST_DIR, 'samples', 'sample_video.mp4'))) {
        console.log(`❌ Sample video not found: ${path.join(TEST_DIR, 'samples', 'sample_video.mp4')}`);
        console.log("Please ensure the sample video exists in the tests/samples directory.");
        process.exit(1);
    }
    
    if (!fs.existsSync(path.join(TEST_DIR, 'samples', 'sample_image.png'))) {
        console.log(`❌ Sample image not found: ${path.join(TEST_DIR, 'samples', 'sample_image.png')}`);
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
        
        // Clean up test files after each test
        try {
            const files = fs.readdirSync(SCRIPTFLOW_TESTS_DIR);
            files.forEach(file => {
                if (file.endsWith('.mp4') || file.endsWith('.json')) {
                    const filePath = path.join(SCRIPTFLOW_TESTS_DIR, file);
                    if (fs.existsSync(filePath) && !file.startsWith('test_')) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        } catch (error) {
            // Ignore cleanup errors
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
