import React, { useState } from "react"
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap"
import { useLocation } from "react-router-dom"
import LoginModal from "../../../components/Login/Login"
import SignupModal from "../../../components/Signup/Signup"
import "./navigation-bar.css"

const NavigationBar = ({ isLoggedIn, setUserData }) => {
  const location = useLocation()
  const [signupModalShow, setSignupModalShow] = useState(false)
  const [loginModalShow, setLoginModalShow] = useState(false)

  const logOut = () => {
    setUserData()
    window.location.assign("/")
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
        <button className="btn btn-outline-secondary bg-sm" onClick={logOut}>
          Thoát
        </button>
      </Nav.Link>
    </>
  )

  const notLoggedInItems = (
    <>
      <Nav.Link href="#" onClick={() => setLoginModalShow(true)}>
        <button className="btn btn-outline-secondary btn-sm">Đăng nhập</button>
      </Nav.Link>
      <Nav.Link href="#" onClick={() => setSignupModalShow(true)}>
        <button className="btn btn-outline-secondary btn-sm">Đăng ký</button>
      </Nav.Link>
    </>
  )

  const userRelatedNavItems = isLoggedIn ? loggedInItems : notLoggedInItems

  return (
    <>
      <Navbar expand="lg" fixed="top">
        <Container>
          <Navbar.Brand className="topdup-brand" href="/">
            TopDup
          </Navbar.Brand>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto" activeKey={location.pathname}></Nav>
            <Nav className="topdup-nav-items">
              <Nav.Link href="/home">Trang chủ</Nav.Link>
              <Nav.Link href="/similarity-reports">Dup Reports</Nav.Link>
              <Nav.Link href="/dup-check">Dup Compare</Nav.Link>
              <Nav.Link href="/dup-finder">Dup Finder</Nav.Link>
              <Nav.Link href="/about">Về TopDup</Nav.Link>
              {userRelatedNavItems}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <SignupModal show={signupModalShow} onHide={() => setSignupModalShow(false)} />
      <LoginModal setUserData={setUserData} show={loginModalShow} onHide={() => setLoginModalShow(false)} />
    </>
  )
}

export default NavigationBar
