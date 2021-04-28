import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-alpine.css"
import React, { Component } from "react"
import { DupReportList } from "./dub-report-list"
import "./dup-report.css"
import DupReportService from "./dup-report.service"
import HeaderRow from "./header-row"
import Pagination from "./pagination"

const queryString = require("query-string")

class DupReport extends Component {
  constructor(props) {
    super(props)
    this.dupReportService = new DupReportService()

    const searchStr = props.location.search || ''
    const queryParam = queryString.parse(searchStr) || {}
    const _currentPage = parseInt(queryParam['page'])

    this.state = {
      userData: props.userData,
      setUserData: props.setUserData,
      simReports: [],
      allReports: [],
      reportsPerPage: 8,
      loading: false,
      currentPage: _currentPage || 1,
      searchObj: {
        titleSearchT: '',
        domainSearchT: '',
        dateRangeSearch: []
      }
    }
  }

  componentDidMount = () => {
    this.getData()
  };

  componentDidUpdate = (_prevProps, prevState, _snapshot) => {
    if (prevState.currentPage !== this.state.currentPage) {

    }
  }

  getData = () => {
    const user = this.state.userData && this.state.userData.user
    const userId = user && user.id
    this.setState({ loading: true })
    this.dupReportService.getSimilarityRecords(userId)
      .then(results => {
        this.setState({ loading: false })
        this.setState({ simReports: results })
        this.setState({ allReports: results })
      })
  };

  onChangeSearchObject = (searchObj) => {
    this.setState({ searchObj: searchObj })
    const { titleSearchT, domainSearchT, dateRangeSearch } = searchObj
    const allReports = this.state.allReports
    const stringSearch = (str, searchT) => !searchT || str.toLowerCase(str).includes(searchT.toLowerCase())
    const filteredReports = allReports.filter(report => {
      const titleOK = stringSearch(report.articleA, titleSearchT) || stringSearch(report.articleB, titleSearchT)
      const domainOK = stringSearch(report.domainA, domainSearchT) || stringSearch(report.domainB, domainSearchT)
      let dateRangeOK = true
      if (dateRangeSearch.length === 2) {
        const beginDate = new Date(dateRangeSearch[0])
        const endDate = new Date(dateRangeSearch[1])
        const dateA = new Date(report.createdDateA)
        const dateB = new Date(report.createdDateB)
        dateRangeOK = (beginDate <= dateA && dateA <= endDate) || (beginDate <= dateB && dateB <= endDate)
      }
      return titleOK && domainOK && dateRangeOK
    })
    this.setState(prevState => ({
      ...prevState,
      simReports: filteredReports
    }))
  }

  render() {
    console.log('Dup report - rerendered')
    const { simReports, reportsPerPage, loading, currentPage, searchObj } = this.state

    const indexOfLastReport = reportsPerPage * currentPage
    const indexOfFirstReport = reportsPerPage * (currentPage - 1)
    const currentSimReports = simReports.slice(indexOfFirstReport, indexOfLastReport)
    const paginate = pageNum => this.setState({ currentPage: pageNum })
    const nextPage = () => this.setState({ currentPage: currentPage + 1 })
    const prevPage = () => {
      if (currentPage > 1) {
        this.setState({ currentPage: currentPage - 1 })
      }
    }

    const updateVotedReport = (report) => {
      const allReports = this.state.allReports
      const newAllReports = allReports.map(item => item.id === report.id ? report : item)
      this.setState({ allReports: newAllReports })
      this.onChangeSearchObject(searchObj)
    }

    const listView = (
      <div className="sim-reports-container">
        <div className="sr-list-with-header">
          <HeaderRow searchObjectChanged={this.onChangeSearchObject} searchObj={searchObj} />
          <DupReportList
            simReports={currentSimReports}
            reportVoted={updateVotedReport}
            loading={loading} />
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
    )

    return (
      <div>
        <div className="slogan-container">
          <div className="slogan-heading">Bảo vệ nội dung của bạn</div>
          {/* Next phrase */}
          {/* <div className="slogan-description">Nhận thông báo khi nội dung của bạn bị sao chép.</div>  */}
        </div>
        <div style={{ width: "100%", height: "900px" }}>
          {listView}
        </div>
      </div>
    )
  }
}

export default DupReport
