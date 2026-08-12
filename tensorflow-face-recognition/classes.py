import uuid
import cv2
import numpy as np
from image_class import ImageClass


class CameraClass:
    def __init__(self, cameraNumber=0):
        self.cameraNumber = cameraNumber
        self.camera = None

    def openCamera(self):
        self.camera = cv2.VideoCapture(self.cameraNumber)
        if not self.isCameraOpen():
            raise RuntimeError("Could not open camera")

    def readFrame(self):
        if not self.isCameraOpen():
            raise RuntimeError("Camera is not open")
        success, frame = self.camera.read()
        if not success:
            return None
        result = ImageClass()
        result.image = frame
        result.updateDimensions()
        return result

    def captureImage(self, filePath):
        imageObject = self.readFrame()
        if imageObject is None:
            raise RuntimeError("Could not capture an image")
        imageObject.saveImage(filePath)
        return imageObject

    def isCameraOpen(self):
        return self.camera is not None and self.camera.isOpened()

    def closeCamera(self):
        if self.camera is not None:
            self.camera.release()
            self.camera = None


class FaceClass(ImageClass):
    def __init__(self, image=None, box=None, confidence=0.0):
        super().__init__()
        self.image = image
        self.box = box
        self.confidence = confidence
        self.embedding = None
        self.personName = "Unknown"
        self.similarity = 0.0
        if image is not None:
            self.updateDimensions()

    def setBoundingBox(self, x, y, width, height): self.box = (x, y, width, height)
    def getBoundingBox(self): return self.box
    def setEmbedding(self, embedding): self.embedding = embedding
    def getEmbedding(self): return self.embedding
    def setPersonName(self, personName): self.personName = personName
    def getPersonName(self): return self.personName


class FaceDetectorClass:
    def __init__(self, minimumConfidence=0.90):
        self.minimumConfidence = minimumConfidence
        self.model = None

    def loadModel(self): raise NotImplementedError("Add a face detector in Lesson 2")
    def detectFaces(self, imageObject): raise NotImplementedError("Implement in Lesson 2")
    def extractFace(self, imageObject, boundingBox):
        x, y, width, height = boundingBox
        return FaceClass(imageObject.cropImage(x, y, width, height), boundingBox)
    def drawFaceBox(self, imageObject, faceObject):
        x, y, width, height = faceObject.getBoundingBox()
        cv2.rectangle(imageObject.image, (x, y), (x + width, y + height), (0, 255, 0), 2)
    def drawAllFaceBoxes(self, imageObject, faces):
        for face in faces: self.drawFaceBox(imageObject, face)
    def isValidFace(self, confidence): return confidence >= self.minimumConfidence


class FacePreprocessorClass:
    def __init__(self, targetWidth=160, targetHeight=160):
        self.targetWidth, self.targetHeight = targetWidth, targetHeight

    def preprocessFace(self, faceObject):
        face = cv2.resize(faceObject.image, (self.targetWidth, self.targetHeight))
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB).astype(np.float32)
        face = self.standardizeFace(face)
        return self.addBatchDimension(face)
    def resizeFace(self, faceObject): return cv2.resize(faceObject.image, (self.targetWidth, self.targetHeight))
    def normalizeFace(self, faceArray): return faceArray.astype(np.float32) / 255.0
    def standardizeFace(self, faceArray):
        mean, std = faceArray.mean(), faceArray.std()
        return (faceArray - mean) / max(std, 1.0 / np.sqrt(faceArray.size))
    def addBatchDimension(self, faceArray): return np.expand_dims(faceArray, axis=0)
    def calculateBrightness(self, faceObject): return float(cv2.cvtColor(faceObject.image, cv2.COLOR_BGR2GRAY).mean())
    def calculateSharpness(self, faceObject): return float(cv2.Laplacian(faceObject.image, cv2.CV_64F).var())
    def checkFaceQuality(self, faceObject): return faceObject.width >= 80 and self.calculateSharpness(faceObject) >= 50


class FaceEmbeddingClass:
    def __init__(self, modelPath): self.modelPath, self.model = modelPath, None
    def loadModel(self):
        import tensorflow as tf
        self.model = tf.keras.models.load_model(self.modelPath)
    def createEmbedding(self, faceObject, preprocessor):
        if self.model is None: raise RuntimeError("Load the model first")
        embedding = self.model.predict(preprocessor.preprocessFace(faceObject), verbose=0)[0]
        embedding = self.normalizeEmbedding(embedding)
        faceObject.setEmbedding(embedding)
        return embedding
    def createEmbeddings(self, faces, preprocessor): return [self.createEmbedding(f, preprocessor) for f in faces]
    def normalizeEmbedding(self, embedding): return embedding / max(np.linalg.norm(embedding), 1e-12)
    def getEmbeddingSize(self): return int(self.model.output_shape[-1]) if self.model is not None else None


class PersonClass:
    def __init__(self, personId, personName):
        self.personId, self.personName, self.embeddings = personId, personName, []
    def addEmbedding(self, embedding): self.embeddings.append(np.asarray(embedding))
    def getEmbeddings(self): return self.embeddings
    def getAverageEmbedding(self): return np.mean(self.embeddings, axis=0) if self.embeddings else None
    def getPersonId(self): return self.personId
    def getPersonName(self): return self.personName
    def setPersonName(self, personName): self.personName = personName


class FaceDatabaseClass:
    def __init__(self, databasePath): self.databasePath, self.people = databasePath, {}
    def addPerson(self, personObject): self.people[personObject.personId] = personObject
    def removePerson(self, personId): return self.people.pop(personId, None) is not None
    def getPerson(self, personId): return self.people.get(personId)
    def findPersonByName(self, personName):
        return next((p for p in self.people.values() if p.personName.casefold() == personName.casefold()), None)
    def getAllPeople(self): return list(self.people.values())
    def personExists(self, personName): return self.findPersonByName(personName) is not None
    def generatePersonId(self): return str(uuid.uuid4())
    def saveDatabase(self):
        records = [(p.personId, p.personName, p.embeddings) for p in self.people.values()]
        np.save(self.databasePath, np.array(records, dtype=object), allow_pickle=True)
    def loadDatabase(self):
        self.people = {}
        for personId, personName, embeddings in np.load(self.databasePath, allow_pickle=True):
            person = PersonClass(personId, personName); person.embeddings = list(embeddings); self.addPerson(person)


class FaceMatcherClass:
    def __init__(self, faceDatabase, threshold=0.70): self.faceDatabase, self.threshold = faceDatabase, threshold
    def calculateCosineSimilarity(self, embedding1, embedding2):
        denominator = np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        return float(np.dot(embedding1, embedding2) / max(denominator, 1e-12))
    def compareWithPerson(self, embedding, personObject):
        scores = [self.calculateCosineSimilarity(embedding, e) for e in personObject.embeddings]
        return max(scores, default=-1.0)
    def isKnownPerson(self, similarity): return similarity >= self.threshold
    def findBestMatch(self, faceObject):
        candidates = [(self.compareWithPerson(faceObject.embedding, p), p) for p in self.faceDatabase.getAllPeople()]
        return max(candidates, key=lambda item: item[0]) if candidates else (-1.0, None)
    def recognizeFace(self, faceObject):
        score, person = self.findBestMatch(faceObject)
        faceObject.similarity = score
        faceObject.setPersonName(person.personName if person and self.isKnownPerson(score) else "Unknown")
        return faceObject


class FaceRegistrationClass:
    def __init__(self, camera, detector, preprocessor, embeddingGenerator, database):
        self.camera, self.detector, self.preprocessor = camera, detector, preprocessor
        self.embeddingGenerator, self.database = embeddingGenerator, database
    def validatePersonName(self, personName):
        name = " ".join(personName.split())
        if not name: raise ValueError("Person name cannot be empty")
        return name
    def registerPerson(self, personName): raise NotImplementedError("Coordinate sample capture in Lesson 5")
    def captureFaceSamples(self, numberOfSamples=20): raise NotImplementedError("Implement in Lesson 5")
    def acceptFaceSample(self, faceObject): return self.preprocessor.checkFaceQuality(faceObject)
    def createPersonEmbeddings(self, faceSamples): return self.embeddingGenerator.createEmbeddings(faceSamples, self.preprocessor)


class FaceRecognitionClass:
    def __init__(self, detector, preprocessor, embeddingGenerator, matcher):
        self.detector, self.preprocessor = detector, preprocessor
        self.embeddingGenerator, self.matcher = embeddingGenerator, matcher
    def recognizeFace(self, faceObject):
        self.embeddingGenerator.createEmbedding(faceObject, self.preprocessor)
        return self.matcher.recognizeFace(faceObject)
    def recognizeImage(self, imageObject): return [self.recognizeFace(f) for f in self.detector.detectFaces(imageObject)]
    def recognizeCameraFrame(self, imageObject): return self.recognizeImage(imageObject)
    def drawRecognitionResult(self, imageObject, faceObject):
        self.detector.drawFaceBox(imageObject, faceObject)
    def startLiveRecognition(self, camera): raise NotImplementedError("Implement the video loop in Lesson 6")

