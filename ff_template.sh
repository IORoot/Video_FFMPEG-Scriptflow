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
# │                Remove any temporary files                │
# ╰──────────────────────────────────────────────────────────╯
function cleanup()
{
    rm -f ${TEMP_FOLDER}/temp_config_ff*
}


# ╭──────────────────────────────────────────────────────────╮
# │     Run the specific ff_script with correct settings     │
# ╰──────────────────────────────────────────────────────────╯
function run_ff_script()
{
    SCRIPT_NAME=$1
    SCRIPT_CONFIG=$2
    SCRIPT_FILE=${TEMP_FOLDER}/temp_config_$SCRIPT_NAME.json

    printf "🏃‍♀️ Running: %s\n" "${SCRIPT_NAME}"

    # Put config for this script into a new /tmp/temp_config_script.json file
    printf "%s\n" "${SCRIPT_CONFIG}"  > ${SCRIPT_FILE}

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
    cd $(dirname $CONFIG_FILE)

    # Loop scripts
    for FF_SCRIPT in "${ARRAY_OF_SCRIPT_NAMES[@]}"
    do
        # Get contents of the settings to run
        SCRIPT_CONTENTS=$(cat ${CONFIG_FILE} | jq --arg SCRIPTNAME "$FF_SCRIPT" 'to_entries[] | select(.key|startswith($SCRIPTNAME)) | .value' )
        run_ff_script "${FF_SCRIPT}" "${SCRIPT_CONTENTS}"
    done

    # Move back to where you were.
    cd $PWD

}

cleanup
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup