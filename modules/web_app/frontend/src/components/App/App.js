import 'bootstrap/dist/css/bootstrap.min.css'
import 'font-awesome/css/font-awesome.min.css'
import './App.css'
import React, { useContext, useState } from "react"
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import useUserData from '../../shared/useUserData'
import { AuthContext } from '../auth/auth-context'
import Dashboard from '../dashboard'
import DupCompare from '../dup-compare/dup-compare'
import DupReport from '../dup-report/dup-report'
import Footer from '../footer/footer'
import NavigationBar from '../navigation-bar/navigation-bar'
import Preferences from '../preferences'
import About from '../about'
import TermCondition from '../term-condition'
import PrivacyPolicy from '../privacy-policy'
import Address from '../address'

function App() {
  const { userData, setUserData } = useUserData()
  const token = userData && userData.accessToken
  const authContext = useContext(AuthContext)

  const [loggedIn, setLoggedIn] = useState(authContext.isLoggedIn)
  const [user, setUser] = useState()

  const login = (user) => {
    setLoggedIn(true)
    setUser(user)
    localStorage.setItem('user', JSON.stringify(user))
  }

  const logout = () => {
    setLoggedIn(false)
    setUser()
    localStorage.removeItem('user')
  }

  const getUser = () => JSON.parse(localStorage['user'])

  return (
    <AuthContext.Provider value={{ isLoggedIn: loggedIn, login: login, logout: logout, getUser: getUser }}>
      <BrowserRouter>
        <div className="App">
          <NavigationBar setUserData={setUserData} userData={userData} isLoggedIn={token ? true : false} />
          <div className="page-content">
            <Switch>
              <Redirect exact from="/" to="/dup-report" />
              <Route exact path="/about" component={About} />
              <Route exact path="/contact" component={Address} />
              <Route exact path="/privacy-policy" component={PrivacyPolicy} />
              <Route exact path="/term-condition" component={TermCondition} />
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/preferences" component={Preferences} />
              <Route exact path="/dup-report" component={DupReport} />
              <Route exact path="/dup-report/:id" component={DupReport} />
              <Route exact path="/dup-compare" component={() => <DupCompare />} />
              <Route exact path="/dup-finder" component={() => <DupCompare />} />
            </Switch>
          </div>
          <ToastContainer />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
