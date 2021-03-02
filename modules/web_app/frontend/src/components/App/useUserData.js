import { useState } from "react"

export default function useUserData() {
  const getUserData = () => {
    const userDataStr = sessionStorage.getItem("userData")
    return JSON.parse(userDataStr)
  }

  const [userData, setUserData] = useState(getUserData())

  const saveUserData = userData => {
    sessionStorage.setItem("userData", JSON.stringify(userData))
    setUserData(userData)
  }

  return {
    setUserData: saveUserData,
    userData
  }
}
