#!/usr/bin/env node
/**
 * Comprehensive Test Runner for JavaScript FFMPEG Scripts
 * Runs all test scripts and generates a detailed report
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
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Test results storage
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: [],
    startTime: null,
    endTime: null,
    duration: 0
};

// Get all test files
function getAllTestFiles() {
    const testFiles = [];
    
    // Get all test_*.js and tests_*.js files
    const files = fs.readdirSync(__dirname);
    files.forEach(file => {
        if ((file.startsWith('test_') || file.startsWith('tests_')) && 
            file.endsWith('.js') && 
            file !== 'run_all_tests.js' &&
            file !== 'test_cleanup.js') {
            testFiles.push(file);
        }
    });
    
    return testFiles.sort();
}

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
        let hasErrors = false;
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
            hasErrors = true;
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
                stderr: stderr,
                hasErrors: hasErrors
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
                hasErrors: true,
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

// Generate detailed report
function generateReport() {
    const report = [];
    
    // Header
    report.push(`${colors.bright}${colors.blue}`);
    report.push('='.repeat(80));
    report.push('🧪 JAVASCRIPT FFMPEG SCRIPTS - COMPREHENSIVE TEST REPORT');
    report.push('='.repeat(80));
    report.push(`${colors.reset}`);
    
    // Summary
    report.push(`\n${colors.bright}📊 SUMMARY:${colors.reset}`);
    report.push(`   Total Tests: ${colors.white}${testResults.total}${colors.reset}`);
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
        
        // Passed tests
        const passedTests = testResults.tests.filter(t => t.passed);
        if (passedTests.length > 0) {
            report.push(`\n${colors.green}✅ PASSED TESTS (${passedTests.length}):${colors.reset}`);
            passedTests.forEach(test => {
                report.push(`   ${colors.green}✓${colors.reset} ${test.file} (${test.duration}ms)`);
            });
        }
        
        // Failed tests
        const failedTests = testResults.tests.filter(t => !t.passed);
        if (failedTests.length > 0) {
            report.push(`\n${colors.red}❌ FAILED TESTS (${failedTests.length}):${colors.reset}`);
            failedTests.forEach(test => {
                report.push(`   ${colors.red}✗${colors.reset} ${test.file} (${test.duration}ms)`);
                if (test.stderr) {
                    report.push(`      ${colors.red}Error: ${test.stderr.trim()}${colors.reset}`);
                }
                if (test.error) {
                    report.push(`      ${colors.red}Error: ${test.error.message}${colors.reset}`);
                }
            });
        }
    }
    
    // Performance analysis
    if (testResults.tests.length > 0) {
        const durations = testResults.tests.map(t => t.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        report.push(`\n${colors.bright}⏱️  PERFORMANCE ANALYSIS:${colors.reset}`);
        report.push(`   Average Duration: ${colors.yellow}${avgDuration.toFixed(0)}ms${colors.reset}`);
        report.push(`   Fastest Test: ${colors.green}${minDuration}ms${colors.reset}`);
        report.push(`   Slowest Test: ${colors.red}${maxDuration}ms${colors.reset}`);
        
        // Slow tests warning
        const slowTests = testResults.tests.filter(t => t.duration > avgDuration * 2);
        if (slowTests.length > 0) {
            report.push(`\n${colors.yellow}⚠️  SLOW TESTS (>2x average):${colors.reset}`);
            slowTests.forEach(test => {
                report.push(`   ${colors.yellow}🐌${colors.reset} ${test.file} (${test.duration}ms)`);
            });
        }
    }
    
    // Footer
    report.push(`\n${colors.bright}${colors.blue}`);
    report.push('='.repeat(80));
    report.push(`Test run completed at ${new Date().toLocaleString()}`);
    report.push('='.repeat(80));
    report.push(`${colors.reset}`);
    
    return report.join('\n');
}

// Save report to file
function saveReportToFile(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(__dirname, `test_report_${timestamp}.txt`);
    
    // Remove colors for file output
    const cleanReport = report.replace(/\x1b\[[0-9;]*m/g, '');
    
    fs.writeFileSync(reportFile, cleanReport);
    console.log(`\n${colors.cyan}📄 Report saved to: ${reportFile}${colors.reset}`);
    
    return reportFile;
}

// Main execution
async function runAllTests() {
    console.log(`${colors.bright}${colors.blue}`);
    console.log('🚀 Starting Comprehensive Test Suite for JavaScript FFMPEG Scripts');
    console.log(`${colors.reset}`);
    
    testResults.startTime = Date.now();
    
    // Get all test files
    const testFiles = getAllTestFiles();
    testResults.total = testFiles.length;
    
    console.log(`\n${colors.cyan}Found ${testFiles.length} test files:${colors.reset}`);
    testFiles.forEach(file => {
        console.log(`   • ${file}`);
    });
    
    if (testFiles.length === 0) {
        console.log(`${colors.yellow}⚠️  No test files found!${colors.reset}`);
        return;
    }
    
    // Run tests sequentially to avoid conflicts
    for (const testFile of testFiles) {
        await runTestFile(testFile);
    }
    
    testResults.endTime = Date.now();
    testResults.duration = testResults.endTime - testResults.startTime;
    
    // Generate and display report
    const report = generateReport();
    console.log(report);
    
    // Save report to file
    const reportFile = saveReportToFile(report);
    
    // Final cleanup
    console.log(`\n${colors.cyan}🧹 Performing final cleanup...${colors.reset}`);
    const cleanedFiles = comprehensiveCleanup(__dirname, { verbose: false });
    if (cleanedFiles > 0) {
        console.log(`${colors.green}✅ Cleaned up ${cleanedFiles} files${colors.reset}`);
    }
    
    // Exit with appropriate code
    const exitCode = testResults.failed > 0 ? 1 : 0;
    console.log(`\n${colors.bright}Test suite ${exitCode === 0 ? colors.green + 'completed successfully' : colors.red + 'completed with failures'}${colors.reset}`);
    
    process.exit(exitCode);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
${colors.bright}JavaScript FFMPEG Scripts Test Runner${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node run_all_tests.js [options]

${colors.cyan}Options:${colors.reset}
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output (default: false)

${colors.cyan}Description:${colors.reset}
  Runs all JavaScript test scripts (test_*.js and tests_*.js) and generates
  a comprehensive report with pass/fail status, performance metrics, and
  detailed error information.

${colors.cyan}Output:${colors.reset}
  - Console output with colored results
  - Detailed report saved to test_report_[timestamp].txt
  - Automatic cleanup of test artifacts

${colors.cyan}Examples:${colors.reset}
  node run_all_tests.js
  node run_all_tests.js --verbose
`);
    process.exit(0);
}

// Run the test suite
if (require.main === module) {
    runAllTests().catch(error => {
        console.error(`${colors.red}💥 Test runner failed: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    getAllTestFiles,
    runTestFile,
    generateReport
};
