
# Spam Classifier
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

msgs=["win money","hello friend","free prize"]
labels=[1,0,1]

vec=CountVectorizer()
X=vec.fit_transform(msgs)

m=MultinomialNB()
m.fit(X,labels)

print(m.predict(vec.transform(["free money"])))
