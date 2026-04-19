import os
import joblib
import logging
from pathlib import Path
import pandas as pd
from data_fetcher import fetch_kaggle_data
from models.xgboost_classifier import CreditApprovalXGBoost
from models.kmeans_clustering import MerchantPersonaKMeans

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_pipeline():
    logger.info("Starting intelligence re-sync pipeline...")
    
    # 1. Fetch & Standardize raw data from Kaggle
    success = fetch_kaggle_data()
    if not success:
        logger.error("Failed to secure the dataset from Kaggle. Aborting train.")
        return

    # 2. Check standardized output
    data_path = Path(__file__).resolve().parent / "data" / "standardized_training_data.csv"
    if not data_path.exists():
        logger.error(f"Missing {data_path}. Data transformation must have failed.")
        return
        
    df = pd.read_csv(data_path)
    logger.info(f"Loaded normalized training framework: Shape {df.shape}")

    # 3. Securely Initialize Models
    xgb = CreditApprovalXGBoost()
    kmeans = MerchantPersonaKMeans(n_clusters=3)

    # 4. Train
    xgb.train(df, target_col="is_approved")
    logger.info("XGBoost trained successfully.")
    
    # K-Means expects features without target
    features_only = df.drop(columns=["is_approved"])
    kmeans.train(features_only)
    logger.info("KMeans clustered personas successfully.")

    # 5. Serialize securely
    model_dir = Path(__file__).resolve().parent / "saved_models"
    model_dir.mkdir(exist_ok=True)
    
    # Save purely the fitted pipelines so inferences don't require training locally over API
    joblib.dump(xgb.pipeline, model_dir / "xgboost_pipeline.pkl")
    joblib.dump(kmeans.pipeline, model_dir / "kmeans_pipeline.pkl")
    
    logger.info("All mathematical models generated and securely saved to disk!")
    logger.info("You can now restart Uvicorn to enable production inferences.")

if __name__ == "__main__":
    run_pipeline()
