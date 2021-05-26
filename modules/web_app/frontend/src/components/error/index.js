import React from "react"
import { Nav } from "react-bootstrap"

function ErrorPage() {
  return (
    <div className="page-wrap d-flex flex-row align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-12 text-center">
            <span className="display-1 d-block">404</span>
            <div className="mb-4 lead">Trang web không tồn tại.</div>
            <Nav.Link href="/">Về trang chính</Nav.Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ErrorPage