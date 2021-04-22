import { useContext, useState } from "react"
import { Nav, NavDropdown } from "react-bootstrap"
import { AuthContext } from "./auth-context"
import LoginModal from "./login"
import SignupModal from "./signup"

export default function Authentication(props) {
  const [signupModalShow, setSignupModalShow] = useState(false)
  const [loginModalShow, setLoginModalShow] = useState(false)
  const authContext = useContext(AuthContext)

  const logouthandler = () => {
    authContext.logout()
  }

  const loggedInItems = (
    <>
      <NavDropdown title="User Dashboard" id="collasible-nav-dropdown">
        <NavDropdown.Item href="#">Action</NavDropdown.Item>
        <NavDropdown.Item href="#">Another action</NavDropdown.Item>
        <NavDropdown.Item href="#">Something</NavDropdown.Item>
        <NavDropdown.Divider />
        <NavDropdown.Item href="#">Separated link</NavDropdown.Item>
      </NavDropdown>
      <Nav.Link href="#">
        <button className="btn btn-outline-secondary bg-sm" onClick={logouthandler}>
          Thoát
        </button>
      </Nav.Link>
    </>
  )

  const notLoggedInItems = (
    <>
      <div>
        <Nav.Link href="#" onClick={() => setLoginModalShow(true)}>
          <button className="btn btn-sm login-btn">Đăng nhập</button>
        </Nav.Link>
      </div>
      <div>
        <Nav.Link href="#" onClick={() => setSignupModalShow(true)}>
          <button className="btn btn-sm login-btn">Đăng ký</button>
        </Nav.Link>
      </div>
    </>
  )

  return (
    <>
      { authContext.isLoggedIn ? loggedInItems : notLoggedInItems}
      <SignupModal
        setUserData={props.setUserData}
        show={signupModalShow}
        onHide={() => setSignupModalShow(false)} />
      <LoginModal
        setUserData={props.setUserData}
        show={loginModalShow}
        onHide={() => setLoginModalShow(false)}
        openSignUp={() => setSignupModalShow(true)}
      />
    </>
  )
}