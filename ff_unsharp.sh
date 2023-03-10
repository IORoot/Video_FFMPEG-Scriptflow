#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                    Sharpen a video using the unsharp mask                    │
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

OUTPUT_FILENAME="output_unsharp.mp4"
LX="5"          # odd numbers only. 3 to 23
LY="5"          # odd numbers only. 3 to 23
LA="1.0"        # -1.5 and 1.5
CX="5"          # odd numbers only. 3 to 23
CY="5"          # odd numbers only. 3 to 23
CA="0.0"        # -1.5 and 1.5
AX="5"          # odd numbers only. 3 to 23
AY="5"          # odd numbers only. 3 to 23
AA="0.0"        # -1.5 and 1.5
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -t <LUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Uses an unsharp mask to alter the luma,chroma and alpha of a video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -lx | --luma_x <SIZE>\n"
        printf "\tSet the luma matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -ly | --luma_y <SIZE>\n"
        printf "\tSet the luma matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -la | --luma_amount <AMOUNT>\n"
        printf "\tSet the luma effect strength. It must be a floating point number. -2.0 to 5.0. Default value is 1.0.\n"
        printf "\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n\n"

        printf " -cx | --chroma_x <SIZE>\n"
        printf "\tSet the chroma matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -cy | --chroma_y <SIZE>\n"
        printf "\tSet the chroma matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -ca | --chroma_amount <AMOUNT>\n"
        printf "\tSet the chroma effect strength. It must be a floating point number. Default value is 0.0.\n"
        printf "\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n\n"

        printf " -ax | --alpha_x <SIZE>\n"
        printf "\tSet the alpha matrix horizontal size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -ay | --alpha_y <SIZE>\n"
        printf "\tSet the alpha matrix vertical size. It must be an odd integer between 3 and 23. The default value is 5.\n\n"

        printf " -aa | --alpha_amount <AMOUNT>\n"
        printf "\tSet the alpha effect strength. It must be a floating point number. Default value is 0.0.\n"
        printf "\tNegative values will blur the input video, while positive values will sharpen it, a value of zero will disable the effect.\n\n"

        printf "\tAll parameters are optional and default to the equivalent of the string '5:5:1.0:5:5:0.0'.\n\n"

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


        -lx|--luma_x)
            LX="$2"
            shift 
            shift
            ;;


        -ly|--luma_y)
            LY="$2"
            shift 
            shift
            ;;


        -la|--luma_amount)
            LA="$2"
            shift 
            shift
            ;;


        -cx|--chroma_x)
            CX="$2"
            shift 
            shift
            ;;


        -cy|--chroma_y)
            CY="$2"
            shift 
            shift
            ;;


        -ca|--chroma_amount)
            CA="$2"
            shift 
            shift
            ;;
            

        -ax|--alpha_x)
            AX="$2"
            shift 
            shift
            ;;


        -ay|--alpha_y)
            AY="$2"
            shift 
            shift
            ;;


        -aa|--alpha_amount)
            AA="$2"
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

    printf "This will sharpen/blur the video.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    printf "🎨 Changing the sharpness of the video.\n" "$LUT_FILE" 

    # https://ffmpeg.org/ffmpeg-filters.html#eq
    ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf \
        unsharp=${LX}:${LY}:${LA}:${CX}:${CY}:${CA}:${AX}:${AY}:${AA} \
        -c:a copy ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@