import * as _ from 'lodash'
import { useContext, useEffect, useState } from "react"
import { Form } from 'react-bootstrap'
import { IconContext } from 'react-icons'
import { FaCheck, FaFacebookSquare, FaHashtag, FaTimes, FaTwitterSquare } from 'react-icons/fa'
import { useLocation } from "react-router-dom"
import { FacebookShareButton, TwitterShareButton } from 'react-share'
import ReactTooltip from 'react-tooltip'
import { TopDup } from "../../shared/constants"
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
  const _targetUrl = queryParam.targetUrl || ''
  const _sourceText = queryParam.sourceText || ''
  const _targetText = queryParam.targetText || ''
  const _simReport = (routeInfo.state || {}).simReport
  const authContext = useContext(AuthContext)
  const dupReportService = new DupReportService()

  const [isVisibleVoteBlock, setIsVisibleVoteBlock] = useState(_simReport !== undefined)
  const [simReport, setSimReport] = useState(_simReport || {})
  const defaultModeA = _sourceUrl ? Mode.Url : Mode.Text
  const defaultModeB = _targetUrl ? Mode.Url : Mode.Text
  const [sourceMode, setSourceMode] = useState(defaultModeA)
  const [targetMode, setTargetMode] = useState(defaultModeB)

  // Similarity threshold set for results dipslay: 0.0
  const [sScoreThreshold, setSScoreThreshold] = useState(0)

  const [sourceUrl, setSourceUrl] = useState(_sourceUrl)
  const [targetUrl, setTargetUrl] = useState(_targetUrl)
  const [sourceText, setSourceText] = useState(_sourceText)
  const [targetText, setTargetText] = useState(_targetText)

  const [sourceSegements, setSourceSegments] = useState([])
  const [targetSegements, setTargetSegments] = useState([])
  const [resultPairs, setResultPairs] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [compareResult, setCompareResult] = useState({})
  const [shareUrl, setShareUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(displayOrderDict.indexA)

  const simCheckService = new DupCompareService()

  useEffect(() => {
    if ((_sourceUrl || _sourceText) && (_targetUrl || _targetText)) {
      checkSimilarity()
    }
  }, [])

  const checkSimilarity = () => {
    // TODO: handle url vs url and url vs text
    const sourceContent = sourceMode === Mode.Text ? sourceText : sourceUrl
    const targetContent = targetMode === Mode.Text ? targetText : targetUrl
    const compareOption = { sourceMode, sourceContent, targetMode, targetContent }
    const queryParam = {}
    if (sourceMode === Mode.Url) queryParam['sourceUrl'] = sourceContent
    if (sourceMode === Mode.Text) queryParam['sourceText'] = sourceContent
    if (targetMode === Mode.Url) queryParam['targetUrl'] = targetContent
    if (targetMode === Mode.Text) queryParam['targetText'] = targetContent
    setShareUrl(`${TopDup.BaseUrl}/dup-compare?${queryString.stringify(queryParam)}`)

    console.log('shareUrl: ', shareUrl)

    setLoading(true)
    setIsVisibleVoteBlock(false)
    setCompareResult({})
    simCheckService.getSimilarityResults(compareOption)
      .then(response => {
        const responseData = response.data || {}
        const compareResult = responseData.results || {}
        const isVisibleVoteBlock = (sourceMode === Mode.Url)
          && (targetMode === Mode.Url)
          && (simReport.urlA === sourceContent)
          && (simReport.urlB === targetContent)
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
    const sortOrder = displayOrder === displayOrderDict.simScore ? 'desc' : 'asc'
    const sortedResultPairs = _.orderBy(resultPairs, [displayOrder], [sortOrder])
    const filteredResults = sortedResultPairs.filter(item => item.similarityScore >= sScoreThreshold)
    setSourceSegments(sourceSegements)
    setTargetSegments(targetSegements)
    setResultPairs(sortedResultPairs)
    setFilteredResults(filteredResults)
  }, [compareResult, sScoreThreshold, displayOrder])

  const getBtnClass = (sourceMode, btnLabel) => {
    return sourceMode === btnLabel
      ? "layout-cell btn btn-primary btn-sm"
      : "layout-cell btn btn-outline-secondary btn-sm"
  }

  const urlInput = (underlyingValue, setUnderlyingValue) => (
    <form className="full-width margin-horizontal--xs">
      <div className="input-group mb-3">
        <input type="text" className="form-control bg--white" placeholder="URL"
          aria-label="Username" aria-describedby="basic-addon1"
          value={underlyingValue} onChange={($event) => setUnderlyingValue($event.target.value)} />
      </div>
    </form>
  )

  const textInput = (underlyingValue, setUnderlyingValue) => (
    <form className="full-width margin-horizontal--xs">
      <div className="input-group mb-3">
        <textarea type="text" className="form-control bg--white" placeholder="Nội dung"
          aria-label="Username" aria-describedby="basic-addon1" rows={10}
          value={underlyingValue} onChange={($event) => setUnderlyingValue($event.target.value)}>
        </textarea>
      </div>
    </form>
  )

  const sourceContentRenderer = () => {
    return sourceMode === Mode.Text
      ? textInput(sourceText, setSourceText)
      : urlInput(sourceUrl, setSourceUrl)
  }

  const targetContentRenderer = () => {
    return targetMode === Mode.Text
      ? textInput(targetText, setTargetText)
      : urlInput(targetUrl, setTargetUrl)
  }

  const resultRenderer = (segments, segmentIdx) => {
    const prevIdx = segmentIdx - 1
    const nextIdx = segmentIdx + 1
    const prevParam = segments[prevIdx] ? <span>{segments[prevIdx]}</span> : ''
    const nextParam = segments[nextIdx] ? <span>{segments[nextIdx]}</span> : ''
    const currParam = <span style={{ color: 'orange' }}>{segments[segmentIdx]}</span>
    return (
      <>{prevParam} {currParam} {nextParam}</>
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

  const resultPairsRenderer = () => {
    return filteredResults.map(pair => {
      const sourceSegIdx = pair.segmentIdxA
      const targetSegIdx = pair.segmentIdxB
      return (
        <>
          <div class="row margin-bottom--xs compare-item">
            <div className="col layout-cell text-justify"> {resultRenderer(sourceSegements, sourceSegIdx)} </div>
            <div className="col layout-cell text-justify"> {resultRenderer(targetSegements, targetSegIdx)} </div>
            <div className="compare-item-info">
              <span class="text-bold text-underline">{pair.similarityScore.toFixed(2)}</span>
              {shareButtons}
            </div>
          </div>
          <hr />
        </>
      )
    })
  }

  const iconRenderer = (IconComponent, color) => {
    return (
      <IconContext.Provider value={{ color: color, className: "global-class-name" }}>
        <IconComponent />
      </IconContext.Provider>
    )
  }

  const voteBlock = () => {
    if (!isVisibleVoteBlock) return ''
    const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "")
    const voteTooltip = authContext.isLoggedIn ? '' : 'Đăng nhập để vote'
    const { articleANbVotes, articleBNbVotes } = simReport
    return (
      <>
        <ReactTooltip type="warning" />

        <div class="row justify-content-md-center">
          <div className="col-md-auto centered-container flex-column">
            <div className={voteItemClassName(1)} data-tip={voteTooltip}>
              <button className="btn"
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 1)}>
                {iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
            {articleANbVotes}
          </div>
          <div className="col-md-auto">
            <div className={voteItemClassName(1)} data-tip={voteTooltip}>
              <button className="btn"
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 3)}>
                {iconRenderer(FaTimes, "#EF5A5A")}
              </button>
            </div>
          </div>
          <div className="col-md-auto">
            <div className={voteItemClassName(1)} data-tip={voteTooltip}>
              <button className="btn"
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 4)}>
                {iconRenderer(FaHashtag, "#F69E0C")}
              </button>
            </div>
          </div>
          <div className="col-md-auto centered-container flex-column">
            <div className={voteItemClassName(1)} data-tip={voteTooltip}>
              <button className="btn"
                disabled={!authContext.isLoggedIn}
                onClick={() => applyVote(simReport, 2)}>
                {iconRenderer(FaCheck, "#3571FF")}
              </button>
            </div>
            {articleBNbVotes}
          </div>
        </div>
      </>
    )
  }

  const onChangeDisplayOrder = ($event) => {
    setDisplayOrder($event.target.value)
  }

  return (
    <div className="dup-compare-container">
      <div className="layout-grid margin-bottom--20">
        <div className="layout-cell flex-fill dup-compare-title">Nhập liên kết hoặc nội dung cần so sánh</div>
      </div>
      <div className="row">
        <div className="col layout-cell">
          <div className="layout-grid">
            <button type="button" className={getBtnClass(sourceMode, Mode.Text)} onClick={() => setSourceMode(Mode.Text)}>Text</button>
            <button type="button" className={getBtnClass(sourceMode, Mode.Url)} onClick={() => setSourceMode(Mode.Url)}>URL</button>
          </div>
          <div className="layout-grid">
            {sourceContentRenderer()}
          </div>
        </div>
        <div className="col layout-cell">
          <div className="layout-grid">
            <button type="button" className={getBtnClass(targetMode, Mode.Text)} onClick={() => setTargetMode(Mode.Text)}>Text</button>
            <button type="button" className={getBtnClass(targetMode, Mode.Url)} onClick={() => setTargetMode(Mode.Url)}>URL</button>
          </div>
          <div className="layout-grid">
            {targetContentRenderer()}
          </div>
        </div>
      </div>
      <div className="layout-grid margin-bottom--30" style={{ 'justify-content': 'flex-end' }}>
        <button type="button" className="btn btn-warning compare-btn" onClick={checkSimilarity}>So sánh</button>
      </div>

      <div className="layout-grid margin-bottom--xs" style={{ 'align-items': 'center' }}>
        <div class="layout-cell text-bold label--5" style={{ width: '260px' }}>
          Kết quả: {filteredResults.length}
        </div>
        <div class="layout-cell col">
          {voteBlock()}
        </div>
        <div class="layout-cell" style={{ width: '260px' }}>
          <Form>
            <Form.Group
              controlId="exampleForm.SelectCustom"
              onChange={onChangeDisplayOrder}
            >
              <Form.Label>Hển thị</Form.Label>
              <Form.Control as="select" custom>
                <option value={displayOrderDict.indexA}>Theo thứ tự câu (bên trái)</option>
                <option value={displayOrderDict.indexB}>Theo thứ tự câu (bên phải)</option>
                <option value={displayOrderDict.simScore}>Độ trùng lặp giảm dần</option>
              </Form.Control>
            </Form.Group>
          </Form>
        </div>
        {/* <div class="col-md-auto" style={{ 'margin-right': '-20px' }}>
          <div class="text-bold">Score</div>
          <RangeSlider
            value={sScoreThreshold} min={0} max={1} step={0.01}
            onChange={e => setSScoreThreshold(e.target.value)}
            tooltipPlacement='top' tooltip="on"
          />
        </div> */}
      </div>

      {loading ? <div className="sr-list-container centered-container"> <h2>Loading...</h2> </div> : resultPairsRenderer()}

      <div className="row margin-bottom--xs" style={{ 'align-items': 'center' }}>
        <div class="col"></div>
        <div class="col-md-auto">{shareButtons}</div>
      </div>
    </div >
  )
}

export default DupCompare

