from sklearn import tree
import matplotlib.pyplot as plt


def divisions(n):
    # Convert numeric division code to text
    if n == 2:
        return "fail"
    return "pass"


def classifications(n):
    # Less than 40 is fail and the numeric code is 2.
    # Pass numeric code is 1
    if n < 40:
        return 2
    return 1


inputmarks = [50, 45, 66, 7, 89, 21, 39, 40, 89]
inputmarks.sort()
marks = [[x] for x in inputmarks]  # Classification needs input as a 2d array
# Use one of the following three
results = [classifications(x) for x in inputmarks]  # Calculated
# results= [4, 4, 4, 3, 3, 2, 1, 1,1]# Input Results
# results= [4, 4, 1, 3, 3, 2, 1, 1,1]# Input Results with error
# results= [4, 4, 1, 1, 1, 1, 1, 1,4]# Input Results with fail pass error
# results= [4, 4, 4, 3, 3, 2, 1, 1,4]# Input Results with labeling error. 89 = both1 and 2
textresults = [divisions(x) for x in results]  # Print results in words
print(inputmarks, results, textresults)
classifier = tree.DecisionTreeClassifier()
model = classifier.fit(marks, results)
print(classifier, model)

fullmarksrange = [x for x in range(101)]
fullresultrange = [model.predict([[x]])[0] for x in fullmarksrange]
print(fullresultrange)
plt.plot(marks, results, color='red')
plt.scatter(marks, results, color='blue', marker='o')
plt.grid()
plt.xlabel('Marks')
plt.ylabel('Division')
plt.title("Marks - Division")
plt.legend(["Failed", "Passed"])
plt.show()
plt.plot(fullmarksrange, fullresultrange, color='green')
plt.scatter(marks, results, color='brown', marker='o')
plt.grid()
plt.xlabel('Marks')
plt.ylabel('Division')
plt.title("Predicted Marks - Division")
plt.legend(["Passed", "Failed"])
plt.show()
