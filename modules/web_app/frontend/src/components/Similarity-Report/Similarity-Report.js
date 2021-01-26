import { AgGridReact } from 'ag-grid-react';
import React, { useState, Component } from "react";
import { getSimilarityRecords } from "./Similarity-Report.service";
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css'
import './Similarity-Report.css'
import BtnCellRenderer from '../../shared/components/btn-cell-renderer/btn-cell-renderer';
import { param } from 'react-dom-factories';

class SimilarityReport extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columnDefs: [
        {
          headerName: 'Source article',
          children: [
            { headerName: 'Domain', field: 'source_article_domain', width: 120, suppressSizeToFit: true },
            { headerName: 'Author', field: 'source_article_author', width: 120, suppressSizeToFit: true },
            { headerName: 'Title', field: 'source_article_title', width: 250, cellStyle: { 'text-align': 'right' } },
            {
              field: 'Vote', cellRenderer: 'btnCellRenderer',
              cellStyle: { 'display': 'flex', 'align-items': 'center', 'justify-content': 'center' },
              width: 80, suppressSizeToFit: true,
              cellRendererParams: (params) => {
                return {
                  label: `Vote (${params.data['sourceArticleNbVote']})`,
                  onClick: () => {
                    params.data['sourceArticleNbVote'] = params.data['sourceArticleNbVote'] + 1
                    params.api.refreshCells({
                      rowNodes: [params.node],
                      force: true
                    })
                  }
                }
              }
            }
          ].map(item => ({
            ...item,
            cellStyle: (params) => ({
              ...item.cellStyle,
              opacity: params.data['sourceArticleNbVote'] < params.data['targetArticleNbVote'] ? 0.4 : 1
            })
          }))
        },
        { headerName: 'Sim Sore', field: 'sim_score', cellStyle: { 'text-align': 'center' }, width: 80, suppressSizeToFit: true },
        {
          headerName: 'Target article',
          children: [
            {
              field: 'Vote', cellRenderer: 'btnCellRenderer',
              cellStyle: { 'display': 'flex', 'align-items': 'center', 'justify-content': 'center' },
              width: 80, suppressSizeToFit: true,
              cellRendererParams: (params) => {
                return {
                  label: `Vote (${params.data['targetArticleNbVote']})`,
                  onClick: () => {
                    params.data['targetArticleNbVote'] = params.data['targetArticleNbVote'] + 1
                    params.api.refreshCells({
                      rowNodes: [params.node],
                      force: true
                    })
                  }
                }
              }
            },
            { headerName: 'Title', field: 'target_article_title', width: 250 },
            { headerName: 'Author', field: 'target_article_author', width: 120, suppressSizeToFit: true },
            { headerName: 'Domain', field: 'target_article_domain', width: 120, suppressSizeToFit: true }
          ].map(item => ({
            ...item,
            cellStyle: (params) => ({
              ...item.cellStyle,
              opacity: params.data['sourceArticleNbVote'] < params.data['targetArticleNbVote'] ? 1 : 0.4
            })
          }))
        }
      ],
      defaultColDef: {
        width: 170,
        sortable: true,
        floatingFilter: true,
        filter: 'agTextColumnFilter',
        filterParams: { newRowsAction: 'keep' },
        floatingFilterComponentParams: {
          suppressFilterButton: true
        }
      },
      rowClassRules: {
        'simscore--primary': (params) => (params.data && params.data['sim_score']) > 0.98,
        'simscore--secondary': (params) => {
          const simScore = params.data && params.data['sim_score']
          if (!simScore) return false
          return (simScore <= 0.95) && (simScore > 0.8)
        }
      },
      frameworkComponents: { btnCellRenderer: BtnCellRenderer },
      getRowHeight: () => 30,
      onModelUpdated: (params) => params.api.sizeColumnsToFit(),
      rowData: null,
      statusBar: {
        statusPanels: [
          { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
          { statusPanel: 'agSelectedRowCountComponent' },
          { statusPanel: 'agAggregationComponent' }
        ]
      }
    }
  }

  onGridReady = (params) => {
    this.gridApi = params.api;
    const updateData = (data) => {
      this.setState({ rowData: data });
    };
    getSimilarityRecords().then(results => {
      updateData(results)
      params.api.sizeColumnsToFit()
    });
  };

  render() {
    return (
      <div style={{ width: '100%', height: '700px' }}>
        <div
          id="myGrid"
          style={{
            height: '100%',
            width: '100%',
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
      </div>
    );
  }
}

export default SimilarityReport;