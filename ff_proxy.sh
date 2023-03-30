#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │           Downgrade large videos to a more manageable file size              │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯


# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_proxy.mp4"
SCALE_X="1280"
SCALE_Y="-2"
FPS="30"
CRF="25"
CODEC="libx264"
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-w <WIDTH>] [-h <HEIGHT>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Change the scale (Width/Height) of a video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE / INPUT_FOLDER>\n"
        printf "\tThe name of an input file.\n"
        printf "\tIf a FOLDER, then it is recursive.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -r | --recursive\n"
        printf "\tIf a FOLDER, then recurse to deeper folders.\n\n"


        printf " -x | --scalex\n"
        printf "\tWidth of the output proxy. can use -2 to keep aspect ratio to scaley. Default 1280.\n\n"


        printf " -y | --scaley\n"
        printf "\tHeight of the output proxy. can use -2 to keep aspect ratio to scalex. Default -2.\n\n"


        printf " -f | --fps\n"
        printf "\tFrames Per Second to reduce the proxy down to. Default 30.\n\n"


        printf " -c | --CRF\n"
        printf "\tConstant Rate Factor. 0-51. Controls the quality of the output. Default 25.\n\n"


        printf " -d | --codec\n"
        printf "\tCodec library to use. libxwebp / libx264 / libx265 /etc... Default libx264.\n\n"


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


        -i|--input)
            INPUT_FILENAME="$2"
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -r|--recursive)
            RECURSIVE=true
            shift
            ;;


        -x|--scalex)
            SCALE_X="$2"
            shift
            shift
            ;;


        -y|--scaley)
            SCALE_Y="$2"
            shift
            shift
            ;;


        -f|--fps)
            FPS="$2"
            shift 
            shift
            ;;


        -c|--crf)
            CRF="$2"
            shift 
            shift
            ;;


        -d|--codec)
            CODEC="$2"
            shift 
            shift
            ;;



        -C|--config)
            CONFIG_FILE="$2"
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
# │        Read config-file if supplied. Requires JQ         │
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

    # Print to screen
    printf "🎛️  Config Flags: %s\n" "$LIST_OF_INPUTS"

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

    INPUT_FILE=$1 

    # Check input filename has been set.
    if [[ -z "${INPUT_FILE+x}" ]]; then 
        printf "\t❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check input file/folder exists.
    if [ ! -f "$INPUT_FILE" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

        # Check input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILE}" > /dev/null 2>&1; then
        printf "\t" 
    else
        printf "\t❌ Input file not a movie file. Exiting.\n"
        exit_gracefully
    fi
}


# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    # If input is a file
    if [[ -f "${INPUT_FILENAME}" ]]; then 
        pre_flight_checks $INPUT_FILENAME
        printf "📐 ff_proxy.sh - Create a small low-res proxy file for input video. "
        ffmpeg -y -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf scale=${SCALE_X}:${SCALE_Y},setsar=1:1,fps=${FPS} -vcodec ${CODEC} -crf ${CRF} -c:a aac -q:a 5 ${OUTPUT_FILENAME}
    fi

    # If input is a folder
    if [[ -d "${INPUT_FILENAME}" ]]; then
        for FILE in $(find ${INPUT_FILENAME} -type f | grep -i 'mp4\|mov');
        do
            pre_flight_checks $FILE
            REALFILE=$(realpath $FILE)
            DIRECTORY=$(dirname $FILE)
            BASENAME=$(basename $FILE)
            NOEXTENSION=$(echo "${BASENAME%.*}" )
            echo "processing ${REALFILE}"
            ffmpeg -y -v ${LOGLEVEL} -i ${REALFILE} -vf scale=${SCALE_X}:${SCALE_Y},setsar=1:1,fps=${FPS} -vcodec ${CODEC} -crf ${CRF} -c:a aac -q:a 5 ${DIRECTORY}/proxy_${NOEXTENSION}.mp4
        done
    fi



    printf "✅ %s\n" "${OUTPUT_FILENAME}"

}

usage $@
arguments $@
read_config "$@"
main $@