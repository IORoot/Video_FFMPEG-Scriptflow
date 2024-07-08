#!/bin/bash
# ╭───────────────────────────────────────────────────────────────────────────╮
# │                                                                           │
# │          This is similar to a concat, but you can use an effect           │
# │                            between each video.                            │
# │                                                                           │
# ╰───────────────────────────────────────────────────────────────────────────╯

# Explanation:
# More than one video needs to be specified. You can also specify a folder.


# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_transition.mp4"              
TMP_FILE="/tmp/tmp_ffmpeg_transition_list.txt"               
GREP=""
FX_CSV="fade"
DURATION="1"
SORT_FLAGS=""

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
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-d <DURATION>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Concat videos with a transition effect between each.\n\n"

        printf "Flags:\n"
        
        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file(s) / folder.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -g | --grep <STRING>\n"
        printf "\tSupply a grep string for filtering the inputs if a folder is specified.\n\n"

        printf " -s | --sort <SORT_FLAGS>\n"
        printf "\tSupply flags to sort command for order of file input.\n"
        printf "\tAdd in quotes. e.g. \"--reverse --random-sort\"\n\n"

        printf " -e | --effects <CSV_STRING>\n"
        printf "\tA csv string of each effect to use. If the effect list is shorter than\n"
        printf "\tvideo list, then the effects will be repeated. [default 'fade'] (https://trac.ffmpeg.org/wiki/Xfade)\n\n"
 
        printf " -d | --duration <STRING>\n"
        printf "\tHow long each transition should take.\n\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
}


# ╭──────────────────────────────────────────────────────────╮
# │         Take the arguments from the command line         │
# ╰──────────────────────────────────────────────────────────╯
function arguments()
{
    POSITIONAL_ARGS=()

    while [[ $# -gt 0 ]]; do
    case $1 in


        -i|--input|--input?|--input??|--input???)
            write_to_temp $(realpath "$2")
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -g|--grep)
            GREP="$2"
            shift 
            shift
            ;;


        -s|--sort)
            SORT_FLAGS="$2"
            shift 
            shift
            ;;


        -e|--effects)
            FX_CSV="$2"
            shift 
            shift
            ;;


        -d|--duration)
            DURATION="$2"
            shift 
            shift
            ;;


        -C|--config)
            CONFIG_FILE="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
            shift 
            shift
            ;;


        --description)              # IGNORED. used for descriptions in JSON 
            shift
            shift
            ;;


        -*|--*)
            echo "Unknown option $1"
            exit 1
            ;;


        *)
            POSITIONAL_ARGS+=("$1") # save positional arg back onto variable
            shift                   # remove argument and shift past it.
            ;;
    esac
    done

}



# ╭──────────────────────────────────────────────────────────╮
# │        Read config-file if supplied. Requires JQ           │
# ╰──────────────────────────────────────────────────────────╯
function read_config()
{
    # Check if config has been set.
    if [ -z ${CONFIG_FILE+x} ]; then return 0; fi
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        printf "JQ is a dependency and could not be found. Please install JQ for JSON parsing. Exiting.\n"
        exit
    fi

    # Read file
    LIST_OF_INPUTS=$(cat ${CONFIG_FILE} | jq -r 'to_entries[] | ["--" + .key, .value] | @sh' | xargs) 

    # Send to the arguments function again to override.
    arguments $LIST_OF_INPUTS
}


# ╭──────────────────────────────────────────────────────────╮
# │     Write the absolute path into the temporary file       │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{

    FILE=$1

    # if this a folder
    if [ -d "$FILE" ]; then
        LOOP=0
        LIST_OF_FILES=$(find $FILE -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP" | sort )
        for FILE in $LIST_OF_FILES
        do
            pre_flight_checks $FILE
            printf "%s\n" "${FILE}" >> ${TMP_FILE}
            LOOP=$(expr $LOOP + 1)
        done 
        return
    fi

    # check files
    pre_flight_checks ${FILE}

    # print line into temp file.
    printf "%s\n" "${FILE}" >> ${TMP_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │ If the GREP is set AFTER the input, we need to grep file. │
# │ Add sort too.                                            │
# ╰──────────────────────────────────────────────────────────╯
function grep_file_and_sort()
{
    cat ${TMP_FILE} | grep "${GREP}" | sort "$SORT_FLAGS" > ${TMP_FILE}.grep
    mv ${TMP_FILE}.grep ${TMP_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │                         Cleanup                          │
# ╰──────────────────────────────────────────────────────────╯
function cleanup()
{
    rm -f ${TMP_FILE}
}



# ╭──────────────────────────────────────────────────────────╮
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    cp -f ${INPUT_FILENAME} ${OUTPUT_FILENAME}
    exit 0
}



# ╭──────────────────────────────────────────────────────────╮
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{
    INPUT_FILE=$1

    # Check input file exists.
    if [ ! -f "$INPUT_FILE" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check input filename is a movie file.
    if ffprobe "${INPUT_FILE}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}



# ╭──────────────────────────────────────────────────────────╮
# │         Concat all files together with xfade fx.          │
# ╰──────────────────────────────────────────────────────────╯
function effects_csv_to_array()
{
    IFS=',' read -r -a FX <<< "$FX_CSV"
}


# ╭───────────────────────────────────────────────────────╮
# │        Convert list of files in file to array           │
# ╰───────────────────────────────────────────────────────╯
function create_array_of_files()
{
    FILES=()
    while IFS= read -r line; do
        FILES+=("$line")
    done < "$TMP_FILE"

    NUM_FILES=${#FILES[@]}
    NUM_FX=${#FX[@]}
}

function get_duration() {
  ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$1"
}

# ╭───────────────────────────────────────────────────────╮
# │               Build the FFMPEG Command                │
# ╰───────────────────────────────────────────────────────╯
function create_command()
{
  
    # Function to get video duration using ffprobe
    get_duration() {
        ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$1"
    }

    # Construct the filter_complex string
    FILTER_COMPLEX=""
    for (( i=0; i<NUM_FILES; i++ ))
    do
        if [[ $i -gt 0 ]]; then
            # Select the xfade effect, wrapping around the FX list
            FX_INDEX=$(( (i-1) % NUM_FX ))
            XF_EFFECT=${FX[$FX_INDEX]}

            # Get duration of previous video
            PREVIOUS_DURATION=$(get_duration "${FILES[$(($i-1))]}")

            # Calculate the offset for the xfade transition
            OFFSET=$(echo "$PREVIOUS_DURATION - $DURATION" | bc)

            # Add xfade transition
            FILTER_COMPLEX+="[$(($i-1)):v][$i:v]xfade=transition=${XF_EFFECT}:duration=${DURATION}:offset=$OFFSET[v$i];"
        fi
    done

    # Final concatenation
    FILTER_COMPLEX+="[v1]"
    for (( i=2; i<NUM_FILES; i++ ))
    do
        FILTER_COMPLEX+="[v$i]"
    done
    FILTER_COMPLEX+="concat=n=$((NUM_FILES-1)):v=1:a=0[outv]"

    # Construct the FFmpeg command
    FFMPEG_CMD="ffmpeg"

    # Add input files to the FFmpeg command
    for FILE in "${FILES[@]}"; do
        FFMPEG_CMD+=" -i \"$FILE\""
    done

    # Add the filter_complex and output mapping to the FFmpeg command
    FFMPEG_CMD+=" -filter_complex \"$FILTER_COMPLEX\" -map \"[outv]\" $OUTPUT_FILENAME"

    echo $FFMPEG_CMD

}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    if [[ -z "${TMP_FILE}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    grep_file_and_sort

    effects_csv_to_array

    create_array_of_files

    create_command

    eval $FFMPEG_CMD

    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"
}


cleanup
usage $@
arguments $@
read_config "$@"
main $@
cleanup