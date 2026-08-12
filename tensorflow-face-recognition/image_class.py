import cv2
import numpy as np


class ImageClass:
    """Stores an image and provides its fundamental operations."""

    def __init__(self, filePath=None):
        self.filePath = filePath
        self.image = None
        self.height = 0
        self.width = 0
        self.channels = 0
        if filePath is not None:
            self.readImage(filePath)

    def readImage(self, filePath):
        self.image = cv2.imread(filePath)
        if self.image is None:
            raise FileNotFoundError(f"Could not read image: {filePath}")
        self.filePath = filePath
        self.updateDimensions()
        return self.image

    def saveImage(self, filePath):
        self._requireImage()
        if not cv2.imwrite(filePath, self.image):
            raise IOError(f"Could not save image: {filePath}")
        return filePath

    def showImage(self, windowName="Image"):
        self._requireImage()
        cv2.imshow(windowName, self.image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    def resizeImage(self, width, height):
        self._requireImage()
        self.image = cv2.resize(self.image, (width, height))
        self.updateDimensions()
        return self.image

    def convertToRGB(self):
        self._requireImage()
        self.image = cv2.cvtColor(self.image, cv2.COLOR_BGR2RGB)
        return self.image

    def convertToGray(self):
        self._requireImage()
        self.image = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        self.updateDimensions()
        return self.image

    def cropImage(self, x, y, width, height):
        self._requireImage()
        return self.image[y:y + height, x:x + width].copy()

    def normalizeImage(self):
        self._requireImage()
        return self.image.astype(np.float32) / 255.0

    def getShape(self):
        self._requireImage()
        return self.image.shape

    def isLoaded(self):
        return self.image is not None

    def copyImage(self):
        self._requireImage()
        return self.image.copy()

    def updateDimensions(self):
        self._requireImage()
        self.height, self.width = self.image.shape[:2]
        self.channels = self.image.shape[2] if self.image.ndim == 3 else 1

    def _requireImage(self):
        if not self.isLoaded():
            raise ValueError("No image has been loaded")

