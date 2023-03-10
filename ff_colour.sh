#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                         Alter the colour of a video                          │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.
cd "$(dirname "$0")"                                        # Change to the script folder.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯

OUTPUT_FILENAME="output_colour.mp4"
BRIGHTNESS="0"      # -1.0 to 1.0
CONTRAST="1"        # -1000.0 to 1000.0
GAMMA="1"           # 0.1 to 10.0
SATURATION="1"      # 0.0 to 3.0
WEIGHT="1"          # 0.0 to 1.0
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -t <LUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Change the Brightness, Contrast, Gamma, Gamma-Weight and Saturation of a video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -b | --brightness <BRIGHTNESS>\n"
        printf "\tChange the brightness value from -1.0 to 1.0.\n\n"

        printf " -c | --contrast <CONTRAST>\n"
        printf "\tChange the contrast value from -1000.0 to 1000.0.\n\n"

        printf " -g | --gamma <GAMMA>\n"
        printf "\tChange the gamma value from 0.1 to 10.0.\n\n"

        printf " -s | --saturation <SATURATION>\n"
        printf "\tChange the saturation value from 0.0 to 3.0.\n\n"

        printf " -w | --weight <GAMMAWEIGHT>\n"
        printf "\tChange the gamma weight value from 0.0 to 1.0.\n\n"

        printf " -c | --config <CONFIG_FILE>\n"
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


        -b|--brightness)
            BRIGHTNESS="$2"
            shift 
            shift
            ;;


        -c|--contrast)
            CONTRAST="$2"
            shift 
            shift
            ;;


        -g|--gamma)
            GAMMA="$2"
            shift 
            shift
            ;;


        -s|--saturation)
            SATURATION="$2"
            shift 
            shift
            ;;


        -w|--weight)
            WEIGHT="$2"
            shift 
            shift
            ;;


        -c|--config)
            CONFIG_FILE="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
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
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "This will alter the colour parameters of the video.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    printf "🎨 Changing the colour of the video.\n" "$LUT_FILE" 

    # https://ffmpeg.org/ffmpeg-filters.html#eq
    ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf \
        eq=brightness=${BRIGHTNESS}:contrast=${CONTRAST}:gamma=${GAMMA}:saturation=${SATURATION}:gamma_weight=${WEIGHT} \
        -c:a copy ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@