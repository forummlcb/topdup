import { BehaviorSubject } from "rxjs"

const userSub = new BehaviorSubject({})

export const dataService = {
    setUserData: userData => userSub.next(userData),
    clearUserData: () => userSub.next({}),
    getUserData: () => userSub.getValue()
}