import PropTypes from "prop-types"
import React, { useRef, useState } from "react"
import FacebookLoginWithButton from 'react-facebook-login'
import "./Login.css"
import AuthService from "./Login.service"


export default function Login({ setToken, setUserData }) {
  const [username, setUsername] = useState()
  const [password, setPassword] = useState()

  const mounted = useRef(true)
  const authService = new AuthService()

  const loginResponseHandler = (result) => {
    const httpCode = result.code
    if (httpCode !== 200) throw (result.message)
    const token = result.data.accessToken
    if (mounted.current) {
      setToken(token)
      setUserData(result.data.user)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    authService.getToken({ username, password })
      .then(result => loginResponseHandler(result))
  }

  const fbLoginClicked = () => { }
  const fbLoginCallback = (fbRespose) => {
    authService.loginByFacebook(fbRespose).then(
      result => loginResponseHandler(result)
    )
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-inner">
        <form onSubmit={handleSubmit}>
          <h3>Sign In</h3>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter username"
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="custom-control custom-checkbox">
              <input
                type="checkbox"
                className="custom-control-input"
                id="customCheck1"
              />
              <label className="custom-control-label" htmlFor="customCheck1">
                Remember me
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Submit
          </button>
          <FacebookLoginWithButton
            appId="800436117349613"
            autoLoad
            fields="name,email,picture"
            onClick={fbLoginClicked}
            cssClass={"btn btn-primary btn-block mt-2"}
            callback={fbLoginCallback}
            icon="fa-facebook" />
          <p className="forgot-password text-right">
            Forgot <a href="#">password?</a>
          </p>
        </form>
      </div>
    </div>
  )
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired
}
