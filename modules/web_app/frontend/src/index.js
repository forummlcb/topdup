import "bootstrap-daterangepicker/daterangepicker.css"
import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css'
import ReactDOM from 'react-dom'
import ReactGA from 'react-ga'
import 'react-toastify/dist/ReactToastify.css'
import App from './components/App/App'
import './index.css'
import reportWebVitals from './reportWebVitals'

ReactGA.initialize('G-EY0TC1L82J');
ReactGA.pageview(window.location.pathname + window.location.search);


ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
