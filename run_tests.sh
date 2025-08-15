#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                           Test Runner Script                                 │
# │        Executes all test JSON files in the ./tests folder sequentially      │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯
# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.

# ╭──────────────────────────────────────────────────────────╮
# │                         Variables                        │
# ╰──────────────────────────────────────────────────────────╯
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$SCRIPT_DIR/tests"
SCRIPTFLOW="$SCRIPT_DIR/scriptflow.sh"
LOG_FILE="$SCRIPT_DIR/test_results.log"
FAILED_TESTS=()
PASSED_TESTS=()
TOTAL_TESTS=0
FAILED_COUNT=0
PASSED_COUNT=0

# ╭──────────────────────────────────────────────────────────╮
# │                     Colour Variables                     │
# ╰──────────────────────────────────────────────────────────╯
function stylesheet()
{
    TEXT_GREEN_400="\e[38;2;74;222;128m"
    TEXT_ORANGE_500="\e[38;2;249;115;22m"
    TEXT_RED_400="\e[38;2;248;113;113m"
    TEXT_BLUE_600="\e[38;2;37;99;235m"
    TEXT_YELLOW_500="\e[38;2;234;179;8m"
    TEXT_PURPLE_500="\e[38;2;168;85;247m"
    TEXT_RESET="\e[39m"
}
stylesheet

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    printf "ℹ️  Usage:\n $0 [OPTIONS]\n\n" >&2 

    printf "Summary:\n"
    printf "Runs all test JSON files in the ./tests folder using scriptflow.sh\n\n"

    printf "Options:\n"
    printf " -h | --help\n"
    printf "\tShow this help message\n\n"
    
    printf " -v | --verbose\n"
    printf "\tShow detailed output for each test\n\n"
    
    printf " -f | --filter <PATTERN>\n"
    printf "\tOnly run tests matching the pattern (e.g., 'scale' for test_ff_scale.json)\n\n"
    
    printf " -s | --skip-cleanup\n"
    printf "\tSkip cleanup of test result files\n\n"
    
    printf " -l | --log-file <FILE>\n"
    printf "\tSpecify custom log file (default: test_results.log)\n\n"
    
    printf " -C | --continue-on-failure\n"
    printf "\tContinue running tests even if some fail\n\n"
    
         printf " -t | --timeout <SECONDS>\n"
     printf "\tSet timeout for individual tests (default: 300 seconds)\n"
     printf "\tNote: Timeout not available on macOS - tests will run without timeout\n\n"

    exit 1
}

# ╭──────────────────────────────────────────────────────────╮
# │         Take the arguments from the command line         │
# ╰──────────────────────────────────────────────────────────╯
function arguments()
{
    POSITIONAL_ARGS=()
    VERBOSE=false
    FILTER=""
    SKIP_CLEANUP=false
    CONTINUE_ON_FAILURE=false
    TIMEOUT=300

    while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--filter)
            FILTER="$2"
            shift 
            shift
            ;;
        -s|--skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 
            shift
            ;;
        -C|--continue-on-failure)
            CONTINUE_ON_FAILURE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 
            shift
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
    done
}

# ╭──────────────────────────────────────────────────────────╮
# │                        Functions                         │
# ╰──────────────────────────────────────────────────────────╯

# Function to print colored output
print_status() {
    local status="$1"
    local message="$2"
    local color="$3"
    
    case $status in
        "INFO")
            printf "${TEXT_BLUE_600}ℹ️  %s${TEXT_RESET}\n" "$message"
            ;;
        "SUCCESS")
            printf "${TEXT_GREEN_400}✅ %s${TEXT_RESET}\n" "$message"
            ;;
        "WARNING")
            printf "${TEXT_YELLOW_500}⚠️  %s${TEXT_RESET}\n" "$message"
            ;;
        "ERROR")
            printf "${TEXT_RED_400}❌ %s${TEXT_RESET}\n" "$message"
            ;;
        "RUNNING")
            printf "${TEXT_PURPLE_500}🔄 %s${TEXT_RESET}\n" "$message"
            ;;
    esac
}

# Function to log messages
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to check if scriptflow exists
check_dependencies() {
    if [[ ! -f "$SCRIPTFLOW" ]]; then
        print_status "ERROR" "scriptflow.sh not found at $SCRIPTFLOW"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_status "ERROR" "jq is required but not installed"
        exit 1
    fi
    
    if ! command -v ffmpeg &> /dev/null; then
        print_status "WARNING" "ffmpeg not found in PATH - tests may fail"
    fi
    
    # Check for timeout command (not available on macOS by default)
    if ! command -v timeout &> /dev/null; then
        print_status "WARNING" "timeout command not available - using alternative method"
        TIMEOUT_AVAILABLE=false
    else
        TIMEOUT_AVAILABLE=true
    fi
}

# Function to get test files
get_test_files() {
    local pattern=""
    if [[ -n "$FILTER" ]]; then
        pattern="*$FILTER*.json"
    else
        pattern="test_*.json"
    fi
    
    find "$TESTS_DIR" -maxdepth 1 -name "$pattern" -type f | sort
}

# Function to run a single test
run_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .json)
    local test_dir=$(dirname "$test_file")
    
    print_status "RUNNING" "Running test: $test_name"
    log_message "INFO" "Starting test: $test_name"
    
    # Change to test directory
    cd "$test_dir" || {
        print_status "ERROR" "Failed to change to test directory: $test_dir"
        return 1
    }
    
    # Add script directory to PATH so ff_ scripts can be found
    export PATH="$SCRIPT_DIR:$PATH"
    
    # Run the test with timeout (if available)
    local start_time=$(date +%s)
    local exit_code=0
    
    if [[ "$TIMEOUT_AVAILABLE" == true ]]; then
        # Use timeout command if available
        if timeout "$TIMEOUT" "$SCRIPTFLOW" -C "$test_file" > >(tee -a "$LOG_FILE") 2>&1; then
            exit_code=$?
        else
            exit_code=$?
        fi
    else
        # Alternative method for macOS (no timeout command)
        if "$SCRIPTFLOW" -C "$test_file" > >(tee -a "$LOG_FILE") 2>&1; then
            exit_code=$?
        else
            exit_code=$?
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Clean up test files after each test
    cleanup_test_results
    
    # Check if test passed
    if [[ $exit_code -eq 0 ]]; then
        print_status "SUCCESS" "Test passed: $test_name (${duration}s)"
        log_message "SUCCESS" "Test passed: $test_name (${duration}s)"
        PASSED_TESTS+=("$test_name")
        ((PASSED_COUNT++))
        return 0
    else
        print_status "ERROR" "Test failed: $test_name (${duration}s) - Exit code: $exit_code"
        log_message "ERROR" "Test failed: $test_name (${duration}s) - Exit code: $exit_code"
        FAILED_TESTS+=("$test_name")
        ((FAILED_COUNT++))
        return 1
    fi
}

# Function to cleanup test results
cleanup_test_results() {
    if [[ "$SKIP_CLEANUP" == true ]]; then
        print_status "INFO" "Skipping cleanup as requested"
        return 0
    fi
    
    print_status "INFO" "Cleaning up test result files..."
    
    # Find and remove test result files (more comprehensive patterns)
    find "$TESTS_DIR" -maxdepth 1 -name "test_result_*" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "ff_*" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "output.mp4" -type f -delete
    
    # Clean up numbered test result files (like 1_test_result_*.mp4)
    find "$TESTS_DIR" -maxdepth 1 -name "*_test_result_*" -type f -delete
    
    # Clean up any other temporary files that might be created
    find "$TESTS_DIR" -maxdepth 1 -name "sample_video_*.mp4" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "temp_*.mp4" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "*.tmp" -type f -delete
    
    # Clean up any other common test output patterns
    find "$TESTS_DIR" -maxdepth 1 -name "test_*.mp4" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "test_*.jpg" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "test_*.jpeg" -type f -delete
    find "$TESTS_DIR" -maxdepth 1 -name "test_*.png" -type f -delete
    
    print_status "SUCCESS" "Cleanup completed"
}

# Function to print summary
print_summary() {
    echo
    echo "╭──────────────────────────────────────────────────────────────────────────────╮"
    echo "│                              TEST SUMMARY                                   │"
    echo "╰──────────────────────────────────────────────────────────────────────────────╯"
    echo
    
    printf "Total Tests: %d\n" $TOTAL_TESTS
    
    # Use simple color output
    if [[ $PASSED_COUNT -gt 0 ]]; then
        echo -e "Passed: \033[32m${PASSED_COUNT}\033[0m"
    else
        echo "Passed: 0"
    fi
    
    if [[ $FAILED_COUNT -gt 0 ]]; then
        echo -e "Failed: \033[31m${FAILED_COUNT}\033[0m"
    else
        echo "Failed: 0"
    fi
    
    if [[ $FAILED_COUNT -gt 0 ]]; then
        echo
        echo "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            printf "  ❌ %s\n" "$test"
        done
    fi
    
    if [[ $PASSED_COUNT -gt 0 ]]; then
        echo
        echo "Passed Tests:"
        for test in "${PASSED_TESTS[@]}"; do
            printf "  ✅ %s\n" "$test"
        done
    fi
    
    echo
    echo "Log file: $LOG_FILE"
    
    # Return appropriate exit code
    if [[ $FAILED_COUNT -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# ╭──────────────────────────────────────────────────────────╮
# │                         Main                             │
# ╰──────────────────────────────────────────────────────────╯

main() {
    # Parse arguments
    arguments "$@"
    
    # Initialize log file
    echo "=== Test Run Started at $(date) ===" > "$LOG_FILE"
    
    # Print header
    echo "╭──────────────────────────────────────────────────────────────────────────────╮"
    echo "│                           FFMPEG Scriptflow Tests                           │"
    echo "╰──────────────────────────────────────────────────────────────────────────────╯"
    echo
    
    # Check dependencies
    check_dependencies
    
    # Get test files
    local test_files=($(get_test_files))
    TOTAL_TESTS=${#test_files[@]}
    
    if [[ $TOTAL_TESTS -eq 0 ]]; then
        print_status "WARNING" "No test files found"
        if [[ -n "$FILTER" ]]; then
            print_status "INFO" "Filter '$FILTER' returned no results"
        fi
        exit 0
    fi
    
    print_status "INFO" "Found $TOTAL_TESTS test file(s)"
    
    # Cleanup before running tests
    cleanup_test_results
    
    # Run tests
    local current_test=0
    for test_file in "${test_files[@]}"; do
        ((current_test++))
        echo
        echo "╭──────────────────────────────────────────────────────────────────────────────╮"
        echo "│                              Test $current_test/$TOTAL_TESTS                                │"
        echo "╰──────────────────────────────────────────────────────────────────────────────╯"
        echo
        
        if ! run_test "$test_file"; then
            if [[ "$CONTINUE_ON_FAILURE" == false ]]; then
                print_status "ERROR" "Test failed and --continue-on-failure not specified. Stopping."
                break
            fi
        fi
        
        echo
    done
    
    # Print summary
    print_summary
}

# Run main function with all arguments
main "$@"
