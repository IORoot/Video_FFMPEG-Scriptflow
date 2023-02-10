# FFMPEG Util scripts and Templates

This is a collection of scripts to automate simple video editing tasks.

The idea is that they can be chained together for more complex video effects and tasks.

These are all based on BASH and FFMPEG.


## Utility Scripts

Current list of scripts and their purposes.

| Script               | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `ff_append.sh`       | This will concatenate two videos together and re-encode them |
| `ff_aspect_ratio.sh` | Changes the container metadata's Display Aspect Ratio (DAR)  |
| `ff_blur.sh`         | Simple blur function using an unsharp mask                   |
| `ff_colour.sh`       | Change brightness, contrast, gamma, saturation of video      |
| `ff_concat.sh`       | Concatenate multiple videos together                         |
| `ff_lut.sh`          | Apply a 3DL/Cube LUT file to a video                         |
| `ff_rotate.sh`       | Rotate a video in 90 degree increments                       |
| `ff_sharpen.sh`      | Simple sharpen function using an unsharp mask                |
| `ff_to_landscape.sh` | Rotate a portrait video to landscape                         |
| `ff_to_portrait.sh`  | Rotate a landscape video to portrait                         |
| `ff_unsharp.sh`      | Use an unsharp mask to blur/sharpen luma,gamma,alpha         |
| `ff_watermark.sh`    | Overlay a watermark image/video                              |
| `ff_flip.sh`    | Horizontally and/or vertically flip the video                              |




### `ff_append.sh`

#### Description
This will append two files together while re-encoding them to be the same codec. Good if you need to change the codec of the video by transcoding them. Note the `ff_concat.sh` script is better if you do not need to transcode.

#### Flags
```bash
Flags:
 -f | --first <FIRST_INPUT_FILE>
        The name of the first input file.

 -s | --second <SECOND_INPUT_FILE>
        The name of the second input file.

 -o | --output <OUTPUT_FILE>
        Default is output_appended.mp4
        The name of the output file.

 -l | --loglevel <LOGLEVEL>
        The FFMPEG loglevel to use. Default is 'error' only.
        Options: quiet,panic,fatal,error,warning,info,verbose,debug,trace
```

#### Example

```bash
./ff_append.sh -f landscape2.mp4 -s landscape.mp4 -o out.mp4
```




### `ff_aspect_ratio.sh`

#### Description

#### Flags

#### Example


### `ff_blur.sh`

#### Description

#### Flags

#### Example


### `ff_colour.sh`

#### Description

#### Flags

#### Example


### `ff_concat.sh`

#### Description

#### Flags

#### Example



### `ff_lut.sh`

#### Description

#### Flags

#### Example



### `ff_rotate.sh`

#### Description

#### Flags

#### Example



### `ff_sharpen.sh`

#### Description

#### Flags

#### Example



### `ff_to_landscape.sh`

#### Description

#### Flags

#### Example



### `ff_to_portrait.sh`

#### Description

#### Flags

#### Example



### `ff_unsharp.sh`

#### Description

#### Flags

#### Example



### `ff_watermark.sh`

#### Description

#### Flags

#### Example