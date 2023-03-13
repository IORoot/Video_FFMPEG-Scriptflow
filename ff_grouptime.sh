#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │          Trim a group of videos from the start / end proportionally          │
# │                       to fit a specified video length.                       │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# Explanation:

# You need to make a instagram video with a hard limit of 60 seconds length.
# You have 4 clips that make up a total duration of 80 seconds. 
# - 2x 30s clip
# - 1x 15s clip
# - 1x 5s clip
# This script will proporionally cut an equal percentage from the start and end
# of each clip to trim 80sec down to 60sec. 
# To remove those 20sec, we could easily remove 5sec from each clip equally, but
# that would completely remove the single last 5 second clip. Instead we do it
# proporionally.

# The Example Maths:

# The Full duration of all clips is 80sec = 100%
# Which means 1sec = 1.25% (100%/80)

# Multiply 1.25 by 30, means 30seconds = 37.5%
# The file breakdown would be:
# Seconds:    30sec | 30sec | 15sec  | 5sec  = 80sec
# Percent:    37.5% | 37.5% | 18.75% | 6.25% = 100%

# The 20 second cut means we need to remove 1.25*20= 25%
# Now use the percentage breakdown for each clip across 20seconds.

# 20 seconds / 100 (%) = 0.2
# 0.2 * 37.5% (first clip)  = 7.5 seconds
# 0.2 * 37.5% (second clip) = 7.5 seconds
# 0.2 * 18.75% (third clip) = 3.75 seconds
# 0.2 * 6.25% (fourth clip) = 1.25 seconds

# Just to confirm: 7.5 + 7.5 + 3.25 + 1.25 = 20 (seconds)

# Conclusion:

# - Clip one needs to remove 7.5 seconds. Divide by 2 for start and end means 3.75sec off both start and end.
# - Clip two needs to remove 7.5 seconds. Divide by 2 for start and end means 3.75sec off both start and end.
# - Clip three needs to remove 3.75 seconds. Divide by 2 for start and end means 1.875sec off both start and end.
# - Clip four needs to remove 1.25 seconds. Divide by 2 for start and end means 0.625sec off both start and end.

# We have calculated the proportionate amount to remove off each clip by 
# measuring the file duration against the full duration.

# The final file will be 60 seconds in total



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

TMP_FILE="/tmp/tmp_ffmpeg_grouptime_list.txt" 
TMP_SUFFIX="trimmed" 
INTERMEDIATE_FILENAME="/tmp/intermediate.mp4"
OUTPUT_FILENAME="output_grouptime.mp4"
DURATION="60"
LOGLEVEL="error"  
PIPE="concat:"               # define temporary file

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-d <DURATION>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Trim input videos by a percentage on start and end to get output video to correct duration.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -d | --duration <DURATION>\n"
        printf "\tThe final duration of the output file in seconds. Default is 60. \n\n"


        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"


        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
}


# ╭──────────────────────────────────────────────────────────╮
# │     Write the absolute path into the temporary file      │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{

    FILE=$1
    TMP=$2

    # Exclude folders
    if [ -d "$FILE" ]; then
        return
    fi

    # get absolute path of file.
    REAL_PATH=$(realpath ${FILE})

    # print to screen
    # printf "➡️  file: %s\n" "${REAL_PATH}"

    # print line into temp file.
    printf "%s\n" "${REAL_PATH}" >> ${TMP}
}



function setup()
{
    # delete any existing temp file.
    rm -f ${TMP_FILE} 
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
            write_to_temp $2 ${TMP_FILE}
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -d|--duration)
            DURATION="$2"
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
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    TOTAL_DURATION=0

    if [[ -z "${TMP_FILE}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    printf "✂️  ff_grouptime.sh - This will remove a percentage of seconds from front and end of all videos.\n"




    # ╭──────────────────────────────────────────────────────────╮
    # │    Step 1 - find full duration of all clips together.    │
    # ╰──────────────────────────────────────────────────────────╯
    while read FILE; do

        FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${FILE})

        printf "\t📁 File %-60s ⏲️  %s\n" "${FILE}" "${FILE_DURATION}"

        TOTAL_DURATION=$(echo "scale=4; ${TOTAL_DURATION} + ${FILE_DURATION}" | bc | awk '{printf "%f", $0}')

    done < ${TMP_FILE}

    printf "\t⏳ Total Video Duration = %s\n" "${TOTAL_DURATION}"






    # ╭──────────────────────────────────────────────────────────────────────────────╮
    # │       Step 2. Calculate 1sec in percentage against the target length.        │
    # ╰──────────────────────────────────────────────────────────────────────────────╯

    ONE_SECOND_IN_PERCENT=$(echo "scale=4; 100 / ${TOTAL_DURATION}" | bc | awk '{printf "%f", $0}')
    #printf "🧮 One second = %s percent\n" "${ONE_SECOND_IN_PERCENT}"






    # ╭──────────────────────────────────────────────────────────╮
    # │         Step 3. Calculate the amount to cut off          │
    # ╰──────────────────────────────────────────────────────────╯

    TIME_TO_REMOVE=$(echo "scale=4; ${TOTAL_DURATION} - ${DURATION} " | bc | awk '{printf "%f", $0}')
    #printf "🧮 Time to remove = %s sec\n" "${TIME_TO_REMOVE}"





    # ╭──────────────────────────────────────────────────────────╮
    # │            Calculate 1% of amount to remove.             │
    # ╰──────────────────────────────────────────────────────────╯
    ONE_PERCENT_TO_REMOVE=$(echo "scale=4; ${TIME_TO_REMOVE} / 100 " | bc | awk '{printf "%f", $0}')
    #printf "🧮 1%% of amount to remove = %s percent\n" "${ONE_PERCENT_TO_REMOVE}"


    # ╭──────────────────────────────────────────────────────────────────────────────╮
    # │ For each file calculate the percentage it takes up and the amount to remove  │
    # ╰──────────────────────────────────────────────────────────────────────────────╯
    if (( $(echo "$TOTAL_DURATION > $DURATION" |bc -l) )); then

        LOOP=1

        while read -r FILE; do

            FILE="/${FILE}" # missing /

            # printf "FILE is %s\n" "${FILE}"
            FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${FILE})
            # printf "FILE_DURATION is %s\n" "${FILE_DURATION}"
            PERCENTAGE_OF_TOTAL=$(echo "scale=4; ${ONE_SECOND_IN_PERCENT} * ${FILE_DURATION}" | bc | awk '{printf "%f", $0}')
            # printf "PERCENTAGE_OF_TOTAL is %s\n" "${PERCENTAGE_OF_TOTAL}"
            AMOUNT_TO_REMOVE=$(echo "scale=4; ${ONE_PERCENT_TO_REMOVE} * ${PERCENTAGE_OF_TOTAL}" | bc | awk '{printf "%f", $0}')
            # printf "AMOUNT_TO_REMOVE is %s\n" "${AMOUNT_TO_REMOVE}"
            HALF_AMOUNT_TO_REMOVE=$(echo "scale=4; ${AMOUNT_TO_REMOVE} / 2" | bc | awk '{printf "%f", $0}')

            printf "\t📄 File %s is %s%% of the total. Removing %ss from start & end.\n" "${FILE}" "${PERCENTAGE_OF_TOTAL}" "${HALF_AMOUNT_TO_REMOVE}"

            if ! command -v gdate &> /dev/null; then
                START=$(date -d@${HALF_AMOUNT_TO_REMOVE} -u +%H:%M:%S.%N)   # convert to timestamp
            else
                START=$(gdate -d@${HALF_AMOUNT_TO_REMOVE} -u +%H:%M:%S.%N)   # convert to timestamp
            fi

            HALF_FROM_END=$(echo "scale=4; ${FILE_DURATION} - ${HALF_AMOUNT_TO_REMOVE}" | bc | awk '{printf "%f", $0}')

            if ! command -v gdate &> /dev/null; then
                END=$(date -d@${HALF_FROM_END} -u +%H:%M:%S.%N)
            else
                END=$(gdate -d@${HALF_FROM_END} -u +%H:%M:%S.%N)
            fi


            NEW_BASEPATH=$(dirname ${FILE})
            NEW_BASENAME=$(basename ${FILE})

            # Trim file to desired length. (remove start and end portions)
            ffmpeg -y -v ${LOGLEVEL} -i ${FILE} -ss ${START} -to ${END} ${NEW_BASEPATH}/${TMP_SUFFIX}_${NEW_BASENAME} < /dev/null

            # Create intermediate files
            ffmpeg -y -v ${LOGLEVEL} -i ${NEW_BASEPATH}/${TMP_SUFFIX}_${NEW_BASENAME} -c copy /tmp/intermediate${LOOP}.ts

            # Remove the trimmed file
            rm -f ${NEW_BASEPATH}/${TMP_SUFFIX}_${NEW_BASENAME}

            # Append to the pipe
            PIPE="$PIPE/tmp/intermediate${LOOP}.ts|"

            # Iterate.
            LOOP=$(( $LOOP + 1 ))

        done < ${TMP_FILE}
    fi




    # Only run this if the clips are less than duration required.
    if (( $(echo "$TOTAL_DURATION < $DURATION" | bc -l) )); then

        LOOP=1
        while read -r FILE; do

            # Create Intermediates
            ffmpeg -y -v ${LOGLEVEL} -i /${FILE} -c copy /tmp/intermediate${LOOP}.ts
            PIPE="$PIPE/tmp/intermediate${LOOP}.ts|"
            LOOP=$(( $LOOP + 1 ))

        done < ${TMP_FILE}
    fi



    # ╭──────────────────────────────────────────────────────────╮
    # │  Concat all files together to make approx output video.  │
    # ╰──────────────────────────────────────────────────────────╯
    ffmpeg -y -v ${LOGLEVEL} -i "${PIPE%?}" -c copy ${INTERMEDIATE_FILENAME}



    # ╭──────────────────────────────────────────────────────────╮
    # │                    Trim to exact time                    │
    # ╰──────────────────────────────────────────────────────────╯
    if ! command -v gdate &> /dev/null; then
        FINALEND=$(date -d@${DURATION} -u +%H:%M:%S) 
    else
        FINALEND=$(gdate -d@${DURATION} -u +%H:%M:%S) 
    fi
    ffmpeg -y -v ${LOGLEVEL} -i ${INTERMEDIATE_FILENAME} -ss 00:00:00 -to ${FINALEND} ${OUTPUT_FILENAME}
    NEW_FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${OUTPUT_FILENAME})
    printf "✅ new duration: ⏲️  %s\n" "${NEW_FILE_DURATION}"



    # ╭──────────────────────────────────────────────────────────╮
    # │                         Cleanup                          │
    # ╰──────────────────────────────────────────────────────────╯
    rm -f ${TMP_SUFFIX}_*
    rm -f ${TMP_FILE}
    rm -f ${INTERMEDIATE_FILENAME}
    rm -f /tmp/intermediate*.ts
}

usage $@
setup
arguments $@
read_config "$@"
main $@