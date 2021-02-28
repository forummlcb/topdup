import React from "react";
import "./navigation-bar.css";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import { useLocation } from "react-router-dom";

const NavigationBar = ({ isLoggedIn }) => {
  const location = useLocation();

  const loggedInItems = (
    <>
      <NavDropdown title="User Dashboard" id="collasible-nav-dropdown">
        <NavDropdown.Item href="#">Action</NavDropdown.Item>
        <NavDropdown.Item href="#">Another action</NavDropdown.Item>
        <NavDropdown.Item href="#">Something</NavDropdown.Item>
        <NavDropdown.Divider />
        <NavDropdown.Item href="#">Separated link</NavDropdown.Item>
      </NavDropdown>
      <Nav.Link href="#">Logout</Nav.Link>
    </>
  );

  const notLoggedInItems = (
    <>
      <Nav.Link href="/sign-in">
        <button className="btn btn-outline-secondary btn-sm">Đăng nhập</button>
      </Nav.Link>
      <Nav.Link href="/sign-up">
        <button className="btn btn-outline-secondary btn-sm">Đăng ký</button>
      </Nav.Link>
    </>
  );

  const userRelatedNavItems = isLoggedIn ? loggedInItems : notLoggedInItems;

  return (
    <Navbar expand="lg" fixed="top">
      <Container>
        <Navbar.Brand className="topdup-brand" href="/">
          TopDup
        </Navbar.Brand>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto" activeKey={location.pathname}></Nav>
          <Nav className="topdup-nav-items">
            <Nav.Link href="/home">Trang chủ</Nav.Link>
            <Nav.Link href="/similarity-reports">DupFinder</Nav.Link>
            <Nav.Link href="/dup-compare">DupCompare</Nav.Link>
            <Nav.Link href="/about">Về TopDup</Nav.Link>
            {userRelatedNavItems}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
