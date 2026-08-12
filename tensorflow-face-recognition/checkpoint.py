from image_class import ImageClass
from classes import CameraClass


def main1():
    imageObject = ImageClass()
    imageObject.readImage("me.jpg")
    print("Image shape:", imageObject.getShape())
    imageObject.saveImage("me-copy.jpg")
    imageObject.showImage("First checkpoint")


def main2():
    cameraobject = CameraClass()
    cameraobject.openCamera()
    cameraobject.captureImage("me.jpg")


if __name__ == "__main__":
    main2()
    main1()
