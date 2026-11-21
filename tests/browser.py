"""Exercise the public workflow with synthetic data."""
import os
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=root))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p, TemporaryDirectory() as tmp:
    backend = os.environ.get("ENGINE", "chromium")
    browser = getattr(p, backend).launch(executable_path=shutil.which("google-chrome") if backend == "chromium" else None)
    for width in (375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 850}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        page.locator("#demo").click()
        page.locator("#cases summary").click()
        page.locator("#cases textarea").fill("Trecho corrigido")
        page.get_by_text("Registrar etapa",exact=True).click()
        expect(page.locator("#cases summary")).to_contain_text("A verificar")
        page.locator("#cases summary").click()
        page.locator("#cases textarea").fill("Conferido no local")
        page.get_by_text("Registrar etapa",exact=True).click()
        expect(page.locator("#cases summary")).to_contain_text("Verificada")
        with page.expect_download() as downloaded:
            page.locator("#export").click()
        file=Path(tmp,"backup.json")
        downloaded.value.save_as(file)
        page.locator("#demo").click()
        expect(page.locator("#cases")).to_contain_text("Nenhuma ocorrência")
        page.locator("#restore").set_input_files(file)
        page.locator("#confirm").click()
        page.reload()
        expect(page.locator("#cases summary")).to_contain_text("Verificada")
        page.locator("#restore").set_input_files(file)
        expect(page.locator("#message")).to_contain_text("0 nova(s) vistoria(s)")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, errors
        page.close()
    browser.close()
server.shutdown()
server.server_close()
