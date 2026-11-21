"""Refresh the offline cache identifier whenever an application asset changes."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
assets = ["index.html", "style.css", "app.js", "core.js", "field.js"]
sha = hashlib.sha256()
for asset in assets:
    sha.update((root / asset).read_bytes())
template = (root / "offline.template.js").read_text(encoding="utf-8")
(root / "sw.js").write_text(template.replace("__VERSION__", sha.hexdigest()[:16])
                            .replace("__ASSETS__", json.dumps(assets)), encoding="utf-8")
