#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                         JSON Template Config Runner                          │
# │        Takes a JSON config file and executes each command in sequence        │
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
PWD=$(pwd)
TEMP_FOLDER="/tmp"
OUTPUT_FILENAME="output.mp4"
CONFIG_FILE="config.json"

# ╭──────────────────────────────────────────────────────────╮
# │                     Colour Variables                     │
# ╰──────────────────────────────────────────────────────────╯
LIGHT_COLOUR="#fafafa"
DARK_COLOUR="#171717"
CONTRAST_COLOUR="$LIGHT_COLOUR"
TAILWIND="#f8fafc #f1f5f9 #e2e8f0 #cbd5e1 #94a3b8 #64748b #475569 #334155 #1e293b #0f172a #020617 #f9fafb #f3f4f6 #e5e7eb #d1d5db #9ca3af #6b7280 #4b5563 #374151 #1f2937 #111827 #030712 #fafafa #f4f4f5 #e4e4e7 #d4d4d8 #a1a1aa #71717a #52525b #3f3f46 #27272a #18181b #09090b #fafafa #f5f5f5 #e5e5e5 #d4d4d4 #a3a3a3 #737373 #525252 #404040 #262626 #171717 #0a0a0a #fafaf9 #f5f5f4 #e7e5e4 #d6d3d1 #a8a29e #78716c #57534e #44403c #292524 #1c1917 #0c0a09 #fef2f2 #fee2e2 #fecaca #fca5a5 #f87171 #ef4444 #dc2626 #b91c1c #991b1b #7f1d1d #450a0a #fff7ed #ffedd5 #fed7aa #fdba74 #fb923c #f97316 #ea580c #c2410c #9a3412 #7c2d12 #431407 #fffbeb #fef3c7 #fde68a #fcd34d #fbbf24 #f59e0b #d97706 #b45309 #92400e #78350f #451a03 #fefce8 #fef9c3 #fef08a #fde047 #facc15 #eab308 #ca8a04 #a16207 #854d0e #713f12 #422006 #f7fee7 #ecfccb #d9f99d #bef264 #a3e635 #84cc16 #65a30d #4d7c0f #3f6212 #365314 #1a2e05 #f0fdf4 #dcfce7 #bbf7d0 #86efac #4ade80 #22c55e #16a34a #15803d #166534 #14532d #052e16 #ecfdf5 #d1fae5 #a7f3d0 #6ee7b7 #34d399 #10b981 #059669 #047857 #065f46 #064e3b #022c22 #f0fdfa #ccfbf1 #99f6e4 #5eead4 #2dd4bf #14b8a6 #0d9488 #0f766e #115e59 #134e4a #042f2e #ecfeff #cffafe #a5f3fc #67e8f9 #22d3ee #06b6d4 #0891b2 #0e7490 #155e75 #164e63 #083344 #f0f9ff #e0f2fe #bae6fd #7dd3fc #38bdf8 #0ea5e9 #0284c7 #0369a1 #075985 #0c4a6e #082f49 #eff6ff #dbeafe #bfdbfe #93c5fd #60a5fa #3b82f6 #2563eb #1d4ed8 #1e40af #1e3a8a #172554 #eef2ff #e0e7ff #c7d2fe #a5b4fc #818cf8 #6366f1 #4f46e5 #4338ca #3730a3 #312e81 #1e1b4b #f5f3ff #ede9fe #ddd6fe #c4b5fd #a78bfa #8b5cf6 #7c3aed #6d28d9 #5b21b6 #4c1d95 #2e1065 #faf5ff #f3e8ff #e9d5ff #d8b4fe #c084fc #a855f7 #9333ea #7e22ce #6b21a8 #581c87 #3b0764 #fdf4ff #fae8ff #f5d0fe #f0abfc #e879f9 #d946ef #c026d3 #a21caf #86198f #701a75 #4a044e #fdf2f8 #fce7f3 #fbcfe8 #f9a8d4 #f472b6 #ec4899 #db2777 #be185d #9d174d #831843 #500724 #fff1f2 #ffe4e6 #fecdd3 #fda4af #fb7185 #f43f5e #e11d48 #be123c #9f1239 #881337 #4c0519"
TAILWIND_ARRAY=($TAILWIND)



# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 1 ]; then
        printf "ℹ️  Usage:\n $0 -c <CONFIG_FILE> [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Runs a config file to execute multiple ff_ scripts in sequence.\n"
        printf "Requires JQ command.\n\n"

        printf "Flags:\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tA JSON configuration file for all settings.\n"
        printf "\tAll inputs/outputs should be relative to where this file is.\n\n"

        printf " -t | --notidy\n"
        printf "\tDo not delete intermediate files.\n"

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

        -C|--config)
            CONFIG_FILE=$(realpath "$2")
            shift 
            shift
            ;;


        -t|--notidy)
            TIDY="FALSE"
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
# │            Config file overrides any settings            │
# ╰──────────────────────────────────────────────────────────╯
function read_config()
{
    # Check if config has been set.
    if [ -z ${CONFIG_FILE+x} ]; then exit 1; fi
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        printf "JQ is a dependency and could not be found. Please install JQ for JSON parsing. Exiting.\n"
        exit 1
    fi

    # Get a list of all the scripts - Any duplicates must have digits after their name. ff_scale1, ff_scale2, etc...
    LIST_OF_SCRIPT_NAMES=$(cat ${CONFIG_FILE} | jq 'to_entries[] | select(.key|startswith("ff")) | .key' | xargs )
    ARRAY_OF_SCRIPT_NAMES=($LIST_OF_SCRIPT_NAMES)
}


# ╭──────────────────────────────────────────────────────────╮
# │   Generate a random colour that stays constant through   │
# │   the whole scriptflow. This allows for multiple steps   │
# │    to use the same random colour and contrast colour.    │
# ╰──────────────────────────────────────────────────────────╯
generate_colours()
{
    RANDOM_SEED=$$$(date +%s)
    RANDOM_KEY=$[$RANDOM_SEED % ${#TAILWIND_ARRAY[@]}]
    CONSTANT_RANDOM_COLOUR=${TAILWIND_ARRAY[$RANDOM_KEY]}
    contrast_colour "$CONSTANT_RANDOM_COLOUR"
    CONSTANT_CONTRAST_COLOUR="$CONTRAST_COLOUR"
}


# ╭──────────────────────────────────────────────────────────╮
# │   Substitute specific keywords for their actual values   │
# ╰──────────────────────────────────────────────────────────╯
function keyword_substitutions()
{

    # <ENV_*>
    # Replace environment variables
    # Run `export VAR="123"` or add to front of scriptflow command
    # VAR="ABC" ./scriptflow.sh
    REGEX="<ENV_([^>]*)>"
    if [[ $SCRIPT_CONTENTS =~ $REGEX ]]; then
        ENVIRONMENT_VARIABLE="${BASH_REMATCH[1]}"
        ENVIRONMENT_VALUE="${!ENVIRONMENT_VARIABLE}"
        ENVIRONMENT_VALUE_SPACED="${ENVIRONMENT_VALUE//_/ }"
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<ENV_${ENVIRONMENT_VARIABLE}>/$ENVIRONMENT_VALUE_SPACED}
    fi


    # <FOLDER_NAME>
    # current folder
    FOLDER_NAME=$(basename $PWD)
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<FOLDER_NAME>/$FOLDER_NAME}


    # <FOLDER_TITLE>
    # This is the folder name, replacing _ for spaces.
    FOLDER_TITLE=${FOLDER_NAME//_/ }
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<FOLDER_TITLE>/$FOLDER_TITLE}


    # <DATE_%d-%m-%y>
    # Format can be of any kind. see https://man7.org/linux/man-pages/man1/date.1.html
    # Formats like:
    # <DATE_%A %d %B. %Y> = Friday 31 March. 2023
    #
    # use ([^>]*) to match any character not a '>' because ungreedy '?' doesn't work on mac bash
    #
    REGEX="<DATE_([^>]*)>"
    if [[ $SCRIPT_CONTENTS =~ $REGEX ]]; then
        DATE_FORMAT="${BASH_REMATCH[1]}"
        DATE=$(date +"${DATE_FORMAT//\\/}")
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<DATE_${BASH_REMATCH[1]}>/$DATE}
    fi



    # <RANDOM_VIDEO>
    # Any random file in folder.
    # "../lib/luts/<RANDOM_FILE>"
    RANDOM_VIDEO=$( find ${PWD} \( -iname '*.mp4' -o -iname '*.mov' \) | sort -R | head -n 1 )
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_VIDEO>/$RANDOM_VIDEO}


    # <RANDOM_VIDEO_FILTER_youth>
    # Any random file in folder, filtered with specific string 'youth'
    # "../lib/overlays/<RANDOM_FILTER_blue>"
    REGEX2="<RANDOM_VIDEO_FILTER_([^>]*)>"
    if [[ $SCRIPT_CONTENTS =~ $REGEX2 ]]; then
        FILTER="${BASH_REMATCH[1]}"
        RANDOM_FILTER=$(find ${PWD} \( -iname '*.mp4' -o -iname '*.mov' \) | grep $FILTER | sort -R | head -n 1)
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_VIDEO_FILTER_${BASH_REMATCH[1]}>/$RANDOM_FILTER}
    fi
    

    # <RANDOM_COLOUR>
    # Replace with a random colour from the tailwind palette
    # This changes on every stage
    RANDOM_SEED=$$$(date +%s)
    RANDOM_KEY=$[$RANDOM_SEED % ${#TAILWIND_ARRAY[@]}]
    RANDOM_COLOUR=${TAILWIND_ARRAY[$RANDOM_KEY]}
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_COLOUR>/$RANDOM_COLOUR}

    # <RANDOM_CONTRAST_COLOUR>
    # This colour will either be a light or dark colour based
    # on the <RANDOM_COLOUR> generated above.
    # This changes on every stage
    contrast_colour "$RANDOM_COLOUR"
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_CONTRAST_COLOUR>/$CONTRAST_COLOUR}


    # <CONSTANT_RANDOM_COLOUR>
    # Set at the top of this script, this colour will
    # only randomise once and stay the same throughout
    # the whole scriptflow run.
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<CONSTANT_RANDOM_COLOUR>/$CONSTANT_RANDOM_COLOUR}

    # <CONSTANT_CONTRAST_COLOUR>
    # Set at the top of this script, this colour will
    # only randomise once and stay the same throughout
    # the whole scriptflow run.
    # Generated using the <CONSTANT_RANDOM_COLOUR>
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<CONSTANT_CONTRAST_COLOUR>/$CONSTANT_CONTRAST_COLOUR}

}


# ╭──────────────────────────────────────────────────────────╮
# │      Find a contrasting colour to the random colour      │
# ╰──────────────────────────────────────────────────────────╯
contrast_colour() {
    IN="$1"
    # Remove the '#' from the hex code and convert it to RGB
    r=$(echo "${IN#"#"}" | sed -E 's/^(..).+$/\1/')
    g=$(echo "${IN#"#"}" | sed -E 's/^..(..).+$/\1/')
    b=$(echo "${IN#"#"}" | sed -E 's/^....(..)$/\1/')

    r_bright=$((16#${r}${r}))
    g_bright=$((16#${g}${g}))
    b_bright=$((16#${b}${b}))

    # Calculate the brightness of the color
    brightness=$(( ${r_bright} + ${g_bright} + ${b_bright}))
    brightness=$((brightness / 3))

    # Return "light" or "dark" depending on the brightness
    if (( $(echo "$brightness > 32767" | bc -l) )); then
        CONTRAST_COLOUR="$DARK_COLOUR"
    else
        CONTRAST_COLOUR="$LIGHT_COLOUR"
    fi
}

# ╭──────────────────────────────────────────────────────────╮
# │                Remove any temporary files                │
# ╰──────────────────────────────────────────────────────────╯
function cleanup()
{
    if [[ -z ${TIDY+x} ]]; then
        rm -f ${TEMP_FOLDER}/temp_config_ff*
        find . -type f -name 'ff*.mp4' -delete
        find . -type f -regex './[0-9][0-9]*_ff.*' -delete
    fi


}



# ╭──────────────────────────────────────────────────────────╮
# │     Run the specific ff_script with correct settings     │
# ╰──────────────────────────────────────────────────────────╯
function run_ff_script()
{
    SCRIPT_NAME=$1
    SCRIPT_CONFIG=$2
    SCRIPT_FILE=${TEMP_FOLDER}/temp_config_$SCRIPT_NAME.json

    printf "\n🚀 Running: %s\n" "${SCRIPT_NAME}" 

    # Put config for this script into a new /tmp/temp_config_script.json file
    printf "%s\n" "${SCRIPT_CONFIG}"  > ${SCRIPT_FILE}

    if [[ $SCRIPT_NAME = *?[0-9] ]]; then
        SCRIPT_NAME=${SCRIPT_NAME::${#SCRIPT_NAME}-1}
    fi

    # Run script
    export PATH=$PATH:$PWD

    eval "${SCRIPT_NAME}.sh -C ${SCRIPT_FILE}"
}



# ╭──────────────────────────────────────────────────────────╮
# │           Loop over each ff_script and run it            │
# ╰──────────────────────────────────────────────────────────╯
function main()
{
    # Check if config has been set.
    if [ -z ${CONFIG_FILE+x} ]; then exit 1; fi

    # Move into the folder of the config.json file.
    # Every folder/file should be relative to that.
    CONFIG_DIRECTORY=$(dirname $CONFIG_FILE)
    cd $CONFIG_DIRECTORY

    # Loop scripts
    for FF_SCRIPT in "${ARRAY_OF_SCRIPT_NAMES[@]}"
    do
        # Get contents of the settings to run and trim any null values
        SCRIPT_CONTENTS=$(cat ${CONFIG_FILE} | jq --arg SCRIPTNAME "$FF_SCRIPT" 'to_entries[] | select(.key|startswith($SCRIPTNAME)) | .value | with_entries(select(.value != null))' )

        # Do any keyword substitutions
        keyword_substitutions

        # timestamp
        printf "\n\n---\n"
        printf "⏱️  started: %s" "$(date +'%d/%m/%Y %H:%M:%S')"
        printf "\n---"

        # Run the ff_script
        run_ff_script "${FF_SCRIPT}" "${SCRIPT_CONTENTS}"
    done

    # Copy the last
    if [ -f "$FF_SCRIPT.mp4" ]; then
        cp $FF_SCRIPT.mp4 $OUTPUT_FILENAME
    fi

}

cleanup
generate_colours
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup

# Move back to where you were.
cd $PWD