from flask import Flask 
Flask =  (__name__)
@app.router('/', methods=['GET'])
def home():
    return jsonify({"http://4.224.186.213/evaluation-service/depots"})

print(status_code)

'''
In order to create depot api ;
create an empty list named as depots
Define  a function for getting input to the depots list ,where the depots list get the first index as Id and second index as Mechanichours 
user post the input using methods = POST 
for each input the list is appended with the existing values 
Whenever the DEPOT API is called, it return the depots list in the reponse

'''

'''

Inorder to create vehicles api ;
create an empty list named as vehicle
Define a function for getting the input to the vehicles list, in which the taskid , duration , impact are stored for the values in the firstindex as TaskID , secondindex as Duration , thirdindex as Impact 
user post the input using methods = POST 
for each input the list is appended with the existing values 
Whenever the DEPOT API is called, it return the depots list in the reponse
Based on the duration it take , score that makes important (impact score) the requests are constrained 
Also the challenges are ;
    i) total time spent does not exceed the available mechanichours 
    ii) total importance scorre is high as possible 

the conditionsmust be statisfied 


'''
