import * as _ from 'lodash'
import { useContext, useEffect, useState } from "react"
import { BrowserView, isMobile, MobileView } from 'react-device-detect'
import { IconContext } from 'react-icons'
import { FaCheck, FaFacebookSquare, FaHashtag, FaTimes, FaTwitterSquare } from 'react-icons/fa'
import { useLocation } from "react-router-dom"
import { FacebookShareButton, TwitterShareButton } from 'react-share'
import ReactTooltip from 'react-tooltip'
import { nFormatter, TopDup } from "../../shared/constants"
import ReactIconRender from '../../shared/react-icon-renderer'
import { AuthContext } from '../auth/auth-context'
import DupReportService from '../dup-report/dup-report.service'
import "./dup-compare.css"
import DupCompareService from "./dup-compare.service"


const queryString = require('query-string')

const Mode = {
  Text: 'text',
  Url: 'url'
}

const Side = {
  Source: 'source',
  Target: 'target'
}

const displayOrderDict = {
  indexA: 'segmentIdxA',
  indexB: 'segmentIdxB',
  simScore: 'similarityScore'
}

const DupCompare = (props) => {
  const routeInfo = useLocation()
  const searchStr = routeInfo.search || ''
  const queryParam = queryString.parse(searchStr) || {}
  const _sourceUrl = queryParam.sourceUrl || ''
  const _sourceText = queryParam.sourceText || ''
  const _targetUrl = queryParam.targetUrl || ''
  const _targetText = queryParam.targetText || ''
  const _simReport = (routeInfo.state || {}).simReport
  const authContext = useContext(AuthContext)
  const dupReportService = new DupReportService()

  const [isVisibleVoteBlock, setIsVisibleVoteBlock] = useState(_simReport !== undefined)
  const [simReport, setSimReport] = useState(_simReport || {})

  // Similarity threshold set for results dipslay: 0.0
  const [sScoreThreshold,] = useState(0)

  const [sourceInput, setSourceInput] = useState(_sourceUrl || _sourceText)
  const [targetInput, setTargetInput] = useState(_targetUrl || _targetText)
  const [sourceTitle, setSourceTitle] = useState('')
  const [targetTitle, setTargetTitle] = useState('')


  const [sourceSegements, setSourceSegments] = useState([])
  const [targetSegements, setTargetSegments] = useState([])
  const [, setResultPairs] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [compareResult, setCompareResult] = useState({})
  const [shareUrl, setShareUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [displayOrder,] = useState(displayOrderDict.indexA)

  const simCheckService = new DupCompareService()

  useEffect(() => {
    if ((_sourceUrl || _sourceText) && (_targetUrl || _targetText)) {
      checkSimilarity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkSimilarity = () => {
    // TODO: handle url vs url and url vs text
    const sourceMode = checkContentAsUrl(sourceInput) ? Mode.Url : Mode.Text
    const targetMode = checkContentAsUrl(targetInput) ? Mode.Url : Mode.Text
    const queryParam = {}
    if (sourceMode === Mode.Url) queryParam['sourceUrl'] = sourceInput
    if (sourceMode === Mode.Text) queryParam['sourceText'] = sourceInput
    if (targetMode === Mode.Url) queryParam['targetUrl'] = targetInput
    if (targetMode === Mode.Text) queryParam['targetText'] = targetInput
    setShareUrl(`${ TopDup.BaseUrl }/dup-compare?${ queryString.stringify(queryParam) }`)
    console.log('shareUrl: ', shareUrl)

    const compareOption = {
      sourceMode,
      targetMode,
      sourceContent: sourceInput,
      targetContent: targetInput
    }

    setLoading(true)
    setIsVisibleVoteBlock(false)
    setCompareResult({})
    simCheckService.getSimilarityResults(compareOption)
      .then(response => {
        const responseData = response.data || {}
        const compareResult = responseData.results || {}
        const isVisibleVoteBlock = (sourceMode === Mode.Url)
          && (targetMode === Mode.Url)
          && (simReport.urlA === sourceInput)
          && (simReport.urlB === targetInput)
        setCompareResult(compareResult)
        setIsVisibleVoteBlock(isVisibleVoteBlock)
      })
      .catch((error) => {
        setCompareResult({})
      })
      .finally(_ => setLoading(false))
  }

  const applyVote = (simReport, votedOption) => {
    const user = authContext.getUser()
    if (user) {
      dupReportService.applyVote(simReport, votedOption, user.id)
        .then(result => {
          const updatedSimReport = result.data
          setSimReport({
            ...simReport,
            ...updatedSimReport
          })
        })
        .catch(error => {
          throw (error)
        })
    }
  }

  useEffect(() => {
    console.log('compareResult: ', compareResult)
    const sourceSegements = compareResult.segmentListA || []
    const targetSegements = compareResult.segmentListB || []
    const resultPairs = compareResult.pairs || []
    const sourceTitle = compareResult.articleTitleA || ''
    const targetTitle = compareResult.articleTitleB || ''
    const sortOrder = displayOrder === displayOrderDict.simScore ? 'desc' : 'asc'
    const sortedResultPairs = _.orderBy(resultPairs, [displayOrder], [sortOrder])
    const filteredResults = sortedResultPairs.filter(item => item.similarityScore >= sScoreThreshold)
    setSourceTitle(sourceTitle)
    setTargetTitle(targetTitle)
    setSourceSegments(sourceSegements)
    setTargetSegments(targetSegements)
    setResultPairs(sortedResultPairs)
    setFilteredResults(filteredResults)
  }, [compareResult, sScoreThreshold, displayOrder])

  const checkContentAsUrl = (content) => {
    let elm
    elm = document.createElement('input')
    elm.setAttribute('type', 'url')
    elm.value = content
    return elm.validity.valid
  }

  const inputTextarea = (underlyingValue, setUnderlyingValue, side) => {
    let placeholder = 'Nhập nội dung'
    if (side === Side.Source) placeholder = placeholder + ' nguồn'
    if (side === Side.Target) placeholder = placeholder + ' đích'
    const nbRows = isMobile ? 5 : 8
    return (
      <form className="full-width margin-horizontal--xs">
        <div className="input-group">
          <textarea type="text" className="form-control bg--white compare-content-container" placeholder={placeholder}
            aria-label="Username" aria-describedby="basic-addon1" rows={nbRows}
            value={underlyingValue} onChange={($event) => setUnderlyingValue($event.target.value)}>
          </textarea>
        </div>
      </form>
    )
  }

  const resultRenderer = (segments, segmentIdx, idxStr) => {
    const prevIdx = segmentIdx - 1
    const nextIdx = segmentIdx + 1
    const prevParam = segments[prevIdx] ? <span>{segments[prevIdx]}</span> : ''
    const nextParam = segments[nextIdx] ? <span>{segments[nextIdx]}</span> : ''
    const currParam = <span style={{ color: 'orange' }}>{segments[segmentIdx]}</span>
    return (
      <>{idxStr} {prevParam} {currParam} {nextParam}</>
    )
  }

  const shareButtons = (
    <>
      <FacebookShareButton
        url={shareUrl}
        quote={props.text}>
        <ReactIconRender className="social-share-btn" color={'#4267B2'} IconComponent={FaFacebookSquare} />
      </FacebookShareButton>
      <TwitterShareButton
        url={shareUrl}
        title={props.text}>
        <ReactIconRender className="social-share-btn" color={'#1DA1F2'} IconComponent={FaTwitterSquare} />
      </TwitterShareButton>
    </>
  )

  const getBtnVoteTooltip = (voteOption) => {
    const isLoggedIn = authContext.isLoggedIn

    if (!isLoggedIn) return 'Đăng nhập để vote'
    if (voteOption === 1) return 'Vote cho bài ' + (isMobile ? 'ở trên' : 'bên trái')
    if (voteOption === 2) return 'Vote cho bài ' + (isMobile ? 'ở dưới' : 'bên phải')
    if (voteOption === 3) return 'Đánh giá lỗi'
    if (voteOption === 4) return 'Hai bài không liên quan'
    return ''
  }

  const voteBlock = () => {
    if (!isVisibleVoteBlock) return ''
    const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
    const { articleANbVotes, articleBNbVotes } = simReport
    const voteBlockDivClass = isMobile ? 'mb-vote-bloc-div' : 'vote-bloc-div'
    const voteBtnDivClass = isMobile ? 'mb-vote-btn-div' : 'vote-btn-div'
    return (
      <>
        <ReactTooltip type="warning" />
        <div className={voteBlockDivClass}>
          <div className={voteBtnDivClass}>
            {nFormatter(articleANbVotes, 1)}
            <div className={voteItemClassName(1)}>
              <button className="btn"
                data-tip={getBtnVoteTooltip(1)}
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 1)}>
                {iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
          </div>
          <div className={voteBtnDivClass}>
            <div className={voteItemClassName(3)}>
              <button className="btn"
                data-tip={getBtnVoteTooltip(3)}
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 3)}>
                {iconRenderer(FaTimes, "#EF5A5A")}
              </button>
            </div>
          </div>
          <div className={voteBtnDivClass}>
            <div className={voteItemClassName(4)}>
              <button className="btn"
                data-tip={getBtnVoteTooltip(4)}
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 4)}>
                {iconRenderer(FaHashtag, "#F69E0C")}
              </button>
            </div>
          </div>
          <div className={voteBtnDivClass}>
            {nFormatter(articleBNbVotes, 1)}
            <div className={voteItemClassName(2)}>
              <button className="btn"
                data-tip={getBtnVoteTooltip(2)}
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 2)}>
                {iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const resultPairsRenderer = () => {
    const resultList = filteredResults.map((pair, idx) => {
      const sourceSegIdx = pair.segmentIdxA
      const targetSegIdx = pair.segmentIdxB
      return (
        <>
          <BrowserView>
            <div className="row margin-bottom--xs compare-item">
              <div className="col layout-cell text-justify"> {resultRenderer(sourceSegements, sourceSegIdx, `${ idx + 1 }. `)} </div>
              <div className="col layout-cell text-justify"> {resultRenderer(targetSegements, targetSegIdx)} </div>
              <div className="compare-item-info">
                <span className="text-bold text-underline">{pair.similarityScore.toFixed(2)}</span>
                {shareButtons}
              </div>
            </div>
            <hr />
          </BrowserView>
          <MobileView>
            <div className="row no-gutters margin-bottom--xs compare-item">
              <div className="col-auto">{idx + 1}.&nbsp;</div>
              <div className="col text-justify">
                <div className="margin-bottom--20">
                  {resultRenderer(sourceSegements, sourceSegIdx)}
                </div>
                <div>
                  {resultRenderer(targetSegements, targetSegIdx)}
                </div>
              </div>
            </div>
          </MobileView>
        </>
      )
    })
    return (<>
      <div className="compare-results-container">
        {resultList}
      </div>
      {isVisibleVoteBlock && (
        <div className="vote-panel-container" style={{ justifyContent: isMobile ? 'flex-end' : 'center' }}>
          <div className="floating-vote-panel">
            {voteBlock()}
          </div>
        </div>)
      }
    </>)
  }

  const iconRenderer = (IconComponent, color) => {
    return (
      <IconContext.Provider value={{ color: color, className: "global-class-name" }}>
        <IconComponent />
      </IconContext.Provider>
    )
  }

  return (
    <div className="dup-compare-container" style={{ margin: isMobile ? '-20px 10px 0px 10px' : 'auto' }}>
      <div className="layout-grid margin-bottom--30">
        <div className="layout-cell flex-fill dup-compare-title" style={{ fontSize: isMobile && '32px' }}>
          Nhập liên kết hoặc <br /> nội dung cần so sánh
        </div>
      </div>
      <div className="row margin-bottom--40">
        <div className="col-sm-12 col-md-6">
          {inputTextarea(sourceInput, setSourceInput, Side.Source)}
          <div className="ellipsis-container">
            {sourceTitle}
          </div>
        </div>
        <div className="col-sm-12 col-md-6">
          {inputTextarea(targetInput, setTargetInput, Side.Target)}
          <div className="ellipsis-container">
            {targetTitle}
          </div>
        </div>
      </div>
      <div className="row margin-bottom--30">
        <div className="col-auto mr-auto text-bold label--5" style={{ maxWidth: '260px' }}>
          Kết quả: {filteredResults.length}
        </div>
        {/* <div className="layout-cell" style={{ width: '260px' }}>
          <Form>
            <Form.Group
              controlId="exampleForm.SelectCustom"
              onChange={($event) => setDisplayOrder($event.target.value)}
            >
              <Form.Label>Hển thị</Form.Label>
              <Form.Control as="select" custom>
                <option value={displayOrderDict.indexA}>Theo thứ tự câu (bên trái)</option>
                <option value={displayOrderDict.indexB}>Theo thứ tự câu (bên phải)</option>
                <option value={displayOrderDict.simScore}>Độ trùng lặp giảm dần</option>
              </Form.Control>
            </Form.Group>
          </Form>
        </div> */}
        <div className="col-auto">
          <button type="button" className="btn btn-warning compare-btn" onClick={checkSimilarity}>So sánh</button>
        </div>
      </div>

      {loading ? <div className="sr-list-container centered-container"> <h2>Loading...</h2> </div> : resultPairsRenderer()}

      <div className="row text-right margin-horizontal">
        <div className="col">{shareButtons}</div>
      </div>
    </div >
  )
}

export default DupCompare

