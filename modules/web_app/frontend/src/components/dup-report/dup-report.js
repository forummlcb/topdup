import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-alpine.css"
import React, { Component } from "react"
import { BrowserView, MobileView } from "react-device-detect"
import DupReportList from "./dub-report-list"
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
      reportsPerPage: 10,
      totalNbReports: 0,
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
      this.getData()
      const searchStr = _prevProps.location.search || ''
      const queryParam = queryString.parse(searchStr) || {}
      queryParam.page = this.state.currentPage
      this.props.history.push({ search: queryString.stringify(queryParam) })
    }
  }

  getData = () => {
    const userData = this.state.userData
    const userId = userData && userData.id
    const { currentPage, reportsPerPage, searchObj } = this.state
    const startPoint = reportsPerPage * (currentPage - 1)
    const queryParam = { startPoint, limit: reportsPerPage, ...searchObj, userId }
    this.setState({ loading: true })
    this.dupReportService.getSimilarityRecords(queryParam)
      .then(result => {
        // Save current displayed reports in
        // window object
        window['saveReportResult'] = {
          response: result,
          queryParam: queryParam
        }
        const { reports, totalNbReports } = result.data
        this.setState(prevState => ({
          ...prevState,
          loading: false,
          simReports: reports,
          allReports: reports,
          totalNbReports: totalNbReports
        }))
      })
      .catch(error => {
        this.setState(prevState => ({
          ...prevState,
          loading: false,
          simReports: [],
          allReports: [],
          totalNbReports: undefined
        }))
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
    const { simReports, reportsPerPage, totalNbReports, loading, currentPage, searchObj } = this.state
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

    const paginationPanel = <Pagination
      reportsPerPage={reportsPerPage}
      totalReports={totalNbReports}
      paginate={paginate}
      prevPage={prevPage}
      nextPage={nextPage}
      currentPage={currentPage}
    />

    const dupReportListPanel = <DupReportList
      simReports={simReports}
      reportVoted={updateVotedReport}
      loading={loading}
    />

    const listDesktopView = (
      <div className="sim-reports-container">
        <div className="sr-list-with-header">
          <HeaderRow searchObjectChanged={this.onChangeSearchObject} searchObj={searchObj} />
          {dupReportListPanel}
        </div>
        {paginationPanel}
      </div>
    )

    const listMobileView = (
      <div>
        <div style={{ 'marginBottom': '20px' }}>
          {dupReportListPanel}
        </div>
        {paginationPanel}
      </div>
    )

    return (
      <div>
        <BrowserView>
          <div className="slogan-container">
            <div className="slogan-heading">Bảo vệ nội dung của bạn</div>
          </div>
          <div style={{ width: "100%", minHeight: "900px" }}>
            {listDesktopView}
          </div>
        </BrowserView>

        <MobileView>
          <div className="slogan-container-mobile">
            <div className="slogan-heading-mobile">Bảo vệ nội dung của bạn</div>
          </div>
          <div style={{ width: "100%", minHeight: "950px", marginBottom: "20px" }}>
            {listMobileView}
          </div>
        </MobileView>
      </div>
    )
  }
}

export default DupReport
