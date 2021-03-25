import React, { useContext, useEffect, useState } from "react"
import { IconContext } from "react-icons"
import { FaCheck, FaHashtag, FaTimes } from "react-icons/fa"
import DupReportService from "./dup-report.service"
import { AuthContext } from "../auth/auth-context"
import ReactTooltip from "react-tooltip"
import moment from "moment"
import DupCompare from "../dup-compare/dup-compare"
import { Button } from "react-bootstrap"
import { Link } from 'react-router-dom'

export const DupReportList = (props) => {
  const [simReports, setSimReports] = useState({ ...props.simReports })
  const [loading, setLoading] = useState({ ...props.loading })
  const dupReportService = new DupReportService()
  const authContext = useContext(AuthContext)

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
    const user = authContext.getUser()
    if (user) {
      dupReportService.applyVote(simReport, votedOption, user.id)
        .then(result => {
          const updatedSimReport = result.data
          props.reportVoted({ ...simReport, ...updatedSimReport })
        })
        .catch(error => {
          throw (error)
        })
    }
  }

  const reportRowRenderer = simReport => {
    console.log('dub report list rerendered!')
    const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
    const voteTooltip = authContext.isLoggedIn ? '' : 'Đăng nhập để vote'
    const { articleA, articleB, articleANbVotes, articleBNbVotes, domainA, domainB, createdDateA, createdDateB, urlA, urlB } = simReport
    return (
      <div className="sim-report-row">
        <div className="sr-title-container">
          <div className="sr-title">
            <span>{articleA}</span>
          </div>
          <div className="sr-title">
            <span>{articleB}</span>
          </div>
        </div>
        <ReactTooltip type="warning" />
        <div className="sr-vote-container">
          <div className="sr-vote-check-container">
            <div className={voteItemClassName(1)} data-tip={voteTooltip}>
              <button className="btn btn-outline-secondary btn-sm sr-vote-btn"
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 1)}>
                {articleANbVotes}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
            <div className={voteItemClassName(2)} data-tip={voteTooltip}>
              <button className="btn btn-outline-secondary btn-sm sr-vote-btn"
                data-tip={voteTooltip}
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 2)}>
                {articleBNbVotes}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
          </div>
          <div className={voteItemClassName(3)} data-tip={voteTooltip}>
            <button className="btn btn-outline-secondary btn-sm sr-vote-error-btn"
              data-tip={voteTooltip}
              disabled={!authContext.isLoggedIn}
              onClick={() => applyVote(simReport, 3)}>
              {iconRenderer(FaTimes, "#EF5A5A")}
            </button>
          </div>
          <div className={voteItemClassName(4)} data-tip={voteTooltip}>
            <button className="btn btn-outline-secondary btn-sm sr-vote-irrelevant-btn"
              data-tip={voteTooltip}
              disabled={!authContext.isLoggedIn}
              onClick={() => applyVote(simReport, 4)}>
              {iconRenderer(FaHashtag, "#F69E0C")}
            </button>
          </div>
        </div>
        <div className="sr-domain-date">
          <div className="col-sm-6">

            <div className="row other">{domainA}</div>
            <div className="row other">{domainB}</div>
          </div>
          <div className="col-sm-6">
            <div className="row other">{new Date(createdDateA).toLocaleDateString()}</div>
            <div className="row other">{new Date(createdDateB).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="sr-compare">
          <Link to={{
            pathname: '/dup-compare',
            state: { urlA, urlB }
          }}>
            <button class="btn btn-outline-secondary">So sánh</button>
          </Link>
        </div>
      </div>
    )
  }

  return <div className="sr-list-container">{simReports.map(item => reportRowRenderer(item))}</div>
}

export default DupReportList