import random
def password_condition(password):
    if len(password) == 4:
        rand_number = random.randint(1000,5000)
        if rand_number == password:
            print("success yoyr 1 in million",rand_number)
        else:
            print("soory u missed it",rand_number)
    else:
        print("passord should be between the length should be 4")
    

try:
    password = int(input("Enter the Password :"))
    password_condition(password)
except ValueError:
        print("Please add only  number")

    