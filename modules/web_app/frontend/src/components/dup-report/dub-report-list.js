import React, { useContext, useEffect, useState } from "react"
import { OverlayTrigger, Popover } from "react-bootstrap"
import { BrowserView, MobileView } from "react-device-detect"
import { IconContext } from "react-icons"
import { FaCheck, FaHashtag, FaTimes } from "react-icons/fa"
import { Link } from 'react-router-dom'
import ReactTooltip from "react-tooltip"
import { AuthContext } from "../auth/auth-context"
import DupReportService from "./dup-report.service"

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

  const getBtnVoteTooltip = (voteOption) => {
    const isLoggedIn = authContext.isLoggedIn

    if (!isLoggedIn) return 'Đăng nhập để vote'
    if (voteOption === 3) return 'Đánh giá lỗi'
    if (voteOption === 4) return 'Hai bài không liên quan'
    return ''
  }

  const reportRowDesktopRenderer = (simReport, isLastItem) => {
    console.log('dub report list rerendered!')
    const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
    const { articleA, articleB, articleANbVotes, articleBNbVotes, domainA, domainB, createdDateA, createdDateB, urlA, urlB } = simReport
    const voteForABtn = (
      <div className={voteItemClassName(1)} data-tip={getBtnVoteTooltip(1)}>
        <button className="btn btn-outline-secondary btn-sm sr-vote-btn"
          disabled={!authContext.isLoggedIn}
          onClick={() => applyVote(simReport, 1)}>
          {articleANbVotes}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
        </button>
      </div>
    )

    const voteForBBtn = (
      <div className={voteItemClassName(2)} data-tip={getBtnVoteTooltip(2)}>
        <button className="btn btn-outline-secondary btn-sm sr-vote-btn"
          disabled={!authContext.isLoggedIn}
          onClick={() => applyVote(simReport, 2)}>
          {articleBNbVotes}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
        </button>
      </div>
    )

    const errorVoteBtn = (
      <div className={voteItemClassName(3)} data-tip={getBtnVoteTooltip(3)}>
        <button className="btn btn-outline-secondary btn-sm sr-vote-error-btn"
          disabled={!authContext.isLoggedIn}
          onClick={() => applyVote(simReport, 3)}>
          {iconRenderer(FaTimes, "#EF5A5A")}
        </button>
      </div>
    )

    const irrVoteBtn = (
      <div className={voteItemClassName(4)} data-tip={getBtnVoteTooltip(4)}>
        <button className="btn btn-outline-secondary btn-sm sr-vote-irrelevant-btn"
          disabled={!authContext.isLoggedIn}
          onClick={() => applyVote(simReport, 4)}>
          {iconRenderer(FaHashtag, "#F69E0C")}
        </button>
      </div>
    )

    const voteBlock = (
      <div className="sr-vote-container">
        <ReactTooltip type="warning" />
        <div className="sr-vote-check-container">
          {voteForABtn}
          {voteForBBtn}
        </div>
        {errorVoteBtn}
        {irrVoteBtn}
      </div>
    )

    return (
      <div className="sim-report-row" style={{ borderBottom: isLastItem && 'unset' }}>
        <div className="sr-title-container">
          <div className="sr-title">
            <span><a href={urlA} target="_blank" rel="noreferrer"> {articleA} </a></span>
          </div>
          <div className="sr-title">
            <span><a href={urlB} target="_blank" rel="noreferrer"> {articleB} </a></span>
          </div>
        </div>
        {voteBlock}
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
            search: `?sourceUrl=${ urlA }&targetUrl=${ urlB }`,
            state: { simReport: simReport }
          }}>
            <button className="btn btn-outline-secondary">So sánh</button>
          </Link>
        </div>
      </div>
    )
  }

  const reportMobileRowRenderer = (simReport) => {
    const { articleA, articleB, domainA, domainB, urlA, urlB } = simReport

    const voteBlock = () => {
      const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
      const { articleANbVotes, articleBNbVotes } = simReport
      return (
        <>
          <ReactTooltip type="warning" />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="col-md-auto centered-container flex-row no-padding">
              <div className={voteItemClassName(1)} data-tip={getBtnVoteTooltip(1)}>
                <button className="btn"
                  disabled={!authContext.isLoggedIn}
                  onClick={() => applyVote(simReport, 1)}>
                  <div className="centered-container">{iconRenderer(FaCheck, "#3571FF")} (A) </div>
                </button>
              </div>
              {articleANbVotes}
            </div>
            <div className="col-md-auto no-padding">
              <div className={voteItemClassName(3)} data-tip={getBtnVoteTooltip(3)}>
                <button className="btn"
                  disabled={!authContext.isLoggedIn}
                  onClick={() => applyVote(simReport, 3)}>
                  {iconRenderer(FaTimes, "#EF5A5A")}
                </button>
              </div>
            </div>
            <div className="col-md-auto no-padding">
              <div className={voteItemClassName(4)} data-tip={getBtnVoteTooltip(4)}>
                <button className="btn"
                  disabled={!authContext.isLoggedIn}
                  onClick={() => applyVote(simReport, 4)}>
                  {iconRenderer(FaHashtag, "#F69E0C")}
                </button>
              </div>
            </div>
            <div className="col-md-auto centered-container flex-row no-padding">
              <div className={voteItemClassName(2)} data-tip={getBtnVoteTooltip(2)}>
                <button className="btn"
                  disabled={!authContext.isLoggedIn}
                  onClick={() => applyVote(simReport, 2)}>
                  <div className="centered-container">{iconRenderer(FaCheck, "#3571FF")} (B) </div>
                </button>
              </div>
              {articleBNbVotes}
            </div>
          </div>
        </>
      )
    }

    return (
      <OverlayTrigger trigger="focus" rootClose key="top" placement="top"
        overlay={
          <Popover id="popover-positioned-top">
            <Popover.Content>
              {voteBlock()}
            </Popover.Content>
          </Popover>
        }
      >
        <div className="report-row-mobile">
          <Link to={{
            pathname: '/dup-compare',
            search: `?sourceUrl=${ urlA }&targetUrl=${ urlB }`,
            state: { simReport: simReport }
          }}>
            <div className="centered-container">
              <div style={{ width: '100%' }}>
                <div className="ellipsis-container">
                  (A) {articleA}
                </div>
                <div className="ellipsis-container color--grey">
                  {domainA}
                </div>
              </div>
            </div>

            <div className="centered-container">
              <div style={{ width: '100%' }}>
                <div className="ellipsis-container">
                  (B) {articleB}
                </div>
                <div className="ellipsis-container color--grey">
                  {domainB}
                </div>
              </div>
              {/* <div>
              <Link to={{
                pathname: '/dup-compare',
                search: `?sourceUrl=${ urlA }&targetUrl=${ urlB }`,
                state: { simReport: simReport }
              }}>
                <button className="btn btn-dark" style={{ width: '90px' }}>So sánh</button>
              </Link>
            </div> */}
            </div>
          </Link>
        </div>
      </OverlayTrigger>
    )
  }

  return <>
    <BrowserView>
      <div className="sr-list-container">{simReports.map((item, idx) => reportRowDesktopRenderer(item, idx === simReports.length - 1))}</div>
    </BrowserView>
    <MobileView>
      {simReports.map(item => reportMobileRowRenderer(item))}
    </MobileView>
  </>

}

export default DupReportList