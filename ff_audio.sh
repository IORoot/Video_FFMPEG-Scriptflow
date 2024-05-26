#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │          Overlay an audio track at specific time on the video                 │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.



# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME=""
AUDIO_FILENAME=""
OUTPUT_FILENAME="ff_audio.mp4"
LOGLEVEL="error"
START="0"
SPEED="1.0"
SHORTEST=""

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
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -a <AUDIO_FILE> [-S <START>] [-p <SPEED>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Overlay an audio file on the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -a | --audio <INPUT_FILE>\n"
        printf "\tThe name of an audio file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -s | --start <SECONDS>\n"
        printf "\tStart time in seconds of when to play audio.\n"

        printf " -p | --speed <SPEED>\n"
        printf "\tPlayback speed of the audio.\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

        exit 0
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


        -i|--input)
            INPUT_FILENAME=$(realpath "$2")
            shift
            shift
            ;;

        -a|--audio)
            AUDIO_FILENAME=$(realpath "$2")
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;

        
        -s|--start)
            START="$2"
            shift 
            shift
            ;;
        
        
        -p|--speed)
            SPEED="$2"
            shift 
            shift
            ;; 

        
        -h|--shortest)
            SHORTEST="-shortest"
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
# │         Read config-file if supplied. Requires JQ          │
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


    # Sen to the arguments function again to override.
    arguments $LIST_OF_INPUTS
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
    # Check input filename has been set.
    if [[ -z "${INPUT_FILENAME+x}" ]]; then 
        printf "\t❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check input file exists.
    if [ ! -f "$INPUT_FILENAME" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check audio filename has been set.
    if [[ -z "${AUDIO_FILENAME+x}" ]]; then 
        printf "\t❌ No audio file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check audio file exists.
    if [ ! -f "$AUDIO_FILENAME" ]; then
        printf "\t❌ audio file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILENAME}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILENAME}"
        ffprobe "${INPUT_FILENAME}"
        exit_gracefully
    fi
}

function print_flags()
{
    printf "🔊 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Overlay" "$AUDIO_FILENAME"
    printf "🏁 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Start" "$START"
    printf "🏎️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Speed" "$SPEED"
    printf "🐜  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Shortest" "$SHORTEST"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    if [[ -z "${AUDIO_FILENAME}" ]]; then 
        printf "❌ No audio file specified. Exiting.\n"
        exit_gracefully
    fi

    print_flags

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -itsoffset ${START} -i ${AUDIO_FILENAME} -filter_complex "[1:a]atempo=${PLAYBACK}[aud]" -map 0:v:0 -map "[aud]" -c:v copy ${SHORTEST} ${OUTPUT_FILENAME} 
    
    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@