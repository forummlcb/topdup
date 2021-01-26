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
			<Nav.Link href="/sign-in">Sign In</Nav.Link>
			<Nav.Link href="/sign-up">Sign Up</Nav.Link>
		</>
	);

	const rightNavItems = isLoggedIn ? loggedInItems : notLoggedInItems;

	return (
		<Navbar bg="primary" variant="dark" expand="lg" fixed="top">
			<Container>
				<Navbar.Brand href="/">TopDup</Navbar.Brand>
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="mr-auto" activeKey={location.pathname}>
						<Nav.Link href="/sign-in">Home</Nav.Link>
						<Nav.Link href="/dupfinder">DupFinder</Nav.Link>
						<Nav.Link href="/similarity-report">Similarity Reports</Nav.Link>
						<Nav.Link href="/dupregister">DupRegister</Nav.Link>
					</Nav>
					<Nav>{rightNavItems}</Nav>
				</Navbar.Collapse>
			</Container>
		</Navbar>
	);
};

export default NavigationBar;
