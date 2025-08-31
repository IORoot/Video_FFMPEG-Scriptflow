#!/bin/bash

# =============================================================================
# FF_CUSTOM - Custom FFMPEG Processing Script
# =============================================================================
# 
# This script allows you to pass any FFMPEG parameters as a string for
# maximum flexibility in video processing operations.
#
# Usage: ./ff_custom.sh [OPTIONS]
#
# Options:
#   -i, --input        Input file path
#   -o, --output       Output file path (default: ff_custom.mp4)
#   -p, --params       FFMPEG parameters string (required)
#   -d, --description  Description of the operation
#   -l, --loglevel     FFMPEG log level (default: error)
#   -C, --config       JSON config file
#   -g, --grep         File filtering pattern
#   -h, --help         Show this help message
#
# Examples:
#   ./ff_custom.sh -i input.mov -p "-c:v libx264 -c:a aac -strict experimental"
#   ./ff_custom.sh -i input.mov -p "-vf \"drawtext=text='hello':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2\" -c:v libx264"
#   ./ff_custom.sh -C config.json
#
# =============================================================================

# Default values
INPUT_FILENAME=""
OUTPUT_FILENAME="ff_custom.mp4"
FFMPEG_PARAMS=""
DESCRIPTION="Custom FFMPEG processing"
LOGLEVEL="error"
CONFIG_FILE=""
GREP_PATTERN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
usage() {
    echo "FF_CUSTOM - Custom FFMPEG Processing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --input        Input file path"
    echo "  -o, --output       Output file path (default: ff_custom.mp4)"
    echo "  -p, --params       FFMPEG parameters string (required)"
    echo "  -d, --description  Description of the operation"
    echo "  -l, --loglevel     FFMPEG log level (default: error)"
    echo "  -C, --config        JSON config file"
    echo "  -g, --grep         File filtering pattern"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -i input.mov -p \"-c:v libx264 -c:a aac -strict experimental\""
    echo "  $0 -i input.mov -p \"-vf \\\"drawtext=text='hello':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2\\\" -c:v libx264\""
    echo "  $0 -C config.json"
    echo ""
    echo "Note: The --params option is required unless using --config"
}

# Function to parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--input)
                INPUT_FILENAME="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILENAME="$2"
                shift 2
                ;;
            -p|--params)
                FFMPEG_PARAMS="$2"
                shift 2
                ;;
            -d|--description)
                DESCRIPTION="$2"
                shift 2
                ;;
            -l|--loglevel)
                LOGLEVEL="$2"
                shift 2
                ;;
            -C|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -g|--grep)
                GREP_PATTERN="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_color $RED "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Function to load config from JSON
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        print_color $BLUE "Loading config from: $CONFIG_FILE"
        
        # Handle the case where the config file contains multiple JSON objects
        # We need to get the first valid JSON object
        local first_config=$(head -n 1 "$CONFIG_FILE")
        
        # Check if it's a single object or multiple objects
        if echo "$first_config" | jq -e . >/dev/null 2>&1; then
            # Single JSON object
            INPUT_FILENAME=$(jq -r '.input // ""' "$CONFIG_FILE")
            OUTPUT_FILENAME=$(jq -r '.output // "ff_custom.mp4"' "$CONFIG_FILE")
            FFMPEG_PARAMS=$(jq -r '.params // ""' "$CONFIG_FILE")
            DESCRIPTION=$(jq -r '.description // "Custom FFMPEG processing"' "$CONFIG_FILE")
            LOGLEVEL=$(jq -r '.loglevel // "error"' "$CONFIG_FILE")
        else
            # Multiple JSON objects - extract the first one
            local temp_file=$(mktemp)
            # Get the first complete JSON object
            local brace_count=0
            local in_object=false
            while IFS= read -r line; do
                if [[ "$line" =~ ^[[:space:]]*\{ ]]; then
                    in_object=true
                    brace_count=1
                elif [[ "$in_object" == true ]]; then
                    if [[ "$line" =~ \{ ]]; then
                        ((brace_count++))
                    fi
                    if [[ "$line" =~ \} ]]; then
                        ((brace_count--))
                    fi
                fi
                
                if [[ "$in_object" == true ]]; then
                    echo "$line" >> "$temp_file"
                fi
                
                if [[ "$in_object" == true && $brace_count -eq 0 ]]; then
                    break
                fi
            done < "$CONFIG_FILE"
            
            # Parse the first object
            INPUT_FILENAME=$(jq -r '.input // ""' "$temp_file")
            OUTPUT_FILENAME=$(jq -r '.output // "ff_custom.mp4"' "$temp_file")
            FFMPEG_PARAMS=$(jq -r '.params // ""' "$temp_file")
            DESCRIPTION=$(jq -r '.description // "Custom FFMPEG processing"' "$temp_file")
            LOGLEVEL=$(jq -r '.loglevel // "error"' "$temp_file")
            
            rm -f "$temp_file"
        fi
        
        print_color $GREEN "Config loaded successfully"
    else
        print_color $RED "Config file not found: $CONFIG_FILE"
        exit 1
    fi
}

# Function to validate required parameters
validate_params() {
    if [[ -z "$INPUT_FILENAME" ]]; then
        print_color $RED "Error: Input filename is required"
        usage
        exit 1
    fi
    
    if [[ -z "$FFMPEG_PARAMS" ]]; then
        print_color $RED "Error: FFMPEG parameters are required"
        usage
        exit 1
    fi
    
    if [[ ! -f "$INPUT_FILENAME" ]]; then
        print_color $RED "Error: Input file not found: $INPUT_FILENAME"
        exit 1
    fi
}

# Function to process files
process_files() {
    local files=()
    
    if [[ -n "$GREP_PATTERN" ]]; then
        # Filter files by pattern
        while IFS= read -r -d '' file; do
            files+=("$file")
        done < <(find . -maxdepth 1 -type f -name "$GREP_PATTERN" -print0)
    else
        files=("$INPUT_FILENAME")
    fi
    
    if [[ ${#files[@]} -eq 0 ]]; then
        print_color $YELLOW "No files found matching pattern: $GREP_PATTERN"
        return 0
    fi
    
    for file in "${files[@]}"; do
        process_single_file "$file"
    done
}

# Function to process a single file
process_single_file() {
    local input_file="$1"
    local output_file="$OUTPUT_FILENAME"
    
    # If processing multiple files, add prefix to output
    if [[ ${#files[@]} -gt 1 ]]; then
        local basename=$(basename "$input_file" | sed 's/\.[^.]*$//')
        local extension="${OUTPUT_FILENAME##*.}"
        output_file="${basename}_${OUTPUT_FILENAME%.*}.${extension}"
    fi
    
    print_color $BLUE "Processing: $input_file"
    print_color $BLUE "Output: $output_file"
    print_color $BLUE "Description: $DESCRIPTION"
    print_color $BLUE "Parameters: $FFMPEG_PARAMS"
    
    # Build FFMPEG command
    # Note: We use eval to properly handle the parameter string with quotes and spaces
    local ffmpeg_cmd="ffmpeg -loglevel $LOGLEVEL -i \"$input_file\" $FFMPEG_PARAMS \"$output_file\""
    
    print_color $YELLOW "Executing: $ffmpeg_cmd"
    
    # Execute FFMPEG command
    if eval "$ffmpeg_cmd"; then
        print_color $GREEN "✅ Successfully processed: $input_file -> $output_file"
    else
        print_color $RED "❌ Failed to process: $input_file"
        return 1
    fi
}

# Function to clean up temporary files
cleanup() {
    # Remove any temporary files if needed
    true
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"
    
    # Load config if specified
    if [[ -n "$CONFIG_FILE" ]]; then
        load_config
    fi
    
    # Validate parameters
    validate_params
    
    # Process files
    process_files
    
    # Cleanup
    cleanup
    
    print_color $GREEN "🎉 Custom FFMPEG processing completed!"
}

# Set up signal handlers for cleanup
trap cleanup EXIT INT TERM

# Run main function
main "$@"
