import 'bootstrap/dist/css/bootstrap.min.css'
import 'font-awesome/css/font-awesome.min.css'
import React, { useContext, useState } from "react"
import { BrowserRouter, Route, Switch } from "react-router-dom"
import About from '../about'
import Address from '../address'
import { AuthContext } from '../auth/auth-context'
import Dashboard from '../dashboard'
import DupCompare from '../dup-compare/dup-compare'
import DupReport from '../dup-report/dup-report'
import ErrorPage from "../error/index"
import Footer from '../footer/footer'
import NavigationBar from '../navigation-bar/navigation-bar'
import Preferences from '../preferences'
import PrivacyPolicy from '../privacy-policy'
import TermCondition from '../term-condition'
import './App.css'

function App() {
  // const { userData, setUserData } = useUserData()
  // const token = userData && userData.accessToken
  const getUser = () => {
    const currentUser = localStorage.getItem('user')
    return currentUser && JSON.parse(currentUser)
  }
  const authContext = useContext(AuthContext)
  const [loggedIn, setLoggedIn] = useState(authContext.isLoggedIn)
  const [user, setUser] = useState(getUser())

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



  return (
    <AuthContext.Provider value={{ isLoggedIn: loggedIn, login: login, logout: logout, getUser: getUser }}>
      <BrowserRouter>
        <div className="App">
          <NavigationBar setUserData={setUser} userData={user} isLoggedIn={user && user.accessToken ? true : false} />
          <div className="page-content">
            <Switch>
              <Route exact path="/" component={DupReport} />
              <Route exact path="/about" component={About} />
              <Route exact path="/contact" component={Address} />
              <Route exact path="/privacy-policy" component={PrivacyPolicy} />
              <Route exact path="/term-condition" component={TermCondition} />
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/preferences" component={Preferences} />
              <Route exact path="/dup-report" component={(props) => <DupReport userData={user} {...props} />} />
              <Route exact path="/dup-report/:id" component={(props) => <DupReport userData={user} {...props} />} />
              <Route exact path="/dup-compare" component={() => <DupCompare />} />
              <Route exact path="/dup-finder" component={() => <DupCompare />} />
              <Route path='*' exact={true} component={ErrorPage} />
            </Switch>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
