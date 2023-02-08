# FFMPEG Video Automator

This is a collection of scripts to automate simple video editing tasks.

The idea is that they can be chained together for more complex video effects and tasks.

These are all based on BASH and FFMPEG.

## Utils



## Explanation of FFMPEG flags and simple tasks

Below is a list of simple tasks and flags to use to accomplish them.

### Trim

Where to start the offset marker (`-ss`) and record or transcode “duration” time (`-t`) in seconds of audio/video
```
-ss time_off -t duration 

eg.

ffmpeg -ss 0 -t 60
```
This will cut everything other than the first 0 to 60 seconds.




### Full Example

``` bash
ffmpeg \
     -sameq -ss 0 -t 60              # Trim to 60secs.
     -i input.m4v \                  # INPUT File 0
     -framerate 30 \                 # Framerate of image to 30fps
     -loop 1 \                       # Loop frame once only (because it's an image.)
     -i watermark/ldnpk_white.png \  # INPUT File 1

    -filter_complex "[1:v] fade=out:st=3:d=1:alpha=1 [ov]; [0:v][ov] overlay=0:0 [v]" \
     # 1. 
     # [1:v]        Filter input 1 (image) : v (video channel)
     # [fade=out]   fade-out filter 
     # st=3         (st)arts at 3 seconds, 
     # d=1          (d)uration of 1 second, 
     # alpha=1      (alpha) channel on. 
     
     # [ov];        set [o]utput [v]ideo as [ov] and end with semicolon.

     # 2. 
     # [0:v]        Filter input 0 (the video) : v (video channel)
     # [ov]         And use the previously created [ov]
     # overlay=0:0  overlay at row 0, column 0 
     # [v]          output video as [v].

     -map "[v]" \                    # Map the filter output [v] to output.
     -map 0:a \                      # Map input 0 audio to output.
     -s 1080x608 \                   # Instagram 1.78 aspect ratio
     -c:v libx264 \                  # Scale to 1280x720.
     -c:a copy \                     # copy to output, don't overwrite.
     -r 30 \                         # covert to 30fps
     -shortest output.mov            # Finish encoding when the shortest input stream ends - which should be the video.
     -nostdin                        # https://stackoverflow.com/questions/13995715/bash-while-loop-wait-until-task-has-completed
```