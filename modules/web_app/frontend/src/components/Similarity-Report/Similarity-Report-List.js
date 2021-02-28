import React, { Component } from "react";
import { IconContext } from "react-icons";
import { FaCheck, FaTimes, FaHashtag } from "react-icons/fa";

export class SimilarityReportList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      simReports: props.simReports,
      loading: props.loading
    };
  }

  static getDerivedStateFromProps(props, current_state) {
    return {
      simReports: props.simReports,
      loading: props.loading
    };
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="sr-list-container" style={{ display: "flex", alignItems: "center" }}>
          <h2>Loading...</h2>
        </div>
      );
    }

    const iconRenderer = (IconComponent, color) => {
      return (
        <IconContext.Provider value={{ color: color, className: "global-class-name" }}>
          <IconComponent />
        </IconContext.Provider>
      );
    };

    const applyVote = (simReport, votedOption) => {
      const currentReports = this.state.simReports;
      const toUpdateReport = currentReports.find(item => item.id === simReport.id);
      if (toUpdateReport) {
        const currentVoteOption = toUpdateReport.votedOption;
        if (currentVoteOption === votedOption) return;

        if (votedOption === 1) toUpdateReport.articleANbVotes += 1;
        if (votedOption === 2) toUpdateReport.articleBNbVotes += 1;

        if (currentVoteOption === 1) toUpdateReport.articleANbVotes += -1;
        if (currentVoteOption === 2) toUpdateReport.articleBNbVotes += -1;

        toUpdateReport.votedOption = votedOption;
        this.setState({ simReports: [...currentReports] });
      }
    };

    const simReportRowRenderer = simReport => {
      const voteItemClassName = value => "sr-vote-item " + (simReport["votedOption"] === value ? "selected" : "");
      console.log(simReport["votedOption"]);
      return (
        <div className="sim-report-row">
          <div className="sr-title-container">
            <div className="sr-title">
              <span>{simReport["articleA"]}</span>
            </div>
            <div className="sr-title">
              <span>{simReport["articleB"]}</span>
            </div>
          </div>
          <div className="sr-vote-container">
            <div className="sr-vote-check-container">
              <div className={voteItemClassName(1)}>
                <button className="btn btn-outline-secondary btn-sm sr-vote-btn" onClick={() => applyVote(simReport, 1)}>
                {simReport["articleANbVotes"] || "999+"}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
                </button>
              </div>
              <div className={voteItemClassName(2)}>
                <button className="btn btn-outline-secondary btn-sm sr-vote-btn" onClick={() => applyVote(simReport, 2)}>
                {simReport["articleBNbVotes"] || 100}&nbsp;{iconRenderer(FaCheck, "#3571FF")}
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
      );
    };

    return <div className="sr-list-container">{this.state.simReports.map(item => simReportRowRenderer(item))}</div>;
  }
}
