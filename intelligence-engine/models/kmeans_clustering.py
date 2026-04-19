import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger(__name__)

class MerchantPersonaKMeans:
    """
    Unsupervised Learning: K-Means Clustering
    Groups merchants into personas (e.g., 'Stable Income' vs 'Seasonal') 
    based on transaction patterns.
    """
    def __init__(self, n_clusters=3):
        self.n_clusters = n_clusters
        
        # Look for pre-trained model
        import os
        import joblib
        model_path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'kmeans_pipeline.pkl')
        
        if os.path.exists(model_path):
            self.pipeline = joblib.load(model_path)
            logger.info("Loaded pre-trained KMeans pipeline from disk.")
        else:
            from sklearn.pipeline import Pipeline
            self.pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('kmeans', KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10))
            ])
            logger.info("Initialized unfitted KMeans pipeline.")
        
        # Predefined mapping of clusters to personas (can be calibrated post-training)
        self.cluster_personas = {
            0: "Stable Income",
            1: "Seasonal High Growth",
            2: "Erratic/High Risk"
        }
        
    def train(self, df: pd.DataFrame, feature_cols: list = None):
        """
        Train the K-Means clustering model.
        """
        logger.info(f"Training K-Means clustering with {self.n_clusters} clusters...")
        if feature_cols:
            X = df[feature_cols]
        else:
            X = df.select_dtypes(include=['number'])
            
        self.pipeline.fit(X)
        logger.info("K-Means training complete. Model is ready to assign personas.")
        
    def predict_persona(self, feature_data: dict) -> dict:
        """
        Assign a persona to a new merchant.
        """
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
