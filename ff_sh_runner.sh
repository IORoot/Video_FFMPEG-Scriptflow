#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │            This is a wrapper script to enable scriptflow to execute           │
# │            any shell script, like yt_dlp or rclone, etc...                   │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 1 ]; then
        printf "ℹ️ Usage:\n $0 -C <CONFIG_FILE>\n\n" >&2 

        printf "Summary:\n"
        printf "This is a wrapper to run any script on the machine.\n\n"

        printf "Flags:\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

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
            CONFIG_FILE="$2"
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
    SCRIPT=$(cat ${CONFIG_FILE} | jq -r '.script') 
    PARAMS=$(cat ${CONFIG_FILE} | jq -r '.parameters') 
    OUTPUT=$(cat ${CONFIG_FILE} | jq -r '.output') 

    # Print to screen
    printf "🎛️  Script Flags: %s\n" "${PARAMS}"
}



# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "%-80s\n" "🚀 sh_runner.sh - Run any arbitary command in scriptflow."

    # Run the script    
    eval "${SCRIPT} ${PARAMS} ${OUTPUT}"

    printf "✅ %s\n" "Done."

}

usage $@
arguments $@
read_config "$@"
main $@