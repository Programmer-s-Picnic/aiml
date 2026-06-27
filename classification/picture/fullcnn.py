from PIL import Image
import numpy as np
import os
import matplotlib.pyplot as plt

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense
from tensorflow.keras.utils import to_categorical


# --------------------------------------------------
# 1. Basic settings
# --------------------------------------------------

base_folder = "classification/picture/pictures"

# Mango 0, Dog 1, Cat 2
classes = ["mango", "dog", "cat"]

image_width = 64
image_height = 64

number_of_classes = len(classes)


# --------------------------------------------------
# 2. Function to convert image into CNN input
# --------------------------------------------------

def image_to_array(image_path):
    """
    This function:
    1. Opens the image
    2. Converts it to RGB
    3. Resizes it to 64 x 64
    4. Converts it to NumPy array
    5. Divides pixel values by 255

    CNN needs image data in this form:

    height x width x color_channels

    Example:
    64 x 64 x 3
    """

    img = Image.open(image_path).convert("RGB")
    img = img.resize((image_width, image_height))

    arr = np.array(img)

    # Normalize pixel values.
    # Original pixel values are from 0 to 255.
    # After division, values become from 0 to 1.
    arr = arr / 255.0

    return arr


# --------------------------------------------------
# 3. Read training images manually
# --------------------------------------------------

X = []
y = []

# Mango images

folder_path = os.path.join(base_folder, "mango")

image_path = os.path.join(folder_path, "mango1.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(0)

image_path = os.path.join(folder_path, "mango2.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(0)


# Dog images

folder_path = os.path.join(base_folder, "dog")

image_path = os.path.join(folder_path, "dog1.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(1)

image_path = os.path.join(folder_path, "dog2.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(1)


# Cat images

folder_path = os.path.join(base_folder, "cat")

image_path = os.path.join(folder_path, "cat1.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(2)

image_path = os.path.join(folder_path, "cat2.png")
print(image_path)
arr = image_to_array(image_path)
X.append(arr)
y.append(2)


# --------------------------------------------------
# 4. Convert lists to NumPy arrays
# --------------------------------------------------

X = np.array(X)
y = np.array(y)

print("X shape:", X.shape)
print("y:", y)

# X shape should be:
# (6, 64, 64, 3)
#
# Meaning:
# 6 images
# 64 height
# 64 width
# 3 color channels

# Convert labels into one-hot format.
#
# Before:
# mango -> 0
# dog   -> 1
# cat   -> 2
#
# After:
# mango -> [1, 0, 0]
# dog   -> [0, 1, 0]
# cat   -> [0, 0, 1]

y_categorical = to_categorical(y, number_of_classes)

print("One-hot labels:")
print(y_categorical)


# --------------------------------------------------
# 5. Create CNN model
# --------------------------------------------------

model = Sequential()

# First convolution layer.
# This layer looks for small patterns like edges and simple shapes.
model.add(
    Conv2D(
        filters=16,
        kernel_size=(3, 3),
        activation="relu",
        input_shape=(image_height, image_width, 3)
    )
)

# MaxPooling reduces image size.
# It keeps important information and reduces calculation.
model.add(MaxPooling2D(pool_size=(2, 2)))

# Second convolution layer.
# This layer can learn slightly more complex patterns.
model.add(
    Conv2D(
        filters=32,
        kernel_size=(3, 3),
        activation="relu"
    )
)

model.add(MaxPooling2D(pool_size=(2, 2)))

# Flatten converts 2D feature maps into 1D data.
# Dense layers need 1D input.
model.add(Flatten())

# Dense hidden layer.
model.add(Dense(64, activation="relu"))

# Output layer.
# We have 3 classes: mango, dog, cat.
# softmax gives probability for each class.
model.add(Dense(number_of_classes, activation="softmax"))


# --------------------------------------------------
# 6. Compile CNN model
# --------------------------------------------------

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print()
print("CNN Model Summary:")
model.summary()


# --------------------------------------------------
# 7. Train CNN model
# --------------------------------------------------
print(X,y)
input()
history = model.fit(
    X,
    y_categorical,
    epochs=50,
    batch_size=2,
    verbose=1
)

print()
print("CNN training completed successfully.")


# --------------------------------------------------
# 8. Predict a new image
# --------------------------------------------------

test_image_path = "classification/picture/test.png"

test_arr = image_to_array(test_image_path)

# CNN expects a batch of images.
# One image shape is:
# (64, 64, 3)
#
# We convert it to:
# (1, 64, 64, 3)
test_arr = np.array(test_arr).reshape(1, image_height, image_width, 3)

prediction = model.predict(test_arr)

print()
print("Prediction probabilities:")
print(prediction)

predicted_number = np.argmax(prediction[0])

predicted_class = classes[predicted_number]

print("Predicted class number:", predicted_number)
print("Predicted class:", predicted_class)


# --------------------------------------------------
# 9. Show test image with prediction
# --------------------------------------------------

img = Image.open(test_image_path)

plt.imshow(img)
plt.axis("off")
plt.title("Predicted class: " + predicted_class)
plt.show()
