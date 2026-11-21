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
        page.keyboard.press("Tab")
        expect(page.locator(".skip")).to_be_focused()
        page.keyboard.press("Enter")
        assert page.evaluate("location.hash === document.querySelector('.skip').hash")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.get_by_text("Localização opcional do ponto",exact=True).click()
        page.locator("#point").fill("Ponto fictício")
        page.locator("#lat").fill("-16.32")
        page.locator("#lon").fill("-48.95")
        page.locator("#note").fill("Texto reservado ao histórico")
        page.get_by_text("Salvar vistoria",exact=True).click()
        with page.expect_download() as geo:
            page.locator("#geo").click()
        import json
        feature=json.loads(geo.value.path().read_text())["features"][0]
        assert feature["geometry"]["coordinates"] == [-48.95,-16.32]
        assert "Texto reservado" not in str(feature)
        page.get_by_text("Comparar as duas últimas vistorias de um ponto",exact=True).click()
        page.locator("#compare-point").select_option("ponto fictício")
        expect(page.locator("#visit-comparison")).to_contain_text("tem uma vistoria")
        page.locator("#parts select").first.select_option("Livre na vistoria")
        page.get_by_text("Salvar vistoria",exact=True).click()
        expect(page.locator("#visit-comparison")).to_contain_text("Sem vistoria → Livre na vistoria")
        expect(page.locator("#visit-comparison")).to_contain_text("sem mudança")
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
        page.locator("#offline").click()
        expect(page.locator("#offline-status")).to_contain_text("Pronto.")
        page.wait_for_function("navigator.serviceWorker.controller !== null")
        page.context.set_offline(True)
        page.reload()
        expect(page.locator("#cases summary")).to_contain_text("Verificada")
        page.context.set_offline(False)
        assert not errors, errors
        page.close()
    browser.close()
server.shutdown()
server.server_close()
