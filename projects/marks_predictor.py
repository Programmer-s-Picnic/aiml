
# Marks Predictor
import numpy as np
from sklearn.linear_model import LinearRegression

X=np.array([1,2,3,4,5]).reshape(-1,1)
y=np.array([20,30,40,50,60])

m=LinearRegression()
m.fit(X,y)

print(m.predict([[6]]))
