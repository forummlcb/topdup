import React, { Component } from "react"
import { isMobile } from 'react-device-detect'
export class Pagination extends Component {
  render() {
    const { reportsPerPage, totalReports, paginate, nextPage, prevPage, currentPage } = this.props
    const pageNumbers = []
    console.log('Pagination: currentPage', currentPage)

    for (let i = 1; i <= Math.ceil(totalReports / reportsPerPage); i++) {
      pageNumbers.push(i)
    }

    const maxPage = pageNumbers[pageNumbers.length - 1]

    const halfNbPage = isMobile ? 4 : 5
    const displayPageNumbers = currentPage <= halfNbPage
      ? pageNumbers.slice(0, 2 * halfNbPage)
      : pageNumbers.slice(currentPage - halfNbPage, currentPage + halfNbPage)

    return (
      <nav>
        <ul className="pagination justify-content-center">
          <li className="page-item">
            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => prevPage()}>&laquo;</button>
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
            <button className="pagination-btn" disabled={currentPage === maxPage} onClick={() => nextPage()}>&raquo;</button>
          </li>
        </ul>
      </nav>
    )
  }
}

export default Pagination
