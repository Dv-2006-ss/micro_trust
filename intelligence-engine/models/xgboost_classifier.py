import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import logging

logger = logging.getLogger(__name__)

class CreditApprovalXGBoost:
    """
    Predicting 'Approval' vs 'Rejection' based on scanned history using XGBoost.
    Includes Feature Engineering (StandardScaler & One-Hot Encoding) mapped to the curriculum.
    """
    def __init__(self):
        import os
        import joblib
        model_path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'xgboost_pipeline.pkl')
        
        if os.path.exists(model_path):
            self.pipeline = joblib.load(model_path)
            logger.info("Loaded pre-trained XGBoost pipeline from disk.")
        else:
            # We use a pipeline to securely hold standard scaler and model
            self.preprocessor = ColumnTransformer(
                transformers=[
                    ('num', StandardScaler(), ['daily_transaction_spikes', 'average_balance', 'monthly_revenue']),
                    ('cat', OneHotEncoder(handle_unknown='ignore'), ['shop_type', 'merchant_category'])
                ]
            )
            # The XGBoost model
            self.model = xgb.XGBClassifier(
                objective='binary:logistic',
                eval_metric='logloss',
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            self.pipeline = Pipeline([
                ('preprocessor', self.preprocessor),
                ('classifier', self.model)
            ])
            logger.info("Initialized unfitted XGBoost pipeline.")
        
    def train(self, df: pd.DataFrame, target_col: str = 'is_approved'):
        """
        Train the model using the provided dataframe.
        """
        logger.info("Starting training of XGBoost model for Credit Scoring...")
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.pipeline.fit(X_train, y_train)
        accuracy = self.pipeline.score(X_test, y_test)
        logger.info(f"Model training completed with test accuracy: {accuracy:.4f}")
        return accuracy
        
    def predict(self, feature_data: dict) -> dict:
        """
        Predict 'Approval' vs 'Rejection' (1 vs 0) and probability.
        """
        df = pd.DataFrame([feature_data])
        
        # Predicting probability
        prob = self.pipeline.predict_proba(df)[0][1]
        prediction = self.pipeline.predict(df)[0]
        
        # Map back to business logic
        return {
            "approved": bool(prediction == 1),
            "approval_probability": float(prob),
            "suggested_risk_level": "Low" if prob > 0.8 else ("Medium" if prob > 0.5 else "High")
        }
