"""Base de test isolée et hachage allégé, posés avant l'import de l'application."""

from __future__ import annotations

import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["SCOPEO_DATA_DIR"] = _tmp
os.environ["SCOPEO_DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SCOPEO_BCRYPT_ROUNDS"] = "4"
