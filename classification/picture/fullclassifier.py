from PIL import Image
import numpy as np
import os
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

base_folder = "classification/picture/pictures"

classes = ["mango", "dog", "cat"]

image_width = 64
image_height = 64

 
def image_to_features(image_path):
  
    img = Image.open(image_path).convert("RGB")
    img = img.resize((image_width, image_height))

    arr = np.array(img)

    average_red = arr[:, :, 0].mean()
    average_green = arr[:, :, 1].mean()
    average_blue = arr[:, :, 2].mean()

    features = [average_red, average_green, average_blue]

    return features


X = []
y = []
# Mango 0, Dog 1, Cat 2
folder_path = os.path.join(base_folder, "mango")
image_path = os.path.join(folder_path, "mango1.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(0)
folder_path = os.path.join(base_folder, "mango")
image_path = os.path.join(folder_path, "mango2.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(0)

folder_path = os.path.join(base_folder, "dog")
image_path = os.path.join(folder_path, "dog1.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(1)
folder_path = os.path.join(base_folder, "dog")
image_path = os.path.join(folder_path, "dog2.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(1)

folder_path = os.path.join(base_folder, "cat")
image_path = os.path.join(folder_path, "cat1.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(2)
folder_path = os.path.join(base_folder, "cat")
image_path = os.path.join(folder_path, "cat2.png")
print(image_path)
features = image_to_features(image_path)
print(features)
X.append(features)
y.append(2)

# print(X,y)
# input()
X = np.array(X)
y = np.array(y)
print(X,y)
# input()






model = KNeighborsClassifier(n_neighbors=3)

model.fit(X, y)

print()
print("Training completed successfully.")
print(model)
# input()

test_image_path = "classification/picture/test.png"
test_features = image_to_features(test_image_path)
test_features = np.array(test_features).reshape(1, -1)

prediction = model.predict(test_features)
print(prediction)
# input()
predicted_class = classes[prediction[0]]
print(predicted_class)

img = Image.open(test_image_path)

plt.imshow(img)
plt.axis("off")
plt.title("Predicted class: " + predicted_class)
plt.show()