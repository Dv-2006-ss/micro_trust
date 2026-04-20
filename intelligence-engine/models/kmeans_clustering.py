import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

# ── Absolute path resolution (works on Windows dev + Linux Render) ────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_THIS_DIR, '..', 'saved_models', 'kmeans_pipeline.pkl')
_DATA_PATH = os.path.join(_THIS_DIR, '..', 'data', 'standardized_training_data.csv')


class MerchantPersonaKMeans:
    """
    Unsupervised Learning: K-Means Clustering
    Groups merchants into personas (e.g., 'Stable Income' vs 'Seasonal')
    based on transaction patterns.
    """
    def __init__(self, n_clusters=3):
        self.n_clusters = n_clusters
        model_path = os.path.abspath(_MODEL_PATH)
        logger.info(f"[KMeans] Looking for pre-trained model at: {model_path}")

        if os.path.exists(model_path):
            self.pipeline = joblib.load(model_path)
            self._fitted = True
            logger.info("✅ Loaded pre-trained KMeans pipeline from disk.")
        else:
            logger.warning(
                "\n"
                "╔══════════════════════════════════════════════════════════════════╗\n"
                "║  ⚠️  KMeans MODEL FILE MISSING — ATTEMPTING AUTO-TRAIN           ║\n"
                f"║  Expected: {model_path[:60]:<60} ║\n"
                "║  This is normal on first Render deploy (gitignored .pkl files). ║\n"
                "╚══════════════════════════════════════════════════════════════════╝"
            )
            self.pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('kmeans', KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10))
            ])
            self._fitted = False
            self._auto_train(model_path)

        # Predefined mapping of clusters to personas (can be calibrated post-training)
        self.cluster_personas = {
            0: "Stable Income",
            1: "Seasonal High Growth",
            2: "Erratic/High Risk"
        }

    def _auto_train(self, model_path: str):
        """Auto-train from the standardized CSV if available (first deploy scenario)."""
        data_path = os.path.abspath(_DATA_PATH)
        logger.info(f"[KMeans] Checking for training data at: {data_path}")

        if not os.path.exists(data_path):
            logger.error(
                "\n"
                "╔══════════════════════════════════════════════════════════════════╗\n"
                "║  ❌ CRITICAL: TRAINING DATA ALSO MISSING — CANNOT AUTO-TRAIN     ║\n"
                f"║  Expected: {data_path[:60]:<60} ║\n"
                "║  The /analyze endpoint WILL assign default personas.            ║\n"
                "║  FIX: Run sync_and_train.py locally, then push saved_models/    ║\n"
                "║  OR un-gitignore the .pkl files so they deploy with the image.  ║\n"
                "╚══════════════════════════════════════════════════════════════════╝"
            )
            return

        try:
            df = pd.read_csv(data_path)
            features_only = df.drop(columns=['is_approved'], errors='ignore')
            logger.info(f"[KMeans] Auto-training on {len(features_only)} rows...")
            self.train(features_only)

            # Save so subsequent restarts skip training
            save_dir = os.path.dirname(model_path)
            os.makedirs(save_dir, exist_ok=True)
            joblib.dump(self.pipeline, model_path)
            logger.info(f"✅ [KMeans] Auto-trained and saved to: {model_path}")
        except Exception as e:
            logger.error(f"[KMeans] Auto-train FAILED: {e}", exc_info=True)

    def train(self, df: pd.DataFrame, feature_cols: list = None):
        """Train the K-Means clustering model."""
        logger.info(f"Training K-Means clustering with {self.n_clusters} clusters...")
        if feature_cols:
            X = df[feature_cols]
        else:
            X = df.select_dtypes(include=['number'])

        self.pipeline.fit(X)
        self._fitted = True
        logger.info("K-Means training complete. Model is ready to assign personas.")

    def predict_persona(self, feature_data: dict) -> dict:
        """Assign a persona to a new merchant."""
        if not self._fitted:
            logger.error("[KMeans] predict_persona() called on UNFITTED model — returning safe default.")
            return {
                "cluster_id": 0,
                "persona": self.cluster_personas.get(0, "Unknown")
            }

        df = pd.DataFrame([feature_data])
        # Only use numeric columns for prediction since pipeline expects numbers
        X = df.select_dtypes(include=['number'])

        try:
            cluster_idx = self.pipeline.predict(X)[0]
        except Exception as e:
            logger.error(f"KMeans prediction mapping failed: {e}")
            cluster_idx = 0

        return {
            "cluster_id": int(cluster_idx),
            "persona": self.cluster_personas.get(int(cluster_idx), "Unknown")
        }
