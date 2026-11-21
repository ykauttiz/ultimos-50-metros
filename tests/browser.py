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
    for width in (320, 375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 850}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        theme = page.get_by_role("combobox", name="Tema da interface")
        for mode in ("dark", "light"):
            theme.select_option(mode)
            expect(page.locator("html")).to_have_attribute("data-theme", mode)
            assert page.evaluate("getComputedStyle(document.documentElement).colorScheme") == mode
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.reload()
        expect(theme).to_have_value("light")
        theme.select_option("system")
        page.emulate_media(color_scheme="dark")
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        page.emulate_media(color_scheme="light")
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        page.reload()
        page.keyboard.press("Tab")
        expect(page.locator(".skip")).to_be_focused()
        page.keyboard.press("Enter")
        assert page.evaluate("location.hash === document.querySelector('.skip').hash")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.get_by_text("Localização opcional do ponto",exact=True).click()
        if backend == "chromium":
            page.context.grant_permissions(["geolocation"])
            page.context.set_geolocation({"latitude": 1.25, "longitude": 2.5, "accuracy": 7})
            page.locator("#gps").click()
            expect(page.locator("#gps-status")).to_contain_text("7 m")
        page.evaluate("""Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
          getCurrentPosition: success => success({coords:{latitude:1.25,longitude:2.5,accuracy:9}})
        }})""")
        page.locator("#gps").click()
        expect(page.locator("#gps-status")).to_contain_text("9 m")
        assert float(page.locator("#lat").input_value()) == 1.25
        assert float(page.locator("#lon").input_value()) == 2.5
        page.locator("#point").fill("Ponto fictício")
        page.locator("#lat").fill("-16.32")
        page.locator("#lon").fill("-48.95")
        page.locator("#visit-photo").set_input_files(root / "icon-192.png")
        expect(page.locator("#photo-preview")).to_be_visible()
        assert page.locator("#photo-preview").get_attribute("src").startswith("data:image/jpeg;base64,")
        page.locator("#note").fill("Texto reservado ao histórico")
        page.get_by_text("Salvar vistoria",exact=True).click()
        page.get_by_role("button",name="Revisar barreira · 0").click()
        expect(page.locator("#rows tr")).to_have_count(0)
        expect(page.locator("#geo")).to_be_disabled()
        page.get_by_role("button",name="Completar vistoria · 1").click()
        expect(page.locator("#rows tr")).to_have_count(1)
        page.get_by_role("button",name="Completar vistoria · 1").click()
        page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        expect(page.locator("#visit-sheet tbody tr")).to_have_count(1)
        assert "Texto reservado" not in page.locator("#visit-sheet").text_content()
        page.evaluate("window.dispatchEvent(new Event('afterprint'))")
        with page.expect_download() as sheet:
            page.locator("#csv-visits").click()
        csv = Path(sheet.value.path()).read_text(encoding="utf-8-sig")
        assert "Ponto fictício" in csv and "Texto reservado" not in csv
        manifest = page.request.get(f"http://127.0.0.1:{server.server_port}/manifest.webmanifest").json()
        for icon in manifest["icons"]:
            assert page.request.get(f"http://127.0.0.1:{server.server_port}/" + icon["src"]).ok
        page.get_by_text("Mapa dos pontos da seleção",exact=True).click()
        expect(page.locator("#map-info")).to_contain_text("Ponto fictício")
        expect(page.locator("#map-info")).to_contain_text("-48.95")
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
        # Armazenamento: aviso sobre persistência e falha de gravação com mensagem clara.
        stored = "JSON.parse(localStorage.getItem('ultimos-50-metros.v2')).records.length"
        before = page.evaluate(stored)
        page.evaluate("""() => { Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:async()=>false,persist:async()=>true}}); }""")
        page.locator("#parts select").nth(1).select_option("Livre na vistoria")
        page.get_by_text("Salvar vistoria",exact=True).click()
        expect(page.locator("#message")).to_contain_text("Vistoria salva neste navegador. O navegador protegeu este armazenamento.")
        assert page.evaluate(stored) == before + 1
        page.evaluate("""() => {
          window.__setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function(){ throw new DOMException('cheio','QuotaExceededError'); };
        }""")
        page.locator("#parts select").nth(2).select_option("Livre na vistoria")
        page.get_by_text("Salvar vistoria",exact=True).click()
        expect(page.locator("#message")).to_contain_text("ficou sem espaço")
        page.evaluate("() => { Storage.prototype.setItem = window.__setItem; }")
        assert page.evaluate(stored) == before + 1
        page.locator("#demo").click()
        page.locator("#cases summary").click()
        if os.environ.get("CAPTURAR_DEMO") == "1":
            captures = root / "capturas"
            captures.mkdir(exist_ok=True)
            page.screenshot(path=captures / f"demo-{width}.png", animations="disabled")

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
