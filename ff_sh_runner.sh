#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │            This is a wrapper script to enable scriptflow to execute           │
# │            any shell script, like yt_dlp or rclone, etc...                   │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.

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
function usage()
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
    printf "🎛️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} ${TEXT_ORANGE_500}%s${TEXT_RESET} ${TEXT_YELLOW_500}%s${TEXT_RESET} ${TEXT_PURPLE_500}%s${TEXT_RESET}\n" "Command" "${SCRIPT}" "${PARAMS}" "${OUTPUT}"
}



# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    # Run the script    
    eval "${SCRIPT} ${PARAMS} ${OUTPUT}"

    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$Exit $?"

}

usage $@
arguments $@
read_config "$@"
main $@