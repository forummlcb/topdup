import React, { Component } from "react";

class BtnCellRenderer extends Component {

  render() {
    return <div className={'btn-primary btn-sm'} style={{ padding: '0px 3px', width: 'fit-content' }} onClick={this.props.onClick}>{this.props.label}</div>;
  }

}

export default BtnCellRenderer;
