import os
import sys
import logging
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_THIS_DIR, '..', 'saved_models', 'xgboost_pipeline.pkl')
_DATA_PATH = os.path.join(_THIS_DIR, '..', 'data', 'standardized_training_data.csv')

# Global Loading to optimize Render worker startup
_GLOBAL_PIPELINE = None
if os.path.exists(_MODEL_PATH):
    _GLOBAL_PIPELINE = joblib.load(_MODEL_PATH)
    logger.info("✅ Loaded pre-trained XGBoost pipeline from disk globally.")

class CreditApprovalXGBoost:
    """
    Predicting 'Approval' vs 'Rejection' based on scanned history using XGBoost.
    Includes Feature Engineering (StandardScaler & One-Hot Encoding) mapped to the curriculum.
    """
    def __init__(self):
        model_path = os.path.abspath(_MODEL_PATH)
        logger.info(f"[XGBoost] Verifying pre-trained model at: {model_path}")

        if _GLOBAL_PIPELINE is not None:
            self.pipeline = _GLOBAL_PIPELINE
            self._fitted = True
        else:
            logger.warning(
                "\n"
                "╔══════════════════════════════════════════════════════════════════╗\n"
                "║  ⚠️  XGBoost MODEL FILE MISSING — ATTEMPTING AUTO-TRAIN          ║\n"
                f"║  Expected: {model_path[:60]:<60} ║\n"
                "║  This is normal on first Render deploy (gitignored .pkl files). ║\n"
                "╚══════════════════════════════════════════════════════════════════╝"
            )
            self.pipeline = self._build_empty_pipeline()
            self._fitted = False
            self._auto_train(model_path)

    def _build_empty_pipeline(self) -> Pipeline:
        """Constructs an unfitted sklearn pipeline for XGBoost classification."""
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), ['daily_transaction_spikes', 'average_balance', 'monthly_revenue']),
                ('cat', OneHotEncoder(handle_unknown='ignore'), ['shop_type', 'merchant_category'])
            ]
        )
        model = xgb.XGBClassifier(
            objective='binary:logistic',
            eval_metric='logloss',
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        return Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])

    def _auto_train(self, model_path: str):
        """Auto-train from the standardized CSV if available (first deploy scenario)."""
        data_path = os.path.abspath(_DATA_PATH)
        logger.info(f"[XGBoost] Checking for training data at: {data_path}")

        if not os.path.exists(data_path):
            logger.error(
                "\n"
                "╔══════════════════════════════════════════════════════════════════╗\n"
                "║  ❌ CRITICAL: TRAINING DATA ALSO MISSING — CANNOT AUTO-TRAIN     ║\n"
                f"║  Expected: {data_path[:60]:<60} ║\n"
                "║  The /analyze endpoint WILL FAIL with NotFittedError.           ║\n"
                "║  FIX: Run sync_and_train.py locally, then push saved_models/    ║\n"
                "║  OR un-gitignore the .pkl files so they deploy with the image.  ║\n"
                "╚══════════════════════════════════════════════════════════════════╝"
            )
            return

        try:
            df = pd.read_csv(data_path)
            logger.info(f"[XGBoost] Auto-training on {len(df)} rows...")
            self.train(df, target_col='is_approved')

            # Save so subsequent restarts skip training
            save_dir = os.path.dirname(model_path)
            os.makedirs(save_dir, exist_ok=True)
            joblib.dump(self.pipeline, model_path)
            logger.info(f"✅ [XGBoost] Auto-trained and saved to: {model_path}")
        except Exception as e:
            logger.error(f"[XGBoost] Auto-train FAILED: {e}", exc_info=True)

    def train(self, df: pd.DataFrame, target_col: str = 'is_approved'):
        """Train the model using the provided dataframe."""
        logger.info("Starting training of XGBoost model for Credit Scoring...")
        X = df.drop(columns=[target_col])
        y = df[target_col]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.pipeline.fit(X_train, y_train)
        self._fitted = True
        accuracy = self.pipeline.score(X_test, y_test)
        logger.info(f"Model training completed with test accuracy: {accuracy:.4f}")
        return accuracy

    def predict(self, feature_data: dict) -> dict:
        """Predict 'Approval' vs 'Rejection' (1 vs 0) and probability."""
        if not self._fitted:
            logger.error("[XGBoost] predict() called on UNFITTED model — returning safe defaults.")
            return {
                "approved": False,
                "approval_probability": 0.5,
                "suggested_risk_level": "Medium"
            }

        df = pd.DataFrame([feature_data])

        try:
            # Predicting probability
            prob = self.pipeline.predict_proba(df)[0][1]
            prediction = self.pipeline.predict(df)[0]
        except Exception as e:
            logger.error(f"[XGBoost] Prediction failed: {e}")
            return {
                "approved": False,
                "approval_probability": 0.5,
                "suggested_risk_level": "Medium"
            }

        # Map back to business logic
        return {
            "approved": bool(prediction == 1),
            "approval_probability": float(prob),
            "suggested_risk_level": "Low" if prob > 0.8 else ("Medium" if prob > 0.5 else "High")
        }
