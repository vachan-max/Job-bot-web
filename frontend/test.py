# import random
# from datetime import datetime, timedelta
# def password_condition(password):
#     if len(password) == 4 and password.isdigit():
#         rand_number = random.randint(4999,5000)
        
#         if rand_number ==int(password):
#             print("success yoyr 1 in million",rand_number)
#         else:
#             print("soory u missed it",rand_number)
#     else:
#         print("passord should be between the length should be 4")
    


# password = input("Enter the Password :")
# password_condition(password)

password ={
    "one":"Man",
    "Two":"Woman"
}

print(password.get("ten","no number"))

    