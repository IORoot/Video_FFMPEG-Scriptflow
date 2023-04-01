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
set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
PWD=$(pwd)
TEMP_FOLDER="/tmp"
OUTPUT_FILENAME="output.mp4"

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
# │   Substitute specific keywords for their actual values   │
# ╰──────────────────────────────────────────────────────────╯
function keyword_substitutions()
{

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
    REGEX="<DATE_(.*)>"
    if [[ $SCRIPT_CONTENTS =~ $REGEX ]]; then
        DATE_FORMAT="${BASH_REMATCH[1]}"
        DATE=$(date +"${DATE_FORMAT//\\/}")
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<DATE_${BASH_REMATCH[1]}>/$DATE}
    fi


    # <RANDOM_VIDEO>
    # Any random file in folder.
    # "../lib/luts/<RANDOM_FILE>"
    RANDOM_VIDEO=$(find . -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | sort -R | head -n 1)
    SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_VIDEO>/$RANDOM_VIDEO}

    # <RANDOM_FILTER_youth>
    # Any random file in folder, filtered with specific string 'youth'
    # "../lib/overlays/<RANDOM_FILTER_blue>"
    REGEX2="<RANDOM_VIDEO_FILTER_(.*)>"
    if [[ $SCRIPT_CONTENTS =~ $REGEX2 ]]; then
        FILTER="${BASH_REMATCH[1]}"
        RANDOM_FILTER=$(find . -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep $FILTER | sort -R | head -n 1)
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//<RANDOM_VIDEO_FILTER_${BASH_REMATCH[1]}>/$RANDOM_FILTER}
    fi
    
}



# ╭──────────────────────────────────────────────────────────╮
# │                Remove any temporary files                │
# ╰──────────────────────────────────────────────────────────╯
function cleanup()
{
    rm -f ${TEMP_FOLDER}/temp_config_ff*
    find . -type f -name 'ff*.mp4' -delete
}



# ╭──────────────────────────────────────────────────────────╮
# │     Run the specific ff_script with correct settings     │
# ╰──────────────────────────────────────────────────────────╯
function run_ff_script()
{
    SCRIPT_NAME=$1
    SCRIPT_CONFIG=$2
    SCRIPT_FILE=${TEMP_FOLDER}/temp_config_$SCRIPT_NAME.json

    printf "\n\n🏃‍♀️ Running: %-20s : " "${SCRIPT_NAME}"

    # Put config for this script into a new /tmp/temp_config_script.json file
    printf "%s\n" "${SCRIPT_CONFIG}"  > ${SCRIPT_FILE}

    if [[ $SCRIPT_NAME = *?[0-9] ]]; then
        SCRIPT_NAME=${SCRIPT_NAME::${#SCRIPT_NAME}-1}
    fi


    # Run script
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

        # Run the ff_script
        run_ff_script "${FF_SCRIPT}" "${SCRIPT_CONTENTS}"
    done

    # Copy the last 
    cp $FF_SCRIPT.mp4 $OUTPUT_FILENAME

}

cleanup
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup

# Move back to where you were.
cd $PWD