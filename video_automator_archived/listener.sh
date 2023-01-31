#!/bin/bash

# ┌─────────────────────────────────────────────────────────────────────────┐ 
# │                                                                         │░
# │                                                                         │░
# │            Watch input folder for files and add to list.csv             │░
# │                                                                         │░
# │                                                                         │░
# └─────────────────────────────────────────────────────────────────────────┘░
#  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

# SOURCE The config file.
. ./config.conf

# Take Arguments.
if [ "$#" -ne 0 ]; then
  echo "Single run "
  $WATCHCOMMAND
else
  # Watch $DIR folder for changes.
  # run command $COMMAND if system sees a change.
  fswatch -o $WATCHFOLDER | xargs -n1 -I{} $WATCHCOMMAND
fi
