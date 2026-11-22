"""Testes do único dado que o app pode gravar: a data da última confissão.

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
spec.loader.exec_module(confiteor)  # não carrega GTK: só as funções de armazenamento

HOJE = datetime.date(2026, 11, 22)


class DataValida(unittest.TestCase):
    def test_aceita_data_real_ate_hoje(self):
        self.assertTrue(confiteor.data_valida("12/09/2026", HOJE))
        self.assertTrue(confiteor.data_valida("22/11/2026", HOJE))
        self.assertTrue(confiteor.data_valida("29/02/2024", HOJE))

    def test_recusa_formato_errado_data_inexistente_ou_futura(self):
        for texto in ["", "12/9/2026", "2026-09-12", "31/02/2026", "23/11/2026", "01/01/1899",
                      "12/09/2026\n", "12/09/2026; rm -rf ~", None, 12092026, ["12/09/2026"]]:
            with self.subTest(texto=texto):
                self.assertFalse(confiteor.data_valida(texto, HOJE))


class Armazenamento(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.arquivo = Path(self.pasta.name) / "confiteor" / "ultima-confissao"

    def tearDown(self):
        self.pasta.cleanup()

    def test_salvar_ler_e_apagar(self):
        self.assertIsNone(confiteor.ler_data(self.arquivo))
        self.assertTrue(confiteor.salvar_data("12/09/2026", self.arquivo))
        self.assertEqual(confiteor.ler_data(self.arquivo), "12/09/2026")
        self.assertEqual(self.arquivo.read_text(encoding="utf-8"), "12/09/2026\n")
        confiteor.apagar_data(self.arquivo)
        self.assertFalse(self.arquivo.exists())
        self.assertFalse(self.arquivo.parent.exists(), "a pasta vazia também é removida")

    def test_arquivo_e_pasta_so_do_usuario(self):
        confiteor.salvar_data("12/09/2026", self.arquivo)
        self.assertEqual(stat.S_IMODE(self.arquivo.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.arquivo.parent.stat().st_mode), 0o700)

    def test_nao_salva_nada_invalido(self):
        self.assertFalse(confiteor.salvar_data("31/02/2026", self.arquivo))
        self.assertFalse(confiteor.salvar_data("Menti 3 vezes", self.arquivo))
        self.assertFalse(self.arquivo.exists())

    def test_ignora_arquivo_adulterado(self):
        self.arquivo.parent.mkdir(parents=True)
        self.arquivo.write_text("<script>alert(1)</script>", encoding="utf-8")
        self.assertIsNone(confiteor.ler_data(self.arquivo))

    def test_mensagens_da_pagina(self):
        msg = lambda **d: json.dumps(d)
        self.assertTrue(confiteor.tratar_mensagem(msg(acao="salvar", data="12/09/2026"), self.arquivo))
        self.assertEqual(confiteor.ler_data(self.arquivo), "12/09/2026")
        # qualquer outra coisa é recusada e não altera o arquivo
        for ruim in [msg(acao="salvar", data="Menti"), msg(acao="ler"), msg(acao="salvar", texto="x"),
                     "não é json", "[1, 2]", None]:
            with self.subTest(mensagem=ruim):
                self.assertFalse(confiteor.tratar_mensagem(ruim, self.arquivo))
        self.assertEqual(confiteor.ler_data(self.arquivo), "12/09/2026")
        self.assertTrue(confiteor.tratar_mensagem(msg(acao="apagar"), self.arquivo))
        self.assertFalse(self.arquivo.exists())

    def test_local_padrao_respeita_xdg_config_home(self):
        import os
        antigo = os.environ.get("XDG_CONFIG_HOME")
        os.environ["XDG_CONFIG_HOME"] = self.pasta.name
        try:
            self.assertEqual(confiteor.arquivo_data(), Path(self.pasta.name) / "confiteor" / "ultima-confissao")
        finally:
            if antigo is None:
                del os.environ["XDG_CONFIG_HOME"]
            else:
                os.environ["XDG_CONFIG_HOME"] = antigo


if __name__ == "__main__":
    unittest.main()
