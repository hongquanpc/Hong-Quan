"""Run shell commands and record every output line with its time -> JSON for the `terminal` scene.
Usage: python3 engine/capture-term.py episodes/<id>/media/deploy.json -C <workdir> -- "zo deploy -to org/proj/web" ["zo status"]
The real output is what the video shows, so nothing on screen is invented."""
import json, os, subprocess, sys, time

args = sys.argv[1:]
out_file = args.pop(0)
cwd = "."
if args[:1] == ["-C"]:
    cwd = args[1]; args = args[2:]
if args[:1] == ["--"]:
    args = args[1:]
result = []
for cmd in args:
    start, lines = time.time(), []
    p = subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
                         env={**os.environ, "NO_COLOR": "1", "TERM": "dumb"})
    for line in p.stdout:
        line = line.rstrip("\n")
        print(line, flush=True)
        if line.strip():
            lines.append({"t": round(time.time() - start, 2), "text": line})
    p.wait()
    result.append({"cmd": cmd, "code": p.returncode, "out": lines})
    if p.returncode:
        print(f"!! {cmd} exited {p.returncode}", file=sys.stderr)
os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)
json.dump(result, open(out_file, "w"), ensure_ascii=False, indent=1)
print("saved", out_file)
