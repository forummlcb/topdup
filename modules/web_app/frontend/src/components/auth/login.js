import React, { useContext } from "react"
import { Modal } from "react-bootstrap"
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props'
import { GoogleLogin } from 'react-google-login'
import { FaFacebookSquare } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import { AuthMode } from "../../shared/constants"
import ReactIconRender from "../../shared/react-icon-renderer"
import { AuthContext } from "./auth-context"
import AuthService from "./auth-service"
import "./auth.css"
import ValidatedLoginForm from "./validated-login-form"


export default function LoginModal(props) {
  const setUserData = props.setUserData
  const authService = new AuthService()
  const authContext = useContext(AuthContext)

  const onSubmitLogin = (loginMode, userCredential, modalProps) => {
    let httpRequest

    if (loginMode === AuthMode.Standard) httpRequest = authService.loginNormal(userCredential)
    if (loginMode === AuthMode.Facebook) httpRequest = authService.authByFacebook(userCredential)
    if (loginMode === AuthMode.Google) httpRequest = authService.authByGoogle(userCredential)

    if (httpRequest) {
      httpRequest.then(
        result => {
          authContext.login(result.data.user)
          setUserData(result.data.user)
          modalProps.onHide()
        }
      )
    }
  }

  const openSignUp = () => {
    props.openSignUp()
    props.onHide()
  }

  return (
    <Modal {...props} aria-labelledby="contained-modal-title-vcenter">
      <div style={{ padding: "20px" }}>
        <div className="layout-grid centered-container auth-heading">Đăng nhập</div>
        <div className="layout-grid centered-container margin-bottom--20">
          <div style={{ cursor: 'pointer' }}>
            <GoogleLogin
              clientId="712851565891-s8rjhfg50a8ebqmeq8ssdd4f0u0s24ca.apps.googleusercontent.com"
              buttonText="Login"
              onSuccess={(ggResponse) => {
                onSubmitLogin(AuthMode.Google, ggResponse, props)
                console.log(ggResponse)
              }}
              onFailure={(ggResponse) => { }}
              cookiePolicy={'single_host_origin'}
              render={renderProps => (
                <div onClick={renderProps.onClick}>
                  <ReactIconRender className={'ext-login-btn'} color={'#4267B2'} IconComponent={FcGoogle} />
                </div>
              )}
            />
          </div>
          <div style={{ cursor: 'pointer' }}>
            <FacebookLogin
              style={{ 'margin-top': '-5px', cursor: 'pointer' }}
              appId="800436117349613"
              fields="name,email,picture"
              cssClass="btn btn-primary btn-block mt-2 ext-login-btn"
              callback={(response) => onSubmitLogin(AuthMode.Facebook, response, props)}
              render={renderProps => (
                <div onClick={renderProps.onClick}>
                  <ReactIconRender className={'ext-login-btn'} color={'#4267B2'} IconComponent={FaFacebookSquare} />
                </div>
              )}
            />
          </div>
        </div>

        <div className="layout-grid centered-container margin-bottom--20">
          <ValidatedLoginForm onSubmitLogin={(userCredential) => onSubmitLogin(AuthMode.Standard, userCredential, props)} />
        </div>

        <div className="layout-grid centered-container margin-bottom--20">
          Quên mật khẩu?
        </div>

        <div className="layout-grid centered-container margin-bottom--20">
          Chưa có tài khoản? &nbsp; <a href="#" onClick={openSignUp}>Đăng ký</a>
        </div>
      </div>
    </Modal>
  )
}

