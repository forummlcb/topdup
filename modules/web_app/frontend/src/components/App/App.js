import 'font-awesome/css/font-awesome.min.css'
import React from "react"
import { BrowserRouter, Route, Switch } from "react-router-dom"
import Footer from '../../shared/components/Footer/Footer'
import NavigationBar from "../../shared/components/navigation-bar/navigation-bar"
import Dashboard from "../Dashboard/Dashboard"
import Login from "../Login/Login"
import Preferences from "../Preferences/Preferences"
import SimilarityReport from "../Similarity-Report/Similarity-Report"
import "./App.css"
import useToken from "./useToken"

function App() {
  const { token, setToken } = useToken()

  return (
    <BrowserRouter>
      <div className="App">
        <NavigationBar isLoggedIn={token ? true : false} />
        <div className="page-content">
          <Switch>
            <Route
              exact
              path="/"
              component={() => {
                return !token ? <Login setToken={setToken} /> : <Dashboard />
              }}
            />
            <Route exact path="/dashboard" component={Dashboard} />
            <Route exact path="/preferences" component={Preferences} />
            <Route
              exact
              path="/similarity-reports"
              component={SimilarityReport}
            />
            <Route
              exact
              path="/similarity-reports/:id"
              component={SimilarityReport}
            />
          </Switch>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
