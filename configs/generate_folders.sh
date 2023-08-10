#!/bin/bash

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
    echo "Usage: $0 <filename> <count> [starting_number]"
    exit 1
fi

filename="$1"
count="$2"
starting_number="${3:-1}"

if [ ! -f "$filename" ]; then
    echo "Error: File '$filename' does not exist."
    exit 1
fi

base_name=$(basename "$filename" .json)

for ((i=starting_number; i<starting_number+count; i++)); do
    folder_name="${base_name}_$(printf "%03d" "$i")"
    mkdir "$folder_name"
    cp "$filename" "$folder_name/config.json"
    echo "Created folder '$folder_name' with 'config.json'"
done

echo "Folders created successfully."
