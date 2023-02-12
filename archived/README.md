# Instagram video automator

This is a 2-stop process with 2 scripts.

# Pre-requisites.

1. Make sure that the input file does NOT have spaces in it. You can use the command:
   `for i in *;do mv "$i" "${i// /_}";done` on the command-line to replace all spaces to underscores in all
   files in the current dircetory.
2. FFMpeg must be installed. `brew install ffmpeg`


## Step 1 - Listener

The listener is used to populate a CSV file located in $CSVFILE (see config) which can then
be intercepted and updated depending on needs of the file. Namely:
- start time
- duration
- file renaming
- LUT to use.

The listener has two modes. The first is Active listening, which will sit there running until something is
placed into the input folder, which will then create the CSV file.

The second is not a listener at all. You just give the `./listener.sh` script a single argument of anything,
like `./listener.sh once` and it'll execute the listener command once only. This is good for placing files
into the input folder once and THEN running it.

## Step 2 - Converter

The converter will pick up the CSV file and pipe it into the convert_with_ffmpeg script to
process.

## Process

        ┌──────────────┐      ┌──────────────┐
        │              │      │              │
        │ Input folder │◀─────│   Listener   │
        │              │      │              │
        └──────────────┘      └──────────────┘
                │                             
                │                             
                │                             
        ┌───────▼──────┐      ┌──────────────┐
        │              │      │              │
        │   CSV file   │◀─────│  Converter   │
        │              │      │              │
        └───────┬──────┘      └──────────────┘
                │                             
                │                             
        ┌───────▼──────┐                      
        │              │                      
        │ Intermediate │                      
        │              │                      
        └───────┬──────┘                      
                │                             
                │                             
                │                             
        ┌───────▼──────┐                      
        │              │                      
        │    Output    │                      
        │              │                      
        └──────────────┘ 


## Config

The config file will allow you to customise the folder locations, filenames and default
CSV rows. Also allows you to set whether the intermediate files are deleted and the output
files are overwritten.

## list.csv

This `list.csv` file that is created at the intermediate step is used for any renaming / cutting
purposes. The columns are as follows:

| filename | start seek point | duration of video | output filename | LUT |
| --- | --- | --- | --- | --- |
| filename1.mp4 | 0 | 60 | newfile | nolut |
| myvideo2.mov | 0 | 60 | original | Alien |
| KVF645382D.m4v | 10 | 30 | original | Drive |

### Output filename
Use the word 'original' as the output filename to keep the original filename.

### LUT
The LUT to be used is a .3DL format. The ones provided are from [Triune](https://www.flickr.com/photos/145482188@N08/albums/72157670634950851/with/28426266446/)

## Output
The output format is .mov so that iPhone compatibility is at maximum.