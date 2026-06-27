from PIL import Image
import numpy as np
import os
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt


# --------------------------------------------------
# 1. Basic settings
# --------------------------------------------------

base_folder = "classification/picture/pictures"

classes = ["cat", "dog", "mango"]

image_width = 64
image_height = 64


# --------------------------------------------------
# 2. Function to convert one image into useful numbers
# --------------------------------------------------

def image_to_features(image_path):
    """
    This function takes an image path,
    opens the image,
    converts it to RGB,
    resizes it,
    converts it into a NumPy array,
    and returns simple features.

    Here we use average Red, Green, and Blue values.
    """

    img = Image.open(image_path).convert("RGB")
    img = img.resize((image_width, image_height))

    arr = np.array(img)

    average_red = arr[:, :, 0].mean()
    average_green = arr[:, :, 1].mean()
    average_blue = arr[:, :, 2].mean()

    features = [average_red, average_green, average_blue]

    return features


# --------------------------------------------------
# 3. Read all training images
# --------------------------------------------------

X = []
y = []

for label_number, class_name in enumerate(classes):
    folder_path = os.path.join(base_folder, class_name)

    if not os.path.exists(folder_path):
        print("Folder not found:", folder_path)
        continue

    for file_name in os.listdir(folder_path):
        file_name_lower = file_name.lower()

        if not (
            file_name_lower.endswith(".jpg")
            or file_name_lower.endswith(".jpeg")
            or file_name_lower.endswith(".png")
        ):
            continue

        image_path = os.path.join(folder_path, file_name)

        try:
            features = image_to_features(image_path)

            X.append(features)
            y.append(label_number)

            print("Loaded:", image_path, "Label:", class_name)

        except Exception as e:
            print("Could not read image:", image_path)
            print("Error:", e)


X = np.array(X)
y = np.array(y)


# --------------------------------------------------
# 4. Check whether enough images are available
# --------------------------------------------------

print()
print("Total images loaded:", len(X))
print("Feature shape:", X.shape)
print("Labels shape:", y.shape)

if len(X) == 0:
    print("No images found.")
    print("Please add images inside cat, dog, and mango folders.")
    exit()

if len(set(y)) < 2:
    print("At least two classes are needed for training.")
    exit()

print()
print("Class image counts:")

for class_number, class_name in enumerate(classes):
    count = list(y).count(class_number)
    print(class_name, ":", count)


# --------------------------------------------------
# 5. Split data into training and testing parts safely
# --------------------------------------------------

number_of_classes = len(set(y))
total_images = len(X)

# With stratify=y, test images must be at least equal to number of classes.
# Example: 3 classes means at least 3 test images are needed.

test_count = max(number_of_classes, int(total_images * 0.25))

# Test count must be smaller than total images.
# Otherwise no training data will remain.

if test_count >= total_images:
    test_count = total_images - 1

can_use_stratify = True

# Every class must have at least 2 images for stratified splitting.
for class_number in set(y):
    if list(y).count(class_number) < 2:
        can_use_stratify = False

# Test set must have at least one image for each class.
if test_count < number_of_classes:
    can_use_stratify = False

print()
print("Number of classes:", number_of_classes)
print("Total images:", total_images)
print("Test images planned:", test_count)
print("Use stratify:", can_use_stratify)

# If there are too few images to split, train directly on all images.
if total_images <= number_of_classes:
    print()
    print("Very small dataset detected.")
    print("Training on all images without train-test split.")

    X_train = X
    y_train = y
    X_test = X
    y_test = y

else:
    if can_use_stratify:
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_count,
            random_state=42,
            stratify=y
        )
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_count,
            random_state=42
        )

print("Training images:", len(X_train))
print("Testing images:", len(X_test))


# --------------------------------------------------
# 6. Train the classifier
# --------------------------------------------------

# n_neighbors should not be bigger than the number of training images.
# So we choose 3 when possible, otherwise choose 1.

if len(X_train) >= 3:
    neighbors = 3
else:
    neighbors = 1

model = KNeighborsClassifier(n_neighbors=neighbors)

model.fit(X_train, y_train)

print()
print("Training completed successfully.")
print("KNN neighbors used:", neighbors)


# --------------------------------------------------
# 7. Test the model on test data
# --------------------------------------------------

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print()
print("Model accuracy:", accuracy)

print()
print("Testing details:")

for i in range(len(X_test)):
    actual_class = classes[y_test[i]]
    predicted_class = classes[y_pred[i]]

    print("Actual:", actual_class, "Predicted:", predicted_class)


# --------------------------------------------------
# 8. Predict a new image
# --------------------------------------------------

test_image_path = "classification/picture/test.png"

if not os.path.exists(test_image_path):
    print()
    print("Prediction image not found.")
    print("Please keep a file named test.jpg in the same folder from where you run this program.")

else:
    test_features = image_to_features(test_image_path)

    test_features = np.array(test_features).reshape(1, -1)

    prediction = model.predict(test_features)

    predicted_class = classes[prediction[0]]

    print()
    print("New image:", test_image_path)
    print("Predicted class:", predicted_class)

    img = Image.open(test_image_path)

    plt.imshow(img)
    plt.axis("off")
    plt.title("Predicted class: " + predicted_class)
    plt.show()