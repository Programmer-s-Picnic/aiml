import numpy as np

def kmeans_divisions(X, k=4):
    # X is a 1D array of scores
    X = X.reshape(-1, 1)
    
    # Initialize centroids at the midpoint of your specific ranges
    # Fail: 20, 3rd: 45, 2nd: 55, 1st: 80
    centroids = np.array([20, 45, 55, 80]).reshape(-1, 1)
    
    for _ in range(100):
        # Calculate absolute distance in 1D
        distances = np.abs(X - centroids.T)
        labels = np.argmin(distances, axis=1)
        
        # Calculate new means for each cluster
        new_centroids = np.array([
            X[labels == i].mean() if len(X[labels == i]) > 0 else centroids[i][0]
            for i in range(k)
        ]).reshape(-1, 1)
        
        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids
        
    return centroids.flatten(), labels

# Example scores
scores = np.array([15, 30, 42, 48, 52, 58, 65, 85, 95])
final_centroids, labels = kmeans_divisions(scores)

divisions = ["Fail", "3rd Div", "2nd Div", "1st Div"]
for i, score in enumerate(scores):
    print(f"Score {score}: {divisions[labels[i]]}")
