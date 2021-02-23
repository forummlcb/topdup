import { AgGridReact } from "ag-grid-react";
import React, { Component } from "react";
import { getSimilarityRecords } from "./Similarity-Report.service";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import "./Similarity-Report.css";
import BtnCellRenderer from "../../shared/components/btn-cell-renderer/btn-cell-renderer";
import { IconContext } from "react-icons";
import { FaCheck, FaTimes, FaHashtag } from "react-icons/fa";

export class SimilarityReport extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columnDefs: [
        {
          headerName: "Source article",
          children: [
            {
              headerName: "Domain",
              field: "domainA",
              width: 120,
              suppressSizeToFit: true
            },
            {
              headerName: "Author",
              field: "authorA",
              width: 120,
              suppressSizeToFit: true
            },
            {
              headerName: "Title",
              field: "articleA",
              width: 250,
              cellStyle: { "text-align": "right" }
            },
            {
              field: "Vote",
              cellRenderer: "btnCellRenderer",
              cellStyle: {
                display: "flex",
                "align-items": "center",
                "justify-content": "center"
              },
              width: 80,
              suppressSizeToFit: true,
              cellRendererParams: params => {
                return {
                  label: `Vote (${params.data["sourceArticleNbVote"]})`,
                  onClick: () => {
                    params.data["sourceArticleNbVote"] =
                      params.data["sourceArticleNbVote"] + 1;
                    params.api.refreshCells({
                      rowNodes: [params.node],
                      force: true
                    });
                  }
                };
              }
            }
          ].map(item => ({
            ...item,
            cellStyle: params => ({
              ...item.cellStyle,
              opacity:
                params.data["sourceArticleNbVote"] <
                params.data["targetArticleNbVote"]
                  ? 0.4
                  : 1
            })
          }))
        },
        {
          headerName: "Sim Score",
          field: "simScore",
          cellStyle: { "text-align": "center" },
          width: 80,
          suppressSizeToFit: true
        },
        {
          headerName: "Target article",
          children: [
            {
              field: "Vote",
              cellRenderer: "btnCellRenderer",
              cellStyle: {
                display: "flex",
                "align-items": "center",
                "justify-content": "center"
              },
              width: 80,
              suppressSizeToFit: true,
              cellRendererParams: params => {
                return {
                  label: `Vote (${params.data["targetArticleNbVote"]})`,
                  onClick: () => {
                    params.data["targetArticleNbVote"] =
                      params.data["targetArticleNbVote"] + 1;
                    params.api.refreshCells({
                      rowNodes: [params.node],
                      force: true
                    });
                  }
                };
              }
            },
            { headerName: "Title", field: "articleB", width: 250 },
            {
              headerName: "Author",
              field: "authorB",
              width: 120,
              suppressSizeToFit: true
            },
            {
              headerName: "Domain",
              field: "domainB",
              width: 120,
              suppressSizeToFit: true
            }
          ].map(item => ({
            ...item,
            cellStyle: params => ({
              ...item.cellStyle,
              opacity:
                params.data["sourceArticleNbVote"] <
                params.data["targetArticleNbVote"]
                  ? 1
                  : 0.4
            })
          }))
        }
      ],
      defaultColDef: {
        width: 170,
        sortable: true,
        floatingFilter: true,
        filter: "agTextColumnFilter",
        filterParams: { newRowsAction: "keep" },
        floatingFilterComponentParams: {
          suppressFilterButton: true
        }
      },
      rowClassRules: {
        "simscore--primary": params =>
          (params.data && params.data["sim_score"]) > 0.98,
        "simscore--secondary": params => {
          const simScore = params.data && params.data["sim_score"];
          if (!simScore) return false;
          return simScore <= 0.95 && simScore > 0.8;
        }
      },
      frameworkComponents: { btnCellRenderer: BtnCellRenderer },
      getRowHeight: () => 30,
      onModelUpdated: params => params.api.sizeColumnsToFit(),
      rowData: [],
      statusBar: {
        statusPanels: [
          { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
          { statusPanel: "agSelectedRowCountComponent" },
          { statusPanel: "agAggregationComponent" }
        ]
      },
      currentMode: "list"
    };

    console.log(this.props.match.params.id)
    this.getData();
  }

  getData = () => {
    getSimilarityRecords().then(results => {
      this.setState({ rowData: results });
    });
  };

  render() {
    const gridView = (
      <div
        id="myGrid"
        style={{
          height: "100%",
          width: "100%"
        }}
        className="ag-theme-alpine"
      >
        <AgGridReact
          modules={this.state.modules}
          columnDefs={this.state.columnDefs}
          defaultColDef={this.state.defaultColDef}
          getRowHeight={this.state.getRowHeight}
          onGridReady={this.onGridReady}
          onModelUpdated={this.state.onModelUpdated}
          frameworkComponents={this.state.frameworkComponents}
          rowData={this.state.rowData}
          statusBar={this.state.statusBar}
          rowClassRules={this.state.rowClassRules}
          headerHeight={30}
        />
      </div>
    );

    const iconRenderer = (IconComponent, color) => {
      return (
        <IconContext.Provider
          value={{ color: color, className: "global-class-name" }}
        >
          <div>
            <IconComponent />
          </div>
        </IconContext.Provider>
      );
    };

    const simReportRenderer = simReport => (
      <div class="sim-report-row">
        <div class="sr-title">
          <div class="row other">{simReport["articleA"]}</div>
          <div class="row other">{simReport["articleB"]}</div>
        </div>
        <div class="sr-vote-container">
          <div class="sr-vote-check-container">
            <div class="row sr-vote-item">
              <span class="sr-vote-icon-container">
                {iconRenderer(FaCheck, "#3571FF")}
              </span>
              &nbsp;60
            </div>
            <div class="row sr-vote-item">
              {iconRenderer(FaCheck, "#3571FF")}&nbsp;52
            </div>
          </div>
          <div class="sr-vote-item sr-vote-error">
            {iconRenderer(FaTimes, "#EF5A5A")}
          </div>
          <div class="sr-vote-item sr-vote-not-related">
            {iconRenderer(FaHashtag, "#F69E0C")}
          </div>
        </div>
        <div class="sr-domain-date">
          <div class="col-sm-6">
            <div class="row other">{simReport["domainA"]}</div>
            <div class="row other">{simReport["domainB"]}</div>
          </div>
          <div class="col-sm-6">
            <div class="row other">{(new Date(simReport["createdDateA"])).toLocaleDateString()}</div>
            <div class="row other">{(new Date(simReport["createdDateB"])).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="sr-compare">
          <button className="btn btn-outline-secondary">So sánh</button>
        </div>
      </div>
    );

    const listView = (
      <div class="sim-reports-container">
        {this.state.rowData.slice(100).map(item => simReportRenderer(item))}
      </div>
    );

    const modeOptions = [
      {
        mode: "grid",
        modeLabel: "Grid",
        iconClassName: "fa fa-table",
        onClick: () => this.setState({ currentMode: "grid" })
      },
      {
        mode: "list",
        modeLabel: "List",
        iconClassName: "fa fa-bars",
        onClick: () => this.setState({ currentMode: "list" })
      }
    ];

    return (
      <div style={{ width: "100%", height: "700px" }}>
        <div class="layout-grid layout-right margin-horizontal--xs">
          {modeOptions.map((option, index) => {
            return (
              <button
                type="button"
                className={
                  "btn btn-sm layout-cell " +
                  (this.state.currentMode === option.mode
                    ? "btn-primary"
                    : "btn-outline-secondary")
                }
                onClick={option.onClick}
              >
                <i className={option.iconClassName}></i> {option.modeLabel}
              </button>
            );
          })}
        </div>
        {this.state.currentMode === "grid" ? gridView : listView}
      </div>
    );
  }
}

export default SimilarityReport;
