#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                                Crop the video                                │
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

OUTPUT_FILENAME="output_text.mp4"
LOGLEVEL="error" 

TEXT="EXAMPLE"
FONT="/System/Library/Fonts/HelveticaNeue.ttc"
COLOUR="WHITE"
SIZE="24"
BOX="1"
BOXCOLOUR="black"
BOXBORDER="5"
XPIXELS="(w-tw)/2"
YPIXELS="(h-th)/2"

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Change the length of the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -t | --text <TEXT>\n"
        printf "\tText to write over video. Default: EXAMPLE.\n\n"


        printf " -f | --font <FONT>\n"
        printf "\tPath to font file to use. Default: /System/Library/Fonts/HelveticaNeue.ttc\n\n"


        printf " -c | --color <FONTCOLOUR>\n"
        printf "\tThe font colour to use. Can be Hex RRGGBB or name and include alpha with '@0.5' after. Default: white.\n\n"


        printf " -s | --size <FONTSIZE>\n"
        printf "\tThe font size to use. Default: 24.\n\n"


        printf " -b | --box <BOX>\n"
        printf "\tShow the background box. Boolean. 1 or 0. Default: 1.\n\n"


        printf " -p | --boxcolour <PAINTCOLOUR>\n"
        printf "\tThe background paint colour to use. Can be Hex RRGGBB or name and include alpha with '@0.5' after. Default: black.\n\n"


        printf " -r | --boxborder <BOXBORDER>\n"
        printf "\tWidth of the border on the background box around the text. Default: 5.\n\n"


        printf " -x | --xpixels <PIXELS>\n"
        printf "\tWhere to position the text in the frame on X-Axis from left. Default center: (w-tw)/2\n\n"


        printf " -y | --ypixels <PIXELS>\n"
        printf "\tWhere to position the text in the frame on Y-Axis from top. Default center: (h-th)/2\n\n"
        printf "\tThe x and y parameters also have access to the following variables:\n"
        printf "\t- w : The input video's width.\n"
        printf "\t- h : The input video's height.\n"
        printf "\t- tw : The rendered text width.\n"
        printf "\t- th : The rendered text height.\n"
        printf "\t- lh : The line height.\n"
        printf "\tThese can be used to calculate areas of the screen. For example:\n"
        printf "\tThe center of the screen on x-axis is 'x=(ow-iw)/2\n\n"


        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

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


        -t|--text)
            TEXT="$2"
            shift 
            shift
            ;;


        -f|--font)
            FONT="$2"
            shift 
            shift
            ;;


        -c|--colour)
            COLOUR="$2"
            shift 
            shift
            ;;


        -s|--size)
            SIZE="$2"
            shift 
            shift
            ;;


        -b|--box)
            BOX="$2"
            shift 
            shift
            ;;


        -p|--boxcolour)
            BOXCOLOUR="$2"
            shift 
            shift
            ;;


        -r|--boxborder)
            BOXBORDER="$2"
            shift 
            shift
            ;;


        -x|--xpixels)
            XPIXELS="$2"
            shift 
            shift
            ;;


        -y|--ypixels)
            YPIXELS="$2"
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
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "This will crop the video.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    printf "✍️  Writing the text '%s' on the video.\n" "${TEXT}"

    ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "drawtext=fontfile=${FONT}:text=${TEXT}:fontcolor=${COLOUR}:fontsize=${SIZE}:box=${BOX}:boxcolor=${BOXCOLOUR}:boxborderw=${BOXBORDER}:x=${XPIXELS}:y=${YPIXELS}" ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
main $@