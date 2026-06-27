from PIL import Image
import matplotlib.pyplot as plt

img = Image.open("classification/picture/pictures/cat/cat1.jpg")

print("Image size:", img.size)
print("Image mode:", img.mode)

plt.imshow(img)
plt.axis("off")
plt.show()