import API from '../../api'

export class AuthService {
  getToken(credentials) {
    return API
      .post("api/v1/auth/token", credentials)
      .then(result => result.data)
  }

  loginByFacebook = (fbResponse) => {
    const body = {
      fbToken: fbResponse.accessToken,
      fbId: fbResponse.id
    }
    return API.post("api/v1/auth/get-token/fb", body)
      .then(result => result.data)
  }
}

export default AuthService
