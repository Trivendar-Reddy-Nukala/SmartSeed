"""
SmartSeed AI Engine — Pre-trained model manager.

Handles saving, loading, and inspecting scikit-learn / joblib models
stored on the local filesystem.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

logger = logging.getLogger(__name__)


class ModelManager:
    """Manage the lifecycle of serialised ML models.

    Models are persisted as ``.joblib`` files inside *model_dir*.

    Args:
        model_dir: Directory where model artefacts are stored.
    """

    def __init__(self, model_dir: str = "models/") -> None:
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        logger.info("ModelManager initialised — model_dir=%s", self.model_dir)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save_model(self, model: Any, name: str) -> None:
        """Serialise *model* to disk under the given *name*.

        Args:
            model: A fitted scikit-learn estimator (or any picklable object).
            name: Logical model name (without extension).
        """
        path = self.model_dir / f"{name}.joblib"
        joblib.dump(model, path)
        logger.info("Model '%s' saved to %s", name, path)

    def load_model(self, name: str) -> Any | None:
        """Load a previously saved model by *name*.

        Args:
            name: Logical model name.

        Returns:
            The deserialised model object, or ``None`` if it does not exist.
        """
        path = self.model_dir / f"{name}.joblib"
        if not path.exists():
            logger.warning("Model '%s' not found at %s", name, path)
            return None
        model = joblib.load(path)
        logger.info("Model '%s' loaded from %s", name, path)
        return model

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def has_model(self, name: str) -> bool:
        """Return ``True`` if a model artefact for *name* exists on disk."""
        return (self.model_dir / f"{name}.joblib").exists()

    def get_model_info(self) -> dict[str, Any]:
        """Return metadata about all saved models.

        Returns:
            A dict mapping each model name to a dict with ``file``,
            ``size_bytes``, and ``last_modified`` keys.
        """
        info: dict[str, Any] = {}
        for file in self.model_dir.glob("*.joblib"):
            stat = file.stat()
            info[file.stem] = {
                "file": str(file),
                "size_bytes": stat.st_size,
                "last_modified": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat(),
            }
        return info
