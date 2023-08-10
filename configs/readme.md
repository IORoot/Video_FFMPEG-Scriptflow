# Create multiple folders to use in scripting

## Adults / youth / teens

```bash
./generate_folders.sh adults.json 20
```

## Syllabus

Use finder to delete all `config.json` files in subfolders.
Then copy into each subfolder with:

```bash
find . -type d -maxdepth 1 -exec cp config.json {} \;
```
