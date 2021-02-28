import React, { Component } from "react";

export class HeaderRow extends Component {
  render() {
    return (
      <div className="sim-header-row">
        <div className="sr-title-container">
          <div className="sr-header-title">Tiêu đề</div>
          <div className="sr-header-title">
            <div className="input-group input-group-sm mb-3">
              <input type="text" className="form-control" placeholder="Search..." aria-label="Small" aria-describedby="inputGroup-sizing-sm" />
            </div>
          </div>
        </div>
        <div className="sr-vote-container"></div>
        <div className="sr-domain-date">
          <div className="col-sm-6">
            <div className="row other">Tên miền</div>
            <div className="row other" style={{ paddingRight: "5px" }}>
              <div className="input-group input-group-sm mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search..."
                  aria-label="Small"
                  aria-describedby="inputGroup-sizing-sm"
                />
              </div>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="row other">Ngày tháng</div>
            <div className="row other"style={{ paddingRight: "5px" }}>
              <div className="input-group input-group-sm mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search..."
                  aria-label="Small"
                  aria-describedby="inputGroup-sizing-sm"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="sr-compare">Chi tiết</div>
      </div>
    );
  }
}

export default HeaderRow;
