import React, { useState } from 'react'
import { Nav } from "react-bootstrap"
import styled from 'styled-components'
import Authentication from '../auth/auth'

const StyledMenu = styled.nav`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: white;
  transform: ${ ({ open }) => open ? 'translateX(0)' : 'translateX(100%)' };
  height: 100vh;
  width: 50%;
  text-align: left;
  padding: 60px 10px 10px 20px;
  position: absolute;
  top: 0;
  right: 0;
  transition: transform 0.3s ease-in-out;

  a {
    font-size: 2rem;
    text-transform: uppercase;
    font-weight: bold;

    color: #0D0C1D;
    text-decoration: none;
    transition: color 0.3s linear;

    @media (max-width: 576px) {
      font-size: 16px;
    }

    &:hover {
      color: #343078;
    }
  }
`

const Menu = ({ open, setUserData }) => {
  return (
    <StyledMenu open={open}>
      <div>
        <Nav.Link href="/about">Giới thiệu</Nav.Link>
      </div>
      <div>
        <Nav.Link href="/dup-report">DupReport</Nav.Link>
      </div>
      <div>
        <Nav.Link href="/dup-compare">DupCompare</Nav.Link>
      </div>
      <Authentication setUserData={setUserData} />
    </StyledMenu>
  )
}

const StyledBurger = styled.button`
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;

  &:focus {
    outline: none;
  }

  div {
    width: 2rem;
    height: 0.25rem;
    background: #0D0C1D;
    border-radius: 10px;
    transition: all 0.3s linear;
    position: relative;
    transform-origin: 1px;

    :first-child {
      transform: ${ ({ open }) => open ? 'rotate(45deg)' : 'rotate(0)' };
    }

    :nth-child(2) {
      opacity: ${ ({ open }) => open ? '0' : '1' };
      transform: ${ ({ open }) => open ? 'translateX(20px)' : 'translateX(0)' };
    }

    :nth-child(3) {
      transform: ${ ({ open }) => open ? 'rotate(-45deg)' : 'rotate(0)' };
    }
  }
`

const Burger = ({ open, setOpen }) => {
  return (
    <StyledBurger open={open} onClick={() => setOpen(!open)}>
      <div />
      <div />
      <div />
    </StyledBurger>
  )
}


const NavBarMobile = (setUserData) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Burger open={open} setOpen={setOpen} />
      <Menu open={open} setOpen={setOpen} setUserData={setUserData} />
    </div>
  )
}

export default NavBarMobile