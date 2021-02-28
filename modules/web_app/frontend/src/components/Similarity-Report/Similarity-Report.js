import { AgGridReact } from "ag-grid-react";
import React, { Component } from "react";
import { getSimilarityRecords } from "./Similarity-Report.service";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import "./Similarity-Report.css";
import { SimilarityReportGrid } from "./Similarity-Report-Grid";
import { SimilarityReportList } from "./Similarity-Report-List";
import Pagination from "./Pagination";
import HeaderRow from "./Header-Row";

class SimilarityReport extends Component {
  constructor(props) {
    super(props);

    this.state = {
      simReports: [],
      reportsPerPage: 8,
      loading: false,
      currentPage: 1,
      currentMode: "list"
    };
  }

  componentDidMount = () => {
    this.getData();
  };

  getData = () => {
    this.setState({ loading: true });
    getSimilarityRecords().then(results => {
      this.setState({ loading: false });
      this.setState({ simReports: results });
    });
  };

  render() {
    const { simReports, currentMode, reportsPerPage, loading, currentPage } = this.state;
    const modeOptions = [
      {
        mode: "grid",
        modeLabel: "Grid",
        iconClassName: "fa fa-table",
        className: "btn btn-sm layout-cell " + (currentMode === "grid" ? "btn-primary" : "btn-outline-secondary"),
        onClick: () => this.setState({ currentMode: "grid" })
      },
      {
        mode: "list",
        modeLabel: "List",
        iconClassName: "fa fa-bars",
        className: "btn btn-sm layout-cell " + (currentMode === "list" ? "btn-primary" : "btn-outline-secondary"),
        onClick: () => this.setState({ currentMode: "list" })
      }
    ];

    const indexOfLastReport = reportsPerPage * currentPage;
    const indexOfFirstReport = reportsPerPage * (currentPage - 1);
    const currentSimReports = simReports.slice(indexOfFirstReport, indexOfLastReport);
    const paginate = pageNum => this.setState({ currentPage: pageNum });
    const nextPage = () => this.setState({ currentPage: currentPage + 1 });
    const prevPage = () => this.setState({ currentPage: currentPage - 1 });

    const gridView = <SimilarityReportGrid simReports={simReports} />;
    const listView = (
      <div className="sim-reports-container">
        <div className="sr-list-with-header">
          <HeaderRow />
          <SimilarityReportList simReports={currentSimReports} loading={loading} />
        </div>
        <Pagination
          reportsPerPage={reportsPerPage}
          totalReports={simReports.length}
          paginate={paginate}
          prevPage={prevPage}
          nextPage={nextPage}
          currentPage={currentPage}
        />
      </div>
    );

    return (
      <div>
        <div className="sologan-container">
          <div className="sologan-heading">Bảo vệ nội dung công sức của bạn</div>
          <div className="sologan-description">Nhận thông báo khi nội dung của bạn bị sao chép.</div>
        </div>
        <div style={{ width: "100%", height: "900px" }}>
          {/* <div className="layout-grid layout-right margin-horizontal--xs">
          {modeOptions.map(option => {
            return (
              <button type="button" className={option.className} onClick={option.onClick}>
                <i className={option.iconClassName}></i> {option.modeLabel}
              </button>
            );
          })}
        </div> */}
          {this.state.currentMode === "grid" ? gridView : listView}
        </div>
        <div className="sologan-bottom-container">
          <div className="sologan-bottom">
            Bạn muốn trở thành tình nguyện viên của topDup? <br /> Hoặc đăng ký nhận thông báo khi website bị sao chép.
          </div>
          <div className="sologan-bottom">
            <button type="button" className="btn btn-volunteer">
              Nộp Đơn TNV
            </button>
            <button type="button" className="btn btn-register-bottom">
              Đăng Ký WEBSITE
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SimilarityReport;
