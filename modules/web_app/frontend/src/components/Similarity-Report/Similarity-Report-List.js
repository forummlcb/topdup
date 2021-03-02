import React, { useEffect, useState } from "react"
import { IconContext } from "react-icons"
import { FaCheck, FaHashtag, FaTimes } from "react-icons/fa"
import { dataService } from "../../shared/data.service"
import SimReportsService from "./Similarity-Report.service"

export const SimilarityReportList = (props) => {
  const [simReports, setSimReports] = useState({ ...props.simReports })
  const [loading, setLoading] = useState({ ...props.loading })
  const simReportsService = new SimReportsService()

  useEffect(() => setSimReports(props.simReports), [props.simReports])
  useEffect(() => setLoading(props.loading), [props.loading])


  if (loading) {
    return (
      <div className="sr-list-container centered-container">
        <h2>Loading...</h2>
      </div>
    )
  }

  const iconRenderer = (IconComponent, color) => {
    return (
      <IconContext.Provider value={{ color: color, className: "global-class-name" }}>
        <IconComponent />
      </IconContext.Provider>
    )
  }

  const applyVote = (simReport, votedOption) => {
    const userData = dataService.getUserData()
    const userId = userData.id
    simReportsService.applyVote(simReport, votedOption, userId)
      .then(result => {
        const updatedSimReport = result.data
        const updatedSimReports = simReports.map(item => {
          if (item.id !== simReport.id) return item
          return { ...item, ...updatedSimReport }
        })
        setSimReports(updatedSimReports)
      })
      .catch(error => {
        throw (error)
      })
  }

  const simReportRowRenderer = simReport => {
    const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
    return (
      <div className="sim-report-row">
        <div className="sr-title-container">
          <div className="sr-title">
            <span>{simReport["articleAId"]}{simReport["articleA"]}</span>
          </div>
          <div className="sr-title">
            <span>{simReport["articleBId"]}{simReport["articleB"]}</span>
          </div>
        </div>
        <div className="sr-vote-container">
          <div className="sr-vote-check-container">
            <div className={voteItemClassName(1)}>
              <button className="btn btn-outline-secondary btn-sm sr-vote-btn" onClick={() => applyVote(simReport, 1)}>
                {simReport["articleANbVotes"]}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
            <div className={voteItemClassName(2)}>
              <button className="btn btn-outline-secondary btn-sm sr-vote-btn" onClick={() => applyVote(simReport, 2)}>
                {simReport["articleBNbVotes"]}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
          </div>
          <div className={voteItemClassName(3)} onClick={() => applyVote(simReport, 3)}>
            <button className="btn btn-outline-secondary btn-sm sr-vote-error-btn">{iconRenderer(FaTimes, "#EF5A5A")}</button>
          </div>
          <div className={voteItemClassName(4)} onClick={() => applyVote(simReport, 4)}>
            <button className="btn btn-outline-secondary btn-sm sr-vote-irrelevant-btn">{iconRenderer(FaHashtag, "#F69E0C")}</button>
          </div>
        </div>
        <div className="sr-domain-date">
          <div className="col-sm-6">
            <div className="row other">{simReport["domainA"]}</div>
            <div className="row other">{simReport["domainB"]}</div>
          </div>
          <div className="col-sm-6">
            <div className="row other">{new Date(simReport["createdDateA"]).toLocaleDateString()}</div>
            <div className="row other">{new Date(simReport["createdDateB"]).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="sr-compare">
          <button className="btn btn-outline-secondary">So sánh</button>
        </div>
      </div>
    )
  }

  return <div className="sr-list-container">{simReports.map(item => simReportRowRenderer(item))}</div>
}

export default SimilarityReportList