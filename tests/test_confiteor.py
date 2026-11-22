"""Testes dos arquivos locais gravados pelo confiteor.py (sem GTK).

Rodar: python3 -m unittest discover -s tests
"""
import datetime
import importlib.util
import json
import stat
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("confiteor", RAIZ / "confiteor.py")
confiteor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(confiteor)  # não carrega GTK: só as funções de arquivo

HOJE = datetime.date(2026, 11, 22)
modo = lambda p: stat.S_IMODE(p.stat().st_mode)


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.pasta = Path(self._tmp.name) / "confiteor"

    def tearDown(self):
        self._tmp.cleanup()


class Datas(Base):
    def test_data_iso_valida(self):
        self.assertTrue(confiteor.data_iso_valida("2026-11-22", HOJE))
        for ruim in ["2026-11-23", "2026-02-30", "22/11/2026", "1899-12-31", "", None, 20261122]:
            with self.subTest(data=ruim):
                self.assertFalse(confiteor.data_iso_valida(ruim, HOJE))

    def test_registrar_guarda_so_a_lista_de_datas(self):
        self.assertEqual(confiteor.ler_confissoes(self.pasta), [])
        confiteor.registrar_confissao("2026-09-12", self.pasta)
        datas = confiteor.registrar_confissao("2026-11-22", self.pasta)
        confiteor.registrar_confissao("2026-11-22", self.pasta)  # mesmo dia não repete
        arquivo = self.pasta / "confissoes.json"
        self.assertEqual(datas, ["2026-09-12", "2026-11-22"])
        self.assertEqual(json.loads(arquivo.read_text()), ["2026-09-12", "2026-11-22"])
        self.assertEqual(modo(arquivo), 0o600)
        self.assertEqual(modo(self.pasta), 0o700)

    def test_registrar_recusa_data_invalida(self):
        with self.assertRaises(ValueError):
            confiteor.registrar_confissao("amanhã", self.pasta)

    def test_ler_ignora_conteudo_estranho(self):
        self.pasta.mkdir(parents=True)
        (self.pasta / "confissoes.json").write_text('["2026-11-22", "Menti", 3, "2099-01-01"]')
        self.assertEqual(confiteor.ler_confissoes(self.pasta), ["2026-11-22"])
        (self.pasta / "confissoes.json").write_text('{"x": 1}')
        self.assertEqual(confiteor.ler_confissoes(self.pasta), [])


class Exame(Base):
    def test_salvar_ler_e_apagar(self):
        exame = {"respostas": {"0-0-10": {"valor": "pequei", "vezes": "2", "obs": "ação"}}, "pdf": "/x.pdf"}
        self.assertTrue(confiteor.salvar_exame(exame, self.pasta))
        arquivo = self.pasta / "exame-atual.json"
        self.assertEqual(modo(arquivo), 0o600)
        self.assertEqual(confiteor.ler_exame(self.pasta), exame)
        confiteor.apagar_exame(self.pasta)
        self.assertFalse(arquivo.exists())
        self.assertIsNone(confiteor.ler_exame(self.pasta))

    def test_recusa_exame_invalido_ou_grande(self):
        self.assertFalse(confiteor.salvar_exame(["não é objeto"], self.pasta))
        self.assertFalse(confiteor.salvar_exame({"obs": "x" * (confiteor.LIMITE_EXAME + 1)}, self.pasta))
        self.assertFalse((self.pasta / "exame-atual.json").exists())


class Confessado(Base):
    def test_fluxo_completo_apaga_tudo_e_guarda_so_a_data(self):
        pdf = Path(self._tmp.name) / "exame.pdf"
        pdf.write_bytes(b"%PDF-1.4")
        confiteor.salvar_exame({"respostas": {"7-0-0": {"valor": "pequei"}}, "pdf": str(pdf)}, self.pasta)

        r = confiteor.confessado(True, HOJE, self.pasta)

        self.assertEqual(r, {"ok": True, "confissoes": ["2026-11-22"], "pdfApagado": True})
        self.assertFalse(pdf.exists())
        self.assertEqual(sorted(p.name for p in self.pasta.iterdir()), ["confissoes.json"])
        self.assertEqual(json.loads((self.pasta / "confissoes.json").read_text()), ["2026-11-22"])

    def test_manter_o_pdf(self):
        pdf = Path(self._tmp.name) / "exame.pdf"
        pdf.write_bytes(b"%PDF-1.4")
        confiteor.salvar_exame({"respostas": {}, "pdf": str(pdf)}, self.pasta)
        r = confiteor.confessado(False, HOJE, self.pasta)
        self.assertFalse(r["pdfApagado"])
        self.assertTrue(pdf.exists())

    def test_so_apaga_pdf(self):
        outro = Path(self._tmp.name) / "importante.txt"
        outro.write_text("não apagar")
        self.assertFalse(confiteor.apagar_pdf(str(outro)))
        self.assertFalse(confiteor.apagar_pdf(""))
        self.assertFalse(confiteor.apagar_pdf(None))
        self.assertTrue(outro.exists())


class PdfConhecido(Base):
    def test_prefere_o_escolhido_e_ignora_o_que_nao_existe(self):
        gerado = Path(self._tmp.name) / "gerado.pdf"
        escolhido = Path(self._tmp.name) / "escolhido.pdf"
        gerado.write_bytes(b"%PDF")
        confiteor.salvar_exame({"respostas": {}, "pdf": str(gerado)}, self.pasta)
        self.assertEqual(confiteor.pdf_conhecido(None, self.pasta), str(gerado))
        escolhido.write_bytes(b"%PDF")
        self.assertEqual(confiteor.pdf_conhecido(str(escolhido), self.pasta), str(escolhido))
        gerado.unlink()
        self.assertIsNone(confiteor.pdf_conhecido(str(Path(self._tmp.name) / "sumiu.pdf"), self.pasta))

    def test_confessado_apaga_o_pdf_escolhido_sem_exame_salvo(self):
        escolhido = Path(self._tmp.name) / "confissao.pdf"
        escolhido.write_bytes(b"%PDF")
        r = confiteor.confessado(True, HOJE, self.pasta, pdf_escolhido=str(escolhido))
        self.assertTrue(r["pdfApagado"])
        self.assertFalse(escolhido.exists())
        self.assertEqual(sorted(p.name for p in self.pasta.iterdir()), ["confissoes.json"])


class Nomes(unittest.TestCase):
    def test_nome_do_pdf(self):
        self.assertEqual(confiteor.nome_pdf_seguro("exame-de-consciencia-2026-11-22.pdf"), "exame-de-consciencia-2026-11-22.pdf")
        for ruim in ["../../x.pdf", "a/b.pdf", "x.sh", "", None]:
            with self.subTest(nome=ruim):
                self.assertRegex(confiteor.nome_pdf_seguro(ruim), r"^exame-de-consciencia-\d{4}-\d{2}-\d{2}\.pdf$")

    def test_pasta_respeita_xdg_data_home(self):
        import os
        antigo = os.environ.get("XDG_DATA_HOME")
        os.environ["XDG_DATA_HOME"] = "/tmp/xdg-teste"
        try:
            self.assertEqual(confiteor.pasta_dados(), Path("/tmp/xdg-teste/confiteor"))
        finally:
            if antigo is None:
                del os.environ["XDG_DATA_HOME"]
            else:
                os.environ["XDG_DATA_HOME"] = antigo


if __name__ == "__main__":
    unittest.main()
