#!/usr/bin/env node
/**
 * Quick Test Runner - Runs a subset of tests for demonstration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { comprehensiveCleanup } = require('./test_cleanup');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test results storage
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
    startTime: null,
    endTime: null,
    duration: 0
};

// Quick test files for demonstration
const quickTestFiles = [
    'test_ff_append.js',
    'test_ff_aspect_ratio.js', 
    'tests_ff_scale.js',
    'tests_ff_text.js',
    'tests_ff_watermark.js'
];

// Run a single test file
function runTestFile(testFile) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        console.log(`\n${colors.cyan}🧪 Running ${testFile}...${colors.reset}`);
        
        const child = spawn('node', [testFile], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
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
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = {
                file: testFile,
                passed: code === 0,
                exitCode: code,
                duration: duration,
                stdout: stdout,
                stderr: stderr
            };
            
            if (code === 0) {
                console.log(`${colors.green}✅ ${testFile} passed${colors.reset} (${duration}ms)`);
                testResults.passed++;
            } else {
                console.log(`${colors.red}❌ ${testFile} failed${colors.reset} (${duration}ms)`);
                if (stderr) {
                    console.log(`${colors.red}   Error: ${stderr.trim()}${colors.reset}`);
                }
                testResults.failed++;
            }
            
            testResults.tests.push(result);
            resolve(result);
        });
        
        child.on('error', (error) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = {
                file: testFile,
                passed: false,
                exitCode: -1,
                duration: duration,
                stdout: stdout,
                stderr: error.message,
                error: error
            };
            
            console.log(`${colors.red}❌ ${testFile} failed${colors.reset} (${duration}ms)`);
            console.log(`${colors.red}   Error: ${error.message}${colors.reset}`);
            
            testResults.tests.push(result);
            testResults.failed++;
            resolve(result);
        });
    });
}

// Generate report
function generateReport() {
    const report = [];
    
    // Header
    report.push(`${colors.bright}${colors.blue}`);
    report.push('='.repeat(60));
    report.push('🧪 QUICK TEST RUNNER - DEMONSTRATION REPORT');
    report.push('='.repeat(60));
    report.push(`${colors.reset}`);
    
    // Summary
    report.push(`\n${colors.bright}📊 SUMMARY:${colors.reset}`);
    report.push(`   Total Tests: ${testResults.total}`);
    report.push(`   Passed: ${colors.green}${testResults.passed}${colors.reset}`);
    report.push(`   Failed: ${colors.red}${testResults.failed}${colors.reset}`);
    report.push(`   Duration: ${colors.yellow}${testResults.duration}ms${colors.reset}`);
    
    // Success rate
    const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
    const statusColor = successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red;
    report.push(`   Success Rate: ${statusColor}${successRate}%${colors.reset}`);
    
    // Detailed results
    if (testResults.tests.length > 0) {
        report.push(`\n${colors.bright}📋 DETAILED RESULTS:${colors.reset}`);
        
        testResults.tests.forEach(test => {
            const status = test.passed ? `${colors.green}✓` : `${colors.red}✗`;
            report.push(`   ${status}${colors.reset} ${test.file} (${test.duration}ms)`);
        });
    }
    
    // Footer
    report.push(`\n${colors.bright}${colors.blue}`);
    report.push('='.repeat(60));
    report.push(`Quick test run completed at ${new Date().toLocaleString()}`);
    report.push('='.repeat(60));
    report.push(`${colors.reset}`);
    
    return report.join('\n');
}

// Main execution
async function runQuickTests() {
    console.log(`${colors.bright}${colors.blue}`);
    console.log('🚀 Quick Test Runner - JavaScript FFMPEG Scripts');
    console.log(`${colors.reset}`);
    
    testResults.startTime = Date.now();
    testResults.total = quickTestFiles.length;
    
    console.log(`\n${colors.cyan}Running ${quickTestFiles.length} test files:${colors.reset}`);
    quickTestFiles.forEach(file => {
        console.log(`   • ${file}`);
    });
    
    // Run tests sequentially
    for (const testFile of quickTestFiles) {
        await runTestFile(testFile);
    }
    
    testResults.endTime = Date.now();
    testResults.duration = testResults.endTime - testResults.startTime;
    
    // Generate and display report
    const report = generateReport();
    console.log(report);
    
    // Final cleanup
    console.log(`\n${colors.cyan}🧹 Performing final cleanup...${colors.reset}`);
    const cleanedFiles = comprehensiveCleanup(__dirname, { verbose: false });
    if (cleanedFiles > 0) {
        console.log(`${colors.green}✅ Cleaned up ${cleanedFiles} files${colors.reset}`);
    }
    
    // Exit with appropriate code
    const exitCode = testResults.failed > 0 ? 1 : 0;
    console.log(`\n${colors.bright}Quick test run ${exitCode === 0 ? colors.green + 'completed successfully' : colors.red + 'completed with failures'}${colors.reset}`);
    
    process.exit(exitCode);
}

// Run the quick test suite
if (require.main === module) {
    runQuickTests().catch(error => {
        console.error(`${colors.red}💥 Quick test runner failed: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = {
    runQuickTests,
    runTestFile,
    generateReport
};
