import React, { Component } from "react"

export class Pagination extends Component {
  render() {
    const { reportsPerPage, totalReports, paginate, nextPage, prevPage, currentPage } = this.props
    const pageNumbers = []

    for (let i = 1; i <= Math.ceil(totalReports / reportsPerPage); i++) {
      pageNumbers.push(i)
    }

    const displayPageNumbers = currentPage <= 5 ? pageNumbers.slice(0, 10) : pageNumbers.slice(currentPage - 5, currentPage + 5)

    return (
      <nav>
        <ul className="pagination justify-content-center">
          <li className="page-item">
            <button className="pagination-btn" onClick={() => prevPage()}>&laquo;</button>
          </li>
          {
            displayPageNumbers.map(num => {
              const className = "pagination-btn " + (currentPage === num ? "selected" : "")
              return (
                <li className="page-item" key={num}>
                  <button className={className} onClick={() => paginate(num)}>{num}</button>
                </li>
              )
            })
          }
          <li className="page-item">
            <button className="pagination-btn" onClick={() => nextPage()}>&raquo;</button>
          </li>
        </ul>
      </nav>
    )
  }
}

export default Pagination
