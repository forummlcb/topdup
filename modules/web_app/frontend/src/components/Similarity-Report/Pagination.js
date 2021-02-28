import React, { Component } from "react";

export class Pagination extends Component {
  render() {
    const { reportsPerPage, totalReports, paginate, nextPage, prevPage, currentPage } = this.props;
    const pageNumbers = [];

    for (let i = 1; i <= Math.ceil(totalReports / reportsPerPage); i++) {
      pageNumbers.push(i);
    }

    const displayPageNumbers = currentPage <= 5 ? pageNumbers.slice(0, 10) : pageNumbers.slice(currentPage - 5, currentPage + 5);

    return (
      <nav>
        <ul className="pagination justify-content-center">
          <li className="page-item">
            <a className="page-link" href="#" onClick={() => prevPage()}>
              Previous
            </a>
          </li>
          {displayPageNumbers.map(num => {
            const className = "page-link " + (currentPage === num ? "selected-page" : "");
            return (
              <li className="page-item" key={num}>
                <a onClick={() => paginate(num)} href="#" className={className}>
                  {num}
                </a>
              </li>
            );
          })}
          <li className="page-item">
            <a className="page-link" href="#" onClick={() => nextPage()}>
              Next
            </a>
          </li>
        </ul>
      </nav>
    );
  }
}

export default Pagination;
