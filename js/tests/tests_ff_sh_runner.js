#!/usr/bin/env node

/**
 * Test suite for ff_sh_runner.js
 * Tests shell script execution functionality with various commands
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'tests');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Test configurations
const testConfigs = [
    {
        name: "Basic echo command",
        config: {
            ff_sh_runner: {
                description: "Run echo command",
                script: "echo",
                parameters: "Hello World",
                output: ""
            }
        }
    },
    {
        name: "List directory contents",
        config: {
            ff_sh_runner: {
                description: "List directory contents",
                script: "ls",
                parameters: "-la",
                output: ""
            }
        }
    },
    {
        name: "Create and remove file",
        config: {
            ff_sh_runner: {
                description: "Create a test file",
                script: "touch",
                parameters: "",
                output: "test_file.txt"
            }
        }
    },
    {
        name: "Get current date",
        config: {
            ff_sh_runner: {
                description: "Get current date",
                script: "date",
                parameters: "",
                output: ""
            }
        }
    },
    {
        name: "Check system info",
        config: {
            ff_sh_runner: {
                description: "Check system information",
                script: "uname",
                parameters: "-a",
                output: ""
            }
        }
    },
    {
        name: "Count lines in file",
        config: {
        ff_sh_runner: {
                description: "Count lines in README",
                script: "wc",
                parameters: "-l",
                output: "../../../README.md"
            }
        }
    }
];

// Run a single test
async function runTest(testConfig) {
    console.log(`\n🧪 Running test: ${testConfig.name}`);
    
    const configPath = path.join(OUTPUT_DIR, `test_sh_runner_config_${Date.now()}.json`);
    
    try {
        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(testConfig.config, null, 2));
        
        // Run ff_sh_runner.js
        const ffShRunner = spawn('node', [path.join(__dirname, '..', 'ff_sh_runner.js'), '-C', configPath], {
            cwd: OUTPUT_DIR
        });
        
        let ffShRunnerOutput = '';
        let ffShRunnerError = '';
        
        ffShRunner.stdout.on('data', (data) => {
            ffShRunnerOutput += data.toString();
        });
        
        ffShRunner.stderr.on('data', (data) => {
            ffShRunnerError += data.toString();
        });
        
        const exitCode = await new Promise((resolve, reject) => {
            ffShRunner.on('close', (code) => {
                resolve(code);
            });
            
            ffShRunner.on('error', (error) => {
                reject(error);
            });
        });
        
        // Check if command executed successfully
        let testPassed = false;
        let verificationMessage = '';
        
        if (exitCode === 0) {
            testPassed = true;
            verificationMessage = 'Command executed successfully';
            
            // Special verification for file creation test
            if (testConfig.name === "Create and remove file") {
                const testFilePath = path.join(OUTPUT_DIR, 'test_file.txt');
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath); // Clean up
                    verificationMessage += ' and file was created';
                } else {
                    testPassed = false;
                    verificationMessage = 'Command executed but file was not created';
                }
            }
        } else {
            testPassed = false;
            verificationMessage = `Command failed with exit code ${exitCode}`;
        }
        
        if (testPassed) {
            console.log(`✅ Test passed: ${testConfig.name}`);
            console.log(`   ${verificationMessage}`);
        } else {
            console.log(`❌ Test failed: ${testConfig.name}`);
            console.log(`   ${verificationMessage}`);
            if (ffShRunnerError) {
                console.log(`   Error output: ${ffShRunnerError.trim()}`);
            }
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
    console.log('🚀 Starting ff_sh_runner.js test suite\n');
    
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
